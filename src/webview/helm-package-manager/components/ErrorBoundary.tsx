import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getVSCodeAPI } from '../vscodeApi';

/**
 * Get shared VS Code API instance.
 */
const vscode = getVSCodeAPI();

/**
 * Props for ErrorBoundary component.
 */
interface ErrorBoundaryProps {
    children: ReactNode;
}

/**
 * State for ErrorBoundary component.
 */
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary component for catching rendering errors.
 * Catches errors in child components and displays a user-friendly error UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    /**
     * Called when an error is caught by the error boundary.
     * Logs the error and sends it to the extension for debugging.
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] React error caught:', error, errorInfo);
        
        // Send error to extension for logging
        if (vscode) {
            vscode.postMessage({
                command: 'logError',
                error: error.message,
                stack: error.stack
            });
        }
        
        this.setState({
            hasError: true,
            error
        });
    }

    /**
     * Renders error UI or children based on error state.
     */
    render(): ReactNode {
        if (this.state.hasError) {
            const containerStyle: React.CSSProperties = {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: '16px',
                padding: '24px',
                color: 'var(--vscode-foreground)',
                fontFamily: 'var(--vscode-font-family)',
                backgroundColor: 'var(--vscode-editor-background)'
            };

            const iconStyle: React.CSSProperties = {
                fontSize: '48px',
                color: 'var(--vscode-errorForeground)'
            };

            const titleStyle: React.CSSProperties = {
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                margin: 0
            };

            const messageStyle: React.CSSProperties = {
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                textAlign: 'center',
                maxWidth: '500px',
                margin: 0
            };

            const reloadButtonStyle: React.CSSProperties = {
                padding: '8px 16px',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--vscode-font-family)',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                marginTop: '8px'
            };

            return (
                <div className="error-boundary" style={containerStyle}>
                    <span className="codicon codicon-error" style={iconStyle}></span>
                    <h2 style={titleStyle}>Something went wrong</h2>
                    <p style={messageStyle}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        style={reloadButtonStyle}
                        onClick={() => {
                            // Reload the webview by resetting error state
                            this.setState({
                                hasError: false,
                                error: null
                            });
                            // Also reload the page as a fallback
                            window.location.reload();
                        }}
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

