import { createElement, Rect } from '.';
import { emptyInventoryElement, slotElement } from './defaultElements';

const NormalInventoryElement = createElement({
    defaultSize: [176, 166],
    config: {},
    defaultValue: {},
    validateDimensions: [8, 8],
    render(render, dimensions) {
        emptyInventoryElement.render(render, dimensions, {});

        const slotDimensions: Rect = { height: 18, width: 18, x: 0, y: 0 };

        for (let x = 0; x < 9; ++x)
            for (let y = 0; y < 4; ++y) {
                slotDimensions.x = 7 + x * 18;
                slotDimensions.y =
                    dimensions.height - (25 + y * 18 + (y > 0 ? 4 : 0)); // +4 to add the offset between the hotbar row of slots and the inventory
                slotElement.render(render, slotDimensions, {
                    background_file: undefined,
                });
            }
    },
});

export default NormalInventoryElement;
