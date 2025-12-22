import React from 'react';

/**
 * Props for EventTypeIcon component.
 */
interface EventTypeIconProps {
    type: 'Normal' | 'Warning' | 'Error';
}

/**
 * EventTypeIcon component.
 * Returns appropriate codicon based on event type with theme-aware colors.
 */
export const EventTypeIcon: React.FC<EventTypeIconProps> = ({ type }) => {
    const getEventTypeIcon = (eventType: string): string => {
        switch (eventType) {
            case 'Normal':
                return 'codicon-check';
            case 'Warning':
                return 'codicon-warning';
            case 'Error':
                return 'codicon-error';
            default:
                return 'codicon-circle-filled';
        }
    };

    const getEventTypeColor = (eventType: string): string => {
        switch (eventType) {
            case 'Normal':
                return 'var(--vscode-testing-iconPassed)';
            case 'Warning':
                return 'var(--vscode-testing-iconQueued)';
            case 'Error':
                return 'var(--vscode-testing-iconFailed)';
            default:
                return 'var(--vscode-foreground)';
        }
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '14px',
        color: getEventTypeColor(type)
    };

    return (
        <span className={getEventTypeIcon(type)} style={iconStyle}></span>
    );
};

