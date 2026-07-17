import type { Edge, Node } from '@xyflow/react';
import { LARGE_APP_KIND_GROUP_THRESHOLD } from './constants';
import type { FlowNodeData, GraphNodeData, KindGroupNodeData } from './types';

function buildGroupEdgeId(source: string, target: string): string {
    return `${source}->${target}:manages`;
}

export function buildKindGroupNodeId(kind: string): string {
    return `kind-group:${kind}`;
}

export function isKindGroupingActive(managedResourceCount: number): boolean {
    return managedResourceCount > LARGE_APP_KIND_GROUP_THRESHOLD;
}

interface KindMemberGroup {
    kind: string;
    members: Node<GraphNodeData>[];
}

function partitionNodes(nodes: Node<GraphNodeData>[]): {
    root: Node<GraphNodeData> | null;
    managed: Node<GraphNodeData>[];
} {
    const root = nodes.find((node) => node.data.dto.role === 'application') ?? null;
    const managed = nodes.filter((node) => node.data.dto.role === 'managed_resource');
    return { root, managed };
}

function groupManagedByKind(managed: Node<GraphNodeData>[]): KindMemberGroup[] {
    const byKind = new Map<string, Node<GraphNodeData>[]>();

    for (const node of managed) {
        const kind = node.data.dto.resourceKey?.kind ?? node.data.dto.kindLabel;
        const existing = byKind.get(kind) ?? [];
        existing.push(node);
        byKind.set(kind, existing);
    }

    return [...byKind.entries()]
        .sort(([leftKind], [rightKind]) => leftKind.localeCompare(rightKind))
        .map(([kind, members]) => ({ kind, members }));
}

function filterGroupMembers(
    members: Node<GraphNodeData>[],
    memberMatchesFilter?: (node: Node<GraphNodeData>) => boolean
): Node<GraphNodeData>[] {
    if (!memberMatchesFilter) {
        return members;
    }
    return members.filter(memberMatchesFilter);
}

export function applyKindGrouping(
    nodes: Node<GraphNodeData>[],
    edges: Edge[],
    expandedKinds: ReadonlySet<string>,
    memberMatchesFilter?: (node: Node<GraphNodeData>) => boolean
): {
    nodes: Node<FlowNodeData>[];
    edges: Edge[];
    isGrouped: boolean;
} {
    const { root, managed } = partitionNodes(nodes);
    if (!root || !isKindGroupingActive(managed.length)) {
        if (memberMatchesFilter && root) {
            const filteredManaged = filterGroupMembers(managed, memberMatchesFilter);
            const visibleIds = new Set([root.id, ...filteredManaged.map((node) => node.id)]);
            const filteredEdges = edges.filter(
                (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
            );
            return { nodes: [root, ...filteredManaged], edges: filteredEdges, isGrouped: false };
        }
        return { nodes, edges, isGrouped: false };
    }

    const groups = groupManagedByKind(managed)
        .map(({ kind, members }) => ({
            kind,
            members,
            matchingMembers: filterGroupMembers(members, memberMatchesFilter)
        }))
        .filter(({ matchingMembers }) => matchingMembers.length > 0);

    const kindGroupNodes: Node<KindGroupNodeData>[] = groups.map(({ kind, matchingMembers }) => ({
        id: buildKindGroupNodeId(kind),
        type: 'kindGroup',
        position: { x: 0, y: 0 },
        data: {
            kind,
            memberCount: matchingMembers.length,
            expanded: expandedKinds.has(kind),
            memberIds: matchingMembers.map((member) => member.id)
        },
        draggable: false,
        selectable: true
    }));

    const visibleManaged: Node<GraphNodeData>[] = [];
    for (const { kind, matchingMembers } of groups) {
        if (expandedKinds.has(kind)) {
            visibleManaged.push(...matchingMembers);
        }
    }

    const flowNodes: Node<FlowNodeData>[] = [root, ...kindGroupNodes, ...visibleManaged];
    const visibleManagedIds = new Set(visibleManaged.map((node) => node.id));
    const flowEdges: Edge[] = [];

    for (const { kind, matchingMembers } of groups) {
        const groupId = buildKindGroupNodeId(kind);
        flowEdges.push({
            id: buildGroupEdgeId(root.id, groupId),
            source: root.id,
            target: groupId,
            type: 'default',
            className: 'argocd-graph-edge'
        });

        if (expandedKinds.has(kind)) {
            for (const member of matchingMembers) {
                flowEdges.push({
                    id: buildGroupEdgeId(groupId, member.id),
                    source: groupId,
                    target: member.id,
                    type: 'default',
                    className: 'argocd-graph-edge'
                });
            }
        }
    }

    for (const edge of edges) {
        if (edge.source === root.id) {
            continue;
        }
        if (visibleManagedIds.has(edge.source) && visibleManagedIds.has(edge.target)) {
            flowEdges.push(edge);
        }
    }

    return { nodes: flowNodes, edges: flowEdges, isGrouped: true };
}

export function collectDtoNodeIds(nodes: Node<GraphNodeData>[]): Set<string> {
    return new Set(nodes.map((node) => node.id));
}
