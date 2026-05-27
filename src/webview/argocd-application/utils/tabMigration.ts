export type TabType = 'graph' | 'details';

/** Legacy tab values persisted before the Graph | Details refactor (#162). */
type LegacyTabType = 'overview' | 'driftDetails';

/**
 * Maps persisted tab selection to the current tab model.
 * Legacy overview/drift values restore to Details; unknown values default to Graph.
 */
export function migratePersistedTab(tab: TabType | LegacyTabType | undefined): TabType {
    if (tab === 'overview' || tab === 'driftDetails') {
        return 'details';
    }
    if (tab === 'graph' || tab === 'details') {
        return tab;
    }
    return 'graph';
}
