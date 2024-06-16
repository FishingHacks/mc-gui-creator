/**
 * A value or a function returning that value
 */
export type ValueOrProvider<T> = T | (() => T);

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
    DoubleElementRegisterError: typeof Error;
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
    defaultElements: {
        slotElement: Element<{
            background_file: {
                type: 'file_input';
                label: string;
            };
        }>;
        emptyInventoryElement: Element<{}>;
        normalInventoryElement: Element<{}>;
    };
}

export const API: GuiCreatorApi = (globalThis as any).api as GuiCreatorApi;