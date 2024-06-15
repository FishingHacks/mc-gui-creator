import type { JSX, PropsWithChildren, Ref } from 'preact/compat';

export type ButtonColor = 'red' | 'blue' | 'green' | 'accent';

export interface ButtonProps {
    color?: ButtonColor;
    onClick?(ev: JSX.TargetedMouseEvent<HTMLButtonElement>): void;
    innerRef?: Ref<HTMLButtonElement>,
}

export function Button({
    color,
    children,
    onClick,
    innerRef
}: PropsWithChildren<ButtonProps>) {
    return (
        <button
            className='button'
            style={{
                '--color': color ? `var(--button-${color})` : undefined,
                '--color-hover': color
                    ? `var(--button-${color}-hover)`
                    : undefined,
            }}
            onClick={onClick}
            ref={innerRef}
            type='button'
        >
            {children}
        </button>
    );
}
