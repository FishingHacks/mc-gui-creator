import { useEffect, useRef, useState } from 'preact/hooks';
import type { Dispatch, Ref, StateUpdater } from 'preact/hooks';
import './index.css';
import type { CanvasElement, DiskFile as DiskFile } from './elements';
import {
    getElement,
    getRegisteredElements,
    newCanvasElement,
    renderCanvasElement,
} from './elements';
import { createRef, type VNode } from 'preact';
import { LazyValue, try_fn } from './utils';
import { Input } from './Input';
import { Dropdown } from './sharedComponents/Dropdown';
import { RadioSelection } from './sharedComponents/RadioSelection';
import { FileInput } from './sharedComponents/FileInput';
import { ElementPreview } from './elements/elementPreview';
import {
    IconKeybinds,
    IconLoad,
    IconPlus,
    IconSave,
} from './sharedComponents/icons';
import {
    closeModal,
    getModals,
    isModalOpen,
    ModalElementProps,
    openConfirmModal,
    openModal,
} from './sharedComponents/Modal';
import { Button } from './sharedComponents/Button';
import { Keybinds } from './Keybinds';
import { load, resetLastLoadedLocation, save } from './saveLoadGui';

export interface GuiData {
    baseElement: CanvasElement;
    elements: CanvasElement[];
}

function validateDimensions(data: GuiData, selected: number) {
    const id = selected < 0 ? data.baseElement.id : data.elements[selected]?.id;
    if (!id) return;

    const element = getElement(id);
    if (!element) return;

    if (selected < 0) {
        if (data.baseElement.dimensions.width < 1)
            data.baseElement.dimensions.width = 1;
        if (data.baseElement.dimensions.height < 1)
            data.baseElement.dimensions.height = 1;
        data.baseElement.dimensions.x = 0;
        data.baseElement.dimensions.y = 0;

        data.baseElement.dimensions =
            try_fn(element.validateDimensions, data.baseElement.dimensions) ||
            data.baseElement.dimensions;

        for (let i = 0; i < data.elements.length; ++i)
            validateDimensions(data, i);
    } else {
        let dimensions = data.elements[selected].dimensions;
        if (dimensions.width < 1) dimensions.width = 1;
        if (dimensions.height < 1) dimensions.height = 1;
        if (dimensions.x < 0) dimensions.x = 0;
        if (dimensions.y < 0) dimensions.y = 0;

        let prevX = dimensions.x;
        let prevY = dimensions.y;
        // validate size
        data.elements[selected].dimensions =
            try_fn(
                element.validateDimensions,
                data.elements[selected].dimensions
            ) || data.elements[selected].dimensions;
        dimensions = data.elements[selected].dimensions;
        dimensions.x = prevX;
        dimensions.y = prevY;

        const { width, height } = data.baseElement.dimensions;
        // validate positions
        if (dimensions.x < 0) dimensions.x = 0;
        if (dimensions.y < 0) dimensions.y = 0;
        if (dimensions.x + dimensions.width > width)
            dimensions.x = width - dimensions.width;
        if (dimensions.y + dimensions.height > height)
            dimensions.y = height - dimensions.height;

        data.elements[selected].dimensions =
            try_fn(
                element.validateDimensions,
                data.elements[selected].dimensions
            ) || data.elements[selected].dimensions;
        dimensions = data.elements[selected].dimensions;
    }
}
function updateRefs(data: GuiData, selected: number, refs: Refs) {
    const el = selected >= 0 ? data.elements[selected] : data.baseElement;
    if (!el) return;

    if (selected >= 0) {
        if (refs.inputXRef.current)
            refs.inputXRef.current.value = el.dimensions.x + '';
        if (refs.inputYRef.current)
            refs.inputYRef.current.value = el.dimensions.y + '';
    }
    if (refs.inputWidthRef.current)
        refs.inputWidthRef.current.value = el.dimensions.width + '';
    if (refs.inputHeightRef.current)
        refs.inputHeightRef.current.value = el.dimensions.height + '';

    if (selected < 0 && refs.canvasRef.current) {
        refs.canvasRef.current.width = el.dimensions.width + 2;
        refs.canvasRef.current.height = el.dimensions.height + 2;
        refs.canvasRef.current.style.aspectRatio = `${
            el.dimensions.width + 2
        } / ${el.dimensions.height + 2}`;
    }
    if (refs.canvasRef.current) render(refs.canvasRef.current, data, selected);
}

