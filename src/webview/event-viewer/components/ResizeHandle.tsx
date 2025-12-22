import React, { useState, useEffect } from 'react';

/**
 * Props for ResizeHandle component.
 */
interface ResizeHandleProps {
    orientation: 'horizontal' | 'vertical';
    onResize: (delta: number) => void;
}

/**
 * ResizeHandle component.
 * Provides drag functionality for resizing panes.
 * Supports both horizontal (height) and vertical (width) orientations.
 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({ orientation, onResize }) => {
    const [dragging, setDragging] = useState(false);
    const [startPos, setStartPos] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartPos(orientation === 'horizontal' ? e.clientY : e.clientX);
    };

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = orientation === 'horizontal' ? e.clientY : e.clientX;
            const delta = currentPos - startPos;
            onResize(delta);
            setStartPos(currentPos);
        };

        const handleMouseUp = () => {
            setDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, startPos, orientation, onResize]);

    const cursorStyle = orientation === 'horizontal' ? 'ns-resize' : 'ew-resize';
    
    return (
        <div
            className={`resize-handle ${orientation}`}
            style={{
                cursor: cursorStyle,
                width: orientation === 'vertical' ? '4px' : '100%',
                height: orientation === 'horizontal' ? '4px' : '100%',
                backgroundColor: 'var(--vscode-panel-border)',
                flexShrink: 0
            }}
            onMouseDown={handleMouseDown}
        />
    );
};

