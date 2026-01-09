import React, { useEffect } from 'react';

/**
 * Props for ConfirmDialog component.
 */
interface ConfirmDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Dialog title */
    title: string;
    /** Dialog message */
    message: string;
    /** Optional detail text */
    detail?: string;
    /** Label for confirm button (default: "Confirm") */
    confirmLabel?: string;
    /** Label for cancel button (default: "Cancel") */
    cancelLabel?: string;
    /** Callback when confirm button is clicked */
    onConfirm: () => void;
    /** Callback when cancel button is clicked */
    onCancel: () => void;
}

/**
 * ConfirmDialog component for confirmation dialogs.
 * Reusable component for confirming destructive actions.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    detail,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel
}) => {
    /**
     * Handle Escape key press to close dialog.
     */
    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, onCancel]);

    /**
     * Handle overlay click to close dialog.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    if (!open) return null;

    // Dialog overlay styles
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    };

    // Dialog content styles
    const dialogContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        lineHeight: '1.5'
    };

    const detailStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        lineHeight: '1.4'
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '8px'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '6px 12px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    const cancelButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const confirmButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const confirmButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const [cancelHovered, setCancelHovered] = React.useState(false);
    const [confirmHovered, setConfirmHovered] = React.useState(false);

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={dialogContentStyle} onClick={(e) => e.stopPropagation()}>
                <h3 style={titleStyle}>{title}</h3>
                <p style={messageStyle}>{message}</p>
                {detail && <p style={detailStyle}>{detail}</p>}
                <div style={actionsStyle}>
                    <button
                        style={cancelHovered ? { ...cancelButtonStyle, ...cancelButtonHoverStyle } : cancelButtonStyle}
                        onClick={onCancel}
                        onMouseEnter={() => setCancelHovered(true)}
                        onMouseLeave={() => setCancelHovered(false)}
                        aria-label={cancelLabel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        style={
                            confirmHovered ? { ...confirmButtonStyle, ...confirmButtonHoverStyle } : confirmButtonStyle
                        }
                        onClick={onConfirm}
                        onMouseEnter={() => setConfirmHovered(true)}
                        onMouseLeave={() => setConfirmHovered(false)}
                        aria-label={confirmLabel}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

