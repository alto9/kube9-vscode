import React from 'react';
import { HelmErrorType } from '../../../services/HelmError';

/**
 * Props for ErrorMessage component.
 */
export interface ErrorMessageProps {
    /** Error message to display */
    error: string;
    /** Optional error type for styling */
    type?: HelmErrorType;
    /** Optional suggestion for resolving the error */
    suggestion?: string;
    /** Whether the error is retryable */
    retryable?: boolean;
    /** Optional retry callback */
    onRetry?: () => void;
    /** Dismiss callback */
    onDismiss: () => void;
}

/**
 * ErrorMessage component.
 * Displays user-friendly error messages with suggestions and retry functionality.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    error,
    type,
    suggestion,
    retryable = false,
    onRetry,
    onDismiss
}) => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '4px',
        marginBottom: '16px',
        color: 'var(--vscode-errorForeground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '16px',
        color: 'var(--vscode-errorForeground)'
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--vscode-errorForeground)',
        margin: 0
    };

    const suggestionStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        margin: 0,
        marginTop: '4px'
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        marginTop: '8px'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const dismissButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    return (
        <div className={`error-message ${type || ''}`} style={containerStyle}>
            <div style={headerStyle}>
                <span className="codicon codicon-warning" style={iconStyle}></span>
                <strong style={messageStyle}>{error}</strong>
            </div>
            {suggestion && (
                <p style={suggestionStyle}>{suggestion}</p>
            )}
            <div style={actionsStyle}>
                {retryable && onRetry && (
                    <button style={buttonStyle} onClick={onRetry}>
                        Retry
                    </button>
                )}
                <button style={dismissButtonStyle} onClick={onDismiss}>
                    Dismiss
                </button>
            </div>
        </div>
    );
};

