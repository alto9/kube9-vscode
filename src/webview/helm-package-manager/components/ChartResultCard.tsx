import React from 'react';
import { ChartSearchResult } from '../types';

/**
 * Props for ChartResultCard component.
 */
interface ChartResultCardProps {
    /** Chart search result data */
    chart: ChartSearchResult;
    /** Callback when card is clicked */
    onClick: (chart: ChartSearchResult) => void;
}

/**
 * ChartResultCard component for displaying individual chart search results.
 * Shows chart name, version, description, and repository.
 */
export const ChartResultCard: React.FC<ChartResultCardProps> = ({ chart, onClick }) => {
    const handleClick = () => {
        onClick(chart);
    };

    const cardStyle: React.CSSProperties = {
        padding: '16px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const cardHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-hoverBackground)',
        borderColor: 'var(--vscode-focusBorder)'
    };

    const [isHovered, setIsHovered] = React.useState(false);

    const nameStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0
    };

    const metaStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    };

    const descriptionStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        lineHeight: '1.4',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical'
    };

    const repositoryStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        fontStyle: 'italic'
    };

    return (
        <div
            style={isHovered ? { ...cardStyle, ...cardHoverStyle } : cardStyle}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            aria-label={`Chart: ${chart.name}`}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <h3 style={nameStyle}>{chart.name}</h3>
                {chart.repository && (
                    <span style={repositoryStyle}>{chart.repository}</span>
                )}
            </div>
            <div style={metaStyle}>
                <span>Version: {chart.version}</span>
                {chart.appVersion && (
                    <span>App Version: {chart.appVersion}</span>
                )}
            </div>
            {chart.description && (
                <p style={descriptionStyle} title={chart.description}>
                    {chart.description}
                </p>
            )}
        </div>
    );
};

