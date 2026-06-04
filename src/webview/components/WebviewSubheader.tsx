import React from 'react';
import type { WebviewHeaderAction } from './webviewHeaderTypes';

export type { WebviewHeaderAction } from './webviewHeaderTypes';

/**
 * Secondary control row rendered directly under {@link WebviewHeader}.
 * Use for page-level tools (export, search, hard refresh, view in tree)—not primary title/actions.
 * Events (#195) and Argo CD (#196) adopt this component; avoid one-off sub-header markup.
 */
export interface WebviewSubheaderProps {
    /** Custom controls (e.g. search field) on the leading side of the row. */
    children?: React.ReactNode;
    /** Action buttons using the same chrome as {@link WebviewHeader} primary buttons. */
    actions?: WebviewHeaderAction[];
    className?: string;
}

function codiconClass(icon: string): string {
    return icon.startsWith('codicon-') ? icon : `codicon-${icon}`;
}

function WebviewSubheaderActionButton({ action }: { action: WebviewHeaderAction }): React.JSX.Element {
    return (
        <button
            type="button"
            className="webview-header-action-btn"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-disabled={action.disabled ? true : undefined}
            aria-busy={action.busy ? true : undefined}
            aria-label={action.label}
        >
            {action.icon && (
                <span className={`codicon ${codiconClass(action.icon)}`} aria-hidden="true" />
            )}
            <span className="webview-header-action-label">{action.label}</span>
        </button>
    );
}

export const WebviewSubheader: React.FC<WebviewSubheaderProps> = ({ children, actions, className }) => {
    const hasChildren = children !== undefined && children !== null;
    const hasActions = actions !== undefined && actions.length > 0;

    if (!hasChildren && !hasActions) {
        return null;
    }

    return (
        <div className={['webview-subheader', className].filter(Boolean).join(' ')}>
            {hasChildren ? <div className="webview-subheader-content">{children}</div> : null}
            {hasActions ? (
                <div className="webview-subheader-actions">
                    {actions.map((action, index) => (
                        <WebviewSubheaderActionButton
                            key={`subheader-${action.label}-${index}`}
                            action={action}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
};
