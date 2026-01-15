import React from 'react';
import { OperatorInstallationStatus } from '../types';
import { StatusBadge } from './StatusBadge';

/**
 * Props for OperatorCard component.
 */
interface OperatorCardProps {
    /** Operator installation status */
    status: OperatorInstallationStatus;
    /** Callback when install button is clicked */
    onInstall: () => void;
    /** Callback when upgrade button is clicked */
    onUpgrade: () => void;
    /** Callback when configure button is clicked */
    onConfigure: () => void;
}

/**
 * OperatorCard component displays the Kube9 Operator with installation status and action buttons.
 * Shows appropriate actions based on installation status.
 */
export const OperatorCard: React.FC<OperatorCardProps> = ({
    status,
    onInstall,
    onUpgrade,
    onConfigure
}) => {
    const cardStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        height: 'auto',
        overflow: 'hidden'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
    };

    const logoStyle: React.CSSProperties = {
        fontSize: '28px',
        lineHeight: '1',
        flexShrink: 0
    };

    const headerContentStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        lineHeight: '1.4',
        margin: 0
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: '8px',
        borderTop: '1px solid var(--vscode-panel-border)'
    };

    const primaryButtonStyle: React.CSSProperties = {
        padding: '6px 12px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const primaryButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        padding: '6px 12px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const disabledButtonStyle: React.CSSProperties = {
        padding: '6px 12px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
        color: 'var(--vscode-descriptionForeground)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'not-allowed',
        opacity: 0.6
    };

    const linkStyle: React.CSSProperties = {
        fontSize: '11px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-textLink-foreground)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'text-decoration 0.15s ease'
    };

    const handleDocumentationClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // Open documentation in external browser
        if (typeof vscode !== 'undefined' && vscode) {
            vscode.postMessage({
                command: 'openExternalLink',
                url: 'https://alto9.github.io/kube9/'
            } as any);
        } else {
            window.open('https://alto9.github.io/kube9/', '_blank');
        }
    };

    const handleViewValuesClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // Placeholder for view values functionality
        console.log('View Values clicked');
    };

    const [primaryButtonHovered, setPrimaryButtonHovered] = React.useState(false);

    const getPrimaryAction = () => {
        if (!status.installed) {
            return (
                <button
                    style={primaryButtonHovered ? { ...primaryButtonStyle, ...primaryButtonHoverStyle } : primaryButtonStyle}
                    onClick={onInstall}
                    onMouseEnter={() => setPrimaryButtonHovered(true)}
                    onMouseLeave={() => setPrimaryButtonHovered(false)}
                    aria-label="Install Kube9 Operator"
                >
                    Install Now
                </button>
            );
        } else if (status.upgradeAvailable) {
            return (
                <button
                    style={primaryButtonHovered ? { ...primaryButtonStyle, ...primaryButtonHoverStyle } : primaryButtonStyle}
                    onClick={onUpgrade}
                    onMouseEnter={() => setPrimaryButtonHovered(true)}
                    onMouseLeave={() => setPrimaryButtonHovered(false)}
                    aria-label="Upgrade Kube9 Operator"
                >
                    Upgrade
                </button>
            );
        } else {
            return (
                <button
                    style={disabledButtonStyle}
                    disabled
                    aria-label="Kube9 Operator is installed"
                >
                    Installed
                </button>
            );
        }
    };

    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <div style={logoStyle}>🎯</div>
                <div style={headerContentStyle}>
                    <h3 style={titleStyle}>Kube9 Operator</h3>
                    <p style={descriptionStyle}>
                        Advanced Kubernetes management for VS Code
                    </p>
                    <div>
                        <StatusBadge status={status} />
                    </div>
                </div>
            </div>
            <div style={actionsStyle}>
                {getPrimaryAction()}
                {status.installed && (
                    <button
                        style={secondaryButtonStyle}
                        onClick={onConfigure}
                        aria-label="Configure Kube9 Operator"
                    >
                        Configure
                    </button>
                )}
                <a
                    href="https://alto9.github.io/kube9/"
                    style={linkStyle}
                    onClick={handleDocumentationClick}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                    }}
                    aria-label="View Kube9 Operator documentation"
                >
                    Documentation
                </a>
                <a
                    href="#"
                    style={linkStyle}
                    onClick={handleViewValuesClick}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                    }}
                    aria-label="View Kube9 Operator default values"
                >
                    View Values
                </a>
            </div>
        </div>
    );
};

// Declare vscode for TypeScript
declare const vscode: {
    postMessage: (message: any) => void;
} | undefined;

