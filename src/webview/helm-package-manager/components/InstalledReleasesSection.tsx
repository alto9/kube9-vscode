import React, { useMemo } from 'react';
import { HelmRelease, ReleaseFilters } from '../types';
import { ReleaseFiltersComponent } from './ReleaseFilters';
import { ReleaseList } from './ReleaseList';

/**
 * Props for InstalledReleasesSection component.
 */
interface InstalledReleasesSectionProps {
    releases: HelmRelease[];
    filters: ReleaseFilters;
    onFilterChange: (filters: ReleaseFilters) => void;
    onUpgrade: (release: HelmRelease) => void;
    onViewDetails: (release: HelmRelease) => void;
    onUninstall: (release: HelmRelease) => void;
}

/**
 * Apply filters to releases based on filter criteria.
 * 
 * @param releases - Array of releases to filter
 * @param filters - Filter criteria
 * @returns Filtered array of releases
 */
function applyFilters(releases: HelmRelease[], filters: ReleaseFilters): HelmRelease[] {
    let filtered = releases;

    // Filter by namespace
    if (filters.namespace !== 'all') {
        filtered = filtered.filter(r => r.namespace === filters.namespace);
    }

    // Filter by status
    if (filters.status !== 'all') {
        filtered = filtered.filter(r => r.status === filters.status);
    }

    // Filter by search query (case-insensitive, name or chart)
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.chart.toLowerCase().includes(query)
        );
    }

    return filtered;
}

/**
 * InstalledReleasesSection component.
 * Main section component that displays all installed Helm releases with filtering.
 */
export const InstalledReleasesSection: React.FC<InstalledReleasesSectionProps> = ({
    releases,
    filters,
    onFilterChange,
    onUpgrade,
    onViewDetails,
    onUninstall
}) => {
    const filteredReleases = useMemo(() => {
        return applyFilters(releases, filters);
    }, [releases, filters]);

    const sectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '32px'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        margin: 0
    };

    return (
        <section className="installed-releases-section" style={sectionStyle}>
            <div className="section-header" style={headerStyle}>
                <h2 style={titleStyle}>📦 Installed Releases</h2>
            </div>
            <ReleaseFiltersComponent
                filters={filters}
                releases={releases}
                onChange={onFilterChange}
            />
            <ReleaseList
                releases={filteredReleases}
                onUpgrade={onUpgrade}
                onViewDetails={onViewDetails}
                onUninstall={onUninstall}
            />
        </section>
    );
};

