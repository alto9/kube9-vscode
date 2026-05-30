import React from 'react';

export type { TabType } from '../utils/tabMigration';
import type { TabType } from '../utils/tabMigration';
import {
    ARGOCD_APP_PANEL_IDS,
    ARGOCD_APP_TAB_IDS,
    nextTabFromArrowKey,
    tabBarTabIndex
} from '../graph/tabBarA11y';

interface TabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

/**
 * Graph | Details tabs with tablist semantics (`.ai/interface/accessibility.md`).
 * DOM order is after the graph canvas in ArgoCDApplicationView; CSS grid places tabs visually below the header.
 */
export function TabBar({ activeTab, onTabChange }: TabBarProps): React.JSX.Element {
    const graphTabRef = React.useRef<HTMLButtonElement>(null);
    const detailsTabRef = React.useRef<HTMLButtonElement>(null);

    const focusTab = React.useCallback((tab: TabType) => {
        const target = tab === 'graph' ? graphTabRef.current : detailsTabRef.current;
        target?.focus();
    }, []);

    const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: TabType): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onTabChange(tab);
            return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const nextTab = nextTabFromArrowKey(activeTab, event.key);
            onTabChange(nextTab);
            focusTab(nextTab);
        }
    };

    return (
        <div
            className="argocd-tab-bar"
            role="tablist"
            aria-label="Argo CD application views"
        >
            <button
                ref={graphTabRef}
                type="button"
                className={`argocd-tab${activeTab === 'graph' ? ' active' : ''}`}
                role="tab"
                id={ARGOCD_APP_TAB_IDS.graph}
                aria-selected={activeTab === 'graph'}
                aria-controls={ARGOCD_APP_PANEL_IDS.graph}
                tabIndex={tabBarTabIndex(activeTab, 'graph')}
                onClick={() => onTabChange('graph')}
                onKeyDown={(event) => handleTabKeyDown(event, 'graph')}
            >
                Graph
            </button>
            <button
                ref={detailsTabRef}
                type="button"
                className={`argocd-tab${activeTab === 'details' ? ' active' : ''}`}
                role="tab"
                id={ARGOCD_APP_TAB_IDS.details}
                aria-selected={activeTab === 'details'}
                aria-controls={ARGOCD_APP_PANEL_IDS.details}
                tabIndex={tabBarTabIndex(activeTab, 'details')}
                onClick={() => onTabChange('details')}
                onKeyDown={(event) => handleTabKeyDown(event, 'details')}
            >
                Details
            </button>
        </div>
    );
}
