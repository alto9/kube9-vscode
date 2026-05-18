import React, { useCallback, useEffect, useState } from 'react';
import type { CRDDescribeData } from '../../providers/CRDDescribeProvider';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';

const vscodeApi: VSCodeAPI | undefined =
    typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscodeApi && typeof window !== 'undefined') {
    (window as Window & { vscodeApi?: VSCodeAPI }).vscodeApi = vscodeApi;
}

type CRDDescribeTab =
    | 'overview'
    | 'versions'
    | 'schemas'
    | 'instances'
    | 'conditions'
    | 'yaml';

export const CRDDescribeApp: React.FC = () => {
    const [data, setData] = useState<CRDDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<CRDDescribeTab>('overview');
    const loading = data === null && error === null;

    const sendMessage = useCallback((message: WebviewToExtensionMessage) => {
        vscodeApi?.postMessage(message);
    }, []);

    useEffect(() => {
        if (!vscodeApi) {
            return;
        }
        const handler = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            switch (message.command) {
                case 'updateCRDDescribeData':
                    setData(message.data as CRDDescribeData);
                    setError(null);
                    break;
                case 'showError':
                    setError((message.data as { message: string }).message);
                    setData(null);
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('message', handler);
        sendMessage({ command: 'ready' });
        return () => window.removeEventListener('message', handler);
    }, [sendMessage]);

    const handleRefresh = useCallback(() => sendMessage({ command: 'refresh' }), [sendMessage]);
    const handleViewYaml = useCallback(() => sendMessage({ command: 'viewYaml' }), [sendMessage]);

    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <div className="loading-message">Loading CRD details...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pod-describe-container">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <div className="error-message">{error}</div>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const headerActions: WebviewHeaderAction[] = [
        { label: 'Refresh', icon: 'codicon-refresh', onClick: handleRefresh },
        { label: 'View YAML', icon: 'codicon-file-code', onClick: handleViewYaml }
    ];

    const instanceCountLabel = data.instances.fetchError
        ? 'Instances'
        : `Instances (${data.instances.totalReturned}${data.instances.truncated ? '+' : ''})`;

    return (
        <div className="pod-describe-container">
            <div className="container">
                <WebviewHeader
                    title={`CRD / ${data.overview.kind}`}
                    actions={headerActions}
                    helpContext="describe-webview"
                />
                <div className="resource-info" style={{ marginBottom: 12, opacity: 0.85, fontSize: '0.9em' }}>
                    Definition: {data.overview.metadataName}
                </div>

                <nav className="tab-navigation">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'versions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('versions')}
                    >
                        Versions ({data.versions.length})
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'schemas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('schemas')}
                    >
                        Schema ({data.schemas.length})
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'instances' ? 'active' : ''}`}
                        onClick={() => setActiveTab('instances')}
                    >
                        {instanceCountLabel}
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('conditions')}
                    >
                        Conditions ({data.conditions.length})
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'yaml' ? 'active' : ''}`}
                        onClick={() => setActiveTab('yaml')}
                    >
                        YAML
                    </button>
                </nav>

                <main className="tab-content">
                    {activeTab === 'overview' && <OverviewPanel d={data} />}
                    {activeTab === 'versions' && <VersionsPanel versions={data.versions} />}
                    {activeTab === 'schemas' && <SchemasPanel schemas={data.schemas} />}
                    {activeTab === 'instances' && <InstancesPanel instances={data.instances} />}
                    {activeTab === 'conditions' && <ConditionsPanel conditions={data.conditions} />}
                    {activeTab === 'yaml' && <YamlPanel yamlText={data.yaml} />}
                </main>
            </div>
        </div>
    );
};

