import type { ResourceGraphNode } from '../../../types/applicationResourceGraph';

export interface GraphNodeData {
    dto: ResourceGraphNode;
    [key: string]: unknown;
}

export interface KindGroupNodeData {
    kind: string;
    memberCount: number;
    expanded: boolean;
    memberIds: string[];
    [key: string]: unknown;
}

export type FlowNodeData = GraphNodeData | KindGroupNodeData;

export function isGraphNodeData(data: FlowNodeData): data is GraphNodeData {
    return 'dto' in data;
}

export function isKindGroupNodeData(data: FlowNodeData): data is KindGroupNodeData {
    return 'kind' in data && 'memberCount' in data && !('dto' in data);
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
