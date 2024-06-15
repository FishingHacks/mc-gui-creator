import { ModalElementProps } from './sharedComponents/Modal';

export function Keybinds(_: ModalElementProps<{}>) {
    return <div className='keybinds'>
        <p>Save GUI: <kbd>Ctrl</kbd> + <kbd>S</kbd></p>
        <p>Load GUI: <kbd>Ctrl</kbd> + <kbd>O</kbd></p>
        <p>Create new GUI: <kbd>Ctrl</kbd> + <kbd>N</kbd></p>
        <p>Keybinds: <kbd>Ctrl</kbd> + <kbd>H</kbd>, <kbd>Ctrl</kbd> + <kbd>/</kbd></p>
        <hr />
        <p>Delete Element: <kbd>Delete</kbd></p>
        <hr />
        <p>Move Element Left: <kbd>←</kbd></p>
        <p>Move Element Right: <kbd>→</kbd></p>
        <p>Move Element Up: <kbd>↑</kbd></p>
        <p>Move Element Down: <kbd>↓</kbd></p>
        <p>Move Element Left by 10: <kbd>Shift</kbd> + <kbd>←</kbd></p>
        <p>Move Element Right by 10: <kbd>Shift</kbd> + <kbd>→</kbd></p>
        <p>Move Element Up by 10: <kbd>Shift</kbd> + <kbd>↑</kbd></p>
        <p>Move Element Down by 10: <kbd>Shift</kbd> + <kbd>↓</kbd></p>
        <hr />
        <p>Width -1: <kbd>Alt</kbd> + <kbd>←</kbd></p>
        <p>Width +1: <kbd>Alt</kbd> + <kbd>→</kbd></p>
        <p>Height -1: <kbd>Alt</kbd> + <kbd>↓</kbd></p>
        <p>Height +1: <kbd>Alt</kbd> + <kbd>↑</kbd></p>
        <p>Width -10: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd></p>
        <p>Width +10: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>→</kbd></p>
        <p>Height -10: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>↓</kbd></p>
        <p>Height +10: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>↑</kbd></p>
    </div>;
}

// ←→↑↓