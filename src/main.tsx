import { render } from 'preact';
import App, {
    onDataLoadEncounteredError,
    onSaveEncounteredError,
    rerender,
} from './App';

import {
    ConfigRecord,
    Configs,
    createElement,
    DoubleElementRegisterError,
    Element,
    getElement,
    getElementPreview,
    getRegisteredElements,
    minSizeValidator,
    Rect,
    registerElement,
    validateMinSize,
} from './elements';
import * as elements from './elements/defaultElements';
import { ModalProvider } from './sharedComponents/Modal';
import { listen } from '@tauri-apps/api/event';
import { onLoad, setLastLoadedLocation } from './saveLoadGui';
import { invoke } from '@tauri-apps/api';
import { async_try_fn, try_fn, ValueOrProvider } from './utils';

export const DEFAULT_ID = 'creator';

for (const [id, element] of Object.entries(elements)) {
    registerElement(id, element);
}

listen('load-success', (ev) =>
    typeof ev.payload == 'object' && ev.payload != null
        ? onLoad(ev.payload)
        : undefined
);
listen('load-error', (ev) => onDataLoadEncounteredError(ev.payload + ''));
listen('save-error', (ev) => onSaveEncounteredError(ev.payload + ''));
listen('update-last-loaded', (ev) =>
    setLastLoadedLocation(typeof ev.payload == 'string' ? ev.payload : '')
);

export type PluginLoadStatusSucesss = {
    type: 'loaded';
    successful: string[];
    errored: { name: string; exception: string }[];
};

export type PluginLoadStatusError = { type: 'errored'; exception: string };

export type PluginLoadStatus =
    | { type: 'loading' }
    | PluginLoadStatusSucesss
    | PluginLoadStatusError;

let pluginLoadStatus: PluginLoadStatus = { type: 'loading' };

function aliasedConsoleFunction(
    fn: (...args: any[]) => any,
    prefix: string,
    ...args: any[]
): any {
    if (args.length < 1) return fn();
    if (typeof args[0] == 'string') {
        args[0] = prefix + args[0];
        return fn.apply(globalThis, args);
    } else {
        return fn(prefix + '%s', ...args);
    }
}

function aliasConsole(name: string) {
    const prefix = `[${name}]: `;
    const newConsole: Console = {} as any;
    for (const k in console) {
        (newConsole as any)[k] = aliasedConsoleFunction.bind(
            globalThis,
            (console as any)[k],
            prefix
        );
    }
    return newConsole;
}

export interface GuiCreatorApi {
    registerElement<T extends Configs>(id: string, element: Element<T>): void;
    createElement<T extends Configs>(value: {
        validateDimensions: ((dimensions: Rect) => Rect) | [number, number];
        render(
            render: CanvasRenderingContext2D,
            dimensions: Rect,
            configs: ConfigRecord<T>
        ): void;
        config: ValueOrProvider<T>;
        defaultValue: ValueOrProvider<ConfigRecord<T>>;
        defaultSize: [number, number];
    }): Element<T>;
    getRegisteredElements(): Record<string, Element<Configs>>;
    getElement(id: string): Element<Configs> | undefined;
    try_fn<T, TArgs extends any[]>(
        fn: ((...args: TArgs) => T | undefined) | undefined,
        ...args: TArgs
    ): T | undefined;
    async_try_fn<T, TArgs extends any[]>(
        fn: ((...args: TArgs) => Promise<T> | undefined) | undefined,
        ...args: TArgs
    ): Promise<T | undefined>;
    DoubleElementRegisterError: typeof DoubleElementRegisterError;
    getElementPreview(id: string): ImageData | undefined;
    validateMinSize(
        minWidth: number,
        minHeight: number,
        dimensions: Rect
    ): Rect;
    minSizeValidator(
        minWidth: number,
        minHeight: number
    ): (dimensions: Rect) => Rect;
    defaultElements: typeof elements;
}

