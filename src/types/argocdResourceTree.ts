/**
 * Subset of Argo CD GET /api/v1/applications/{name}/resource-tree response.
 * Live API shape may flatten resourceRef fields onto each node (see argoproj/argo-cd#14604).
 */

export interface ArgoCDResourceTreeParentRef {
    group?: string;
    kind?: string;
    name?: string;
    namespace?: string;
    uid?: string;
    version?: string;
}

export interface ArgoCDResourceTreeNodeHealth {
    status?: string;
    message?: string;
}

export interface ArgoCDResourceTreeNode {
    group?: string;
    kind?: string;
    namespace?: string;
    name?: string;
    version?: string;
    uid?: string;
    parentRefs?: ArgoCDResourceTreeParentRef[];
    health?: ArgoCDResourceTreeNodeHealth;
}

export interface ArgoCDResourceTreeResponse {
    nodes?: ArgoCDResourceTreeNode[];
    hosts?: unknown[];
    orphanedNodes?: ArgoCDResourceTreeNode[];
}
