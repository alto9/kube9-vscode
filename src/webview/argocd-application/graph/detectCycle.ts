export function graphHasCycle(
    nodeIds: readonly string[],
    edges: ReadonlyArray<{ source: string; target: string }>
): boolean {
    const adjacency = new Map<string, string[]>();
    for (const id of nodeIds) {
        adjacency.set(id, []);
    }
    for (const edge of edges) {
        adjacency.get(edge.source)?.push(edge.target);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): boolean => {
        if (visiting.has(nodeId)) {
            return true;
        }
        if (visited.has(nodeId)) {
            return false;
        }
        visiting.add(nodeId);
        for (const next of adjacency.get(nodeId) ?? []) {
            if (visit(next)) {
                return true;
            }
        }
        visiting.delete(nodeId);
        visited.add(nodeId);
        return false;
    };

    for (const nodeId of nodeIds) {
        if (visit(nodeId)) {
            return true;
        }
    }

    return false;
}
