/**
 * Typed postMessage contracts for the Argo CD application webview.
 *
 * Canonical message names and payloads: `.forge/integration/api_contracts.md`
 */

import type { ArgoCDApplication, HealthStatus, SyncStatus } from './argocd';
import type { ApplicationResourceGraph, TopologySource } from './applicationResourceGraph';

/** Reference to a managed resource node in graph action messages. */
export interface ResourceNodeRef {
    kind: string;
    name: string;
    namespace: string;
    group?: string;
    version?: string;
}

/** Phases for application-level and resource-level operations. */
export type OperationPhase = 'Running' | 'Succeeded' | 'Failed' | 'Error';

// ---------------------------------------------------------------------------
// Webview → extension
// ---------------------------------------------------------------------------

export interface ReadyWebviewMessage {
    type: 'ready';
}

export interface SyncWebviewMessage {
    type: 'sync';
}

export interface RefreshWebviewMessage {
    type: 'refresh';
}

export interface HardRefreshWebviewMessage {
    type: 'hardRefresh';
}

export interface ViewInTreeWebviewMessage {
    type: 'viewInTree';
}

export interface NavigateToResourceWebviewMessage {
    type: 'navigateToResource';
    kind: string;
    name: string;
    namespace: string;
}

export interface GraphRefreshWebviewMessage {
    type: 'graphRefresh';
    bypassCache?: boolean;
}

export interface ResourceActionWebviewMessage {
    type: 'resourceAction';
    actionId: string;
    kind: string;
    name: string;
    namespace: string;
    group?: string;
    version?: string;
}

export type WebviewToExtensionMessage =
    | ReadyWebviewMessage
    | SyncWebviewMessage
    | RefreshWebviewMessage
    | HardRefreshWebviewMessage
    | ViewInTreeWebviewMessage
    | NavigateToResourceWebviewMessage
    | GraphRefreshWebviewMessage
    | ResourceActionWebviewMessage;

// ---------------------------------------------------------------------------
// Extension → webview
// ---------------------------------------------------------------------------

export interface ApplicationDataExtensionMessage {
    type: 'applicationData';
    data: ArgoCDApplication;
}

export interface UpdateStatusExtensionMessage {
    type: 'updateStatus';
    syncStatus?: SyncStatus;
    healthStatus?: HealthStatus;
}

export interface OperationProgressExtensionMessage {
    type: 'operationProgress';
    phase: OperationPhase;
    message?: string;
}

export interface ResourceGraphExtensionMessage {
    type: 'resourceGraph';
    graph: ApplicationResourceGraph;
    topologySource: TopologySource;
    refreshedAt: string;
    truncated?: boolean;
    totalManagedCount?: number;
}

export interface ResourceActionProgressExtensionMessage {
    type: 'resourceActionProgress';
    actionId: string;
    phase: OperationPhase;
    message?: string;
    nodeRef?: ResourceNodeRef;
}

export interface ResourceActionResultExtensionMessage {
    type: 'resourceActionResult';
    actionId: string;
    success: boolean;
    message: string;
    nodeRef?: ResourceNodeRef;
}

export interface ErrorExtensionMessage {
    type: 'error';
    message: string;
}

export interface GraphErrorExtensionMessage {
    type: 'graphError';
    message: string;
}

export interface GraphDegradationExtensionMessage {
    type: 'graphDegradation';
    message: string;
}

export type ExtensionToWebviewMessage =
    | ApplicationDataExtensionMessage
    | UpdateStatusExtensionMessage
    | OperationProgressExtensionMessage
    | ResourceGraphExtensionMessage
    | ResourceActionProgressExtensionMessage
    | ResourceActionResultExtensionMessage
    | ErrorExtensionMessage
    | GraphErrorExtensionMessage
    | GraphDegradationExtensionMessage;

export type ArgoCDWebviewMessage = WebviewToExtensionMessage | ExtensionToWebviewMessage;

const WEBVIEW_MESSAGE_TYPES = new Set<string>([
    'ready',
    'sync',
    'refresh',
    'hardRefresh',
    'viewInTree',
    'navigateToResource',
    'graphRefresh',
    'resourceAction'
]);

const EXTENSION_MESSAGE_TYPES = new Set<string>([
    'applicationData',
    'updateStatus',
    'operationProgress',
    'resourceGraph',
    'resourceActionProgress',
    'resourceActionResult',
    'error',
    'graphError',
    'graphDegradation'
]);

const OPERATION_PHASES = new Set<string>(['Running', 'Succeeded', 'Failed', 'Error']);

