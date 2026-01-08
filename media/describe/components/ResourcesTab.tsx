import React from 'react';
import { ResourceSummary, PodSummary, JobSummary, PVCSummary, ServiceSummary } from '../../../src/providers/NamespaceDescribeProvider';
import { VSCodeAPI } from '../types';

interface ResourcesTabProps {
    /** Resource summary data */
    resources: ResourceSummary;
    /** Namespace name */
    namespace: string;
    /** VS Code API for message passing */
    vscode: VSCodeAPI;
}

type HealthStatus = 'healthy' | 'degraded' | 'failed' | 'none';

interface ResourceRowProps {
    /** Resource type name */
    type: string;
    /** Total count */
    count: number;
    /** Details text (optional) */
    details?: string;
    /** Health status */
    health: HealthStatus;
    /** Click handler */
    onClick: () => void;
}

/**
 * Individual resource row component.
 */
const ResourceRow: React.FC<ResourceRowProps> = ({ type, count, details, health, onClick }) => {
    const getHealthIndicator = () => {
        if (health === 'none') return null;
        
        const healthClass = `health-indicator health-${health}`;
        return <span className={healthClass} aria-label={`Health status: ${health}`}></span>;
    };

    return (
        <div className="resource-row" onClick={onClick} role="button" tabIndex={0}>
            <div className="resource-type">
                {getHealthIndicator()}
                <span>{type}</span>
            </div>
            <div className="resource-count">{count}</div>
            {details && <div className="resource-details">{details}</div>}
        </div>
    );
};

/**
 * Calculate pod health status.
 * Green if all running, yellow if some pending, red if any failed.
 */
const calculatePodHealth = (pods: PodSummary): HealthStatus => {
    if (pods.total === 0) return 'none';
    if (pods.failed > 0) return 'failed';
    if (pods.pending > 0) return 'degraded';
    return 'healthy';
};

/**
 * Calculate job health status.
 * Yellow if any active, red if any failed.
 */
const calculateJobHealth = (jobs: JobSummary): HealthStatus => {
    if (jobs.total === 0) return 'none';
    if (jobs.failed > 0) return 'failed';
    if (jobs.active > 0) return 'degraded';
    return 'healthy';
};

/**
 * Calculate PVC health status.
 * Yellow if any pending, red if any lost.
 */
const calculatePVCHealth = (pvcs: PVCSummary): HealthStatus => {
    if (pvcs.total === 0) return 'none';
    if (pvcs.lost > 0) return 'failed';
    if (pvcs.pending > 0) return 'degraded';
    return 'healthy';
};

/**
 * Format pod details string.
 */
const formatPodDetails = (pods: PodSummary): string => {
    const parts: string[] = [];
    if (pods.running > 0) parts.push(`${pods.running} Running`);
    if (pods.pending > 0) parts.push(`${pods.pending} Pending`);
    if (pods.failed > 0) parts.push(`${pods.failed} Failed`);
    if (pods.succeeded > 0) parts.push(`${pods.succeeded} Succeeded`);
    return parts.join(', ') || 'No pods';
};

/**
 * Format service details string.
 */
const formatServiceDetails = (services: ServiceSummary): string => {
    const parts: string[] = [];
    if (services.clusterIP > 0) parts.push(`${services.clusterIP} ClusterIP`);
    if (services.nodePort > 0) parts.push(`${services.nodePort} NodePort`);
    if (services.loadBalancer > 0) parts.push(`${services.loadBalancer} LoadBalancer`);
    if (services.externalName > 0) parts.push(`${services.externalName} ExternalName`);
    return parts.join(', ') || 'No services';
};

/**
 * Format job details string.
 */
const formatJobDetails = (jobs: JobSummary): string => {
    const parts: string[] = [];
    if (jobs.active > 0) parts.push(`${jobs.active} Active`);
    if (jobs.completed > 0) parts.push(`${jobs.completed} Completed`);
    if (jobs.failed > 0) parts.push(`${jobs.failed} Failed`);
    return parts.join(', ') || 'No jobs';
};

/**
 * Format PVC details string.
 */
const formatPVCDetails = (pvcs: PVCSummary): string => {
    const parts: string[] = [];
    if (pvcs.bound > 0) parts.push(`${pvcs.bound} Bound`);
    if (pvcs.pending > 0) parts.push(`${pvcs.pending} Pending`);
    if (pvcs.lost > 0) parts.push(`${pvcs.lost} Lost`);
    return parts.join(', ') || 'No PVCs';
};

/**
 * Calculate total resource count to determine if namespace is empty.
 */
