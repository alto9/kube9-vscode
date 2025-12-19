import React from 'react';
import { KubernetesEvent, EventFilters } from '../../../types/Events';

/**
 * Props for ThreePaneLayout component.
 */
interface ThreePaneLayoutProps {
    events: KubernetesEvent[];
    selectedEvent: KubernetesEvent | null;
    onEventSelect: (event: KubernetesEvent) => void;
    filters: EventFilters;
    onFilterChange: (filters: EventFilters) => void;
    loading: boolean;
    error: string | null;
    sendMessage: (message: any) => void;
}

/**
 * ThreePaneLayout component placeholder.
 * Will be fully implemented in story 015.
 */
export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = () => {
    return (
        <div className="three-pane-layout">
            <div className="layout-placeholder">ThreePaneLayout (placeholder)</div>
        </div>
    );
};