function createAPI(name: string): GuiCreatorApi {
    return {
        async_try_fn,
        try_fn,
        createElement,
        defaultElements: elements,
        DoubleElementRegisterError,
        getElement,
        getElementPreview,
        getRegisteredElements,
        minSizeValidator,
        validateMinSize,
        registerElement(id, element) {
            return registerElement(id, element, name);
        },
    };
}

function validateName(name: string): boolean {
    if (name.length < 6) return false;
    if (!name.endsWith('.js')) return false;
    for (let i = 0; i < name.length - 3; ++i) {
        if (name[i] >= 'a' && name[i] <= 'z') continue;
        if (name[i] >= 'A' && name[i] <= 'Z') continue;
        if (name[i] == '-' || name[i] == '_') continue;
        return false;
    }
    return true;
}

function stringifyError(error: any): string {
    if (typeof error == 'string') return error;
    if (error instanceof Error)
        return (
            error.name +
            ': ' +
            error.message +
            (error.stack && error.stack.length > 0
                ? error.stack
                      .split('\n')
                      .map((el) => '\nat ' + el)
                      .join('')
                : '')
        );
    return try_fn(error?.toString) ?? error + '';
}

async function gotPlugins(plugins: [string, string][]) {
    console.log('[%s]: Loading plugins...', DEFAULT_ID);
    const loadedPlugins = await Promise.allSettled(
        plugins.map(async function ([code, name]): Promise<
            | { type: 'success'; name: string }
            | { type: 'fail'; name: string; e: any }
        > {
            if (!validateName(name))
                return {
                    name,
                    type: 'fail',
                    e: new Error(
                        'A plugin name can only contain letters, - and _, has to be at least 3 letters long and end in `.js`'
                    ),
                };
            try {
                const api = createAPI(name);
                const context: any = {
                    console: aliasConsole(name),
                    __PREFRESH__: undefined,
                    __TAURI__: undefined,
                    __TAURI_INVOKE__: undefined,
                    __TAURI_IPC__: undefined,
                    __TAURI_METADATA__: undefined,
                    __TAURI_PATTERN__: undefined,
                    __TAURI_POST_MESSAGE__: undefined,
                    extensionName: name,
                    globalThis: undefined,
                    window: undefined,
                    api,
                    ...api,
                };
                context.globalThis = context;
                context.window = context;
                Object.setPrototypeOf(context.window, window);

                await new Function(
                    'context',
                    'code',
                    'with (context) { return eval("code = undefined; context = undefined;" + code); }'
                )(context, code);

                console.log('[%s]: Loaded successfully', name);
                return { type: 'success', name };
            } catch (e) {
                console.error('[%s]: Failed to load:\n%s', name, e);
                return { type: 'fail', name, e };
            }
        })
    );
    const successful: string[] = [];
    const errored: {
        name: string;
        exception: string;
    }[] = [];

    for (let i = 0; i < loadedPlugins.length; ++i) {
        const plugin = loadedPlugins[i];
        if (plugin.status == 'fulfilled') {
            if (plugin.value.type == 'success')
                successful.push(plugin.value.name);
            else
                errored.push({
                    name: plugin.value.name,
                    exception: stringifyError(plugin.value.e),
                });
        } else if (plugin.status == 'rejected')
            errored.push({
                exception: stringifyError(plugin.reason),
                name: plugins[i][1],
            });
    }

    pluginLoadStatus = {
        type: 'loaded',
        successful,
        errored,
    };
    rerender();
}

function loadingPluginsErroed(error: any) {
    console.error('[%s]: Failed to load plugins: %s', DEFAULT_ID, error);
    pluginLoadStatus = { type: 'errored', exception: stringifyError(error) };
    rerender();
}

export function getPluginLoadStatus(): PluginLoadStatus {
    return pluginLoadStatus;
}

invoke('load_plugins')
    .then(function (payload) {
        if (
            typeof payload == 'object' &&
            Array.isArray(payload) &&
            (payload.length == 0 || payload[0].length == 2)
        )
            gotPlugins(payload as any);
        else loadingPluginsErroed('Wrong response returned by Main Process');
    })
    .catch(loadingPluginsErroed);

render(
    <ModalProvider>
        <App />
    </ModalProvider>,
    document.getElementById('root')!
);
