import React from 'react';
import { EventFilters } from '../../../types/Events';

/**
 * Props for StatusBar component.
 */
interface StatusBarProps {
    eventCount: number;
    totalCount: number;
    filters: EventFilters;
    autoRefreshEnabled: boolean;
}

/**
 * StatusBar component placeholder.
 * Will be fully implemented in story 025.
 */
export const StatusBar: React.FC<StatusBarProps> = () => {
    return (
        <div className="status-bar">
            <div className="status-bar-placeholder">StatusBar (placeholder)</div>
        </div>
    );
};

