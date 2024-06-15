import { clone, try_fn, ValueOrProvider } from '../utils';

/**
 * An interface to house data on where to place something on a renderable surface (such as the canvas)
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * A global and static object housing the logic for your element.
 *
 * getConfigs() should return a map of configuration elements. This can be used by the gui to allow the user to customize your element.
 * The actual values specified by the user are being passed to the render function.
 *
 * This function should be **static** and thus never change
 */
export interface Element<T extends Configs> {
    validateDimensions(dimensions: Rect): Rect;
    render(
        render: CanvasRenderingContext2D,
        dimensions: Rect,
        configs: ConfigRecord<T>
    ): void;
    getConfigs(): T;
    default(): ElementDefault<T>;
}

export interface ElementDefault<T extends Configs> {
    width: number;
    height: number;
    configuration: ConfigRecord<T>;
}

export type MultiChoiceValues = string | { id: string; label: string };

/**
 * The different types of configurations your element can have
 */
export type ConfigurationElement = (
    | { type: 'string_input' | 'unbound_number_input' }
    | { type: 'bound_number_input'; min: number; max: number }
    | { type: 'dropdown' | 'radio'; values: MultiChoiceValues[] }
    | { type: 'file_input' }
) & { label?: string };

/**
 * A Map of keys and a Configuration Element. This is used by the GUI to provide configuration options for the element, when you select it
 */
export type Configs = Record<PropertyKey, ConfigurationElement>;

/**
 * A Map of keys and the value of the grantfa configuration elements.
 *
 * Meaning, if you pass `{ name: { type: "string_input" }, loops: { type: "number_input" } }`,
 * it would return `{ name: string, loops: number }`, as those are the values used by those 2 particular configuration elements
 */
export type ConfigRecord<T extends Configs> = {
    [K in keyof T]: ElementValue<T[K]>;
};

/**
 * If you pass this a type that extends the ConfigurationElement, it will return the value-type such a configuration would give.
 *
 * For example, for the string_input, it returns string, as the value used by a string_input is a string
 */
export type ElementValue<T extends ConfigurationElement> =
    T['type'] extends 'string_input'
        ? string
        : T['type'] extends 'dropdown' | 'radio'
        ? string
        : T['type'] extends 'unbound_number_input' | 'bound_number_input'
        ? number
        : T['type'] extends 'file_input'
        ? DiskFile
        : never;

export type DiskFile = { data: ImageData; path: string } | undefined;

/**
 * A renderable element, which has the id of the actual element that has the code for rendering, resizing, etc
 */
export interface CanvasElement {
    /**
     * The dimensions of this element
     */
    dimensions: Rect;
    /**
     * The id. You should use this on getElement() to get the actual element
     */
    id: string;
    /**
     * The data of the Element
     * We are responsible for saving and loading it!
     */
    data: Record<string, string | number | DiskFile>;
    /**
     * A custom name that can be defined by the user. Treat as absent if empty
     */
    name: string;
}

/**
 * Renders an element to the canvas
 *
 * @param context The context being used to render to the canvas
 * @param element The element that you wanna render
 */
export function renderCanvasElement(
    context: CanvasRenderingContext2D,
    element: CanvasElement
) {
    const actualElement = getElement(element.id);
    try {
        actualElement?.render(
            context,
            {
                x: element.dimensions.x + 1,
                y: element.dimensions.y + 1,
                height: element.dimensions.height,
                width: element.dimensions.width,
            },
            element.data as any
        );
    } catch (e) {
        console.error('[gui-creator] Failed to render element %s', element.id);
    }
}

export function newCanvasElement(
    id: string,
    name: string,
    x: number,
    y: number
): CanvasElement | undefined {
    const element = getElement(id);
    if (!element) return;
    const element_default = try_fn(element.default);
    if (!element_default) return;

    const cfgs = try_fn(element.getConfigs);
    if (!cfgs) return;
    for (const k in cfgs) {
        if (cfgs[k]?.type == 'file_input')
            (element_default.configuration as any)[k] = undefined;
    }

    return {
        id,
        name,
        data: clone(element_default.configuration),
        dimensions: {
            x,
            y,
            width: element_default.width,
            height: element_default.height,
        },
    };
}

