import { ClusterStatus } from '../kubernetes/ClusterTypes';

/**
 * Types of tree items that can appear in the cluster tree view.
 * 
 * Base types:
 * - cluster: Top-level cluster nodes
 * - folder: Folder items for organizing clusters hierarchically
 * - namespace: Individual namespace items (under Namespaces category)
 * - allNamespaces: Special "All Namespaces" item
 * - info: Informational items (e.g., auth status)
 * 
 * Category types (appear under clusters):
 * - dashboard: Dashboard category (appears first)
 * - nodes: Nodes category and individual node items
 * - namespaces: Namespaces category
 * - networking: Networking category
 * - services: Services subcategory (under Networking)
 * - workloads: Workloads category
 * - deployments: Deployments subcategory (under Workloads)
 * - statefulsets: StatefulSets subcategory (under Workloads)
 * - daemonsets: DaemonSets subcategory (under Workloads)
 * - cronjobs: CronJobs subcategory (under Workloads)
 * - storage: Storage category
 * - persistentVolumes: Persistent Volumes subcategory (under Storage)
 * - persistentVolumeClaims: Persistent Volume Claims subcategory (under Storage)
 * - storageClasses: Storage Classes subcategory (under Storage)
 * - helm: Helm category
 * - configuration: Configuration category
 * - configmaps: ConfigMaps subcategory (under Configuration)
 * - secrets: Secrets subcategory (under Configuration)
 * - argocd: ArgoCD Applications category
 * - customResources: Custom Resources category
 * - reports: Reports category
 * - events: Events category (appears when operator is installed)
 * - compliance: Compliance subcategory (under Reports)
 * 
 * Individual resource types (items within categories):
 * - deployment: Individual deployment item
 * - statefulset: Individual statefulset item
 * - daemonset: Individual daemonset item
 * - cronjob: Individual cronjob item
 * - pod: Individual pod item
 * - persistentVolume: Individual persistent volume item
 * - persistentVolumeClaim: Individual persistent volume claim item
 * - storageClass: Individual storage class item
 * - configmap: Individual configmap item
 * - secret: Individual secret item
 * - service: Individual service item (under Services)
 * - argocdApplication: Individual ArgoCD Application item (under ArgoCD)
 * - crd: Individual Custom Resource Definition item
 * - dataCollection: Individual data collection report item (under Compliance)
 */
export type TreeItemType = 
    | 'cluster' 
    | 'folder'
    | 'namespace' 
    | 'allNamespaces' 
    | 'info'
    | 'dashboard'
    | 'nodes'
    | 'namespaces'
    | 'networking'
    | 'workloads'
    | 'deployments'
    | 'statefulsets'
    | 'daemonsets'
    | 'cronjobs'
    | 'deployment'
    | 'statefulset'
    | 'daemonset'
    | 'cronjob'
    | 'pod'
    | 'storage'
    | 'persistentVolumes'
    | 'persistentVolumeClaims'
    | 'storageClasses'
    | 'persistentVolume'
    | 'persistentVolumeClaim'
    | 'storageClass'
    | 'helm'
    | 'configuration'
    | 'configmaps'
    | 'secrets'
    | 'services'
    | 'configmap'
    | 'secret'
    | 'service'
    | 'argocd'
    | 'argocdApplication'
    | 'customResources'
    | 'reports'
    | 'events'
    | 'compliance'
    | 'crd'
    | 'dataCollection';

/**
 * Re-export ClusterStatus for convenience.
 */
export { ClusterStatus };

/**
 * Metadata structure for tree items.
 * Contains cluster context information and optional resource-specific data.
 */
export interface TreeItemData {
    /** Kubeconfig context information */
    context: {
        name: string;
        cluster: string;
        namespace?: string;
    };
    /** Cluster information */
    cluster: {
        name: string;
        server: string;
    };
    /** Optional resource name for individual resource items */
    resourceName?: string;
    /** Optional namespace for namespaced resources */
    namespace?: string;
    /** Optional label selector for workload resources */
    labelSelector?: string;
}

