import {
    AIConformanceCategoryRollup,
    AIConformanceRequirementRow,
    AIConformanceStatus,
    AIConformanceSummary,
    AIConformanceTotals,
    OperatorStatus,
} from './OperatorStatusTypes';

export type OperatorStatusParseLogger = (message: string) => void;

const AI_CONFORMANCE_STATUSES = new Set<AIConformanceStatus>([
    'passed',
    'failed',
    'warning',
    'not-applicable',
    'not-evaluated',
    'needs-evidence',
]);

const ZERO_AI_CONFORMANCE_TOTALS: AIConformanceTotals = {
    totalRequirements: 0,
    mustRequirements: 0,
    shouldRequirements: 0,
    passed: 0,
    failed: 0,
    warning: 0,
    notApplicable: 0,
    notEvaluated: 0,
    needsEvidence: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readLastOutcome(value: unknown): AIConformanceSummary['lastOutcome'] {
    if (value === 'none' || value === 'success' || value === 'failed') {
        return value;
    }
    return 'none';
}

function readRunState(value: unknown): AIConformanceSummary['runState'] {
    if (value === 'completed' || value === 'failed' || value === 'partial') {
        return value;
    }
    return null;
}

function readRequirementLevel(value: unknown): AIConformanceRequirementRow['level'] {
    return value === 'SHOULD' ? 'SHOULD' : 'MUST';
}

export function normalizeAIConformanceStatus(
    raw: unknown,
    log: OperatorStatusParseLogger,
    context: string
): AIConformanceStatus {
    if (typeof raw === 'string' && AI_CONFORMANCE_STATUSES.has(raw as AIConformanceStatus)) {
        return raw as AIConformanceStatus;
    }

    const unexpected = raw === undefined || raw === null ? '<missing>' : String(raw);
    log(
        `[WARNING] Unknown AI conformance status ${context}: "${unexpected}"; normalized to not-evaluated`
    );
    return 'not-evaluated';
}

function parseTotals(raw: unknown): AIConformanceTotals {
    if (!isRecord(raw)) {
        return { ...ZERO_AI_CONFORMANCE_TOTALS };
    }

    return {
        totalRequirements: readNumber(raw.totalRequirements),
        mustRequirements: readNumber(raw.mustRequirements),
        shouldRequirements: readNumber(raw.shouldRequirements),
        passed: readNumber(raw.passed),
        failed: readNumber(raw.failed),
        warning: readNumber(raw.warning),
        notApplicable: readNumber(raw.notApplicable),
        notEvaluated: readNumber(raw.notEvaluated),
        needsEvidence: readNumber(raw.needsEvidence),
    };
}

function parseCategoryRollup(raw: unknown): AIConformanceCategoryRollup {
    if (!isRecord(raw)) {
        return {
            total: 0,
            passed: 0,
            failed: 0,
            warning: 0,
            notApplicable: 0,
            notEvaluated: 0,
            needsEvidence: 0,
        };
    }

    return {
        total: readNumber(raw.total),
        passed: readNumber(raw.passed),
        failed: readNumber(raw.failed),
        warning: readNumber(raw.warning),
        notApplicable: readNumber(raw.notApplicable),
        notEvaluated: readNumber(raw.notEvaluated),
        needsEvidence: readNumber(raw.needsEvidence),
    };
}

function parseCategories(
    raw: unknown,
    log: OperatorStatusParseLogger
): Record<string, AIConformanceCategoryRollup> {
    if (!isRecord(raw)) {
        return {};
    }

    const categories: Record<string, AIConformanceCategoryRollup> = {};
    for (const [key, value] of Object.entries(raw)) {
        categories[key] = parseCategoryRollup(value);
        if (!isRecord(value)) {
            log(`[WARNING] AI conformance category "${key}" was not an object; using zeroed rollup counts`);
        }
    }
    return categories;
}

function parseRequirementRow(
    raw: unknown,
    log: OperatorStatusParseLogger,
    index: number
): AIConformanceRequirementRow | null {
    if (!isRecord(raw)) {
        log(`[WARNING] AI conformance requirement at index ${index} was not an object; skipping row`);
        return null;
    }

    const id = readString(raw.id);
    if (!id) {
        log(`[WARNING] AI conformance requirement at index ${index} is missing id; skipping row`);
        return null;
    }

    return {
        id,
        category: readString(raw.category),
        level: readRequirementLevel(raw.level),
        title: readString(raw.title),
        status: normalizeAIConformanceStatus(raw.status, log, `for requirement "${id}"`),
        rationale: readString(raw.rationale),
    };
}

export function parseAIConformanceSummary(
    raw: unknown,
    log: OperatorStatusParseLogger = () => {}
): AIConformanceSummary | undefined {
    if (raw === undefined || raw === null) {
        return undefined;
    }

    if (!isRecord(raw)) {
        log('[WARNING] Operator status aiConformance was not an object; omitting conformance summary');
        return undefined;
    }

    const requirementsRaw = raw.requirements;
    const requirements: AIConformanceRequirementRow[] = [];
    if (Array.isArray(requirementsRaw)) {
        requirementsRaw.forEach((row, index) => {
            const parsed = parseRequirementRow(row, log, index);
            if (parsed) {
                requirements.push(parsed);
            }
        });
    } else if (requirementsRaw !== undefined) {
        log('[WARNING] Operator status aiConformance.requirements was not an array; using empty requirements');
    }

    return {
        checklistVersion: readString(raw.checklistVersion, 'unknown'),
        kubernetesMinor: readString(raw.kubernetesMinor, 'unknown'),
        sourceRevision: readNullableString(raw.sourceRevision),
        lastCompletedAt: readNullableString(raw.lastCompletedAt),
        lastOutcome: readLastOutcome(raw.lastOutcome),
        runState: readRunState(raw.runState),
        runId: readNullableString(raw.runId),
        totals: parseTotals(raw.totals),
        categories: parseCategories(raw.categories, log),
        requirements,
        error: readNullableString(raw.error),
        schedulingEnabled: raw.schedulingEnabled === true,
        scheduleIntervalSeconds:
            typeof raw.scheduleIntervalSeconds === 'number' ? raw.scheduleIntervalSeconds : null,
        checklistSource: readNullableString(raw.checklistSource),
    };
}

/**
 * Normalizes a parsed operator status payload for extension consumption.
 * Strips raw evidence fields and normalizes conformance statuses.
 */
export function normalizeOperatorStatusPayload(
    raw: OperatorStatus,
    log: OperatorStatusParseLogger = () => {}
): OperatorStatus {
    const rawRecord = raw as unknown as Record<string, unknown>;
    const aiConformance = parseAIConformanceSummary(rawRecord.aiConformance, log);

    const normalized: OperatorStatus = { ...raw };
    if (aiConformance) {
        normalized.aiConformance = aiConformance;
    } else {
        delete normalized.aiConformance;
    }

    return normalized;
}
