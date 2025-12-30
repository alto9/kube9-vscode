import React from 'react';

/**
 * Props for Footer component.
 */
interface FooterProps {
    /** Total number of log lines displayed */
    lineCount: number;
    /** Current streaming status */
    streamStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * Footer component for Pod Logs Viewer.
 * Displays line count and streaming status at the bottom of the interface.
 */
export const Footer: React.FC<FooterProps> = ({ lineCount, streamStatus }) => {
    const statusIcon = {
        connected: '●',
        disconnected: '⏸',
        error: '⚠'
    }[streamStatus];

    const statusText = {
        connected: 'Streaming',
        disconnected: 'Paused',
        error: 'Error'
    }[streamStatus];

    const statusClass = `status-${streamStatus}`;

    return (
        <div className="footer">
            <span className="line-count">{lineCount.toLocaleString()} lines</span>
            <span className={`stream-status ${statusClass}`}>
                {statusIcon} {statusText}
            </span>
        </div>
    );
};

