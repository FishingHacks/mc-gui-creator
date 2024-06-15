import type { ComponentType } from 'preact';
import { createContext, PropsWithChildren, useReducer } from 'preact/compat';
import { try_fn } from '../utils';
import { Button, ButtonColor } from './Button';
import { IconX } from './icons';

function ModalElement({
    id,
    children: Child,
    title: name,
    width,
    height,
    data,
}: ModalElementProps<Omit<ModalProps<object>, 'onClose'>>) {
    return (
        <div className='modal' style={{ '--width': width, '--height': height }}>
            <div className='modal-head'>
                <h3>{name}</h3>
                <button className='icon-button modal-x' type='button' onClick={closeModal.bind(globalThis, id, true)}>
                    <IconX />
                </button>
            </div>
            <div className='modal-body'>
                <Child {...data} id={id} />
            </div>
        </div>
    );
}

function ConfirmModalChild(
    props: ModalElementProps<Omit<ConfirmModalProps<object>, 'onClose'>>
) {
    return (
        <>
            <props.children id={props.id} />
            <div className='confirm-modal-button-row'>
                <Button
                    color={props.confirmColor || 'blue'}
                    onClick={handleConfirm.bind(
                        globalThis,
                        props.id,
                        props.onConfirm,
                        props.closeOnConfirm ? props.closeOnConfirm : true
                    )}
                >
                    {props.labels?.confirm || 'Confirm'}
                </Button>
                <Button
                    color={props.cancelColor || 'red'}
                    onClick={handleCancel.bind(
                        globalThis,
                        props.id,
                        props.onCancel,
                        props.closeOnCancel ? props.closeOnCancel : true
                    )}
                >
                    {props.labels?.cancel || 'Cancel'}
                </Button>
            </div>
        </>
    );
}

export function ConfirmModalElement(
    props: Omit<ConfirmModalProps<object>, 'onClose'> & { id: string }
) {
    return (
        <ModalElement
            title={props.title}
            id={props.id}
            height={props.height}
            width={props.width ?? '30em'}
            children={ConfirmModalChild as any}
            data={props}
        />
    );
}

