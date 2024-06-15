import type { VNode } from 'preact';
import type { Ref } from 'preact/hooks';
import { MultiChoiceValues } from '../elements';
import { TargetedEvent } from 'preact/compat';

export interface RadioSelectionProperties {
    innerRef?: Ref<HTMLDivElement>;
    value: string;
    label: string;
    id: string;
    possibleValues: MultiChoiceValues[];
    onChange?(element: HTMLDivElement, selected: string): void;
}

export function RadioSelection({
    innerRef,
    value,
    label,
    id,
    possibleValues,
    onChange,
}: RadioSelectionProperties): VNode<any> | null {
    return (
        <>
            <div className='input-element'>
                <label htmlFor={id}>{label}</label>
                <div ref={innerRef}>
                    {possibleValues.map(
                        mapPossibleValues.bind(globalThis, value, id, onChange)
                    )}
                </div>
            </div>
        </>
    );
}

function mapPossibleValues(
    value: string,
    selectionId: string,
    onChange: RadioSelectionProperties['onChange'],
    current: MultiChoiceValues,
    index: number
) {
    const id = typeof current == 'object' ? current.id : current;

    return (
        <div key={index}>
            <input
                type='radio'
                name={selectionId}
                id={id}
                value={id}
                checked={id == value}
                onChange={onChange ? handleChangeEvent.bind(globalThis, onChange) : undefined}
            />
            <label htmlFor={id}>
                {typeof current == 'object' ? current.label : current}
            </label>
        </div>
    );
}

function handleChangeEvent(
    onChange: NonNullable<RadioSelectionProperties['onChange']>,
    ev: TargetedEvent<HTMLInputElement>
) {
    if (ev.target instanceof HTMLInputElement) {
        const divElement = ev.target.parentElement?.parentElement;
        if (!(divElement instanceof HTMLDivElement)) return;
        if (!ev.target.value) return;
        onChange(divElement, ev.target.value);
    }
}