const getTotalResourceCount = (resources: ResourceSummary): number => {
    return (
        resources.pods.total +
        resources.deployments +
        resources.statefulSets +
        resources.daemonSets +
        resources.services.total +
        resources.configMaps +
        resources.secrets +
        resources.ingresses +
        resources.jobs.total +
        resources.cronJobs +
        resources.persistentVolumeClaims.total +
        resources.replicaSets +
        resources.endpoints +
        resources.networkPolicies +
        resources.serviceAccounts +
        resources.roles +
        resources.roleBindings
    );
};

/**
 * Resources tab component displaying comprehensive resource counts with health indicators.
 */
export const ResourcesTab: React.FC<ResourcesTabProps> = ({ resources, namespace, vscode }) => {
    const handleResourceClick = (resourceType: string) => {
        vscode.postMessage({
            command: 'navigateToResource',
            data: { resourceType, namespace }
        });
    };

    const totalCount = getTotalResourceCount(resources);

    // Empty state
    if (totalCount === 0) {
        return (
            <div className="resources-tab">
                <div className="empty-state">
                    <p>This namespace has no resources.</p>
                    <p className="hint">Resources will appear here as they are created in the namespace.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="resources-tab">
            {/* Workloads Section */}
            <section className="resource-section">
                <h2>Workloads</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="Pods"
                        count={resources.pods.total}
                        details={formatPodDetails(resources.pods)}
                        health={calculatePodHealth(resources.pods)}
                        onClick={() => handleResourceClick('pods')}
                    />
                    <ResourceRow
                        type="Deployments"
                        count={resources.deployments}
                        health="none"
                        onClick={() => handleResourceClick('deployments')}
                    />
                    <ResourceRow
                        type="StatefulSets"
                        count={resources.statefulSets}
                        health="none"
                        onClick={() => handleResourceClick('statefulsets')}
                    />
                    <ResourceRow
                        type="DaemonSets"
                        count={resources.daemonSets}
                        health="none"
                        onClick={() => handleResourceClick('daemonsets')}
                    />
                    <ResourceRow
                        type="ReplicaSets"
                        count={resources.replicaSets}
                        health="none"
                        onClick={() => handleResourceClick('replicasets')}
                    />
                </div>
            </section>

            {/* Services & Networking Section */}
            <section className="resource-section">
                <h2>Services & Networking</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="Services"
                        count={resources.services.total}
                        details={formatServiceDetails(resources.services)}
                        health="none"
                        onClick={() => handleResourceClick('services')}
                    />
                    <ResourceRow
                        type="Ingresses"
                        count={resources.ingresses}
                        health="none"
                        onClick={() => handleResourceClick('ingresses')}
                    />
                    <ResourceRow
                        type="Network Policies"
                        count={resources.networkPolicies}
                        health="none"
                        onClick={() => handleResourceClick('networkpolicies')}
                    />
                    <ResourceRow
                        type="Endpoints"
                        count={resources.endpoints}
                        health="none"
                        onClick={() => handleResourceClick('endpoints')}
                    />
                </div>
            </section>

            {/* Configuration Section */}
            <section className="resource-section">
                <h2>Configuration</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="ConfigMaps"
                        count={resources.configMaps}
                        health="none"
                        onClick={() => handleResourceClick('configmaps')}
                    />
                    <ResourceRow
                        type="Secrets"
                        count={resources.secrets}
                        health="none"
                        onClick={() => handleResourceClick('secrets')}
                    />
                    <ResourceRow
                        type="Service Accounts"
                        count={resources.serviceAccounts}
                        health="none"
                        onClick={() => handleResourceClick('serviceaccounts')}
                    />
                </div>
            </section>

            {/* Storage Section */}
            <section className="resource-section">
                <h2>Storage</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="Persistent Volume Claims"
                        count={resources.persistentVolumeClaims.total}
                        details={formatPVCDetails(resources.persistentVolumeClaims)}
                        health={calculatePVCHealth(resources.persistentVolumeClaims)}
                        onClick={() => handleResourceClick('persistentvolumeclaims')}
                    />
                </div>
            </section>

            {/* Batch Section */}
            <section className="resource-section">
                <h2>Batch</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="Jobs"
                        count={resources.jobs.total}
                        details={formatJobDetails(resources.jobs)}
                        health={calculateJobHealth(resources.jobs)}
                        onClick={() => handleResourceClick('jobs')}
                    />
                    <ResourceRow
                        type="CronJobs"
                        count={resources.cronJobs}
                        health="none"
                        onClick={() => handleResourceClick('cronjobs')}
                    />
                </div>
            </section>

            {/* RBAC Section */}
            <section className="resource-section">
                <h2>RBAC</h2>
                <div className="resource-table">
                    <ResourceRow
                        type="Roles"
                        count={resources.roles}
                        health="none"
                        onClick={() => handleResourceClick('roles')}
                    />
                    <ResourceRow
                        type="Role Bindings"
                        count={resources.roleBindings}
                        health="none"
                        onClick={() => handleResourceClick('rolebindings')}
                    />
                </div>
            </section>
        </div>
    );
};