interface ModalContextValue {
    modals: Modal<object>[];
    dispatch(action: ModalAction): void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export type ModalElementProps<T> = T & { id: string };

export interface ModalProps<T> {
    title: string;
    children: ComponentType<ModalElementProps<T>>;
    onClose?(): void;
    width?: string;
    height?: string;
    data: T;
}

export interface ConfirmModalProps<T> extends ModalProps<T> {
    labels?: { confirm?: string; cancel?: string };
    closeOnConfirm?: boolean;
    closeOnCancel?: boolean;
    onConfirm?(): void;
    onCancel?(): void;
    confirmColor?: ButtonColor;
    cancelColor?: ButtonColor;
}

export type Modal<T> =
    | {
          type: 'custom';
          id: string;
          props: ModalProps<T>;
      }
    | {
          id: string;
          type: 'confirm';
          props: ConfirmModalProps<T>;
      };

export type ModalAction =
    | ModalOpenAction<object>
    | ModalCloseAction
    | ModalCloseAllAction;

export interface ModalOpenAction<T> {
    type: 'open';
    modal: Modal<T>;
}
export interface ModalCloseAction {
    type: 'close';
    id: string;
    canceled?: boolean;
}
export interface ModalCloseAllAction {
    type: 'closeAll';
    canceled?: boolean;
}

function handleCloseModal(modal: Modal<object>, canceled?: boolean) {
    if (canceled && modal.type == 'confirm') try_fn(modal.props.onCancel);
    try_fn(modal.props.onClose);
}

function modalReducer(
    state: Modal<object>[],
    action: ModalAction
): Modal<object>[] {
    if (action.type == 'open') {
        return [...state, action.modal];
    } else if (action.type == 'close') {
        if (state.findIndex((el) => el.id === action.id) < 0) return state;
        for (let i = state.length - 1; i >= 0; --i)
            if (state[i].id === action.id) handleCloseModal(state[i]);
        return state.filter((el) => el.id !== action.id);
    } else if (action.type == 'closeAll') {
        if (state.length < 1) return state;
        for (let i = state.length - 1; i >= 0; --i) handleCloseModal(state[i]);
        return [];
    }
    return state;
}

export function ModalProvider({ children }: PropsWithChildren) {
    const [modals, dispatch] = useReducer(modalReducer, []);

    ctx.openModal = function openModal<T>(props: ModalProps<T>) {
        const id = crypto.randomUUID();
        dispatch({
            modal: {
                type: 'custom',
                id,
                props: props as any,
            },
            type: 'open',
        });
        return id;
    };
    ctx.openConfirmModal = function openConfirmModal<T>(
        props: ConfirmModalProps<T>
    ): string {
        const id = crypto.randomUUID();
        dispatch({
            modal: {
                type: 'confirm',
                id,
                props: props as any,
            },
            type: 'open',
        });
        return id;
    };

    ctx.closeModal = function closeModal(id: string, canceled?: boolean) {
        dispatch({ type: 'close', id, canceled });
    };

    ctx.closeAllModals = function closeAllModals(canceled?: boolean) {
        dispatch({ type: 'closeAll', canceled });
    };

    ctx.modals = modals;

    const currentModal = modals[modals.length - 1];

    return (
        <ModalContext.Provider value={{ dispatch, modals }}>
            {typeof currentModal == 'object' ? (
                <div
                    className='modal-bg'
                    onContextMenu={preventEventModalBg}
                    onClick={(ev) => {
                        if (
                            ev.target instanceof HTMLElement &&
                            ev.target.classList.contains('modal-bg')
                        ) {
                            ev.preventDefault();
                            dispatch({
                                type: 'close',
                                canceled: true,
                                id: currentModal.id,
                            });
                        }
                    }}
                    onMouseDown={preventEventModalBg}
                >
                    <div className='modal-container'>
                        {currentModal.type == 'custom' ? (
                            <ModalElement
                                key={currentModal.id}
                                id={currentModal.id}
                                {...currentModal.props}
                            />
                        ) : (
                            <ConfirmModalElement
                                key={currentModal.id}
                                id={currentModal.id}
                                {...currentModal.props}
                            />
                        )}
                    </div>
                </div>
            ) : undefined}
            {children}
        </ModalContext.Provider>
    );
}

function preventEventModalBg(ev: {
    preventDefault(): any;
    target: EventTarget | null;
}) {
    if (
        ev.target instanceof HTMLElement &&
        ev.target.classList.contains('modal-bg')
    )
        ev.preventDefault();
}

let ctx: {
    openModal?<T>(props: ModalProps<T>): string;
    openConfirmModal?<T>(props: ConfirmModalProps<T>): string;
    closeModal?(id: string, canceled?: boolean): void;
    closeAllModals?(canceled?: boolean): void;
    modals?: Modal<object>[];
} = {};

export function openModal<T>(props: ModalProps<T>): string {
    return ctx.openModal?.(props) ?? '';
}
export function openConfirmModal<T>(props: ConfirmModalProps<T>): string {
    return ctx.openConfirmModal?.(props) ?? '';
}
export function closeModal(id: string, canceled?: boolean): void {
    ctx.closeModal?.(id, canceled);
}
export function closeAllModals(canceled?: boolean): void {
    ctx.closeAllModals?.(canceled);
}
export function getModals(): Modal<object>[] {
    return ctx.modals ?? [];
}
export function isModalOpen(): boolean {
    return typeof ctx.modals == 'object' ? ctx.modals.length > 0 : false;
}

function handleConfirm(
    id: string,
    onConfirm?: () => void,
    shouldClose?: boolean
) {
    try_fn(onConfirm);
    if (shouldClose) closeModal(id);
}

function handleCancel(
    id: string,
    onCancel?: () => void,
    shouldClose?: boolean
) {
    try_fn(onCancel);
    if (shouldClose) closeModal(id);
}