const OverviewPanel: React.FC<{ d: CRDDescribeData }> = ({ d }) => {
    const o = d.overview;
    return (
        <div className="section overview-tab">
            <div className="section">
                <h2>Definition</h2>
                <div className="info-grid">
                    <div className="info-item">
                        <div className="info-label">Kind</div>
                        <div className="info-value">{o.kind}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Plural</div>
                        <div className="info-value">{o.plural}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Group</div>
                        <div className="info-value">{o.group || '—'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Scope</div>
                        <div className="info-value">{o.scope}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Storage version</div>
                        <div className="info-value">{o.storageVersion || '—'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Served versions</div>
                        <div className="info-value">{o.servedVersions.length ? o.servedVersions.join(', ') : '—'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Categories</div>
                        <div className="info-value">{o.categories.length ? o.categories.join(', ') : '—'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Age</div>
                        <div className="info-value">{o.age}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Created</div>
                        <div className="info-value">{o.creationTimestamp}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VersionsPanel: React.FC<{ versions: CRDDescribeData['versions'] }> = ({ versions }) => {
    if (versions.length === 0) {
        return <p className="empty-hint">No versions defined on this CRD.</p>;
    }
    return (
        <div className="section">
            <table className="conditions-table">
                <thead>
                    <tr>
                        <th>Version</th>
                        <th>Served</th>
                        <th>Storage</th>
                        <th>Deprecated</th>
                    </tr>
                </thead>
                <tbody>
                    {versions.map(v => (
                        <tr key={v.name}>
                            <td>{v.name}</td>
                            <td>{v.served ? 'Yes' : 'No'}</td>
                            <td>{v.storage ? 'Yes' : 'No'}</td>
                            <td>{v.deprecated ? 'Yes' : 'No'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const SchemasPanel: React.FC<{ schemas: CRDDescribeData['schemas'] }> = ({ schemas }) => {
    if (schemas.length === 0) {
        return (
            <p className="empty-hint">
                No per-version structural schema (OpenAPI v3) is published for served versions of this CRD.
            </p>
        );
    }
    return (
        <div className="section">
            {schemas.map(s => (
                <details key={s.versionName} open={schemas.length === 1} style={{ marginBottom: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Version {s.versionName}</summary>
                    <pre
                        className="code-block schema-block"
                        style={{
                            overflow: 'auto',
                            maxHeight: 480,
                            fontSize: 12,
                            marginTop: 8,
                            padding: 8,
                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                            borderRadius: 4
                        }}
                    >
                        {s.schemaText}
                    </pre>
                </details>
            ))}
        </div>
    );
};

const InstancesPanel: React.FC<{ instances: CRDDescribeData['instances'] }> = ({ instances }) => {
    if (instances.fetchError) {
        return (
            <div className="section">
                <div
                    style={{
                        padding: 12,
                        borderRadius: 4,
                        border: '1px solid var(--vscode-inputValidation-errorBorder)',
                        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                        marginBottom: 12
                    }}
                >
                    <strong>Unable to list custom resources:</strong>
                    <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{instances.fetchError}</div>
                </div>
                <p className="empty-hint">
                    This is usually RBAC or API discovery related—metadata about the CRD above is still valid.
                </p>
            </div>
        );
    }
    if (instances.sample.length === 0) {
        return (
            <p className="empty-hint">
                No {instances.scope === 'Namespaced' ? 'namespaced' : 'cluster-scoped'} instances found (or none
                returned in this sample).
            </p>
        );
    }
    return (
        <div className="section">
            {instances.scope === 'Namespaced' ? (
                <p style={{ opacity: 0.85, marginBottom: 8 }}>
                    Namespaced CRD — instances show with namespace. Showing up to{' '}
                    {instances.sample.length}
                    {instances.truncated ? ' (truncated)' : ''}.
                </p>
            ) : (
                <p style={{ opacity: 0.85, marginBottom: 8 }}>
                    Cluster-scoped CRD — instances listed without namespace. Showing up to{' '}
                    {instances.sample.length}
                    {instances.truncated ? ' (truncated)' : ''}.
                </p>
            )}
            <table className="conditions-table">
                <thead>
                    <tr>
                        {instances.scope === 'Namespaced' && <th>Namespace</th>}
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    {instances.sample.map(row => (
                        <tr key={`${row.namespace || ''}:${row.name}`}>
                            {instances.scope === 'Namespaced' && <td>{row.namespace}</td>}
                            <td>{row.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ConditionsPanel: React.FC<{ conditions: CRDDescribeData['conditions'] }> = ({ conditions }) => {
    if (conditions.length === 0) {
        return <p className="empty-hint">No status conditions reported on this CRD.</p>;
    }
    return (
        <div className="section">
            <table className="conditions-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    {conditions.map(c => (
                        <tr key={`${c.type}-${c.status}`}>
                            <td>{c.type}</td>
                            <td>{c.status}</td>
                            <td>{c.reason || '—'}</td>
                            <td>{c.message || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const YamlPanel: React.FC<{ yamlText: string }> = ({ yamlText }) => (
    <div className="section">
        <pre
            className="code-block yaml-block"
            style={{
                overflow: 'auto',
                maxHeight: '70vh',
                fontSize: 12,
                padding: 8,
                background: 'var(--vscode-editor-inactiveSelectionBackground)',
                borderRadius: 4
            }}
        >
            {yamlText}
        </pre>
        <p className="empty-hint" style={{ marginTop: 8 }}>
            Use <strong>View YAML</strong> in the header to open this CustomResourceDefinition in the YAML editor.
        </p>
    </div>
);
