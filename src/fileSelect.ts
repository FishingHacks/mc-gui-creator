import { invoke } from '@tauri-apps/api';
import { listen } from '@tauri-apps/api/event';
import { DiskFile } from './elements';

export function selectFile(): Promise<DiskFile> {
    return new Promise(async function (res) {
        try {
            let unlisten = await listen('file_selected', function (ev) {
                unlisten();

                if (ev.payload == undefined || !Array.isArray(ev.payload))
                    return res(undefined);
                const [path, url] = ev.payload as [string, string];

                loadImageData(url).then((data) =>
                    res(data ? { path, data } : undefined)
                );
            });
            await invoke('open_file');
        } catch {
            res(undefined);
        }
    });
}

async function loadImageData(url: string): Promise<ImageData | undefined> {
    const image = document.createElement('img');
    image.src = url;
    document.body.append(image);

    try {
        await new Promise((res, rej) => {
            if (image.complete) res(undefined);
            image.addEventListener('load', res);
            image.addEventListener('error', rej);
        });
    } catch {
        return;
    }

    image.remove();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.style.imageRendering = 'pixelated';
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
}
