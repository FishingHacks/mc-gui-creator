import { render } from 'preact';
import App, { onDataLoadEncounteredError, onSaveEncounteredError } from './App';

import { getElement, getRegisteredElements, registerElement } from './elements';
import * as elements from './elements/defaultElements';
import { ModalProvider } from './sharedComponents/Modal';
import { listen } from '@tauri-apps/api/event';
import { onLoad, setLastLoadedLocation } from './saveLoadGui';

// api setup (TBD: Plugins: get a custom copy of the api and remove the globals)
(globalThis as any).__api = {
    registerElement,
    getElement,
    getRegisteredElements,
};

for (const [id, element] of Object.entries(elements)) {
    registerElement(id, element);
}

listen('load-success', (ev) =>
    typeof ev.payload == 'object' && ev.payload != null
        ? onLoad(ev.payload)
        : undefined
);
listen('load-error', (ev) => onDataLoadEncounteredError(ev.payload + ''));
listen('save-error', (ev) => onSaveEncounteredError(ev.payload + ''));
listen('update-last-loaded', (ev) =>
    setLastLoadedLocation(typeof ev.payload == 'string' ? ev.payload : '')
);

render(
    <ModalProvider>
        <App />
    </ModalProvider>,
    document.getElementById('root')!
);
