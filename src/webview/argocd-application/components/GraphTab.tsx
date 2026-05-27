import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import { ArgoCDApplication } from '../../../types/argocd';

interface GraphTabProps {
    application: ArgoCDApplication;
    resourceGraph: ApplicationResourceGraph | null;
}

const placeholderStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    padding: '40px 20px',
    color: 'var(--vscode-descriptionForeground)',
    fontSize: '13px',
    fontFamily: 'var(--vscode-font-family)',
    textAlign: 'center',
    gap: '8px'
};

const summaryStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--vscode-descriptionForeground)'
};

/**
 * Graph tab placeholder until React Flow canvas lands in #163–#165.
 */
export function GraphTab({ application, resourceGraph }: GraphTabProps): React.JSX.Element {
    if (!resourceGraph) {
        return (
            <div style={placeholderStyle} data-testid="graph-tab-placeholder">
                <span>Graph loading…</span>
                <span style={summaryStyle}>Waiting for resource graph from {application.name}</span>
            </div>
        );
    }

    const managedNodeCount = resourceGraph.nodes.filter((node) => node.role === 'managed_resource').length;

    return (
        <div style={placeholderStyle} data-testid="graph-tab-summary">
            <span>Resource graph ready</span>
            <span style={summaryStyle}>
                {managedNodeCount} managed resource{managedNodeCount === 1 ? '' : 's'},{' '}
                {resourceGraph.edges.length} relationship{resourceGraph.edges.length === 1 ? '' : 's'}
            </span>
            <span style={summaryStyle}>
                Topology: {resourceGraph.topologyMode} ({resourceGraph.topologySource})
            </span>
        </div>
    );
}
