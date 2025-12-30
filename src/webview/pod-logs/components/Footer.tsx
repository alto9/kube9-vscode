import React from 'react';

/**
 * Props for Footer component.
 */
interface FooterProps {
    /** Total number of log lines displayed */
    lineCount: number;
    /** Current streaming status */
    streamStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
    /** Whether reconnection is in progress */
    reconnecting?: boolean;
}

/**
 * Footer component for Pod Logs Viewer.
 * Displays line count and streaming status at the bottom of the interface.
 */
export const Footer: React.FC<FooterProps> = ({ lineCount, streamStatus, reconnecting = false }) => {
    // Determine status display based on reconnecting flag or streamStatus
    const displayStatus = reconnecting || streamStatus === 'reconnecting' ? 'reconnecting' : streamStatus;
    
    const statusIcon = {
        connected: '●',
        disconnected: '⏸',
        reconnecting: '⟳',
        error: '⚠'
    }[displayStatus];

    const statusText = {
        connected: 'Streaming',
        disconnected: 'Paused',
        reconnecting: 'Reconnecting...',
        error: 'Error'
    }[displayStatus];

    const statusClass = `status-${displayStatus}`;

    return (
        <div className="footer">
            <span className="line-count">{lineCount.toLocaleString()} lines</span>
            <span className={`stream-status ${statusClass}`}>
                {statusIcon} {statusText}
            </span>
        </div>
    );
};

