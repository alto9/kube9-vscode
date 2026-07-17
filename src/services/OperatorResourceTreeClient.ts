import * as k8s from '@kubernetes/client-node';
import * as vscode from 'vscode';
import { Writable } from 'stream';
import type { ArgoCDResourceTreeResponse } from '../types/argocdResourceTree';
import { getKubernetesApiClient, type KubernetesApiClient } from '../kubernetes/apiClient';
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

export const OPERATOR_RESOURCE_TREE_DEFAULT_TIMEOUT_MS = 30_000;

export const RESOURCE_TREE_ENRICHMENT_LOG_PREFIX =
    '[INFO] Argo CD resource-tree enrichment unavailable';

export interface OperatorResourceTreeFetchInput {
    clusterContext: string;
    applicationName: string;
    applicationNamespace: string;
    cancellationToken?: vscode.CancellationToken;
    timeoutMs?: number;
}

export interface OperatorResourceTreeSuccess {
    ok: true;
    resourceTree: ArgoCDResourceTreeResponse;
}

export interface OperatorResourceTreeFailure {
    ok: false;
    code?: string;
    message: string;
}

export type OperatorResourceTreeResult = OperatorResourceTreeSuccess | OperatorResourceTreeFailure;

export interface OperatorExecResult {
    stdout: string;
    stderr: string;
}

export type OperatorExecFn = (
    clusterContext: string,
    commandArgs: string[],
    options: {
        cancellationToken?: vscode.CancellationToken;
        timeoutMs?: number;
    }
) => Promise<OperatorExecResult>;

let operatorExecFnOverride: OperatorExecFn | undefined;

/** Test hook: override kubectl exec behavior for operator CLI calls. */
export function setOperatorExecFnForTesting(fn: OperatorExecFn | undefined): void {
    operatorExecFnOverride = fn;
}

export function buildResourceTreeQueryArgs(
    applicationName: string,
    applicationNamespace: string
): string[] {
    return [
        'kube9-operator',
        'query',
        'argocd',
        'resource-tree',
        'get',
        applicationName,
        `--namespace=${applicationNamespace}`,
        '--format=json'
    ];
}

export function parseOperatorResourceTreeStdout(stdout: string): ArgoCDResourceTreeResponse | null {
    const trimmed = stdout.trim();
    if (trimmed === '') {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        return parsed as ArgoCDResourceTreeResponse;
    } catch {
        return null;
    }
}

export function parseOperatorResourceTreeStderr(stderr: string): { code?: string; message: string } {
    const trimmed = stderr.trim();
    if (trimmed === '') {
        return { message: 'Operator resource-tree query failed' };
    }

    try {
        const envelope = JSON.parse(trimmed) as { ok?: boolean; code?: string; message?: string };
        if (envelope.ok === false) {
            return {
                code: typeof envelope.code === 'string' ? envelope.code : undefined,
                message:
                    typeof envelope.message === 'string' && envelope.message.trim() !== ''
                        ? envelope.message
                        : envelope.code ?? 'Operator resource-tree query failed'
            };
        }
    } catch {
        // Fall through to raw stderr text.
    }

    return { message: trimmed };
}

function throwIfCancelled(token?: vscode.CancellationToken): void {
    if (token?.isCancellationRequested) {
        throw new vscode.CancellationError();
    }
}

