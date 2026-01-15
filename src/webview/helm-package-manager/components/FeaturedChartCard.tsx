import React from 'react';
import { FeaturedChart } from '../types';

/**
 * Props for FeaturedChartCard component.
 */
interface FeaturedChartCardProps {
    /** Featured chart information */
    chart: FeaturedChart;
    /** Callback when install button is clicked */
    onInstall: (chart: FeaturedChart) => void;
}

/**
 * FeaturedChartCard component displays a featured Helm chart with install action.
 */
export const FeaturedChartCard: React.FC<FeaturedChartCardProps> = ({
    chart,
    onInstall
}) => {
    // Get icon based on chart name
    const getChartIcon = (chartName: string): string => {
        const name = chartName.toLowerCase();
        if (name.includes('trivy')) {
            return '🔒'; // Security icon for Trivy
        }
        return '📦'; // Default package icon
    };
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

    const versionStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        opacity: 0.8
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: '8px'
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

    const installedButtonStyle: React.CSSProperties = {
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

    const [primaryButtonHovered, setPrimaryButtonHovered] = React.useState(false);

    const handleInstall = () => {
        onInstall(chart);
    };

    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <div style={logoStyle}>{getChartIcon(chart.name)}</div>
                <div style={headerContentStyle}>
                    <h3 style={titleStyle}>{chart.name}</h3>
                    <p style={descriptionStyle}>{chart.description}</p>
                    <div style={versionStyle}>Version: {chart.version}</div>
                </div>
            </div>
            <div style={actionsStyle}>
                {chart.installed ? (
                    <button
                        style={installedButtonStyle}
                        disabled
                        aria-label={`${chart.name} is installed`}
                    >
                        Installed
                    </button>
                ) : (
                    <button
                        style={primaryButtonHovered ? { ...primaryButtonStyle, ...primaryButtonHoverStyle } : primaryButtonStyle}
                        onClick={handleInstall}
                        onMouseEnter={() => setPrimaryButtonHovered(true)}
                        onMouseLeave={() => setPrimaryButtonHovered(false)}
                        aria-label={`Install ${chart.name}`}
                    >
                        Install Now
                    </button>
                )}
            </div>
        </div>
    );
};
