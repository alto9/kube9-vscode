import React, { useMemo } from 'react';
import type { ClusterInfo, ClusterCustomizationConfig } from '../types';

/**
 * Props for Footer component
 */
interface FooterProps {
    /** Array of all clusters */
    clusters: ClusterInfo[];
    /** Customization configuration */
    customizations: ClusterCustomizationConfig;
    /** Callback function to filter to hidden clusters */
    onFilterHidden: () => void;
    /** Callback function to show all clusters */
    onShowAll: () => void;
    /** Whether the view is currently filtered to show only hidden clusters */
    showHiddenOnly: boolean;
}

/**
 * Footer component displays cluster counts and provides filtering controls
 */
export function Footer({ clusters, customizations, onFilterHidden, onShowAll, showHiddenOnly }: FooterProps): JSX.Element {
    // Calculate visible and hidden counts
    const { visibleCount, hiddenCount } = useMemo(() => {
        const visible = clusters.filter(c => {
            const customization = customizations.clusters[c.contextName];
            return !customization?.hidden;
        }).length;

        const hidden = clusters.filter(c => {
            const customization = customizations.clusters[c.contextName];
            return customization?.hidden === true;
        }).length;

        return {
            visibleCount: visible,
            hiddenCount: hidden
        };
    }, [clusters, customizations]);

    return (
        <footer className="cluster-manager-footer">
            <span>
                {visibleCount} visible / {clusters.length} total clusters
            </span>
            {hiddenCount > 0 && !showHiddenOnly && (
                <span className="footer-hidden-link" onClick={onFilterHidden} role="button" tabIndex={0} onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onFilterHidden();
                    }
                }}>
                    {hiddenCount} hidden
                </span>
            )}
            {showHiddenOnly && (
                <button className="footer-show-all-button" onClick={onShowAll}>
                    Show All
                </button>
            )}
        </footer>
    );
}

