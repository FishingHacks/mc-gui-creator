import type { VNode } from 'preact';
import type { Ref } from 'preact/hooks';

export interface InputProperties {
    innerRef?: Ref<HTMLInputElement>;
    type: 'string' | 'number';
    value: string | number;
    label: string;
    id: string;
    onSubmit?(element: HTMLInputElement): void;
    min?: number;
    max?: number;
}

export function Input({
    innerRef,
    type,
    value,
    label,
    id,
    onSubmit,
    min,
    max,
}: InputProperties): VNode<any> | null {
    return (
        <>
            <div className='input-element'>
                <label htmlFor={id}>{label}</label>
                <input
                    ref={innerRef}
                    value={value + ''}
                    type={type}
                    onSubmit={submitHandler}
                    onKeyDown={keyDownHandler}
                    onBlur={
                        onSubmit
                            ? (ev) => {
                                  if (ev.target instanceof HTMLInputElement) {
                                      onSubmit(ev.target);
                                  }
                              }
                            : undefined
                    }
                    min={type == 'number' ? min : undefined}
                    max={type == 'number' ? max : undefined}
                    id={id}
                    name={id}
                />
            </div>
        </>
    );
}

function keyDownHandler(ev: {
    target: any;
    key: string;
    preventDefault(): void;
}) {
    if (ev.key != 'Enter') return;
    ev.preventDefault();
    if (ev.target instanceof HTMLElement) ev.target.blur();
}

function submitHandler(ev: { target: any }) {
    if (ev.target instanceof HTMLElement) ev.target.blur();
}