const TOPOLOGY_SOURCES = new Set<string>([
    'crd_flat',
    'argocd_resource_tree',
    'kubernetes_owner_ref',
    'operator_snapshot'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isOptionalBoolean(value: unknown): boolean {
    return value === undefined || typeof value === 'boolean';
}

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isResourceNodeRef(value: unknown): value is ResourceNodeRef {
    if (!isRecord(value)) {
        return false;
    }
    return (
        isNonEmptyString(value.kind) &&
        isNonEmptyString(value.name) &&
        isNonEmptyString(value.namespace) &&
        isOptionalString(value.group) &&
        isOptionalString(value.version)
    );
}

function isApplicationResourceGraph(value: unknown): value is ApplicationResourceGraph {
    if (!isRecord(value)) {
        return false;
    }
    return (
        isRecord(value.applicationKey) &&
        isNonEmptyString(value.applicationKey.context) &&
        isNonEmptyString(value.applicationKey.namespace) &&
        isNonEmptyString(value.applicationKey.name) &&
        Array.isArray(value.nodes) &&
        Array.isArray(value.edges) &&
        TOPOLOGY_SOURCES.has(String(value.topologySource)) &&
        (value.topologyMode === 'full' || value.topologyMode === 'limited') &&
        isNonEmptyString(value.structureVersion) &&
        isNonEmptyString(value.observedAt)
    );
}

function validateWebviewPayload(type: string, payload: Record<string, unknown>): boolean {
    switch (type) {
        case 'ready':
        case 'sync':
        case 'refresh':
        case 'hardRefresh':
        case 'viewInTree':
            return true;
        case 'navigateToResource':
            return (
                isNonEmptyString(payload.kind) &&
                isNonEmptyString(payload.name) &&
                isNonEmptyString(payload.namespace)
            );
        case 'graphRefresh':
            return isOptionalBoolean(payload.bypassCache);
        case 'resourceAction':
            return (
                isNonEmptyString(payload.actionId) &&
                isNonEmptyString(payload.kind) &&
                isNonEmptyString(payload.name) &&
                isNonEmptyString(payload.namespace) &&
                isOptionalString(payload.group) &&
                isOptionalString(payload.version)
            );
        default:
            return false;
    }
}

function validateExtensionPayload(type: string, payload: Record<string, unknown>): boolean {
    switch (type) {
        case 'applicationData':
            return isRecord(payload.data);
        case 'updateStatus':
            return (
                (payload.syncStatus === undefined || isRecord(payload.syncStatus)) &&
                (payload.healthStatus === undefined || isRecord(payload.healthStatus))
            );
        case 'operationProgress':
            return (
                typeof payload.phase === 'string' &&
                OPERATION_PHASES.has(payload.phase) &&
                isOptionalString(payload.message)
            );
        case 'resourceGraph':
            return (
                isApplicationResourceGraph(payload.graph) &&
                TOPOLOGY_SOURCES.has(String(payload.topologySource)) &&
                isNonEmptyString(payload.refreshedAt) &&
                isOptionalBoolean(payload.truncated) &&
                (payload.totalManagedCount === undefined || typeof payload.totalManagedCount === 'number')
            );
        case 'resourceActionProgress':
            return (
                isNonEmptyString(payload.actionId) &&
                typeof payload.phase === 'string' &&
                OPERATION_PHASES.has(payload.phase) &&
                isOptionalString(payload.message) &&
                (payload.nodeRef === undefined || isResourceNodeRef(payload.nodeRef))
            );
        case 'resourceActionResult':
            return (
                isNonEmptyString(payload.actionId) &&
                typeof payload.success === 'boolean' &&
                isNonEmptyString(payload.message) &&
                (payload.nodeRef === undefined || isResourceNodeRef(payload.nodeRef))
            );
        case 'error':
        case 'graphError':
        case 'graphDegradation':
            return isNonEmptyString(payload.message);
        default:
            return false;
    }
}

/** Returns true when value is a valid webview → extension message. */
export function isWebviewMessage(value: unknown): value is WebviewToExtensionMessage {
    if (!isRecord(value) || typeof value.type !== 'string') {
        return false;
    }
    if (!WEBVIEW_MESSAGE_TYPES.has(value.type)) {
        return false;
    }
    return validateWebviewPayload(value.type, value);
}

/** Returns true when value is a valid resourceAction webview message. */
export function isResourceActionMessage(value: unknown): value is ResourceActionWebviewMessage {
    return isWebviewMessage(value) && value.type === 'resourceAction';
}

/** Returns true when value is a valid graphRefresh webview message. */
export function isGraphRefreshMessage(value: unknown): value is GraphRefreshWebviewMessage {
    return isWebviewMessage(value) && value.type === 'graphRefresh';
}

/** Returns true when value is a valid extension → webview message. */
export function isExtensionMessage(value: unknown): value is ExtensionToWebviewMessage {
    if (!isRecord(value) || typeof value.type !== 'string') {
        return false;
    }
    if (!EXTENSION_MESSAGE_TYPES.has(value.type)) {
        return false;
    }
    return validateExtensionPayload(value.type, value);
}

/** Returns true when value is a valid resourceGraph extension message. */
export function isResourceGraphMessage(value: unknown): value is ResourceGraphExtensionMessage {
    return isExtensionMessage(value) && value.type === 'resourceGraph';
}

/** Build a host → webview resourceGraph message. */
export function buildResourceGraphMessage(input: {
    graph: ApplicationResourceGraph;
    topologySource: TopologySource;
    refreshedAt: string;
    truncated?: boolean;
    totalManagedCount?: number;
}): ResourceGraphExtensionMessage {
    return {
        type: 'resourceGraph',
        graph: input.graph,
        topologySource: input.topologySource,
        refreshedAt: input.refreshedAt,
        ...(input.truncated !== undefined ? { truncated: input.truncated } : {}),
        ...(input.totalManagedCount !== undefined ? { totalManagedCount: input.totalManagedCount } : {})
    };
}