/**
 * @returns A new very simple GUI
 */
function newGuiData(): GuiData {
    return {
        elements: [],
        baseElement: newCanvasElement('emptyInventoryElement', '', 0, 0)!,
    };
}

function render(canvas: HTMLCanvasElement, data: GuiData, selected?: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return console.error('Could not get canvas rendering context');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    renderCanvasElement(ctx, data.baseElement);
    for (const el of data.elements) {
        renderCanvasElement(ctx, el);
    }
    if (typeof selected == 'number') {
        let rect =
            selected < 0
                ? data.baseElement.dimensions
                : data.elements[selected]?.dimensions ?? {
                      height: 0,
                      width: 0,
                      x: 0,
                      y: 0,
                  };
        ctx.fillStyle = 'red';
        // top border
        ctx.fillRect(rect.x, rect.y, rect.width + 2, 1); // technically we have to do x - 1 and y - 1, but because we also have to do +1 on both due to the 1 px border on the canvas element, we can cancel that out
        // bottom border
        ctx.fillRect(rect.x, rect.y + rect.height + 1, rect.width + 2, 1);
        // left border
        ctx.fillRect(rect.x, rect.y, 1, rect.height + 2);
        // right border
        ctx.fillRect(rect.x + rect.width + 1, rect.y, 1, rect.height + 2);
    }
}

type SelectedState =
    | { index: number; offset: [number, number] | undefined }
    | undefined;

interface Refs {
    inputXRef: Ref<HTMLInputElement>;
    inputYRef: Ref<HTMLInputElement>;
    inputWidthRef: Ref<HTMLInputElement>;
    inputHeightRef: Ref<HTMLInputElement>;
    canvasRef: Ref<HTMLCanvasElement>;
}

let __boolsetstate: Dispatch<StateUpdater<boolean>> = () => {};

function toggle(v: boolean) {
    return !v;
}

export function rerender() {
    __boolsetstate(toggle);
}

function preventEvent(ev: { preventDefault(): void }) {
    ev.preventDefault();
}

function ElementPreviewModal({
    x,
    y,
    id,
}: ModalElementProps<{ x: number; y: number }>) {
    return (
        <div className='element-preview-container' onContextMenu={preventEvent}>
            {Object.keys(getRegisteredElements()).map((k) => (
                <ElementPreview
                    key={k}
                    id={k}
                    onClick={() => {
                        const el = newCanvasElement(k, '', x, y);
                        if (!el) return;
                        dataState[0].elements.push(el);
                        validateDimensions(
                            dataState[0],
                            dataState[0].elements.length - 1
                        );
                        dataState[1](dataState[0]);
                        selectedState[1]({
                            index: dataState[0].elements.length - 1,
                            offset: undefined,
                        });
                        closeModal(id);
                    }}
                />
            ))}
        </div>
    );
}

