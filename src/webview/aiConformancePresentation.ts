/** Pure helpers for Kubernetes AI Conformance report rendering (shared by webview bundle and unit tests). */

export type AIConformanceStatus =
    | 'passed'
    | 'failed'
    | 'warning'
    | 'not-applicable'
    | 'not-evaluated'
    | 'needs-evidence';

export interface AIConformanceRequirementRow {
    id: string;
    category: string;
    level: 'MUST' | 'SHOULD';
    title: string;
    status: AIConformanceStatus;
    rationale: string;
}

export interface AIConformanceCategoryRollup {
    total: number;
    passed: number;
    failed: number;
    warning: number;
    notApplicable: number;
    notEvaluated: number;
    needsEvidence: number;
}

const NEUTRAL_STATUSES: ReadonlySet<AIConformanceStatus> = new Set([
    'not-applicable',
    'not-evaluated',
    'needs-evidence',
]);

const OUTCOME_STATUSES: ReadonlySet<AIConformanceStatus> = new Set(['passed', 'failed', 'warning']);

/** CSS class for a status badge; neutral statuses avoid pass/fail coloring. */
export function statusBadgeClass(status: AIConformanceStatus): string {
    const base = 'status-pill';
    if (status === 'passed') {
        return `${base} status-passed`;
    }
    if (status === 'failed') {
        return `${base} status-failed`;
    }
    if (status === 'warning') {
        return `${base} status-warning`;
    }
    if (status === 'not-applicable') {
        return `${base} status-not-applicable`;
    }
    if (status === 'not-evaluated') {
        return `${base} status-not-evaluated`;
    }
    if (status === 'needs-evidence') {
        return `${base} status-needs-evidence`;
    }
    return base;
}

/** Visible text label for a status badge (accessibility: never color-only). */
export function statusDisplayLabel(status: AIConformanceStatus): string {
    switch (status) {
        case 'passed':
            return 'Passed';
        case 'failed':
            return 'Failed';
        case 'warning':
            return 'Warning';
        case 'not-applicable':
            return 'Not applicable';
        case 'not-evaluated':
            return 'Not evaluated';
        case 'needs-evidence':
            return 'Needs evidence';
        default:
            return status;
    }
}

export function isNeutralEvidenceStatus(status: AIConformanceStatus): boolean {
    return NEUTRAL_STATUSES.has(status);
}

export function shouldShowRequirementDetail(row: AIConformanceRequirementRow): boolean {
    if (OUTCOME_STATUSES.has(row.status) && row.rationale.trim()) {
        return true;
    }
    return isNeutralEvidenceStatus(row.status);
}

export function detailCopyForRequirement(row: AIConformanceRequirementRow): string {
    if (row.rationale.trim()) {
        return row.rationale.trim();
    }
    if (row.status === 'needs-evidence') {
        return 'This requirement needs external evidence or policy review before readiness can be assessed.';
    }
    if (row.status === 'not-evaluated') {
        return 'This requirement was not evaluated in the latest operator run.';
    }
    if (row.status === 'not-applicable') {
        return 'This requirement does not apply to this cluster configuration.';
    }
    return '';
}

/** Group requirements by category, preserving operator category order from the rollup map. */
export function groupRequirementsByCategory(
    categories: Record<string, AIConformanceCategoryRollup>,
    requirements: AIConformanceRequirementRow[]
): Array<{ categoryId: string; rollup: AIConformanceCategoryRollup; rows: AIConformanceRequirementRow[] }> {
    return Object.entries(categories).map(([categoryId, rollup]) => ({
        categoryId,
        rollup,
        rows: requirements.filter((row) => row.category === categoryId),
    }));
}

/** Human-readable overall readiness from operator outcome fields. */
export function formatOverallReadiness(
    lastOutcome: 'none' | 'success' | 'failed',
    runState: 'completed' | 'failed' | 'partial' | null
): string {
    if (lastOutcome === 'none') {
        return 'No completed run';
    }
    if (lastOutcome === 'success' && runState === 'completed') {
        return 'Latest run completed';
    }
    if (lastOutcome === 'failed' || runState === 'failed') {
        return 'Latest run failed';
    }
    if (runState === 'partial') {
        return 'Latest run partial';
    }
    return 'Latest run completed';
}
