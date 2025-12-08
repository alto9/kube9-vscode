import React from 'react';

interface OutOfSyncSummaryProps {
    count: number;
}

/**
 * Warning banner component displaying count of out-of-sync resources.
 */
export function OutOfSyncSummary({ count }: OutOfSyncSummaryProps): React.JSX.Element {
    if (count === 0) {
        return <></>;
    }

    const bannerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        backgroundColor: 'var(--vscode-testing-iconQueued)',
        color: 'var(--vscode-foreground)',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500
    };

    return (
        <div style={bannerStyle}>
            <span className="codicon codicon-warning" style={{ fontSize: '16px' }}></span>
            <span>{count} resource{count !== 1 ? 's' : ''} out of sync</span>
        </div>
    );
}

