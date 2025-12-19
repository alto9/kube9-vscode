import React from 'react';

/**
 * Props for ResizeHandle component.
 */
interface ResizeHandleProps {
    orientation: 'horizontal' | 'vertical';
    onResize: (delta: number) => void;
}

/**
 * ResizeHandle component stub.
 * Provides basic resize handle functionality for pane resizing.
 * Will be fully implemented in story 016.
 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({ orientation, onResize }) => {
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
        />
    );
};

