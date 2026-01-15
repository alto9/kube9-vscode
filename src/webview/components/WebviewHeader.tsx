import React from 'react';

/**
 * Action button definition for WebviewHeader.
 */
export interface WebviewHeaderAction {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Props for WebviewHeader component.
 */
export interface WebviewHeaderProps {
    title: string;
    actions?: WebviewHeaderAction[];
    helpContext?: string; // If provided, shows help button
}

// Get VS Code API - use shared instance if available, otherwise try to acquire
function getVSCodeAPI(): any {
    if (typeof window === 'undefined') {
        return undefined;
    }
    
    const windowWithVSCode = window as any;
    
    // Check for shared instance first (set by some webviews)
    if (windowWithVSCode.vscodeApi) {
        return windowWithVSCode.vscodeApi;
    }
    
    // Check for global vscode
    if (windowWithVSCode.vscode) {
        return windowWithVSCode.vscode;
    }
    
    // Don't try to acquire - let the parent component handle it
    // This prevents the "acquireVsCodeApi can only be called once" error
    return undefined;
}

const vscode = getVSCodeAPI();

/**
 * Standardized header component for all webviews.
 * Provides consistent title (left) and actions menu (right) with optional help button.
 */
export const WebviewHeader: React.FC<WebviewHeaderProps> = ({
    title,
    actions = [],
    helpContext
}) => {
    const handleHelpClick = () => {
        if (vscode && helpContext) {
            vscode.postMessage({
                type: 'openHelp',
                context: helpContext
            });
        }
    };

    return (
        <header className="webview-header">
            <div className="webview-header-title">
                <h1>{title}</h1>
            </div>
            <div className="webview-header-actions">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className="webview-header-action-btn"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        aria-label={action.label}
                    >
                        {action.icon && (
                            <span className={`codicon ${action.icon.startsWith('codicon-') ? action.icon : `codicon-${action.icon}`}`}></span>
                        )}
                        <span className="webview-header-action-label">{action.label}</span>
                    </button>
                ))}
                {helpContext && (
                    <button
                        className="webview-header-action-btn webview-header-help-btn"
                        onClick={handleHelpClick}
                        aria-label="Open help documentation"
                    >
                        <span className="codicon codicon-question"></span>
                        <span className="webview-header-action-label">Help</span>
                    </button>
                )}
            </div>
        </header>
    );
};
