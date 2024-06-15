import { createElement } from '.';
import { putImageDataBlend as putImageData } from '../utils';

type Colors = Record<string, [number, number, number, number]>;

function replaceAllNewLines(str: string): string {
    let new_str = '';
    for (let i = 0; i < str.length; ++i) {
        if (str[i] == '\n' || str[i] == '\r') continue;
        else new_str += str[i];
    }
    return new_str;
}

/**
 * Turns a text image representation into ImageData
 *
 * Text Representation:
 *
 * ```
 * bwb
 * bww
 * ```
 * ^= for black, white black; black, white, white
 *
 * @param text the text
 * @param width the width of the image
 * @param height the height of the image
 * @param colors the colors specified in the text (+ ' ' for invisible)
 */
function makeImageData(
    text: string,
    width: number,
    height: number,
    colors: Colors
): ImageData {
    text = replaceAllNewLines(text);
    if (width * height != text.length) {
        console.log(text, width, height, text.length, width * height);
        throw new Error('Width and height dont align with the text!');
    }
    const data = new Uint8ClampedArray(width * height * 4); // data: rgba (4 bytes) * width * height
    for (let i = 0; i < text.length; ++i) {
        const offset = i * 4;
        const color = colors[text[i]];
        if (color) {
            data[offset] = color[0];
            data[offset + 1] = color[1];
            data[offset + 2] = color[2];
            data[offset + 3] = color[3];
        } else {
            data[offset + 3] = 0; // only set the alpha channel to 0, we dont care about the other ones (tho as we are creating the data, these are supposed to be 0)
        }
    }
    return new ImageData(data, width, height);
}

const minecraftColors: Colors = {
    b: [0, 0, 0, 0xff], // the 0xff at the end is regarding the alpha channel
    w: [0xff, 0xff, 0xff, 0xff], // the 0xff at the end is regarding the alpha channel
    g: [0xc6, 0xc6, 0xc6, 0xff], // the 0xff at the end is regarding the alpha channel
    d: [0x55, 0x55, 0x55, 0xff], // the 0xff at the end is regarding the alpha channel
};
const topLeftCorner = makeImageData(
    `
  bb
 bww
bwww
bwww
`,
    4,
    4,
    minecraftColors
);
const topRightCorner = makeImageData(
    `
b   
wb  
wgb 
gddb
`,
    4,
    4,
    minecraftColors
);
const bottomLeftCorner = makeImageData(
    `
bwwg
 bgd
  bd
   b
`,
    4,
    4,
    minecraftColors
);
const bottomRightCorner = makeImageData(
    `
dddb
dddb
ddb 
bb  
`,
    4,
    4,
    minecraftColors
);

const GUI_MINECRAFT_BLACK = '#000000';
const GUI_MINECRAFT_WHITE = '#ffffff';
const GUI_MINECRAFT_GRAY = '#c6c6c6';
const GUI_MINECRAFT_DARKGRAY = '#555555';

const EmptyInventoryElement = createElement({
    defaultSize: [176, 166],
    config: {},
    defaultValue: {},
    validateDimensions: [8, 8],
    render(render, dimensions, _) {
        const { x, y, width, height } = dimensions;

        putImageData(render, topLeftCorner, x, y);
        putImageData(render, topRightCorner, x + width - 4, y);
        putImageData(render, topRightCorner, x + width - 4, y);
        putImageData(render, bottomLeftCorner, x, y + height - 4);
        putImageData(render, bottomRightCorner, x + width - 4, y + height - 4);

        const horizontalBarWidth = width - 8;
        const verticalBarHeight = height - 8;

        render.fillStyle = GUI_MINECRAFT_BLACK;
        render.fillRect(x + 4, y, horizontalBarWidth, 1); // top bar
        render.fillRect(x + 4, y + height - 1, horizontalBarWidth, 1); // bottom bar
        render.fillRect(x, y + 4, 1, verticalBarHeight); // left bar
        render.fillRect(x + width - 1, y + 4, 1, verticalBarHeight); // right bar

        render.fillStyle = GUI_MINECRAFT_WHITE;
        render.fillRect(x + 4, y + 1, horizontalBarWidth, 2); // top bar
        render.fillRect(x + 1, y + 4, 2, verticalBarHeight); // left bar

        render.fillStyle = GUI_MINECRAFT_DARKGRAY;
        render.fillRect(x + 4, y + height - 3, horizontalBarWidth, 2); // bottom bar
        render.fillRect(x + width - 3, y + 4, 2, verticalBarHeight); // right bar

        render.fillStyle = GUI_MINECRAFT_GRAY;
        render.fillRect(x + 4, y + 3, horizontalBarWidth, 1); // top bar
        render.fillRect(x + 4, y + height - 4, horizontalBarWidth, 1); // bottom bar
        render.fillRect(x + 3, y + 4, 1, verticalBarHeight); // left bar
        render.fillRect(x + width - 4, y + 4, 1, verticalBarHeight); // right bar
        render.fillRect(x + 4, y + 4, width - 8, height - 8); // center
    },
});

export default EmptyInventoryElement;
