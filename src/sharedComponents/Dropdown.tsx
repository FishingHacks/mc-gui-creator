import type { VNode } from 'preact';
import type { Ref } from 'preact/hooks';
import { MultiChoiceValues } from '../elements';
import { TargetedEvent } from 'preact/compat';

export interface DropdownProperties {
    innerRef?: Ref<HTMLSelectElement>;
    value: string;
    label: string;
    id: string;
    possibleValues: MultiChoiceValues[];
    onChange?(element: HTMLSelectElement, selected: string): void;
}

export function Dropdown({
    innerRef,
    value,
    label,
    id,
    possibleValues,
    onChange,
}: DropdownProperties): VNode<any> | null {
    return (
        <>
            <div className='input-element'>
                <label htmlFor={id}>{label}</label>
                <div className='select-container'>
                    <select
                        name={id}
                        id={id}
                        onChange={
                            onChange
                                ? handleOnChange.bind(globalThis, onChange)
                                : undefined
                        }
                        ref={innerRef}
                        defaultValue={value}
                    >
                        {possibleValues.map(
                            mapPossibleValues.bind(globalThis, value)
                        )}
                    </select>
                    <div className='dropdown-arrow'>
                        <svg
                            data-size='sm'
                            data-combobox-chevron='true'
                            viewBox='0 0 15 15'
                            fill='none'
                            style='--combobox-chevron-size: var(--combobox-chevron-size-sm);'
                        >
                            <path
                                d='M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z'
                                fill='currentColor'
                                fill-rule='evenodd'
                                clip-rule='evenodd'
                            ></path>
                        </svg>
                    </div>
                </div>
            </div>
        </>
    );
}

function handleOnChange(
    onChange: NonNullable<DropdownProperties['onChange']>,
    ev: TargetedEvent<HTMLSelectElement>
) {
    if (ev.target instanceof HTMLSelectElement) {
        const element = ev.target;
        if (element.selectedOptions.length < 1) return;
        const selected = element.selectedOptions[0].value;
        onChange(element, selected);
    }
}

function mapPossibleValues(
    value: string,
    current: MultiChoiceValues,
    index: number
) {
    const id = typeof current == 'object' ? current.id : current;

    if (id == value)
        return (
            <option value={id} selected key={index}>
                {typeof current == 'object' ? current.label : current}
            </option>
        );
    return (
        <option value={id} key={index}>
            {typeof current == 'object' ? current.label : current}
        </option>
    );
}
