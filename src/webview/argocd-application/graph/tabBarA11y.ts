import type { TabType } from '../utils/tabMigration';

export const ARGOCD_APP_TAB_IDS = {
    graph: 'argocd-app-tab-graph',
    details: 'argocd-app-tab-details'
} as const;

export const ARGOCD_APP_PANEL_IDS = {
    graph: 'argocd-app-panel-graph',
    details: 'argocd-app-panel-details'
} as const;

export function tabBarTabIndex(activeTab: TabType, tab: TabType): 0 | -1 {
    return activeTab === tab ? 0 : -1;
}

export function nextTabFromArrowKey(activeTab: TabType, key: 'ArrowLeft' | 'ArrowRight'): TabType {
    if (key === 'ArrowRight') {
        return activeTab === 'graph' ? 'details' : 'graph';
    }
    return activeTab === 'graph' ? 'details' : 'graph';
}
