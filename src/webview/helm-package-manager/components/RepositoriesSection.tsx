import React from 'react';
import { HelmRepository } from '../types';
import { RepositoryList } from './RepositoryList';

/**
 * Props for RepositoriesSection component.
 */
interface RepositoriesSectionProps {
    /** Array of repositories to display */
    repositories: HelmRepository[];
    /** Callback when add repository button is clicked */
    onAddRepository: () => void;
    /** Callback when update repository button is clicked */
    onUpdateRepository: (name: string) => void;
    /** Callback when remove repository button is clicked */
    onRemoveRepository: (name: string) => void;
}

/**
 * RepositoriesSection component for displaying the repositories section.
 * Shows section header with add button and repository list.
 */
export const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({
    repositories,
    onAddRepository,
    onUpdateRepository,
    onRemoveRepository
}) => {
    const sectionStyle: React.CSSProperties = {
        marginBottom: '24px'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0
    };

    const addButtonStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        transition: 'background-color 0.15s ease'
    };

    const addButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const [isAddButtonHovered, setIsAddButtonHovered] = React.useState(false);

    return (
        <section className="repositories-section" style={sectionStyle}>
            <div style={headerStyle}>
                <h2 style={titleStyle}>📚 Repositories</h2>
                <button
                    style={isAddButtonHovered ? { ...addButtonStyle, ...addButtonHoverStyle } : addButtonStyle}
                    onClick={onAddRepository}
                    onMouseEnter={() => setIsAddButtonHovered(true)}
                    onMouseLeave={() => setIsAddButtonHovered(false)}
                    aria-label="Add repository"
                >
                    + Add Repository
                </button>
            </div>
            <RepositoryList
                repositories={repositories}
                onUpdate={onUpdateRepository}
                onRemove={onRemoveRepository}
            />
        </section>
    );
};

