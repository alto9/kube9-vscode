const RECOVERY_HINTS: Array<{ pattern: RegExp; hint: string }> = [
    {
        pattern: /permission|rbac|denied/i,
        hint: 'Check your RBAC permissions for this cluster and namespace.'
    },
    {
        pattern: /connect|unreachable|connection/i,
        hint: 'Verify the cluster is reachable and your kubeconfig context is correct.'
    },
    {
        pattern: /timeout|timed out/i,
        hint: 'The cluster may be slow to respond. Close and reopen this panel to retry.'
    },
    {
        pattern: /not found|deleted/i,
        hint: 'The Application may have been removed. Refresh the cluster tree and try again.'
    },
    {
        pattern: /kubectl.*not.*(installed|path)/i,
        hint: 'Install kubectl and ensure it is available on your PATH.'
    }
];

export const DEFAULT_ERROR_RECOVERY_HINT =
    'Close and reopen this panel to retry, or use Refresh after fixing the underlying issue.';

export function getErrorRecoveryHint(message: string): string {
    for (const entry of RECOVERY_HINTS) {
        if (entry.pattern.test(message)) {
            return entry.hint;
        }
    }
    return DEFAULT_ERROR_RECOVERY_HINT;
}