/**
 * A function that returns a function that ensures a rectangle is at least the specified size
 *
 * @param minWidth The minimum width of your element
 * @param minHeight The minimum height of your element
 * @returns A function thay ou can set as your Element.validateDimensions, which ensures that your element is at all times at least the specified size
 */
export function minSizeValidator(
    minWidth: number,
    minHeight: number
): (dimensions: Rect) => Rect {
    return validateMinSize.bind(globalThis, minWidth, minHeight);
}

export function validateMinSize(
    minWidth: number,
    minHeight: number,
    dimensions: Rect
): Rect {
    if (dimensions.width < minWidth) dimensions.width = minWidth;
    if (dimensions.height < minHeight) dimensions.height = minHeight;

    return dimensions;
}

/**
 * A registry of all elements that we can render.
 */
const elementRegistry: Record<string, Element<any>> = {};
const renderedElementCache: Record<string, ImageData> = {};

export function getElementPreview(id: string): ImageData | undefined {
    if (id in renderedElementCache) return renderedElementCache[id];
    const element = getElement(id);
    if (!element) return;
    const element_default = try_fn(element.default);
    if (!element_default) return;
    const rect: Rect = { x: 0, y: 0, width: element_default.width, height: element_default.height };
    const canvas = document.createElement("canvas");
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.imageRendering = "pixelated";
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    if (!element.render) return;
    try_fn(element.render, ctx, rect, element_default.configuration);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    renderedElementCache[id] = imageData;
    return imageData;
}

/**
 * Lookup an element
 * @param id The id of the element
 * @returns If found, the element, otherwise undefined.
 */
export function getElement(
    id: string
): Element<Configs> | undefined {
    if (id in elementRegistry) {
        return elementRegistry[id];
    }
    return undefined;
}

/**
 * This Error will be invoked when someone tried to register an Element with the id of an already registered element
 */
export class DoubleElementRegisterError extends Error {
    constructor(id: string) {
        super();
        this.message = 'Double registration of element with id ' + id;
        this.name = 'DoubleElementRegisterError';
    }
}

/**
 * Registers a new element
 *
 * @param id The ID of the element
 * @param element The actual element
 * @param registerer Who is registering the element (creator by default. The API-version of registerElement sets this automatically to the plugin thats registering the elements)
 */
export function registerElement<T extends Configs>(
    id: string,
    element: Element<T>,
    registerer?: string
) {
    if (id in elementRegistry) {
        throw new DoubleElementRegisterError(id);
    }
    console.log('[%s]: Registering element %s!', registerer ?? 'creator', id);

    elementRegistry[id] = element;
}

export function getRegisteredElements(): Record<string, Element<any>> {
    return elementRegistry;
}

export function createElement<T extends Configs>(value: {
    validateDimensions: ((dimensions: Rect) => Rect) | [number, number];
    render(
        render: CanvasRenderingContext2D,
        dimensions: Rect,
        configs: ConfigRecord<T>
    ): void;
    config: ValueOrProvider<T>;
    defaultValue: ValueOrProvider<ConfigRecord<T>>;
    defaultSize: [number, number];
}): Element<T> {
    const { config, defaultSize, defaultValue, render, validateDimensions } =
        value;
    return {
        default() {
            return {
                width: defaultSize[0],
                height: defaultSize[1],
                configuration:
                    typeof defaultValue == 'function'
                        ? defaultValue()
                        : defaultValue,
            };
        },
        getConfigs: typeof config == 'function' ? config : () => config,
        render,
        validateDimensions:
            typeof validateDimensions == 'function'
                ? validateDimensions
                : minSizeValidator(...validateDimensions),
    };
}
