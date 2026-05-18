/**
 * CRD Describe Provider — types and implementation for CustomResourceDefinition detail views.
 */

import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import { KubernetesApiClient } from '../kubernetes/apiClient';
import { KubectlError } from '../kubernetes/KubectlError';

const INSTANCE_LIST_LIMIT = 200;

/** One row in the CRD version table. */
export interface CRDVersionRow {
    name: string;
    served: boolean;
    storage: boolean;
    deprecated: boolean;
}

/** OpenAPI structural schema text for a served version. */
export interface CRDSchemaSection {
    versionName: string;
    schemaText: string;
}

/** Condition from CRD `.status.conditions`. */
export interface CRDConditionRow {
    type: string;
    status: string;
    reason?: string;
    message?: string;
}

/** One custom resource instance (summary). */
export interface CRDInstanceRow {
    name: string;
    namespace?: string;
}

/** Listing custom resource instances (exists / placement). */
export interface CRDInstancesSummary {
    scope: 'Namespaced' | 'Cluster' | 'Unknown';
    totalReturned: number;
    truncated: boolean;
    sample: CRDInstanceRow[];
    /** Present when list/discovery failed (e.g. RBAC). */
    fetchError?: string;
}

/** Payload for the CRD describe webview. */
export interface CRDDescribeData {
    overview: {
        metadataName: string;
        kind: string;
        plural: string;
        group: string;
        scope: string;
        categories: string[];
        servedVersions: string[];
        storageVersion: string;
        age: string;
        creationTimestamp: string;
    };
    versions: CRDVersionRow[];
    schemas: CRDSchemaSection[];
    instances: CRDInstancesSummary;
    conditions: CRDConditionRow[];
    yaml: string;
}

/**
 * Fetches and formats CustomResourceDefinition detail for the Describe webview.
 */
export class CRDDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    async getCRDDetails(crdMetadataName: string, context: string): Promise<CRDDescribeData> {
        this.k8sClient.setContext(context);

        let crd: k8s.V1CustomResourceDefinition;
        try {
            crd = await this.k8sClient.apiextensions.readCustomResourceDefinition({
                name: crdMetadataName
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch CustomResourceDefinition ${crdMetadataName}: ${message}`);
        }

        const group = crd.spec?.group || '';
        const plural = crd.spec?.names?.plural || '';
        const kind = crd.spec?.names?.kind || 'Unknown';
        const scopeRaw = crd.spec?.scope || '';
        const scope: 'Namespaced' | 'Cluster' | 'Unknown' =
            scopeRaw === 'Namespaced' ? 'Namespaced' :
            scopeRaw === 'Cluster' ? 'Cluster' : 'Unknown';

        const versions = crd.spec?.versions || [];
        const storageVersion = versions.find(v => v.storage === true)?.name || versions[0]?.name || '';

        const versionRows: CRDVersionRow[] = versions.map(v => ({
            name: v.name || 'Unknown',
            served: v.served === true,
            storage: v.storage === true,
            deprecated: v.deprecated === true || Boolean(v.deprecationWarning)
        }));

        const schemas: CRDSchemaSection[] = versions
            .filter(v => v.served !== false && v.schema?.openAPIV3Schema !== undefined && v.schema.openAPIV3Schema !== null)
            .map(v => ({
                versionName: v.name || 'Unknown',
                schemaText: this.stringifySchema(v.schema!.openAPIV3Schema as Record<string, unknown>)
            }));

        const servedLabels = versions.filter(v => v.served !== false).map(v => v.name || '').filter(Boolean);

        const conditions: CRDConditionRow[] = (crd.status?.conditions || []).map(c => ({
            type: c.type || 'Unknown',
            status: c.status || 'Unknown',
            reason: c.reason,
            message: c.message
        }));

        const instances = await this.listInstances(
            group,
            plural,
            storageVersion,
            scope,
            context
        );

        const yamlBody = yaml.dump(crd as unknown as Record<string, unknown>, {
            lineWidth: 120,
            noRefs: true
        });

        return {
            overview: {
                metadataName: crd.metadata?.name || crdMetadataName,
                kind,
                plural,
                group,
                scope: scopeRaw || 'Unknown',
                categories: crd.spec?.names?.categories || [],
                servedVersions: servedLabels,
                storageVersion,
                age: this.calculateAge(crd.metadata?.creationTimestamp),
                creationTimestamp: this.formatTimestamp(crd.metadata?.creationTimestamp)
            },
            versions: versionRows,
            schemas,
            instances,
            conditions,
            yaml: yamlBody
        };
    }

    private stringifySchema(openApi: Record<string, unknown>): string {
        try {
            return JSON.stringify(openApi, null, 2);
        } catch {
            return '[Unable to render schema JSON]';
        }
    }

    private async listInstances(
        group: string,
        plural: string,
        version: string,
        scope: 'Namespaced' | 'Cluster' | 'Unknown',
        contextName: string
    ): Promise<CRDInstancesSummary> {
        if (!group || !plural || !version || scope === 'Unknown') {
            return {
                scope,
                totalReturned: 0,
                truncated: false,
                sample: [],
                fetchError: !group ? 'Missing API group on CRD.' : !plural ? 'Missing plural name on CRD.' : undefined
            };
        }

        try {
            let body: Record<string, unknown>;
            if (scope === 'Namespaced') {
                body = await this.k8sClient.customObjects.listCustomObjectForAllNamespaces({
                    group,
                    version,
                    plural,
                    limit: INSTANCE_LIST_LIMIT,
                    timeoutSeconds: 15
                }) as Record<string, unknown>;
            } else {
                body = await this.k8sClient.customObjects.listClusterCustomObject({
                    group,
                    version,
                    plural,
                    limit: INSTANCE_LIST_LIMIT,
                    timeoutSeconds: 15
                }) as Record<string, unknown>;
            }

            const items = (body.items as Array<Record<string, unknown>>) || [];
            const sample: CRDInstanceRow[] = items.map(item => {
                const meta = item.metadata as { name?: string; namespace?: string } | undefined;
                return {
                    name: meta?.name || 'Unknown',
                    namespace: scope === 'Namespaced' ? meta?.namespace : undefined
                };
            });

            return {
                scope,
                totalReturned: sample.length,
                truncated: sample.length >= INSTANCE_LIST_LIMIT,
                sample
            };
        } catch (error: unknown) {
            const kerr = KubectlError.fromExecError(error, contextName);
            return {
                scope,
                totalReturned: 0,
                truncated: false,
                sample: [],
                fetchError: kerr.getDetails() || kerr.message
            };
        }
    }

    private formatTimestamp(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }
        return timestamp;
    }

    private calculateAge(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }
        try {
            const now = new Date();
            const then = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const diffMs = now.getTime() - then.getTime();
            if (isNaN(diffMs) || diffMs < 0) {
                return 'Unknown';
            }
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            if (days > 0) {
                return `${days}d`;
            }
            if (hours > 0) {
                return `${hours}h`;
            }
            if (minutes > 0) {
                return `${minutes}m`;
            }
            return `${seconds}s`;
        } catch {
            return 'Unknown';
        }
    }
}
