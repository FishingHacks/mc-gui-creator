import { invoke } from '@tauri-apps/api';
import {
    GuiData,
    onDataLoadEncounteredError,
    onGetGuiData as onObtainedGuiData,
    onSaveEncounteredError,
} from './App';
import { CanvasElement, DiskFile, Rect } from './elements';
import { clone } from './utils';

/////////////////////////////////////////////////////////////////
/////////////////////////// T Y P E S ///////////////////////////
/////////////////////////////////////////////////////////////////

interface RustGuiData {
    base_element: RustElement;
    elements: RustElement[];
}

interface RustElement {
    dimensions: Rect;
    id: string;
    data: Record<string, RustConfigType>;
    name: string;
}

type RustConfigType =
    | { PathValue: { path: string; data: RustImageData } }
    | { NumberValue: number }
    | { StringValue: string };

interface RustImageData {
    width: number;
    height: number;
    data: number[];
}

type PossibleConfigTypes = string | number | DiskFile;

////////////////////////////////////////////////////////////////
//////////////// N O R M A L    ===>    R U S T ////////////////
////////////////////////////////////////////////////////////////

export function normalToRust(normal: GuiData): RustGuiData {
    return {
        base_element: normalElementToRust(normal.baseElement),
        elements: normal.elements.map(normalElementToRust),
    };
}

function normalElementToRust(normal: CanvasElement): RustElement {
    const data: RustElement['data'] = {};

    for (const k in normal.data) {
        if (normal.data[k] == undefined) continue; // skip over files that aren't set :3
        data[k] = normalConfigValueToRust(normal.data[k]);
    }

    return {
        dimensions: clone(normal.dimensions),
        id: normal.id,
        name: normal.name,
        data,
    };
}

function normalConfigValueToRust(normal: PossibleConfigTypes): RustConfigType {
    if (typeof normal == 'string') return { StringValue: normal };
    if (typeof normal == 'number') return { NumberValue: normal };
    if (typeof normal == 'object')
        return {
            PathValue: {
                path: normal.path,
                data: normalImageDataToRust(normal.data),
            },
        };
    throw new Error(`Unknown config type: ${typeof normal}`);
}

function normalImageDataToRust(normal: ImageData): RustImageData {
    return {
        width: normal.width,
        height: normal.height,
        data: [...normal.data],
    };
}

////////////////////////////////////////////////////////////////
//////////////// R U S T    ===>    N O R M A L ////////////////
////////////////////////////////////////////////////////////////

export function rustToNormal(rust: RustGuiData): GuiData {
    return {
        baseElement: rustElementToNormal(rust.base_element),
        elements: rust.elements.map(rustElementToNormal),
    };
}

function rustElementToNormal(rust: RustElement): CanvasElement {
    const data: CanvasElement['data'] = {};

    for (const k in rust.data) {
        data[k] = rustConfigValueToNormal(rust.data[k]);
    }

    return {
        dimensions: clone(rust.dimensions),
        id: rust.id,
        name: rust.name,
        data,
    };
}

function rustConfigValueToNormal(rust: RustConfigType): PossibleConfigTypes {
    if ('StringValue' in rust) return rust.StringValue;
    if ('NumberValue' in rust) return rust.NumberValue;
    if ('PathValue' in rust)
        return {
            path: rust.PathValue.path,
            data: rustImageDataToNormal(rust.PathValue.data),
        };
    throw new Error(`Invalid rust config: ${rust}`);
}

function rustImageDataToNormal(rust: RustImageData): ImageData {
    const data = new Uint8ClampedArray(rust.width * rust.height * 4);
    const maxIdx = Math.min(data.length, rust.data.length);
    for (let i = 0; i < maxIdx; ++i) data[i] = rust.data[i];

    return new ImageData(data, rust.width, rust.height);
}

///////////////////////////////////////////////////////////////
///////////// E X P O R T E D   F U N C T I O N S /////////////
///////////////////////////////////////////////////////////////

let lastLoadedLocation = '';

export function save(data: GuiData) {
    try {
        const rustData = normalToRust(data);

        invoke('save', {
            lastLoadedLocation,
            data: rustData,
        }).catch((err) => onSaveEncounteredError(err + ''));
    } catch (e) {
        return onSaveEncounteredError(e + '');
    }
}

export function load() {
    invoke('load').catch((err) => onDataLoadEncounteredError(err + ''));
}

export function onLoad(data: object) {
    try {
        if (
            typeof data == 'object' &&
            'data' in data &&
            'last_loaded_location' in data &&
            typeof data.data == 'object' &&
            typeof data.last_loaded_location == 'string'
        ) {
            lastLoadedLocation = data.last_loaded_location;
            onObtainedGuiData(rustToNormal(data.data as RustGuiData));
        }
    } catch (e) {
        return onDataLoadEncounteredError(e + '');
    }
}

export function resetLastLoadedLocation() {
    lastLoadedLocation = '';
}

export function setLastLoadedLocation(location: string) {
    lastLoadedLocation = location;
}
