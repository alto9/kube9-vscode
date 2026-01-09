import React from 'react';
import { ChartSearchResult } from '../types';
import { ChartResultCard } from './ChartResultCard';

/**
 * Props for ChartResults component.
 */
interface ChartResultsProps {
    /** Array of chart search results */
    results: ChartSearchResult[];
    /** Callback when a chart is clicked */
    onClick: (chart: ChartSearchResult) => void;
}

/**
 * ChartResults component for displaying a list of chart search results.
 * Renders a grid of ChartResultCard components.
 */
export const ChartResults: React.FC<ChartResultsProps> = ({ results, onClick }) => {
    const containerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        marginTop: '16px'
    };

    if (results.length === 0) {
        return null;
    }

    return (
        <div style={containerStyle}>
            {results.map((chart, index) => (
                <ChartResultCard
                    key={`${chart.name}-${chart.version}-${index}`}
                    chart={chart}
                    onClick={onClick}
                />
            ))}
        </div>
    );
};

