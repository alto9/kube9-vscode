import React from 'react';
import { nextOverflowMenuIndex } from './overflowMenuKeyboard';
import { partitionWebviewHeaderActions } from './partitionWebviewHeaderActions';
import type { WebviewHeaderAction } from './webviewHeaderTypes';

export type { WebviewHeaderAction } from './webviewHeaderTypes';

/**
 * Props for WebviewHeader component.
 */
export interface WebviewHeaderProps {
    title: string;
    /** Auto-partitioned: first three primary, remainder overflow. */
    actions?: WebviewHeaderAction[];
    /** Explicit primary buttons (max three); use with `overflowActions`. */
    primaryActions?: WebviewHeaderAction[];
    /** Explicit overflow menu items. */
    overflowActions?: WebviewHeaderAction[];
    helpContext?: string; // If provided, shows help button
    className?: string;
}

// Get VS Code API - use shared instance if available, otherwise try to acquire
function getVSCodeAPI(): any {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const windowWithVSCode = window as any;

    if (windowWithVSCode.vscodeApi) {
        return windowWithVSCode.vscodeApi;
    }

    if (windowWithVSCode.vscode) {
        return windowWithVSCode.vscode;
    }

    return undefined;
}

function codiconClass(icon: string): string {
    return icon.startsWith('codicon-') ? icon : `codicon-${icon}`;
}

function WebviewHeaderActionButton({
    action,
    className
}: {
    action: WebviewHeaderAction;
    className?: string;
}): React.JSX.Element {
    return (
        <button
            type="button"
            className={['webview-header-action-btn', className].filter(Boolean).join(' ')}
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

function WebviewHeaderActionsOverflow({
    actions
}: {
    actions: WebviewHeaderAction[];
}): React.JSX.Element | null {
    const [open, setOpen] = React.useState(false);
    const [focusedItemIndex, setFocusedItemIndex] = React.useState(0);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuItemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

    const closeMenu = React.useCallback((returnFocusToTrigger: boolean) => {
        setOpen(false);
        if (returnFocusToTrigger) {
            triggerRef.current?.focus();
        }
    }, []);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        menuItemRefs.current[focusedItemIndex]?.focus();
    }, [focusedItemIndex, open]);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(event.target as Element)) {
                closeMenu(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [closeMenu, open]);

    const handleMenuKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu(true);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocusedItemIndex((current) => nextOverflowMenuIndex(current, 'down', actions.length));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setFocusedItemIndex((current) => nextOverflowMenuIndex(current, 'up', actions.length));
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="webview-header-overflow" ref={menuRef} onKeyDown={handleMenuKeyDown}>
            <button
                ref={triggerRef}
                type="button"
                className="webview-header-action-btn webview-header-overflow-trigger"
                aria-label="Actions"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => {
                    if (open) {
                        closeMenu(true);
                        return;
                    }
                    setFocusedItemIndex(0);
                    setOpen(true);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (open) {
                            closeMenu(true);
                            return;
                        }
                        setFocusedItemIndex(0);
                        setOpen(true);
                    }
                }}
            >
                <span className="codicon codicon-kebab-vertical" aria-hidden="true" />
                <span className="webview-header-action-label">Actions</span>
            </button>
            {open && (
                <div className="webview-header-overflow-menu" role="menu">
                    {actions.map((action, index) => (
                        <button
                            key={`${action.label}-${index}`}
                            ref={(element) => {
                                menuItemRefs.current[index] = element;
                            }}
                            type="button"
                            role="menuitem"
                            className="webview-header-overflow-item"
                            disabled={action.disabled}
                            aria-disabled={action.disabled ? true : undefined}
                            aria-busy={action.busy ? true : undefined}
                            tabIndex={-1}
                            onClick={() => {
                                if (!action.disabled) {
                                    action.onClick();
                                }
                                closeMenu(true);
                            }}
                        >
                            {action.icon && (
                                <span
                                    className={`codicon ${codiconClass(action.icon)}`}
                                    aria-hidden="true"
                                />
                            )}
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Standardized header component for all webviews.
 * Provides consistent title (left) and actions (right) with optional help button.
 */
export const WebviewHeader: React.FC<WebviewHeaderProps> = ({
    title,
    actions,
    primaryActions,
    overflowActions,
    helpContext,
    className
}) => {
    const { primary, overflow } = partitionWebviewHeaderActions({
        actions,
        primaryActions,
        overflowActions
    });

    const handleHelpClick = () => {
        const api = getVSCodeAPI();
        if (api && helpContext) {
            api.postMessage({
                type: 'openHelp',
                context: helpContext
            });
        }
    };

    return (
        <header className={['webview-header', className].filter(Boolean).join(' ')}>
            <div className="webview-header-title">
                <h1>{title}</h1>
            </div>
            <div className="webview-header-actions">
                {primary.map((action, index) => (
                    <WebviewHeaderActionButton key={`primary-${action.label}-${index}`} action={action} />
                ))}
                <WebviewHeaderActionsOverflow actions={overflow} />
                {helpContext && (
                    <button
                        type="button"
                        className="webview-header-action-btn webview-header-help-btn"
                        onClick={handleHelpClick}
                        aria-label="Open help documentation"
                    >
                        <span className="codicon codicon-question" aria-hidden="true" />
                        <span className="webview-header-action-label">Help</span>
                    </button>
                )}
            </div>
        </header>
    );
};
