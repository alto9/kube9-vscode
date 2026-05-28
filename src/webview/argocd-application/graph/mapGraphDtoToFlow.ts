import type { Edge, Node } from '@xyflow/react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import type { GraphNodeData } from './types';

export function mapGraphDtoToFlow(graph: ApplicationResourceGraph): {
    nodes: Node<GraphNodeData>[];
    edges: Edge[];
} {
    const nodes: Node<GraphNodeData>[] = graph.nodes.map((dto) => ({
        id: dto.id,
        type: 'resourceGraph',
        position: { x: 0, y: 0 },
        data: { dto },
        draggable: false,
        selectable: true
    }));

    const edges: Edge[] = graph.edges.map((dto) => ({
        id: dto.id,
        source: dto.source,
        target: dto.target,
        type: 'default',
        className: 'argocd-graph-edge'
    }));

    return { nodes, edges };
}
