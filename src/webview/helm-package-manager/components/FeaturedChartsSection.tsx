import React from 'react';
import { OperatorInstallationStatus, FeaturedChart } from '../types';
import { OperatorCard } from './OperatorCard';
import { FeaturedChartCard } from './FeaturedChartCard';

/**
 * Props for FeaturedChartsSection component.
 */
interface FeaturedChartsSectionProps {
    /** Operator installation status */
    operatorStatus: OperatorInstallationStatus;
    /** Featured charts to display */
    featuredCharts: FeaturedChart[];
    /** Callback when install button is clicked */
    onInstall: () => void;
    /** Callback when upgrade button is clicked */
    onUpgrade: () => void;
    /** Callback when configure button is clicked */
    onConfigure: () => void;
    /** Callback when a featured chart install button is clicked */
    onFeaturedChartInstall: (chart: FeaturedChart) => void;
}

/**
 * FeaturedChartsSection component prominently displays the Kube9 Operator card and other featured charts.
 * This section appears at the top of the Helm Package Manager.
 */
export const FeaturedChartsSection: React.FC<FeaturedChartsSectionProps> = ({
    operatorStatus,
    featuredCharts,
    onInstall,
    onUpgrade,
    onConfigure,
    onFeaturedChartInstall
}) => {
    const sectionStyle: React.CSSProperties = {
        marginBottom: 0,
        marginTop: 0
    };

    const headingStyle: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        marginBottom: '16px',
        marginTop: 0
    };

    const chartsGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '16px',
        marginBottom: 0,
        alignItems: 'start'
    };

    return (
        <section className="featured-charts-section" style={sectionStyle}>
            <h2 style={headingStyle}>🌟 Featured Charts</h2>
            <div style={chartsGridStyle}>
                {/* Operator Card as first tile */}
                <OperatorCard
                    status={operatorStatus}
                    onInstall={onInstall}
                    onUpgrade={onUpgrade}
                    onConfigure={onConfigure}
                />
                {/* Other featured charts as tiles */}
                {featuredCharts.map((chart) => (
                    <FeaturedChartCard
                        key={chart.chart}
                        chart={chart}
                        onInstall={onFeaturedChartInstall}
                    />
                ))}
            </div>
        </section>
    );
};