async function defaultOperatorExec(
    clusterContext: string,
    commandArgs: string[],
    options: {
        cancellationToken?: vscode.CancellationToken;
        timeoutMs?: number;
    }
): Promise<OperatorExecResult> {
    throwIfCancelled(options.cancellationToken);

    const apiClient = getKubernetesApiClient();
    apiClient.setContext(clusterContext);

    const resolver = getOperatorNamespaceResolver();
    const namespace = await resolver.resolveNamespace(clusterContext);
    const podName = await getOperatorPodName(apiClient, namespace);

    const exec = new k8s.Exec(apiClient.getKubeConfig());
    const timeoutMs = options.timeoutMs ?? OPERATOR_RESOURCE_TREE_DEFAULT_TIMEOUT_MS;

    return new Promise<OperatorExecResult>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let settled = false;

        const finish = (error?: Error, result?: OperatorExecResult): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutHandle);
            options.cancellationToken?.onCancellationRequested(() => undefined);
            if (error) {
                reject(error);
                return;
            }
            resolve(result ?? { stdout, stderr });
        };

        const timeoutHandle = setTimeout(() => {
            finish(new Error('TIMEOUT'));
        }, timeoutMs);

        options.cancellationToken?.onCancellationRequested(() => {
            finish(new vscode.CancellationError());
        });

        const stdoutStream = new Writable({
            highWaterMark: 1024 * 1024,
            write(chunk: Buffer, _encoding: string, callback: () => void) {
                stdout += chunk.toString();
                callback();
            }
        });

        const stderrStream = new Writable({
            highWaterMark: 1024 * 1024,
            write(chunk: Buffer, _encoding: string, callback: () => void) {
                stderr += chunk.toString();
                callback();
            }
        });

        exec.exec(
            namespace,
            podName,
            'operator',
            commandArgs,
            stdoutStream,
            stderrStream,
            null,
            false,
            (status) => {
                throwIfCancelled(options.cancellationToken);
                if (status.status === 'Success') {
                    finish(undefined, { stdout, stderr });
                    return;
                }
                finish(new Error(stderr.trim() || status.message || 'Operator CLI failed'));
            }
        ).catch((error: Error) => {
            finish(new Error(`Failed to execute operator CLI: ${error.message}`));
        });
    });
}

async function getOperatorPodName(
    apiClient: KubernetesApiClient,
    namespace: string
): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({ namespace });

    const operatorPods = pods.items.filter((pod) => {
        const labels = pod.metadata?.labels;
        const hasLabel =
            labels?.['app.kubernetes.io/name'] === 'kube9-operator' ||
            labels?.['app'] === 'kube9-operator';
        const isRunning = pod.status?.phase === 'Running';
        const hasContainerReady = pod.status?.containerStatuses?.some(
            (containerStatus) => containerStatus.name === 'operator' && containerStatus.ready === true
        );
        return hasLabel && isRunning && hasContainerReady;
    });

    if (operatorPods.length === 0) {
        throw new Error(
            `No running kube9-operator pod found in namespace '${namespace}'. Ensure the operator is deployed and running.`
        );
    }

    const operatorPod = operatorPods[0];
    if (!operatorPod.metadata?.name) {
        throw new Error(`kube9-operator pod has no name in namespace '${namespace}'`);
    }

    return operatorPod.metadata.name;
}

export class OperatorResourceTreeClient {
    async fetchResourceTree(
        input: OperatorResourceTreeFetchInput
    ): Promise<OperatorResourceTreeResult> {
        throwIfCancelled(input.cancellationToken);

        const commandArgs = buildResourceTreeQueryArgs(
            input.applicationName,
            input.applicationNamespace
        );
        const execFn = operatorExecFnOverride ?? defaultOperatorExec;

        try {
            const { stdout, stderr } = await execFn(input.clusterContext, commandArgs, {
                cancellationToken: input.cancellationToken,
                timeoutMs: input.timeoutMs ?? OPERATOR_RESOURCE_TREE_DEFAULT_TIMEOUT_MS
            });

            throwIfCancelled(input.cancellationToken);

            const resourceTree = parseOperatorResourceTreeStdout(stdout);
            if (!resourceTree) {
                const parsedStderr = parseOperatorResourceTreeStderr(stderr);
                return {
                    ok: false,
                    code: parsedStderr.code ?? 'INTERNAL_ERROR',
                    message: parsedStderr.message
                };
            }

            return { ok: true, resourceTree };
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            if (message === 'TIMEOUT') {
                return { ok: false, code: 'TIMEOUT', message: 'Resource-tree query timed out' };
            }

            const parsedStderr = parseOperatorResourceTreeStderr(message);
            return {
                ok: false,
                code: parsedStderr.code ?? 'INTERNAL_ERROR',
                message: parsedStderr.message
            };
        }
    }
}