function CreateNewModal({ id }: ModalElementProps<{}>) {
    const [name, setName] = useState('');
    const [elementId, setElementId] = useState('emptyInventoryElement');

    const inputWidthRef = useRef<HTMLInputElement>(null);
    const inputHeightRef = useRef<HTMLInputElement>(null);

    function getDimensions(): [number, number] {
        const defaultConfig = try_fn(getElement(elementId)?.default);
        if (!defaultConfig) {
            closeModal(id);
            return [0, 0];
        }
        return [defaultConfig.width, defaultConfig.height];
    }

    const [dimensions, setDimensions] = useState(getDimensions);

    return (
        <div style={{}}>
            <Input
                id='newGuiName'
                label='Name'
                type='string'
                value={name}
                onSubmit={(element) => setName(element.value + '')}
            />
            <Input
                id='newGuiWidth'
                label='Width'
                type='number'
                value={dimensions[0]}
                innerRef={inputWidthRef}
                onSubmit={(element) => {
                    let number = Number(element.value);
                    if (isNaN(number)) {
                        element.value = dimensions[0] + '';
                        return;
                    }
                    const rect = try_fn(
                        getElement(elementId)?.validateDimensions,
                        { x: 0, y: 0, width: number, height: dimensions[1] }
                    );
                    if (!rect) {
                        element.value = dimensions[0] + '';
                        return;
                    }
                    setDimensions([rect.width, rect.height]);
                    element.value = rect.width + '';
                    if (inputHeightRef.current)
                        inputHeightRef.current.value = rect.height + '';
                }}
            />
            <Input
                id='newGuiHeight'
                label='Height'
                type='number'
                value={dimensions[1]}
                innerRef={inputHeightRef}
                onSubmit={(element) => {
                    let number = Number(element.value);
                    if (isNaN(number)) {
                        element.value = dimensions[0] + '';
                        return;
                    }
                    const rect = try_fn(
                        getElement(elementId)?.validateDimensions,
                        { x: 0, y: 0, width: dimensions[0], height: number }
                    );
                    if (!rect) {
                        element.value = dimensions[1] + '';
                        return;
                    }
                    setDimensions([rect.width, rect.height]);
                    element.value = rect.height + '';
                    if (inputWidthRef.current)
                        inputWidthRef.current.value = rect.width + '';
                }}
            />
            <Dropdown
                id='newGuiBaseElementType'
                label='Base Element'
                possibleValues={Object.keys(getRegisteredElements())}
                value={elementId}
                onChange={(element, selected) => {
                    if (!getElement(selected))
                        return (element.value = elementId);
                    const newRect = try_fn(getElement(selected)?.default);
                    if (!newRect) return (element.value = elementId);
                    setElementId(selected);
                    setDimensions([newRect.width, newRect.height]);
                }}
            />
            <div className='confirm-modal-button-row'>
                <Button
                    color='blue'
                    onClick={() => {
                        const baseElement = newCanvasElement(
                            elementId,
                            name,
                            0,
                            0
                        );
                        if (!baseElement) return;
                        baseElement.dimensions.width = dimensions[0];
                        baseElement.dimensions.height = dimensions[1];
                        const newDimensions = try_fn(
                            getElement(baseElement.id)?.validateDimensions,
                            baseElement.dimensions
                        );
                        if (!newDimensions) return;
                        baseElement.dimensions = newDimensions;
                        closeModal(id);
                        resetLastLoadedLocation();
                        dataState[1]({
                            baseElement,
                            elements: [],
                        });
                    }}
                >
                    Create
                </Button>
                <Button
                    color='red'
                    onClick={closeModal.bind(globalThis, id, true)}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

let dataState: [GuiData, Dispatch<StateUpdater<GuiData>>] = [
    newGuiData(),
    () => {},
];
let selectedState: [SelectedState, Dispatch<StateUpdater<SelectedState>>] = [
    undefined,
    () => {},
];
let refs: Refs = {
    canvasRef: createRef(),
    inputXRef: createRef(),
    inputYRef: createRef(),
    inputWidthRef: createRef(),
    inputHeightRef: createRef(),
};

export function onGetGuiData(data: GuiData) {
    try {
        const missingElements = ["Missing Elements (Are all required plugins loaded?):"];
        if (!getElement(data.baseElement.id))
            missingElements.push(
                `Unknown Element for the Base Element: ${data.baseElement.id}`
            );
        for (let i = 0; i < data.elements.length; ++i)
            if (!getElement(data.elements[i].id))
                missingElements.push(
                    `Unknown Element for Element #${i}${
                        data.elements[i].name.length > 0
                            ? ' (' + data.elements[i].name + ')'
                            : ''
                    }: ${data.elements[i].id}`
                );

        if (missingElements.length > 1) return onDataLoadEncounteredError(missingElements.join('\n'));

        validateDimensions(data, -1);

        selectedState[1](undefined);
        dataState[1](data);
    } catch (e) {
        return onDataLoadEncounteredError(e + '');
    }
}

export function onDataLoadEncounteredError(error: string) {
    openModal({
        children: () => <p>{error}</p>,
        data: {},
        title: 'Failed to Load',
    });
}
export function onSaveEncounteredError(error: string) {
    openModal({
        children: () => <p>{error}</p>,
        data: {},
        title: 'Failed to Save',
    });
}

const openLoadFileModal = openConfirmModal.bind(globalThis, {
    children: () => <p>Your changes will be lost if you don't save them</p>,
    data: {},
    title: 'Save Changes',
    onConfirm: load,
});

const openKeybindsModal = openModal.bind(globalThis, {
    children: Keybinds,
    data: {},
    title: 'Keybinds',
});

const openCreateModal = openConfirmModal.bind(globalThis, {
    children: () => <p>Your changes will be lost if you don't save them</p>,
    data: {},
    title: 'Save Changes',
    onConfirm: openModal.bind(globalThis, {
        children: CreateNewModal,
        data: {},
        title: 'Create a new GUI',
    }),
});

export default function App() {
    const [data, setData] = (dataState = useState(newGuiData));
    const [_, __internal_boolSetState] = useState(false);
    __boolsetstate = __internal_boolSetState;

    /**
     * The index of the currently selected element. If the index < 0, then the background element is selected
     */
    const [selected, setSelected] = (selectedState =
        useState<SelectedState>(undefined));

    refs = {
        canvasRef: useRef<HTMLCanvasElement>(null),
        inputXRef: useRef<HTMLInputElement>(null),
        inputYRef: useRef<HTMLInputElement>(null),
        inputWidthRef: useRef<HTMLInputElement>(null),
        inputHeightRef: useRef<HTMLInputElement>(null),
    };

    useEffect(() => {
        if (
            refs.canvasRef.current &&
            refs.canvasRef.current instanceof HTMLCanvasElement
        )
            render(refs.canvasRef.current, data, selected?.index);
    });

    // events
    useEffect(() => {
        function onKeyDown(ev: KeyboardEvent) {
            const modals = getModals();
            if (ev.key == 'Escape' && modals.length > 0)
                return closeModal(modals[modals.length - 1].id);
            
            if (modals.length > 0) return;

            if (ev.ctrlKey) {
                if (ev.key == 'h' || ev.key == '/')
                    return ev.preventDefault(), openKeybindsModal();
                if (ev.key == 'n')
                    return ev.preventDefault(), openCreateModal();
                if (ev.key == 'o')
                    return ev.preventDefault(), openLoadFileModal();
                if (ev.key == 's')
                    return ev.preventDefault(), save(data);
            }

            if (!selected) return;

            if (ev.key == 'Delete' && selected.index >= 0) {
                const idx = selected.index;
                data.elements.splice(idx, 1);
                setSelected(undefined);
                setData(data);
            }

            const el =
                selected.index >= 0
                    ? data.elements[selected.index]
                    : data.baseElement;

            let incrementBy = ev.shiftKey ? 10 : 1;
            if (ev.key == 'ArrowRight' || ev.key == 'ArrowLeft') {
                if (ev.altKey)
                    el.dimensions.width +=
                        ev.key == 'ArrowLeft' ? -incrementBy : incrementBy;
                else if (selected.index >= 0)
                    el.dimensions.x +=
                        ev.key == 'ArrowLeft' ? -incrementBy : incrementBy;
            }
            if (ev.key == 'ArrowUp' || ev.key == 'ArrowDown') {
                if (ev.altKey)
                    el.dimensions.height +=
                        ev.key == 'ArrowUp' ? -incrementBy : incrementBy;
                else if (selected.index >= 0)
                    el.dimensions.y +=
                        ev.key == 'ArrowUp' ? -incrementBy : incrementBy;
            }

            if (
                ev.key == 'ArrowUp' ||
                ev.key == 'ArrowDown' ||
                ev.key == 'ArrowRight' ||
                ev.key == 'ArrowLeft'
            ) {
                validateDimensions(data, selected.index);
                updateRefs(data, selected.index, refs);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    });

    return (
        <div
            className='main'
            onMouseDown={(ev) => {
                // if the target is either the main thing, meaning we clicked in the empty space around the canvas or its the left section (or an item in it), reset the selection.
                if (
                    ev.target instanceof HTMLDivElement &&
                    (ev.target.classList.contains('section-left') ||
                        ev.target.classList.contains('section-left-item') ||
                        ev.target.classList.contains('main'))
                )
                    setSelected(undefined);
            }}
        >
            {
                undefined /* The left section, in here you should have a list of all elements you can use */
            }
            <canvas
                className={
                    data.baseElement.dimensions.height >
                    data.baseElement.dimensions.width
                        ? 'scale-by-height center-canvas'
                        : 'scale-by-width center-canvas'
                }
                width={
                    data.baseElement.dimensions.width + 2 /*
        + 2 because we add a 1px border to the canvas in order to draw a border around the selected element,
        which may go out of "gui space" when the element is at 0,0, so we make "gui space" go from 1, 1 to canvas width - 2, canvas height - 2,
        which ensures that any 1px border is always in the canvas */
                }
                height={data.baseElement.dimensions.height + 2}
                ref={refs.canvasRef}
                style={{
                    aspectRatio: `${data.baseElement.dimensions.width + 2}/${
                        data.baseElement.dimensions.height + 2
                    }`,
                }}
                onMouseMove={function (event) {
                    if ((event.buttons & 0b1) == 0) return;
                    const target = event.target;
                    // should always be true
                    if (!(target instanceof HTMLCanvasElement)) return;

                    // event.clientX/Y: the position of the cursor relative to the window
                    // event.target.offsetLeft/offsetTop: The width/height from the top left of the screen
                    // clientWidth/height: The size of the canvas element
                    // event.width/height: The width/height of the canvas
                    // if we divide the width/height by the clientWidth/clientHeight, we will have the multiplier by which we need to multiply the mouse position relative to the top left of the canvas (clientX/Y - target.offsetLeft/Top).
                    // Example: the canvas is 10x10, but the clientWidth/height is 20x20, we get 0.5 (10 / 20). And a mouse position of 20, 20 multiplied by 0.5, 0.5 is 10, 10, so the actual position on the canvas we're on.
                    // NOTE: As noted above, the "gui space" actually starts at 1, 1, so we also have to subtract 1
                    const x =
                        Math.floor(
                            ((event.clientX - target.offsetLeft) *
                                target.width) /
                                target.clientWidth
                        ) - 1;
                    const y =
                        Math.floor(
                            ((event.clientY - target.offsetTop) *
                                target.height) /
                                target.clientHeight
                        ) - 1;

                    if (
                        selected &&
                        selected.offset &&
                        selected.index >= 0 &&
                        selected.index < data.elements.length &&
                        x >= 0 &&
                        y >= 0 &&
                        x < target.width - 1 &&
                        y < target.height - 1
                    ) {
                        let newX = selected.offset[0] + x;
                        let newY = selected.offset[1] + y;

                        data.elements[selected.index].dimensions.x = newX;
                        data.elements[selected.index].dimensions.y = newY;
                        validateDimensions(data, selected.index);
                        updateRefs(data, selected.index, refs);

                        setData(data);
                    }
                }}
                onMouseDown={function (event) {
                    const target = event.target;
                    // should always be true
                    if (!(target instanceof HTMLCanvasElement)) return;

                    // event.clientX/Y: the position of the cursor relative to the window
                    // event.target.offsetLeft/offsetTop: The width/height from the top left of the screen
                    // clientWidth/height: The size of the canvas element
                    // event.width/height: The width/height of the canvas
                    // if we divide the width/height by the clientWidth/clientHeight, we will have the multiplier by which we need to multiply the mouse position relative to the top left of the canvas (clientX/Y - target.offsetLeft/Top).
                    // Example: the canvas is 10x10, but the clientWidth/height is 20x20, we get 0.5 (10 / 20). And a mouse position of 20, 20 multiplied by 0.5, 0.5 is 10, 10, so the actual position on the canvas we're on.
                    // NOTE: As noted above, the "gui space" actually starts at 1, 1, so we also have to subtract 1
                    const x = Math.floor(
                        ((event.clientX - target.offsetLeft) * target.width) /
                            target.clientWidth
                    );
                    const y = Math.floor(
                        ((event.clientY - target.offsetTop) * target.height) /
                            target.clientHeight
                    );

                    if (
                        x <= 0 ||
                        y <= 0 ||
                        x > target.width ||
                        y > target.height
                    )
                        return;

                    if ((event.buttons & 0b10) >= 1) {
                        event.preventDefault();
                        if (isModalOpen()) return;

                        openModal({
                            title: 'Select Element',
                            children: ElementPreviewModal,
                            data: { x, y },
                        });
                        return;
                    }
                    if ((event.buttons & 0b1) == 0) return;

                    event.preventDefault();
                    if (
                        x > 0 &&
                        y > 0 &&
                        x < target.width - 1 &&
                        y < target.height - 1
                    ) {
                        for (let i = data.elements.length - 1; i >= 0; --i) {
                            // go backwards as the last most elements render on top
                            const dimensions = data.elements[i].dimensions;
                            // NOTE: As above noted, we're working here with gui screen space, and thus have to subtract 1 from x and y
                            if (
                                dimensions.x <= x - 1 &&
                                dimensions.y <= y - 1 &&
                                dimensions.x + dimensions.width > x - 1 &&
                                dimensions.y + dimensions.height > y - 1
                            ) {
                                // calculate the mouse offset
                                // this is done by taking the element x and y coordinate and subtracting the mouse position.
                                // if we add the mouse position to this, we will get the new x and y for the element!
                                // why this works: offset = x - mouseX; (later) x = offset + mouseX;, meaning: x = x - mouseX + mouseX; We know (- mouseX + mouseX) is equal to zero, so we can "leave it out".
                                // mouseX changes tho, so this is giving the difference between the 2 positions + the original element positions.

                                // Example: element is at (3, 3) and mouse at (5, 5), so this returns (-2, -2). If we move the mouse to (7, 7) now (+2, +2), then the new element position is (7 - 2, 7 - 2), so (5, 5), which perfectly aligns with the original position (3, 3) and the mouse delta (+2, +2): (3 + 2, 3 + 2) = (5, 5)
                                return setSelected({
                                    offset: [
                                        dimensions.x - (x - 1),
                                        dimensions.y - (y - 1),
                                    ],
                                    index: i,
                                });
                            }
                        }
                        return setSelected({
                            offset: undefined /* this is the background element, it has to always be at 0,0 */,
                            index: -1,
                        });
                    } else {
                        return setSelected(undefined);
                    }
                }}
                onMouseUp={() => setSelected(selectedRemoveOffset)}
                onContextMenu={(event) => {
                    if (isModalOpen()) return event.preventDefault();
                    const target = event.target;
                    // should always be true
                    if (!(target instanceof HTMLCanvasElement)) return;

                    // event.clientX/Y: the position of the cursor relative to the window
                    // event.target.offsetLeft/offsetTop: The width/height from the top left of the screen
                    // clientWidth/height: The size of the canvas element
                    // event.width/height: The width/height of the canvas
                    // if we divide the width/height by the clientWidth/clientHeight, we will have the multiplier by which we need to multiply the mouse position relative to the top left of the canvas (clientX/Y - target.offsetLeft/Top).
                    // Example: the canvas is 10x10, but the clientWidth/height is 20x20, we get 0.5 (10 / 20). And a mouse position of 20, 20 multiplied by 0.5, 0.5 is 10, 10, so the actual position on the canvas we're on.
                    // NOTE: As noted above, the "gui space" actually starts at 1, 1, so we also have to subtract 1
                    const x = Math.floor(
                        ((event.clientX - target.offsetLeft) * target.width) /
                            target.clientWidth
                    );
                    const y = Math.floor(
                        ((event.clientY - target.offsetTop) * target.height) /
                            target.clientHeight
                    );

                    if (
                        x <= 0 ||
                        y <= 0 ||
                        x > target.width ||
                        y > target.height
                    )
                        return;

                    event.preventDefault();
                    openModal({
                        title: 'Select Element',
                        children: ElementPreviewModal,
                        data: { x, y },
                    });
                }}
            ></canvas>
            {
                undefined /* this is the right section, here you should be able to configure the custom name of an element, its position and size and the config it supplies */
            }
            <div className='section-right'>
                {selected && (
                    <>
                        <h3 className='section-heading'>
                            {selected.index >= 0
                                ? data.elements[selected.index].name.length > 0
                                    ? data.elements[selected.index].name
                                    : `Element #${selected.index}`
                                : 'GUI'}
                        </h3>
                        <ElementControls
                            refs={refs}
                            data={data}
                            setData={setData}
                            selected={selected.index}
                        />
                    </>
                )}
            </div>
            <div className='bottom-bar'>
                <button className='icon-button save' title='Save File' onClick={save.bind(globalThis, data)}>
                    <IconSave />
                </button>
                <button
                    className='icon-button load'
                    title='Load File'
                    onClick={openLoadFileModal}
                >
                    <IconLoad />
                </button>
                <button
                    className='icon-button create'
                    title='Create a new GUI'
                    onClick={openCreateModal}
                >
                    <IconPlus />
                </button>
                <button
                    className='icon-button keybinds'
                    title='Create a new GUI'
                    onClick={openKeybindsModal}
                >
                    <IconKeybinds />
                </button>
            </div>
        </div>
    );
}

function ElementControls({
    refs,
    data,
    setData,
    selected,
}: {
    refs: Refs;
    data: GuiData;
    selected: number;
    setData: (value: StateUpdater<GuiData>) => void;
}): VNode<any> {
    function updateValue(
        type: 'x' | 'y' | 'width' | 'height',
        element: HTMLInputElement
    ) {
        const el = selected >= 0 ? data.elements[selected] : data.baseElement;
        let number = Number(element.value);
        if (isNaN(number)) {
            element.value = el.dimensions[type] + '';
            return;
        }

        el.dimensions[type] = number;
        validateDimensions(data, selected);
        element.value = el.dimensions[type] + '';
        updateRefs(data, selected, refs);

        setData(data);
    }
    const el = selected >= 0 ? data.elements[selected] : data.baseElement;

    const element = getElement(el.id);

    if (!element) {
        // something went very wrong
        return <></>;
    }

    const configs = try_fn(element.getConfigs);
    const lazyDefault = new LazyValue(element.default);

    return (
        <>
            {selected >= 0 ? (
                <>
                    <Input
                        key='element-name'
                        id='element-name'
                        label='Name'
                        type='string'
                        value={el.name}
                        onSubmit={(element) => {
                            el.name = element.value;
                            rerender();
                        }}
                    />
                    <Input
                        key='element-position-x'
                        id='element-position-x'
                        innerRef={refs.inputXRef}
                        label='X Position'
                        type='number'
                        value={el.dimensions.x}
                        onSubmit={updateValue.bind(globalThis, 'x')}
                    />
                    <Input
                        key='element-position-y'
                        id='element-position-y'
                        innerRef={refs.inputYRef}
                        label='Y Position'
                        type='number'
                        value={el.dimensions.y}
                        onSubmit={updateValue.bind(globalThis, 'y')}
                    />
                    <Input
                        key='element-position-width'
                        id='element-position-width'
                        label='Width'
                        type='number'
                        value={el.dimensions.width}
                        onSubmit={updateValue.bind(globalThis, 'width')}
                        innerRef={refs.inputWidthRef}
                    />
                    <Input
                        key='element-position-height'
                        id='element-position-height'
                        label='Height'
                        type='number'
                        value={el.dimensions.height}
                        onSubmit={updateValue.bind(globalThis, 'height')}
                        innerRef={refs.inputHeightRef}
                    />
                </>
            ) : (
                <>
                    <Input
                        key='element-name'
                        id='element-name'
                        label='Name'
                        type='string'
                        value={el.name}
                        onSubmit={(element) => {
                            el.name = element.value;
                            rerender();
                        }}
                    />
                    <Dropdown
                        key='base-element-id'
                        id='base-element-id'
                        label='Base Element'
                        possibleValues={Object.keys(getRegisteredElements())}
                        value={data.baseElement.id}
                        onChange={(el) => {
                            if (!getElement(el.value)) return;
                            const width = data.baseElement.dimensions.width;
                            const height = data.baseElement.dimensions.height;
                            const name = data.baseElement.name;
                            const newBaseElement = newCanvasElement(
                                el.value,
                                '',
                                0,
                                0
                            );
                            if (!newBaseElement)
                                return (el.value = data.baseElement.id);
                            newBaseElement.dimensions.width = width;
                            newBaseElement.dimensions.height = height;
                            newBaseElement.name = name;
                            data.baseElement = newBaseElement;
                            validateDimensions(data, -1);
                            updateRefs(data, -1, refs);
                            rerender();
                        }}
                    />
                    <Input
                        key='base-element-position-width'
                        id='base-element-position-width'
                        label='Width'
                        type='number'
                        value={el.dimensions.width}
                        onSubmit={updateValue.bind(globalThis, 'width')}
                        innerRef={refs.inputWidthRef}
                    />
                    <Input
                        key='base-element-position-height'
                        id='base-element-position-height'
                        label='Height'
                        type='number'
                        value={el.dimensions.height}
                        onSubmit={updateValue.bind(globalThis, 'height')}
                        innerRef={refs.inputHeightRef}
                    />
                </>
            )}
            {typeof configs == 'object'
                ? Object.entries(configs).map(([k, v]) => {
                      const name =
                          '' + (typeof v.label == 'string' ? v.label : k);
                      if (
                          v.type == 'string_input' ||
                          v.type == 'bound_number_input' ||
                          v.type == 'unbound_number_input'
                      ) {
                          if (
                              (typeof el.data[k] != 'string' &&
                                  v.type == 'string_input') ||
                              (typeof el.data[k] != 'number' &&
                                  v.type != 'string_input')
                          ) {
                              let value = lazyDefault.value?.configuration?.[k];
                              if (
                                  (typeof value != 'string' &&
                                      v.type == 'string_input') ||
                                  (typeof value != 'number' &&
                                      v.type != 'string_input')
                              ) {
                                  el.data[k] = value;
                              } else {
                                  return <></>;
                              }
                          }
                          let value = el.data[k] as string | number;
                          return (
                              <Input
                                  key={k}
                                  label={name}
                                  id={k}
                                  type={
                                      v.type == 'string_input'
                                          ? 'string'
                                          : 'number'
                                  }
                                  value={value}
                                  min={
                                      v.type == 'bound_number_input'
                                          ? v.min
                                          : undefined
                                  }
                                  max={
                                      v.type == 'bound_number_input'
                                          ? v.max
                                          : undefined
                                  }
                                  onSubmit={function (input_element) {
                                      let number_value: number = Number(
                                          input_element.value
                                      );
                                      if (
                                          v.type != 'string_input' &&
                                          typeof number_value == 'number' &&
                                          isNaN(number_value)
                                      ) {
                                          input_element.value = el.data[k] + '';
                                          if (refs.canvasRef.current)
                                              render(
                                                  refs.canvasRef.current,
                                                  data,
                                                  selected
                                              );
                                          return;
                                      }
                                      if (v.type == 'bound_number_input') {
                                          if (number_value < v.min)
                                              number_value = v.min;
                                          if (number_value > v.max)
                                              number_value = v.max;
                                      }
                                      el.data[k] =
                                          v.type == 'string_input'
                                              ? input_element.value
                                              : number_value;
                                      input_element.value = el.data[k] + '';

                                      if (refs.canvasRef.current)
                                          render(
                                              refs.canvasRef.current,
                                              data,
                                              selected
                                          );
                                  }}
                              />
                          );
                      } else if (v.type == 'dropdown' || v.type == 'radio') {
                          if (typeof el.data[k] != 'string') {
                              let value = lazyDefault.value?.configuration?.[k];
                              if (typeof value == 'string') el.data[k] = value;
                              else return <></>;
                          }
                          const values = v.values;
                          function onChange(
                              element: HTMLSelectElement | HTMLDivElement,
                              newValue: string
                          ) {
                              if (values.indexOf(newValue) < 0) {
                                  let newIndex = values.indexOf(
                                      el.data[k] as string
                                  );
                                  if (newIndex < 0) newIndex = 0;
                                  const selection = values[newIndex];
                                  el.data[k] =
                                      typeof selection == 'object'
                                          ? selection.id
                                          : selection;
                                  if (element instanceof HTMLSelectElement) {
                                      element.selectedIndex = newIndex;
                                  } else {
                                      if (element.children.length < newIndex) {
                                          const div_with_radio =
                                              element.children[newIndex];
                                          if (
                                              div_with_radio.children.length ==
                                              2
                                          ) {
                                              const radio =
                                                  div_with_radio.children[0];
                                              if (
                                                  radio instanceof
                                                  HTMLInputElement
                                              )
                                                  radio.checked = true;
                                          }
                                      }
                                  }
                              } else {
                                  el.data[k] = newValue;
                              }

                              if (refs.canvasRef.current)
                                  render(
                                      refs.canvasRef.current,
                                      data,
                                      selected
                                  );
                          }
                          if (v.type == 'dropdown')
                              return (
                                  <Dropdown
                                      id={k}
                                      label={name}
                                      possibleValues={v.values}
                                      value={el.data[k] as string}
                                      key={k}
                                      onChange={onChange}
                                  />
                              );

                          return (
                              <RadioSelection
                                  id={k}
                                  label={name}
                                  possibleValues={v.values}
                                  value={el.data[k] as string}
                                  key={k}
                                  onChange={onChange}
                              />
                          );
                      } else if (v.type == 'file_input') {
                          if (
                              typeof el.data[k] != 'object' &&
                              typeof el.data[k] != 'undefined'
                          )
                              el.data[k] = undefined;
                          let value = el.data[k] as DiskFile;
                          return (
                              <FileInput
                                  id={k}
                                  label={name}
                                  value={value ? value.path : undefined}
                                  onChange={function (file) {
                                      el.data[k] = file;
                                      setData(data);
                                      if (refs.canvasRef.current)
                                          render(
                                              refs.canvasRef.current,
                                              data,
                                              selected
                                          );
                                  }}
                              />
                          );
                      }
                  })
                : undefined}
        </>
    );
}

// removes the offset of the selected index, used by onMouseUp
function selectedRemoveOffset(value: SelectedState): SelectedState {
    if (value) value.offset = undefined;
    return value;
}
