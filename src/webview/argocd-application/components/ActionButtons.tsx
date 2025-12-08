import React from 'react';

interface ActionButtonsProps {
    onSync: () => void;
    onRefresh: () => void;
    onHardRefresh: () => void;
    onViewInTree: () => void;
    syncing?: boolean;
    refreshing?: boolean;
}

/**
 * Action buttons component for sync, refresh, and navigation actions.
 */
export function ActionButtons({
    onSync,
    onRefresh,
    onHardRefresh,
    onViewInTree,
    syncing = false,
    refreshing = false
}: ActionButtonsProps): React.JSX.Element {
    const containerStyle: React.CSSProperties = {
        marginTop: '24px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        transition: 'opacity 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    const linkButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'transparent',
        color: 'var(--vscode-textLink-foreground)',
        textDecoration: 'underline',
        padding: '6px 8px'
    };

    const disabledStyle: React.CSSProperties = {
        opacity: 0.5,
        cursor: 'not-allowed'
    };

    const isDisabled = syncing || refreshing;

    return (
        <div style={containerStyle}>
            <button
                style={isDisabled ? { ...primaryButtonStyle, ...disabledStyle } : primaryButtonStyle}
                onClick={onSync}
                disabled={isDisabled}
                title="Sync application to match Git state"
            >
                {syncing ? (
                    <>
                        <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: '14px' }}></span>
                        Syncing...
                    </>
                ) : (
                    <>
                        <span className="codicon codicon-sync" style={{ fontSize: '14px' }}></span>
                        Sync
                    </>
                )}
            </button>

            <button
                style={isDisabled ? { ...secondaryButtonStyle, ...disabledStyle } : secondaryButtonStyle}
                onClick={onRefresh}
                disabled={isDisabled}
                title="Refresh application status"
            >
                {refreshing ? (
                    <>
                        <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: '14px' }}></span>
                        Refreshing...
                    </>
                ) : (
                    <>
                        <span className="codicon codicon-refresh" style={{ fontSize: '14px' }}></span>
                        Refresh
                    </>
                )}
            </button>

            <button
                style={isDisabled ? { ...secondaryButtonStyle, ...disabledStyle } : secondaryButtonStyle}
                onClick={onHardRefresh}
                disabled={isDisabled}
                title="Hard refresh (clear cache and refresh)"
            >
                <span className="codicon codicon-clear-all" style={{ fontSize: '14px' }}></span>
                Hard Refresh
            </button>

            <button
                style={linkButtonStyle}
                onClick={onViewInTree}
                disabled={isDisabled}
                title="Navigate to application in tree view"
            >
                <span className="codicon codicon-list-tree" style={{ fontSize: '14px' }}></span>
                View in Tree
            </button>
        </div>
    );
}

