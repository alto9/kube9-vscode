import React, { useState, useEffect, useRef } from 'react';

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
 * Uses throttled updates during drag to prevent performance issues.
 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({ orientation, onResize }) => {
    const [dragging, setDragging] = useState(false);
    const [startPos, setStartPos] = useState(0);
    const frameIdRef = useRef<number | null>(null);
    const lastDeltaRef = useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartPos(orientation === 'horizontal' ? e.clientY : e.clientX);
        lastDeltaRef.current = 0;
    };

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = orientation === 'horizontal' ? e.clientY : e.clientX;
            const delta = currentPos - startPos;
            
            // Cancel any pending animation frame
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
            }
            
            // Throttle updates using requestAnimationFrame
            frameIdRef.current = requestAnimationFrame(() => {
                const incrementalDelta = delta - lastDeltaRef.current;
                if (incrementalDelta !== 0) {
                    onResize(incrementalDelta);
                    lastDeltaRef.current = delta;
                }
                frameIdRef.current = null;
            });
        };

        const handleMouseUp = () => {
            // Cancel any pending animation frame
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
                frameIdRef.current = null;
            }
            setDragging(false);
            lastDeltaRef.current = 0;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            // Clean up any pending animation frame
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
                frameIdRef.current = null;
            }
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

