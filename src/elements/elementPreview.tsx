import type { VNode } from 'preact';
import { getElementPreviewNamespaced } from '.';
import { useEffect, useRef } from 'preact/hooks';

export function ElementPreview({
    id,
    onClick,
}: {
    id: string;
    onClick?: () => void;
}): VNode<any> | null {
    const image = getElementPreviewNamespaced(id);
    if (!image) return null;
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        ref.current?.getContext('2d')?.putImageData(image, 0, 0);
    }, []);

    return (
        <button className='element-preview unstyled-button' onClick={onClick}>
            <div>
                <canvas
                    width={image.width}
                    height={image.height}
                    ref={ref}
                    className={
                        image.height > image.width
                            ? 'scale-by-height'
                            : 'scale-by-width'
                    }
                ></canvas>
                <p>{id.substring(id.indexOf(':') + 1)}</p>
            </div>
        </button>
    );
}
