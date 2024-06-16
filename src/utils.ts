export function try_fn<T, TArgs extends any[]>(
    try_val: ((...args: TArgs) => T | undefined) | undefined,
    ...args: TArgs
): T | undefined {
    if (typeof try_val != 'function') return;
    try {
        return try_val(...args);
    } catch {}
}

export async function async_try_fn<T, TArgs extends any[]>(
    try_val: ((...args: TArgs) => Promise<T> | undefined) | undefined,
    ...args: TArgs
): Promise<T | undefined> {
    if (typeof try_val != 'function') return;
    try {
        return await try_val(...args);
    } catch {}
}

export type ValueOrProvider<T> = T | (() => T);

export function get<T>(
    value: T extends Function ? never : ValueOrProvider<T>
): T {
    if (typeof value == 'function') return value();
    return value as T;
}

export function toDefinitiveProvider<T>(
    value: T extends Function ? never : ValueOrProvider<T>
): () => T {
    if (typeof value == 'function') return value as any;
    return () => value as any;
}

export class LazyValue<T> {
    private real_value?: T;
    private provider: () => T;

    get value(): T | undefined {
        if (this.real_value == undefined) {
            try {
                const value = this.provider();
                this.real_value = value;
                return value;
            } catch {
                return;
            }
        }
        return this.real_value;
    }

    constructor(provider: () => T) {
        this.provider = provider;
    }
}

export function putImageDataBlend(
    canvas: CanvasRenderingContext2D,
    image: ImageData,
    x: number,
    y: number,
    black_white_only?: boolean
) {
    const data = canvas.getImageData(x, y, image.width, image.height);

    for (let x = 0; x < image.width; ++x)
        for (let y = 0; y < image.width; ++y) {
            const offset = (x + y * image.width) * 4;
            if (image.data[offset + 3] <= 0) continue; // image is transparent, dont do anything
            if (data.data[offset + 3] <= 0) {
                // canvas is transparent, just copy over the image
                data.data[offset] = image.data[offset];
                data.data[offset + 1] = image.data[offset + 1];
                data.data[offset + 2] = image.data[offset + 2];
                data.data[offset + 3] = image.data[offset + 3];
                continue;
            }

            let r1 = data.data[offset];
            let g1 = data.data[offset + 1];
            let b1 = data.data[offset + 2];

            let r2 = image.data[offset];
            let g2 = image.data[offset + 1];
            let b2 = image.data[offset + 2];
            const a2 = image.data[offset + 3];

            if (black_white_only) {
                let color = Math.round((r2 + g2 + b2) / 3);
                r2 = color;
                g2 = color;
                b2 = color;
            }

            r1 = (r1 * (255 - a2) + r2 * a2) / 255;
            if (r1 > 255) r1 = 255;

            g1 = (g1 * (255 - a2) + g2 * a2) / 255;
            if (g1 > 255) g1 = 255;

            b1 = (b1 * (255 - a2) + b2 * a2) / 255;
            if (b1 > 255) b1 = 255;

            data.data[offset] = r1;
            data.data[offset + 1] = g1;
            data.data[offset + 2] = b1;
            data.data[offset + 3] = Math.max(data.data[offset + 3], a2);
        }

    canvas.putImageData(data, x, y);
}

export function clone<T>(value: T): T {
    // all these types of values are copy-on-write, aka if we return them, we effectively return the value (let a = 12; let b = a; b++; // b = 13, a = 12)
    if (
        typeof value == 'number' ||
        typeof value == 'string' ||
        typeof value == 'bigint' ||
        typeof value == 'boolean' ||
        typeof value == 'undefined' ||
        typeof value == 'symbol'
    )
        return value;
    // we don't have any way to clone functions. So please don't put random values on the function object
    if (typeof value == 'function') return value;
    if (value == null) return null as T;
    if (Array.isArray(value)) return [...value] as T;
    const data = {} as any;

    for (const k in value) {
        data[k] = clone(value[k]);
    }

    return data;
}
