/**
 * Heuristic checks that serialized telemetry JSON does not echo observability.md
 * "Never send" categories (paths, manifest snippets, multiline blobs).
 * Used by payloadForbidListVerification.test.ts — not production code.
 */

export interface ForbidListRule {
    readonly id: string;
    readonly test: (json: string, parsed: Record<string, unknown>) => string | null;
}

function anyValueTooLongOrMultiline(parsed: Record<string, unknown>, maxLen: number): string | null {
    for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== 'string') {
            return `non-string value for ${k}`;
        }
        if (v.includes('\n') || v.includes('\r')) {
            return `multiline value for ${k}`;
        }
        if (v.length > maxLen) {
            return `value for ${k} exceeds ${maxLen} characters`;
        }
    }
    return null;
}

/** Rules applied to JSON.stringify output of allowlisted telemetry payloads. */
export const FORBID_LIST_PAYLOAD_RULES: ForbidListRule[] = [
    {
        id: 'kubeconfig_path_marker',
        test: (json) => (/\.kube(\/|\\|'|"|$|\s)/i.test(json) ? 'matches .kube path marker' : null),
    },
    {
        id: 'unix_home_path',
        test: (json) => (/[/\\](Users|home)[/\\]/i.test(json) ? 'matches Unix/macOS home path segment' : null),
    },
    {
        id: 'windows_drive_path',
        test: (json) => (/[A-Za-z]:\\/.test(json) ? 'matches Windows drive path' : null),
    },
    {
        id: 'k8s_manifest_apiversion',
        test: (json) => (/apiVersion\s*:/i.test(json) ? 'matches Kubernetes manifest apiVersion marker' : null),
    },
    {
        id: 'bounded_scalar_strings',
        test: (_json, parsed) => anyValueTooLongOrMultiline(parsed, 256),
    },
];

export function violationsForTelemetryPayloadJson(json: string): string[] {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(json) as Record<string, unknown>;
    } catch {
        return ['invalid JSON'];
    }
    const out: string[] = [];
    for (const rule of FORBID_LIST_PAYLOAD_RULES) {
        const hit = rule.test(json, parsed);
        if (hit !== null) {
            out.push(`${rule.id}: ${hit}`);
        }
    }
    return out;
}
