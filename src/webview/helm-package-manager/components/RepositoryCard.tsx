import React from 'react';
import { HelmRepository } from '../types';

/**
 * Props for RepositoryCard component.
 */
interface RepositoryCardProps {
    /** Repository data */
    repository: HelmRepository;
    /** Callback when update button is clicked */
    onUpdate: (name: string) => void;
    /** Callback when remove button is clicked */
    onRemove: (name: string) => void;
}

/**
 * RepositoryCard component for displaying individual Helm repository information.
 * Shows repository name, URL, chart count, and action buttons.
 */
export const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository, onUpdate, onRemove }) => {
    const handleUpdate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(repository.name);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(repository.name);
    };

    const cardStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'background-color 0.15s ease, border-color 0.15s ease'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px'
    };

    const nameStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        flex: 1
    };

    const urlStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        wordBreak: 'break-all'
    };

    const metaStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    };

    const buttonStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        height: '24px',
        transition: 'background-color 0.15s ease'
    };

    const buttonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const [updateHovered, setUpdateHovered] = React.useState(false);
    const [removeHovered, setRemoveHovered] = React.useState(false);

    const formatChartCount = (count: number): string => {
        if (count === 1) return '1 chart';
        return `${count} charts`;
    };

    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={nameStyle}>{repository.name}</h3>
                    <p style={urlStyle} title={repository.url}>
                        {repository.url}
                    </p>
                </div>
                <div style={buttonContainerStyle}>
                    <button
                        style={updateHovered ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
                        onClick={handleUpdate}
                        onMouseEnter={() => setUpdateHovered(true)}
                        onMouseLeave={() => setUpdateHovered(false)}
                        title="Update repository"
                        aria-label={`Update repository ${repository.name}`}
                    >
                        🔄
                    </button>
                    <button
                        style={removeHovered ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
                        onClick={handleRemove}
                        onMouseEnter={() => setRemoveHovered(true)}
                        onMouseLeave={() => setRemoveHovered(false)}
                        title="Remove repository"
                        aria-label={`Remove repository ${repository.name}`}
                    >
                        🗑️
                    </button>
                </div>
            </div>
            {repository.chartCount > 0 && (
                <div style={metaStyle}>
                    <span>{formatChartCount(repository.chartCount)}</span>
                </div>
            )}
        </div>
    );
};

