import type { JSX, VNode } from 'preact';
import { DiskFile } from '../elements';
import { selectFile } from '../fileSelect';
import { try_fn } from '../utils';
import { rerender } from '../App';

export interface FileInputProperties {
    value?: string | undefined;
    label: string;
    id: string;
    onChange?(file: DiskFile): void;
}

export function FileInput({
    id,
    label,
    value,
    onChange,
}: FileInputProperties): VNode<any> {
    return (
        <div className='input-element'>
            <label htmlFor={id}>{label}</label>
            <div className='file-div'>
                <button
                    className='file-input'
                    onClick={fileSelectClick.bind(globalThis, onChange)}
                >
                    {typeof value == 'string'
                        ? getFilename(value)
                        : 'Select File'}
                </button>
                <button
                    className='file-input-x'
                    onClick={fileUnselectClick.bind(globalThis, onChange)}
                >
                    x
                </button>
            </div>
        </div>
    );
}

function getFilename(value: string): string {
    return value.substring(value.lastIndexOf('/') + 1);
}

async function fileSelectClick(
    onChange: FileInputProperties['onChange'],
    ev: JSX.TargetedMouseEvent<HTMLButtonElement>
) {
    const target = ev.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const file = await selectFile();
    target.blur();
    
    if (!file) return;
    try_fn(onChange, file);

    rerender();
}

function fileUnselectClick(
    onChange: FileInputProperties['onChange'],
    ev: JSX.TargetedMouseEvent<HTMLButtonElement>
) {
    const target = ev.target;
    if (!(target instanceof HTMLButtonElement)) return;

    target.blur();
    
    try_fn(onChange, undefined);

    rerender();
}
