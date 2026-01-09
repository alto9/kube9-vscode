import React from 'react';
import { OperatorInstallationStatus } from '../types';
import { OperatorCard } from './OperatorCard';

/**
 * Props for FeaturedChartsSection component.
 */
interface FeaturedChartsSectionProps {
    /** Operator installation status */
    operatorStatus: OperatorInstallationStatus;
    /** Callback when install button is clicked */
    onInstall: () => void;
    /** Callback when upgrade button is clicked */
    onUpgrade: () => void;
    /** Callback when configure button is clicked */
    onConfigure: () => void;
}

/**
 * FeaturedChartsSection component prominently displays the Kube9 Operator card.
 * This section appears at the top of the Helm Package Manager.
 */
export const FeaturedChartsSection: React.FC<FeaturedChartsSectionProps> = ({
    operatorStatus,
    onInstall,
    onUpgrade,
    onConfigure
}) => {
    const sectionStyle: React.CSSProperties = {
        marginBottom: '24px'
    };

    const headingStyle: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        marginBottom: '16px',
        marginTop: 0
    };

    return (
        <section className="featured-charts-section" style={sectionStyle}>
            <h2 style={headingStyle}>🌟 Featured Charts</h2>
            <OperatorCard
                status={operatorStatus}
                onInstall={onInstall}
                onUpgrade={onUpgrade}
                onConfigure={onConfigure}
            />
        </section>
    );
};

