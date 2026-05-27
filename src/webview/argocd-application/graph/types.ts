import type { ResourceGraphNode } from '../../../types/applicationResourceGraph';

export interface GraphNodeData {
    dto: ResourceGraphNode;
    [key: string]: unknown;
}

export interface LayoutPosition {
    x: number;
    y: number;
}

export interface GraphLayoutCache {
    positions: Map<string, LayoutPosition>;
    structureVersion: string | null;
    topologySource: string | null;
    nodeCount: number;
}
