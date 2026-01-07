import React, { useState, useEffect } from 'react';

/**
 * Props for AddRepositoryModal component.
 */
interface AddRepositoryModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Array of existing repository names for duplicate checking */
    existingRepositories: string[];
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when form is submitted with valid data */
    onSubmit: (name: string, url: string) => Promise<void>;
}

/**
 * AddRepositoryModal component for adding new Helm repositories.
 * Includes validation for name and URL fields.
 */
export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
    open,
    existingRepositories,
    onClose,
    onSubmit
}) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setName('');
            setUrl('');
            setErrors([]);
            setSubmitting(false);
        }
    }, [open]);

    /**
     * Validate form inputs and return validation errors.
     */
    const validate = (): boolean => {
        const newErrors: string[] = [];

        // Validate name
        if (!name.trim()) {
            newErrors.push('Repository name is required');
        } else if (existingRepositories.includes(name.trim())) {
            newErrors.push(`Repository '${name.trim()}' already exists`);
        } else if (!/^[a-zA-Z0-9-_]+$/.test(name.trim())) {
            newErrors.push('Name must contain only letters, numbers, hyphens, and underscores');
        }

        // Validate URL
        if (!url.trim()) {
            newErrors.push('Repository URL is required');
        } else {
            try {
                const parsedUrl = new URL(url.trim());
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    newErrors.push('URL must use HTTP or HTTPS protocol');
                }
            } catch {
                newErrors.push('Invalid URL format');
            }
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    /**
     * Handle form submission.
     */
    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(name.trim(), url.trim());
            onClose();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setErrors([errorMessage]);
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Handle input change with real-time validation.
     */
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        // Clear errors when user starts typing
        if (errors.length > 0) {
            setErrors([]);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        // Clear errors when user starts typing
        if (errors.length > 0) {
            setErrors([]);
        }
    };

    /**
     * Handle Escape key press to close modal.
     */
    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, submitting, onClose]);

    /**
     * Handle overlay click to close modal.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !submitting) {
            onClose();
        }
    };

    if (!open) return null;

    const isFormValid = name.trim() && url.trim() && errors.length === 0;

    // Modal overlay styles
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

    // Modal content styles
    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '24px',
        maxWidth: '500px',
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

    const inputGroupStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const inputStyle: React.CSSProperties = {
        padding: '6px 8px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-input-foreground)',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px',
        outline: 'none'
    };

    const inputFocusStyle: React.CSSProperties = {
        borderColor: 'var(--vscode-focusBorder)'
    };

    const errorMessageStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-errorForeground)',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '2px',
        padding: '8px',
        marginTop: '4px'
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

    const submitButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const submitButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const submitButtonDisabledStyle: React.CSSProperties = {
        opacity: 0.5,
        cursor: 'not-allowed'
    };

    const [cancelHovered, setCancelHovered] = useState(false);
    const [submitHovered, setSubmitHovered] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);
    const [urlFocused, setUrlFocused] = useState(false);

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <h3 style={titleStyle}>Add Helm Repository</h3>

                <div style={inputGroupStyle}>
                    <label style={labelStyle} htmlFor="repository-name">
                        Repository Name
                    </label>
                    <input
                        id="repository-name"
                        type="text"
                        placeholder="e.g., bitnami"
                        value={name}
                        onChange={handleNameChange}
                        onBlur={validate}
                        onFocus={() => setNameFocused(true)}
                        style={nameFocused ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                        disabled={submitting}
                        autoFocus
                    />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle} htmlFor="repository-url">
                        Repository URL
                    </label>
                    <input
                        id="repository-url"
                        type="text"
                        placeholder="https://charts.example.com"
                        value={url}
                        onChange={handleUrlChange}
                        onBlur={validate}
                        onFocus={() => setUrlFocused(true)}
                        style={urlFocused ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                        disabled={submitting}
                    />
                </div>

                {errors.length > 0 && (
                    <div>
                        {errors.map((error, index) => (
                            <div key={index} style={errorMessageStyle}>
                                {error}
                            </div>
                        ))}
                    </div>
                )}

                <div style={actionsStyle}>
                    <button
                        style={cancelHovered ? { ...cancelButtonStyle, ...cancelButtonHoverStyle } : cancelButtonStyle}
                        onClick={onClose}
                        onMouseEnter={() => setCancelHovered(true)}
                        onMouseLeave={() => setCancelHovered(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        style={
                            submitting || !isFormValid
                                ? { ...submitButtonStyle, ...submitButtonDisabledStyle }
                                : submitHovered
                                  ? { ...submitButtonStyle, ...submitButtonHoverStyle }
                                  : submitButtonStyle
                        }
                        onClick={handleSubmit}
                        onMouseEnter={() => setSubmitHovered(true)}
                        onMouseLeave={() => setSubmitHovered(false)}
                        disabled={submitting || !isFormValid}
                    >
                        {submitting ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    );
};

