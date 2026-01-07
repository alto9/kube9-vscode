import React, { useState } from 'react';
import { ChartSearchResult } from '../types';
import { SearchBar } from './SearchBar';
import { ChartResults } from './ChartResults';
import { ChartDetailModal } from './ChartDetailModal';

/**
 * Props for DiscoverChartsSection component.
 */
interface DiscoverChartsSectionProps {
    /** Array of chart search results */
    searchResults: ChartSearchResult[];
    /** Whether a search is currently in progress */
    searching: boolean;
    /** Callback when search query changes */
    onSearch: (query: string) => void;
    /** Callback when a chart is clicked */
    onChartClick: (chart: ChartSearchResult) => void;
    /** Callback when install button is clicked in modal */
    onInstall?: (chart: ChartSearchResult) => void;
}

/**
 * DiscoverChartsSection component for chart discovery and search.
 * Provides search functionality with debounced input, loading states, and results display.
 */
export const DiscoverChartsSection: React.FC<DiscoverChartsSectionProps> = ({
    searchResults,
    searching,
    onSearch,
    onChartClick,
    onInstall
}) => {
    const [selectedChart, setSelectedChart] = useState<ChartSearchResult | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    /**
     * Handle chart click - open modal with selected chart.
     */
    const handleChartClick = (chart: ChartSearchResult) => {
        setSelectedChart(chart);
        setModalOpen(true);
        onChartClick(chart);
    };

    /**
     * Handle modal close.
     */
    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedChart(null);
    };

    /**
     * Handle install button click in modal.
     */
    const handleInstall = (chart: ChartSearchResult) => {
        if (onInstall) {
            onInstall(chart);
        }
        handleModalClose();
    };
    const sectionStyle: React.CSSProperties = {
        marginBottom: '32px'
    };

    const headingStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        marginBottom: '16px',
        marginTop: 0
    };

    const loadingContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const spinnerStyle: React.CSSProperties = {
        fontSize: '24px'
    };

    const loadingMessageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)'
    };

    const emptyContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const emptyIconStyle: React.CSSProperties = {
        fontSize: '32px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.6
    };

    const emptyMessageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)',
        textAlign: 'center',
        maxWidth: '400px'
    };

    // Determine if we have an active search query
    // This is a simple heuristic - if we have results or are searching, we likely have a query
    // In a real implementation, we'd track the query separately
    const hasActiveSearch = searching || searchResults.length > 0;

    return (
        <section className="discover-charts-section" style={sectionStyle}>
            <h2 style={headingStyle}>🔍 Discover Charts</h2>
            <SearchBar onSearch={onSearch} debounceMs={300} />
            
            {searching && (
                <div style={loadingContainerStyle}>
                    <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
                    <div style={loadingMessageStyle}>Searching charts...</div>
                </div>
            )}
            
            {!searching && !hasActiveSearch && (
                <div style={emptyContainerStyle}>
                    <span className="codicon codicon-inbox" style={emptyIconStyle}></span>
                    <div style={emptyMessageStyle}>Search for charts by name...</div>
                </div>
            )}
            
            {!searching && hasActiveSearch && searchResults.length === 0 && (
                <div style={emptyContainerStyle}>
                    <span className="codicon codicon-inbox" style={emptyIconStyle}></span>
                    <div style={emptyMessageStyle}>No charts found matching your search</div>
                    <div style={{ ...emptyMessageStyle, fontSize: '12px', marginTop: '4px' }}>
                        Try checking your spelling or using different keywords
                    </div>
                </div>
            )}
            
            {!searching && searchResults.length > 0 && (
                <ChartResults results={searchResults} onClick={handleChartClick} />
            )}

            {/* Chart Detail Modal */}
            <ChartDetailModal
                chart={selectedChart}
                open={modalOpen}
                onClose={handleModalClose}
                onInstall={handleInstall}
            />
        </section>
    );
};

