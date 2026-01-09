import React, { useState } from 'react';
import { HelmRepository } from '../types';
import { RepositoryList } from './RepositoryList';
import { AddRepositoryModal } from './AddRepositoryModal';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Props for RepositoriesSection component.
 */
interface RepositoriesSectionProps {
    /** Array of repositories to display */
    repositories: HelmRepository[];
    /** Callback when add repository form is submitted */
    onAddRepository: (name: string, url: string) => Promise<void>;
    /** Callback when update repository button is clicked */
    onUpdateRepository: (name: string) => void;
    /** Callback when remove repository is confirmed */
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
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [repositoryToRemove, setRepositoryToRemove] = useState<string | null>(null);

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

    const [isAddButtonHovered, setIsAddButtonHovered] = useState(false);

    /**
     * Handle add repository button click - open modal.
     */
    const handleAddRepositoryClick = () => {
        setAddModalOpen(true);
    };

    /**
     * Handle add repository form submission.
     */
    const handleAddRepositorySubmit = async (name: string, url: string) => {
        await onAddRepository(name, url);
        setAddModalOpen(false);
    };

    /**
     * Handle remove repository button click - show confirmation dialog.
     */
    const handleRemoveRepositoryClick = (name: string) => {
        setRepositoryToRemove(name);
        setRemoveConfirmOpen(true);
    };

    /**
     * Handle remove repository confirmation.
     */
    const handleRemoveConfirm = () => {
        if (repositoryToRemove) {
            onRemoveRepository(repositoryToRemove);
            setRepositoryToRemove(null);
        }
        setRemoveConfirmOpen(false);
    };

    /**
     * Handle remove repository cancellation.
     */
    const handleRemoveCancel = () => {
        setRepositoryToRemove(null);
        setRemoveConfirmOpen(false);
    };

    // Get list of existing repository names for duplicate checking
    const existingRepositoryNames = repositories.map((repo) => repo.name);

    return (
        <>
            <section className="repositories-section" style={sectionStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>📚 Repositories</h2>
                    <button
                        style={isAddButtonHovered ? { ...addButtonStyle, ...addButtonHoverStyle } : addButtonStyle}
                        onClick={handleAddRepositoryClick}
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
                    onRemove={handleRemoveRepositoryClick}
                />
            </section>

            <AddRepositoryModal
                open={addModalOpen}
                existingRepositories={existingRepositoryNames}
                onClose={() => setAddModalOpen(false)}
                onSubmit={handleAddRepositorySubmit}
            />

            <ConfirmDialog
                open={removeConfirmOpen}
                title="Remove Repository"
                message={`Are you sure you want to remove repository '${repositoryToRemove || ''}'?`}
                detail={
                    repositoryToRemove
                        ? repositories.find((r) => r.name === repositoryToRemove)?.chartCount
                            ? `This repository contains ${repositories.find((r) => r.name === repositoryToRemove)?.chartCount} charts.`
                            : undefined
                        : undefined
                }
                confirmLabel="Remove"
                cancelLabel="Cancel"
                onConfirm={handleRemoveConfirm}
                onCancel={handleRemoveCancel}
            />
        </>
    );
};

