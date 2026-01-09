import React from 'react';
import { HelmRelease } from '../types';
import { ReleaseCard } from './ReleaseCard';

/**
 * Props for ReleaseList component.
 */
interface ReleaseListProps {
    releases: HelmRelease[];
    onUpgrade: (release: HelmRelease) => void;
    onViewDetails: (release: HelmRelease) => void;
    onUninstall: (release: HelmRelease) => void;
}

/**
 * EmptyState component for when no releases are found.
 */
const EmptyState: React.FC = () => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        padding: '48px 24px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '48px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.6
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '14px',
        color: 'var(--vscode-descriptionForeground)',
        textAlign: 'center',
        maxWidth: '400px',
        fontWeight: 500
    };

    const suggestionStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.8,
        textAlign: 'center',
        marginTop: '4px'
    };

    return (
        <div className="empty-state" style={containerStyle}>
            <span className="codicon codicon-package" style={iconStyle}></span>
            <div style={messageStyle}>No Helm releases installed</div>
            <div style={suggestionStyle}>Search for charts to install.</div>
        </div>
    );
};

/**
 * ReleaseList component.
 * Renders a list of ReleaseCard components or an empty state.
 */
export const ReleaseList: React.FC<ReleaseListProps> = ({
    releases,
    onUpgrade,
    onViewDetails,
    onUninstall
}) => {
    const listContainerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        padding: '16px 0'
    };

    if (releases.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="release-list" style={listContainerStyle}>
            {releases.map((release) => (
                <ReleaseCard
                    key={`${release.namespace}-${release.name}`}
                    release={release}
                    onUpgrade={onUpgrade}
                    onViewDetails={onViewDetails}
                    onUninstall={onUninstall}
                />
            ))}
        </div>
    );
};

