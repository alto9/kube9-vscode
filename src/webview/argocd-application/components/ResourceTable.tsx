import React from 'react';
import { ArgoCDResource } from '../../../types/argocd';
import { ResourceRow } from './ResourceRow';

interface ResourceTableProps {
    resources: ArgoCDResource[];
    onNavigate: (kind: string, name: string, namespace: string) => void;
}

/**
 * Table component displaying resources with columns: Kind, Name, Namespace, Sync Status, Health Status.
 */
export function ResourceTable({ resources, onNavigate }: ResourceTableProps): React.JSX.Element {
    const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

    const toggleRow = (resourceId: string): void => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(resourceId)) {
                next.delete(resourceId);
            } else {
                next.add(resourceId);
            }
            return next;
        });
    };

    const getResourceId = (resource: ArgoCDResource): string => {
        return `${resource.kind}:${resource.namespace}:${resource.name}`;
    };

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)'
    };

    const headerStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        borderBottom: '2px solid var(--vscode-panel-border)',
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const emptyStateStyle: React.CSSProperties = {
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)'
    };

    if (resources.length === 0) {
        return (
            <div style={emptyStateStyle}>
                No resources found
            </div>
        );
    }

    return (
        <table style={tableStyle}>
            <thead>
                <tr>
                    <th style={{ ...headerStyle, width: '32px' }}></th>
                    <th style={headerStyle}>Kind</th>
                    <th style={headerStyle}>Name</th>
                    <th style={headerStyle}>Namespace</th>
                    <th style={headerStyle}>Sync Status</th>
                    <th style={headerStyle}>Health Status</th>
                </tr>
            </thead>
            <tbody>
                {resources.map((resource) => {
                    const resourceId = getResourceId(resource);
                    return (
                        <ResourceRow
                            key={resourceId}
                            resource={resource}
                            isExpanded={expandedRows.has(resourceId)}
                            onToggle={() => toggleRow(resourceId)}
                            onNavigate={onNavigate}
                        />
                    );
                })}
            </tbody>
        </table>
    );
}

