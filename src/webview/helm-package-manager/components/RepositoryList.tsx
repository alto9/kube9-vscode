import React from 'react';
import { HelmRepository } from '../types';
import { RepositoryCard } from './RepositoryCard';

/**
 * Props for RepositoryList component.
 */
interface RepositoryListProps {
    /** Array of repositories to display */
    repositories: HelmRepository[];
    /** Callback when update button is clicked */
    onUpdate: (name: string) => void;
    /** Callback when remove button is clicked */
    onRemove: (name: string) => void;
}

/**
 * RepositoryList component for displaying a list of Helm repositories.
 * Handles empty state and maps repositories to RepositoryCard components.
 */
export const RepositoryList: React.FC<RepositoryListProps> = ({ repositories, onUpdate, onRemove }) => {
    const listStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const emptyStateStyle: React.CSSProperties = {
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '13px'
    };

    if (repositories.length === 0) {
        return (
            <div style={emptyStateStyle}>
                No repositories configured. Add one to get started.
            </div>
        );
    }

    return (
        <div style={listStyle}>
            {repositories.map((repository) => (
                <RepositoryCard
                    key={repository.name}
                    repository={repository}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
};

