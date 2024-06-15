import { createElement } from '.';
import { putImageDataBlend } from '../utils';

const SLOT_MINECRAFT_GRAY = '#8b8b8b';
const SLOT_MINECRAFT_DARKGRAY = '#373737';
const SLOT_MINECRAFT_WHITE = '#ffffff';

const SlotElement = createElement({
    validateDimensions: [2, 2],
    defaultSize: [18, 18],
    config: {
        background_file: {
            type: 'file_input',
            label: 'Background Image',
        },
    },
    defaultValue: {
        background_file: undefined,
    },
    render(render, dimensions, data) {
        const { x, y, width, height } = dimensions;

        render.fillStyle = SLOT_MINECRAFT_DARKGRAY;
        // left border of the slot
        // we only draw height - 1 because there's a 1x1 corner in the bottom left (see bottom left corner below)
        render.fillRect(x, y, 1, height - 1);
        // top border of the slot
        // we only draw width - 1 because there's a 1x1 corner in the top right (see top right corner)
        render.fillRect(x, y, width - 1, 1);

        render.fillStyle = SLOT_MINECRAFT_GRAY;
        // top right corner
        render.fillRect(x + width - 1, y, 1, 1);
        // bottom left corner
        render.fillRect(x, y + height - 1, 1, 1);
        // center
        render.fillRect(x + 1, y + 1, width - 2, height - 2);

        render.fillStyle = SLOT_MINECRAFT_WHITE;
        // bottom border
        // we draw width - 1 and from x + 1 because on the bottom left there's a 1x1 corner (see bottom left corner above)
        render.fillRect(x + 1, y + height - 1, width - 1, 1);
        // right border
        // we draw height - 1 and from y + 1 because on the top left there's a 1x1 corner
        render.fillRect(x + width - 1, y + 1, 1, height - 1);

        if (data.background_file) {
            const img = data.background_file.data;

            if (width - 2 < img.width || height - 2 < img.height) return; // only render if the image fits into the slot, -2 on each side for the 1x1 border
            let offsetLeft = Math.floor((width - img.width) / 2);
            let offsetTop = Math.floor((height - img.height) / 2);
            putImageDataBlend(render, img, offsetLeft + x, offsetTop + y, true);
        }
    },
});

export default SlotElement;
