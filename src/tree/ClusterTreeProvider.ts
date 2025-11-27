import * as vscode from 'vscode';
import { ClusterTreeItem, ClusterStatus } from './ClusterTreeItem';
import { TreeItemType } from './TreeItemTypes';
import { TreeItemFactory } from './TreeItemFactory';
import { ParsedKubeconfig } from '../kubernetes/KubeconfigParser';
import { ClusterConnectivity } from '../kubernetes/ClusterConnectivity';
import { Settings } from '../config/Settings';
import { KubectlErrorType } from '../kubernetes/KubectlError';
import { NodesCategory } from './categories/NodesCategory';
import { NamespacesCategory } from './categories/NamespacesCategory';
import { WorkloadsCategory } from './categories/WorkloadsCategory';
import { DeploymentsSubcategory } from './categories/workloads/DeploymentsSubcategory';
import { StatefulSetsSubcategory } from './categories/workloads/StatefulSetsSubcategory';
import { DaemonSetsSubcategory } from './categories/workloads/DaemonSetsSubcategory';
import { CronJobsSubcategory } from './categories/workloads/CronJobsSubcategory';
import { StorageCategory } from './categories/StorageCategory';
import { PersistentVolumesSubcategory } from './categories/storage/PersistentVolumesSubcategory';
import { PersistentVolumeClaimsSubcategory } from './categories/storage/PersistentVolumeClaimsSubcategory';
import { StorageClassesSubcategory } from './categories/storage/StorageClassesSubcategory';
import { NetworkingCategory } from './categories/networking/NetworkingCategory';
import { ServicesSubcategory } from './categories/networking/ServicesSubcategory';
import { ConfigurationCategory } from './categories/ConfigurationCategory';
import { ConfigMapsSubcategory } from './categories/configuration/ConfigMapsSubcategory';
import { SecretsSubcategory } from './categories/configuration/SecretsSubcategory';
import { HelmCategory } from './categories/HelmCategory';
import { CustomResourcesCategory } from './categories/CustomResourcesCategory';
import { ReportsCategory } from './categories/ReportsCategory';
import { ComplianceSubcategory } from './categories/reports/ComplianceSubcategory';
import { namespaceWatcher } from '../services/namespaceCache';
import { OperatorStatusClient, getOperatorStatusOutputChannel } from '../services/OperatorStatusClient';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';

/**
 * Tree data provider for displaying Kubernetes clusters in the VS Code sidebar.
 * Implements the TreeDataProvider interface to supply data to the tree view.
 * 
 * This provider manages the hierarchical display of:
 * - Clusters (top-level)
 * - Namespaces (under clusters)
 */
export class ClusterTreeProvider implements vscode.TreeDataProvider<ClusterTreeItem> {
    /**
     * Event emitter for tree data changes.
     * Fire this event to trigger a refresh of the tree view.
     */
    private _onDidChangeTreeData: vscode.EventEmitter<ClusterTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<ClusterTreeItem | undefined | null | void>();

    /**
     * Event that VS Code listens to for tree data changes.
     * When this event fires, VS Code will call getChildren() to refresh the tree.
     */
    readonly onDidChangeTreeData: vscode.Event<ClusterTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    /**
     * Stores the parsed kubeconfig data.
     * Updated when kubeconfig is parsed or refreshed.
     */
    private kubeconfig: ParsedKubeconfig | undefined;

    /**
     * Tracks which error types have been shown to the user during this session.
     * Used to prevent repeatedly showing the same error (e.g., kubectl not found).
     */
    private shownErrorTypes: Set<KubectlErrorType> = new Set();

    /**
     * Cache of cluster connectivity status to persist between tree refreshes.
     * Maps context name to its last known connectivity status.
     */
    private clusterStatusCache: Map<string, ClusterStatus> = new Map();

    /**
     * Timer for periodic connectivity checks.
     * Checks cluster connectivity every 60 seconds automatically.
     */
    private refreshInterval: NodeJS.Timeout | undefined;

    /**
     * Subscription to namespace context change events.
     * Allows the tree to refresh when kubectl context changes externally.
     */
    private contextSubscription?: vscode.Disposable;

    /**
     * Client for querying and caching operator status from clusters.
     * Used to determine operator presence and status for each cluster.
     */
    private operatorStatusClient: OperatorStatusClient = new OperatorStatusClient();

    /**
     * Flag to indicate that operator status should be force refreshed.
     * Set to true during manual refresh to bypass cache.
     */
    private forceOperatorRefreshFlag: boolean = false;

    /**
     * Get the UI representation of a tree element.
     * This method is called by VS Code to render each tree item.
     * 
     * @param element The tree item to get the UI representation for
     * @returns The tree item (already a TreeItem, so we return as-is)
     */
    getTreeItem(element: ClusterTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get the children of a tree element.
     * This method is called by VS Code to populate the tree view.
     * 
     * @param element The parent element to get children for. If undefined, get root elements.
     * @returns A promise resolving to an array of child tree items
     */
    async getChildren(element?: ClusterTreeItem): Promise<ClusterTreeItem[]> {
        // If no element is provided, we're getting the root level items (clusters)
        if (!element) {
            return this.getClusters();
        }

        // If element is a cluster, return the 7 categories
        if (element.type === 'cluster' && element.resourceData) {
            return this.getCategories(element);
        }

        // If element is a category, return its children (placeholder for now)
        if (this.isCategoryType(element.type)) {
            return this.getCategoryChildren(element);
        }

        // If element has children, return them
        if (element.children) {
            return element.children;
        }

        // No children for this element
        return [];
    }

    /**
     * Get resource categories for a cluster.
     * Returns categories with Dashboard always appearing first, followed by conditional and standard categories:
     * - Dashboard always appears first (for all clusters)
     * - If operator status is NOT Basic: Reports appears second, followed by Nodes, Namespaces, Workloads, Storage, Helm, Configuration, Custom Resources
     * - If operator status is Basic or undefined: Returns Nodes, Namespaces, Workloads, Storage, Helm, Configuration, Custom Resources (no Reports)
     * 
     * @param clusterElement The cluster tree item to get categories for
     * @returns Array of category tree items
     */
    private getCategories(clusterElement: ClusterTreeItem): ClusterTreeItem[] {
        if (!clusterElement.resourceData) {
            return [];
        }

        const categories = [
            TreeItemFactory.createNodesCategory(clusterElement.resourceData),
            TreeItemFactory.createNamespacesCategory(clusterElement.resourceData),
            TreeItemFactory.createWorkloadsCategory(clusterElement.resourceData),
            TreeItemFactory.createStorageCategory(clusterElement.resourceData),
            TreeItemFactory.createNetworkingCategory(clusterElement.resourceData),
            TreeItemFactory.createHelmCategory(clusterElement.resourceData),
            TreeItemFactory.createConfigurationCategory(clusterElement.resourceData),
            TreeItemFactory.createCustomResourcesCategory(clusterElement.resourceData)
        ];

        // Prepend Reports category if operator is installed (status is NOT Basic)
        if (clusterElement.operatorStatus !== undefined && clusterElement.operatorStatus !== OperatorStatusMode.Basic) {
            return [
                TreeItemFactory.createDashboardCategory(clusterElement.resourceData),
                TreeItemFactory.createReportsCategory(clusterElement.resourceData),
                ...categories
            ];
        }

        // Dashboard appears first for all clusters
        return [
            TreeItemFactory.createDashboardCategory(clusterElement.resourceData),
            ...categories
        ];
    }

    /**
     * Check if a tree item type is a category type.
     * 
     * @param type The tree item type to check
     * @returns True if the type is a category type
     */
    private isCategoryType(type: TreeItemType): boolean {
        return type === 'dashboard' ||
               type === 'nodes' || 
               type === 'namespaces' || 
               type === 'workloads' || 
               type === 'deployments' ||
               type === 'statefulsets' ||
               type === 'daemonsets' ||
               type === 'cronjobs' ||
               type === 'deployment' ||
               type === 'statefulset' ||
               type === 'daemonset' ||
               type === 'cronjob' ||
               type === 'pod' ||
               type === 'storage' ||
               type === 'persistentVolumes' ||
               type === 'persistentVolumeClaims' ||
               type === 'storageClasses' ||
               type === 'persistentVolume' ||
               type === 'persistentVolumeClaim' ||
               type === 'networking' ||
               type === 'services' ||
               type === 'helm' || 
               type === 'configuration' || 
               type === 'configmaps' ||
               type === 'secrets' ||
               type === 'configmap' ||
               type === 'customResources' ||
               type === 'reports' ||
               type === 'compliance' ||
               type === 'dataCollection';
    }

    /**
     * Get children for a category tree item.
     * Delegates to category-specific handlers for fetching and displaying resources.
     * 
     * @param categoryElement The category tree item to get children for
     * @returns Array of child tree items for the category
     */
    private async getCategoryChildren(categoryElement: ClusterTreeItem): Promise<ClusterTreeItem[]> {
        if (!this.kubeconfig || !categoryElement.resourceData) {
            return [];
        }

        // Delegate to category-specific handlers
        switch (categoryElement.type) {
            case 'nodes':
                return NodesCategory.getNodeItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'namespaces':
                return NamespacesCategory.getNamespaceItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'workloads':
                return WorkloadsCategory.getWorkloadSubcategories(
                    categoryElement.resourceData
                );
            
            case 'deployments':
                return DeploymentsSubcategory.getDeploymentItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'deployment': {
                // Get label selector from resourceData
                const labelSelector = categoryElement.resourceData.labelSelector || '';
                return DeploymentsSubcategory.getPodsForDeployment(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    labelSelector,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            }
            
            case 'statefulsets':
                return StatefulSetsSubcategory.getStatefulSetItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'statefulset': {
                // Get label selector from resourceData
                const statefulSetLabelSelector = categoryElement.resourceData.labelSelector || '';
                return StatefulSetsSubcategory.getPodsForStatefulSet(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    statefulSetLabelSelector,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            }
            
            case 'daemonsets':
                return DaemonSetsSubcategory.getDaemonSetItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'daemonset': {
                // Get label selector from resourceData
                const daemonSetLabelSelector = categoryElement.resourceData.labelSelector || '';
                return DaemonSetsSubcategory.getPodsForDaemonSet(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    daemonSetLabelSelector,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            }
            
            case 'cronjobs':
                return CronJobsSubcategory.getCronJobItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'cronjob':
                return CronJobsSubcategory.getPodsForCronJob(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'storage':
                return StorageCategory.getStorageSubcategories(
                    categoryElement.resourceData
                );
            
            case 'networking':
                return NetworkingCategory.getNetworkingSubcategories(
                    categoryElement.resourceData
                );
            
            case 'services':
                return ServicesSubcategory.getServiceItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'persistentVolumes':
                return PersistentVolumesSubcategory.getPersistentVolumeItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'persistentVolumeClaims':
                return PersistentVolumeClaimsSubcategory.getPersistentVolumeClaimItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'storageClasses':
                return StorageClassesSubcategory.getStorageClassItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'configuration':
                return ConfigurationCategory.getConfigurationSubcategories(
                    categoryElement.resourceData
                );
            
            case 'configmaps':
                return ConfigMapsSubcategory.getConfigMapItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'secrets':
                return SecretsSubcategory.getSecretItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'helm':
                return HelmCategory.getHelmReleaseItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'customResources':
                return CustomResourcesCategory.getCRDItems(
                    categoryElement.resourceData,
                    this.kubeconfig.filePath,
                    (error, clusterName) => this.handleKubectlError(error, clusterName)
                );
            
            case 'reports':
                return ReportsCategory.getReportsSubcategories(
                    categoryElement.resourceData
                );
            
            case 'compliance':
                return ComplianceSubcategory.getComplianceReportItems(
                    categoryElement.resourceData
                );
            
            case 'dataCollection':
                return [];
            
            default:
                return [];
        }
    }

    /**
     * Get namespace tree items for a cluster.
     * Queries the cluster using kubectl to retrieve the list of namespaces.
     * 
     * NOTE: This method is preserved for future use when the Namespaces category is implemented.
     * It will be called from getCategoryChildren() when category type is 'namespaces'.
     * 
     * @param clusterElement The cluster tree item to get namespaces for
     * @returns Array of namespace tree items, or empty array on error
     */
    private async getNamespaces(clusterElement: ClusterTreeItem): Promise<ClusterTreeItem[]> {
        // Ensure we have the required kubeconfig data
        if (!this.kubeconfig || !clusterElement.resourceData) {
            console.error('Cannot query namespaces: kubeconfig not loaded or missing resource data');
            return [];
        }

        const contextName = clusterElement.resourceData.context.name;
        const clusterName = clusterElement.resourceData.cluster?.name || contextName;
        
        // Query namespaces using kubectl
        const result = await ClusterConnectivity.getNamespaces(
            this.kubeconfig.filePath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            this.handleKubectlError(result.error, clusterName);
            return [];
        }

        // If no namespaces found (empty cluster), return empty array
        if (result.namespaces.length === 0) {
            return [];
        }

        // Create "All Namespaces" special item
        const allNamespacesItem = new ClusterTreeItem(
            'All Namespaces',
            'allNamespaces',
            vscode.TreeItemCollapsibleState.None,
            {
                context: clusterElement.resourceData!.context,
                cluster: clusterElement.resourceData!.cluster
            }
        );
        allNamespacesItem.iconPath = new vscode.ThemeIcon('globe');
        allNamespacesItem.tooltip = `View all namespaces in ${clusterName}`;
        
        // Make "All Namespaces" clickable to open webview
        allNamespacesItem.command = {
            command: 'kube9.openNamespace',
            title: 'Open All Namespaces',
            arguments: [
                contextName,
                clusterName,
                undefined // undefined indicates "All Namespaces"
            ]
        };

        // Sort namespaces alphabetically
        const sortedNamespaces = result.namespaces.sort((a, b) => a.localeCompare(b));

        // Create tree items for each namespace
        const namespaceItems = sortedNamespaces.map(namespaceName => {
            const item = new ClusterTreeItem(
                namespaceName,
                'namespace',
                vscode.TreeItemCollapsibleState.None,
                {
                    context: clusterElement.resourceData!.context,
                    cluster: clusterElement.resourceData!.cluster
                }
            );

            // Set icon for namespace
            item.iconPath = new vscode.ThemeIcon('symbol-namespace');
            item.tooltip = `Namespace: ${namespaceName}`;
            
            // Make namespace clickable to open webview
            item.command = {
                command: 'kube9.openNamespace',
                title: 'Open Namespace',
                arguments: [
                    clusterElement.resourceData!.context.name,
                    clusterElement.resourceData!.cluster.name,
                    namespaceName
                ]
            };
            
            return item;
        });

        // Return "All Namespaces" first, followed by individual namespaces
        return [allNamespacesItem, ...namespaceItems];
    }

    /**
     * Get cluster tree items from the parsed kubeconfig.
     * Creates a tree item for each context, showing the cluster name and context information.
     * Also checks connectivity status for each cluster asynchronously.
     * 
     * @returns Array of cluster tree items, or a message item if no clusters are available
     */
    private getClusters(): ClusterTreeItem[] {
        // If no kubeconfig data is available, show a message
        if (!this.kubeconfig) {
            const messageItem = new ClusterTreeItem(
                'No clusters detected',
                'cluster',
                vscode.TreeItemCollapsibleState.None
            );
            messageItem.iconPath = new vscode.ThemeIcon('info');
            messageItem.tooltip = 'No kubeconfig file found or it contains no clusters';
            return [messageItem];
        }

        // If kubeconfig has no contexts, show a helpful message
        if (!this.kubeconfig.contexts || this.kubeconfig.contexts.length === 0) {
            const messageItem = new ClusterTreeItem(
                'No clusters configured',
                'cluster',
                vscode.TreeItemCollapsibleState.None
            );
            messageItem.iconPath = new vscode.ThemeIcon('info');
            messageItem.tooltip = 'Add clusters to your kubeconfig file to see them here';
            return [messageItem];
        }

        // Create tree items for each context
        const clusterItems: ClusterTreeItem[] = this.kubeconfig.contexts.map(context => {
            // Find the corresponding cluster data
            const cluster = this.kubeconfig!.clusters.find(c => c.name === context.cluster);
            
            // Skip if cluster data is missing (invalid kubeconfig)
            if (!cluster) {
                console.warn(`Context ${context.name} references non-existent cluster ${context.cluster}`);
                return null;
            }
            
            // Create the tree item with context name as the label
            const item = new ClusterTreeItem(
                context.name,
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    context: context,
                    cluster: cluster
                }
            );

            // Set description to show the cluster name if different from context name
            if (cluster && cluster.name !== context.name) {
                item.description = cluster.name;
            }

            // Initialize with unknown status
            item.status = ClusterStatus.Unknown;
            
            // Set initial icon and tooltip (will be updated after connectivity check)
            const isCurrentContext = context.name === this.kubeconfig!.currentContext;
            this.updateTreeItemAppearance(item, isCurrentContext, ClusterStatus.Unknown, item.operatorStatus);

            return item;
        }).filter((item): item is ClusterTreeItem => item !== null);

        // Update cluster items with cached status
        clusterItems.forEach(item => {
            if (item.type === 'cluster' && item.resourceData?.context?.name) {
                const contextName = item.resourceData.context.name;
                const cachedStatus = this.clusterStatusCache.get(contextName);
                
                if (cachedStatus !== undefined) {
                    // Use cached status if available
                    item.status = cachedStatus;
                    const isCurrentContext = contextName === this.kubeconfig!.currentContext;
                    this.updateTreeItemAppearance(item, isCurrentContext, cachedStatus, item.operatorStatus);
                }
            }
        });

        // Check connectivity for all clusters asynchronously
        this.checkAllClustersConnectivity(clusterItems);

        // Check operator status for all clusters asynchronously
        // Filter to only valid cluster items (exclude auth status item)
        const validClusters = clusterItems.filter(item => 
            item.type === 'cluster' && 
            item.resourceData?.context?.name
        );
        
        // Check operator status for each cluster asynchronously (fire-and-forget)
        // Use forceOperatorRefreshFlag if set (for manual refresh), otherwise use cache
        const forceRefresh = this.forceOperatorRefreshFlag;
        validClusters.forEach(item => {
            void this.checkOperatorStatus(item, forceRefresh);
        });
        
        // Clear the flag after use
        if (this.forceOperatorRefreshFlag) {
            this.forceOperatorRefreshFlag = false;
        }

        // Add authentication status message at the bottom of the cluster list
        const authStatusItem = this.createAuthStatusItem();
        clusterItems.push(authStatusItem);

        return clusterItems;
    }

    /**
     * Create an informational tree item showing authentication status.
     * Provides users with context about API key requirements and easy access to configuration.
     * 
     * @returns A tree item with authentication status message and configuration link
     */
    private createAuthStatusItem(): ClusterTreeItem {
        const hasApiKey = Settings.hasApiKey();
        
        if (hasApiKey) {
            // Show authenticated status
            const item = new ClusterTreeItem(
                'AI features enabled',
                'info',
                vscode.TreeItemCollapsibleState.None
            );
            item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
            item.tooltip = 'API key configured. AI-powered recommendations are available.';
            item.contextValue = 'authStatus';
            return item;
        } else {
            // Show message prompting API key configuration
            const item = new ClusterTreeItem(
                'Configure API key to enable AI recommendations',
                'info',
                vscode.TreeItemCollapsibleState.None
            );
            item.iconPath = new vscode.ThemeIcon('key');
            item.tooltip = 'API key required for AI features only. Core cluster management works without authentication.\n\nClick to configure your API key.';
            item.contextValue = 'authStatus';
            
            // Make the item clickable to open settings
            item.command = {
                command: 'kube9.configureApiKey',
                title: 'Configure API Key',
                arguments: []
            };
            
            return item;
        }
    }

    /**
     * Update the kubeconfig data and refresh the tree view.
     * This method should be called whenever the kubeconfig is parsed or refreshed.
     * 
     * @param kubeconfig The parsed kubeconfig data
     */
    setKubeconfig(kubeconfig: ParsedKubeconfig): void {
        this.kubeconfig = kubeconfig;
        this.refresh();
        
        // Start periodic connectivity checks
        this.startPeriodicRefresh();
        
        // Subscribe to namespace context changes
        if (!this.contextSubscription) {
            this.contextSubscription = namespaceWatcher.onDidChangeContext(() => {
                console.log('Namespace context changed externally, refreshing tree view...');
                this.refresh();
            });
        }
    }

    /**
     * Get the kubeconfig file path.
     * 
     * @returns The kubeconfig file path, or undefined if not set
     */
    getKubeconfigPath(): string | undefined {
        return this.kubeconfig?.filePath;
    }

    /**
     * Refresh the tree view.
     * Call this method to trigger a complete refresh of the tree view.
     * VS Code will call getChildren() again to rebuild the tree.
     * 
     * @param forceOperatorRefresh If true, forces operator status refresh for all clusters, bypassing cache
     */
    refresh(forceOperatorRefresh = false): void {
        // If manual refresh is requested, set flag to force refresh operator status
        // The flag will be checked in getClusters() when cluster items are created
        if (forceOperatorRefresh) {
            this.forceOperatorRefreshFlag = true;
        }
        
        // Fire tree data change event to refresh the tree view
        // This will trigger getChildren() which calls getClusters()
        // getClusters() will check forceOperatorRefreshFlag and pass it to checkOperatorStatus()
        this._onDidChangeTreeData.fire();
    }

    /**
     * Start periodic connectivity and operator status checks for all clusters.
     * Checks cluster connectivity every 60 seconds automatically.
     * Also checks operator status periodically (cache TTL is 5 minutes, so checks
     * will only query the cluster when cache expires).
     * Clears any existing interval before starting a new one.
     */
    private startPeriodicRefresh(): void {
        // Clear existing interval if any
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Set up new interval for 60-second periodic checks
        this.refreshInterval = setInterval(() => {
            console.log('Running periodic cluster connectivity check...');
            
            // Get current cluster items
            if (this.kubeconfig && this.kubeconfig.contexts.length > 0) {
                const clusterItems = this.kubeconfig.contexts
                    .map(context => {
                        const cluster = this.kubeconfig!.clusters.find(c => c.name === context.cluster);
                        if (!cluster) {
                            return null;
                        }
                        
                        const item = new ClusterTreeItem(
                            context.name,
                            'cluster',
                            vscode.TreeItemCollapsibleState.Collapsed,
                            { context, cluster }
                        );
                        return item;
                    })
                    .filter((item): item is ClusterTreeItem => item !== null);
                
                // Run connectivity check (this will update cache and refresh tree)
                this.checkAllClustersConnectivity(clusterItems);
                
                // Check operator status for all clusters asynchronously
                // Filter to only valid cluster items (exclude auth status item)
                const validClusters = clusterItems.filter(item => 
                    item.type === 'cluster' && 
                    item.resourceData?.context?.name
                );
                
                // Check operator status for each cluster asynchronously (fire-and-forget)
                // The OperatorStatusClient will check cache TTL and refresh if needed
                validClusters.forEach(item => {
                    void this.checkOperatorStatus(item, false);
                });
            }
        }, 60000); // 60 seconds = 60000 milliseconds
    }

    /**
     * Refresh a specific tree item.
     * Call this method to refresh only a specific node and its children.
     * 
     * @param element The tree item to refresh, or undefined to refresh the entire tree
     */
    refreshItem(element?: ClusterTreeItem): void {
        this._onDidChangeTreeData.fire(element);
    }

    /**
     * Check connectivity for all clusters asynchronously and update their status.
     * This method runs in the background and updates the tree when complete.
     * 
     * @param clusterItems Array of cluster tree items to check
     */
    private async checkAllClustersConnectivity(clusterItems: ClusterTreeItem[]): Promise<void> {
        // Filter out non-cluster items (like message items)
        const validClusters = clusterItems.filter(item => 
            item.type === 'cluster' && 
            item.resourceData?.context?.name
        );

        if (validClusters.length === 0 || !this.kubeconfig) {
            return;
        }

        // Extract context names
        const contextNames = validClusters.map(item => item.resourceData!.context.name);

        try {
            // Check all clusters in parallel for better performance
            const results = await ClusterConnectivity.checkMultipleConnectivity(
                this.kubeconfig.filePath,
                contextNames
            );

            // Track if any status changed to determine if refresh is needed
            let statusChanged = false;

            // Update each cluster item with its connectivity status
            validClusters.forEach((item, index) => {
                const result = results[index];
                const contextName = item.resourceData!.context.name;
                
                // Check if status actually changed
                const previousStatus = this.clusterStatusCache.get(contextName);
                if (previousStatus !== result.status) {
                    statusChanged = true;
                }
                
                // Update item status
                item.status = result.status;
                
                // Cache the status for future tree refreshes
                this.clusterStatusCache.set(contextName, result.status);

                // Handle any errors that occurred during connectivity check
                if (result.error) {
                    const clusterName = item.resourceData!.cluster?.name || contextName;
                    this.handleKubectlError(result.error, clusterName);
                }

                // Determine if this is the current context
                const isCurrentContext = contextName === this.kubeconfig?.currentContext;

                // Update the item's appearance based on its status
                this.updateTreeItemAppearance(item, isCurrentContext, result.status, item.operatorStatus);
            });

            // Only refresh the tree view if status actually changed
            // This prevents unnecessary tree rebuilds during periodic checks
            if (statusChanged) {
                console.log('Cluster status changed, refreshing tree view...');
                this.refresh();
            }
        } catch (error) {
            console.error('Error checking cluster connectivity:', error);
        }
    }

    /**
     * Check operator status for a single cluster and update the tree item.
     * This method runs asynchronously and updates the cluster item with operator status
     * information when available.
     * 
     * @param item The cluster tree item to check operator status for
     * @param forceRefresh If true, bypasses cache and queries the cluster directly
     */
    private async checkOperatorStatus(item: ClusterTreeItem, forceRefresh = false): Promise<void> {
        // Validate prerequisites
        if (!this.kubeconfig || !item.resourceData?.context?.name) {
            return;
        }

        const kubeconfigPath = this.kubeconfig.filePath;
        const contextName = item.resourceData.context.name;

        try {
            // Query operator status (uses caching internally unless forceRefresh=true)
            // OperatorStatusClient handles all errors internally and returns a valid CachedOperatorStatus
            const cachedStatus = await this.operatorStatusClient.getStatus(
                kubeconfigPath,
                contextName,
                forceRefresh
            );

            // Update item with operator status
            item.operatorStatus = cachedStatus.mode;
            item.operatorStatusDetails = cachedStatus.status ?? undefined;

            // Update appearance with operator status (prioritizes operator status over connectivity)
            const isCurrentContext = contextName === this.kubeconfig.currentContext;
            const currentStatus = item.status || ClusterStatus.Unknown;
            this.updateTreeItemAppearance(item, isCurrentContext, currentStatus, item.operatorStatus);

            // Refresh just this tree item
            this._onDidChangeTreeData.fire(item);
        } catch (error) {
            // Handle unexpected errors gracefully - leave operatorStatus undefined if check fails
            // This prevents operator status check failures from breaking the tree view
            // Note: OperatorStatusClient.getStatus() should never throw, but we handle it defensively
            const outputChannel = getOperatorStatusOutputChannel();
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            outputChannel.appendLine(
                `[ERROR] Unexpected error in checkOperatorStatus for cluster ${contextName}: ${errorMessage}`
            );
            if (errorStack) {
                outputChannel.appendLine(`[ERROR] Stack trace: ${errorStack}`);
            }
            
            // Leave operatorStatus undefined - tree will show connectivity-based icon
            // No error dialogs shown to users - errors are logged to OutputChannel only
        }
    }

    /**
     * Formats an ISO 8601 timestamp into a human-readable string.
     * For recent times (< 1 hour), shows relative time (e.g., "2 minutes ago").
     * For older times, shows ISO date string.
     * 
     * @param timestamp ISO 8601 timestamp string
     * @returns Human-readable timestamp string
     */
    private formatTimestamp(timestamp: string): string {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);

            // Show relative time for recent updates (< 1 hour)
            if (diffMinutes < 1) {
                return 'Just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            }

            // For older times, show ISO date
            return date.toISOString();
        } catch (error) {
            // Fall back to original timestamp if parsing fails
            return timestamp;
        }
    }

    /**
     * Builds a comprehensive tooltip for a cluster tree item.
     * Includes cluster name, connection status, server URL, namespace, and operator status details.
     * 
     * @param item The cluster tree item to build tooltip for
     * @param isCurrentContext Whether this cluster is the current context
     * @param status The connection status of the cluster
     * @returns Formatted tooltip string
     */
    private buildOperatorStatusTooltip(
        item: ClusterTreeItem,
        isCurrentContext: boolean,
        status: ClusterStatus
    ): string {
        const contextName = item.resourceData?.context?.name || item.label;
        const parts: string[] = [];

        // Cluster name
        parts.push(`Cluster: ${contextName}`);

        // Connection status
        let connectionStatus: string;
        if (status === ClusterStatus.Unknown) {
            connectionStatus = 'Checking connection...';
        } else if (status === ClusterStatus.Connected) {
            connectionStatus = isCurrentContext ? 'Current context (connected)' : 'Connected';
        } else {
            connectionStatus = isCurrentContext ? 'Current context (disconnected)' : 'Disconnected';
        }
        parts.push(`Connection: ${connectionStatus}`);

        // Server URL (if available)
        if (item.resourceData?.cluster?.server) {
            parts.push(`Server: ${item.resourceData.cluster.server}`);
        }

        // Namespace (if available)
        if (item.resourceData?.context?.namespace) {
            parts.push(`Namespace: ${item.resourceData.context.namespace}`);
        }

        // Operator status section (if operator status is available)
        if (item.operatorStatus !== undefined) {
            // Operator Status mode
            let operatorStatusText: string;
            switch (item.operatorStatus) {
                case OperatorStatusMode.Basic:
                    operatorStatusText = 'basic';
                    break;
                case OperatorStatusMode.Operated:
                    operatorStatusText = 'operated';
                    break;
                case OperatorStatusMode.Enabled:
                    operatorStatusText = 'enabled';
                    break;
                case OperatorStatusMode.Degraded:
                    operatorStatusText = 'degraded';
                    break;
            }
            parts.push(`Operator Status: ${operatorStatusText}`);

            // Additional operator details (if available)
            if (item.operatorStatusDetails) {
                const details = item.operatorStatusDetails;

                // Tier
                if (details.tier) {
                    parts.push(`Tier: ${details.tier}`);
                }

                // Version
                if (details.version) {
                    parts.push(`Version: ${details.version}`);
                }

                // Health
                if (details.health) {
                    parts.push(`Health: ${details.health}`);
                }

                // Last Update
                if (details.lastUpdate) {
                    const formattedTime = this.formatTimestamp(details.lastUpdate);
                    parts.push(`Last Update: ${formattedTime}`);
                }

                // Error message (if degraded/unhealthy and error exists)
                if ((item.operatorStatus === OperatorStatusMode.Degraded || 
                     details.health === 'degraded' || 
                     details.health === 'unhealthy') && 
                    details.error) {
                    parts.push(`Error: ${details.error}`);
                }
            }
        }

        return parts.join('\n');
    }

    /**
     * Updates a tree item's icon and tooltip based on its status.
     * Prioritizes operator status over connectivity status when operator status is available.
     * 
     * @param item The tree item to update
     * @param isCurrentContext Whether this cluster is the current context
     * @param status The connection status of the cluster
     * @param operatorStatus Optional operator status mode (takes priority over connectivity status)
     */
    private updateTreeItemAppearance(
        item: ClusterTreeItem, 
        isCurrentContext: boolean, 
        status: ClusterStatus,
        operatorStatus?: OperatorStatusMode
    ): void {
        // Determine the appropriate icon based on operator status (if available) or connectivity status
        let iconId: string;
        let iconColor: vscode.ThemeColor | undefined;

        // Prioritize operator status over connectivity status when operator status is available
        if (operatorStatus !== undefined) {
            switch (operatorStatus) {
                case OperatorStatusMode.Basic:
                    iconId = 'circle-outline';
                    // No color - use default
                    break;
                case OperatorStatusMode.Operated:
                    iconId = 'shield';
                    // No color - use default
                    break;
                case OperatorStatusMode.Enabled:
                    iconId = 'verified';
                    iconColor = new vscode.ThemeColor('testing.iconPassed');
                    break;
                case OperatorStatusMode.Degraded:
                    iconId = 'warning';
                    iconColor = new vscode.ThemeColor('editorWarning.foreground');
                    break;
            }
        } else {
            // Fall back to connectivity-based icons when operator status is not available
            if (status === ClusterStatus.Unknown) {
                iconId = 'loading~spin';
            } else if (status === ClusterStatus.Connected) {
                if (isCurrentContext) {
                    iconId = 'vm-active'; // Active VM icon for current + connected
                } else {
                    iconId = 'vm-connect'; // Connected VM icon
                }
            } else { // Disconnected
                if (isCurrentContext) {
                    iconId = 'warning'; // Warning icon for current + disconnected
                } else {
                    iconId = 'warning'; // Warning icon for disconnected clusters
                }
            }
        }

        // Set icon with color if specified
        if (iconColor) {
            item.iconPath = new vscode.ThemeIcon(iconId, iconColor);
        } else {
            item.iconPath = new vscode.ThemeIcon(iconId);
        }
        
        // Update tooltip with comprehensive operator status information
        item.tooltip = this.buildOperatorStatusTooltip(item, isCurrentContext, status);
    }

    /**
     * Handle kubectl errors by displaying appropriate user-facing messages.
     * Implements smart error tracking to avoid spamming users with repeated messages.
     * 
     * @param error The kubectl error to handle
     * @param clusterName Name of the cluster where the error occurred
     */
    private handleKubectlError(error: import('../kubernetes/KubectlError').KubectlError, clusterName: string): void {
        // Determine whether to show a user-facing message based on error type
        switch (error.type) {
            case KubectlErrorType.BinaryNotFound:
                // Only show this error once per session to avoid spam
                if (!this.shownErrorTypes.has(KubectlErrorType.BinaryNotFound)) {
                    vscode.window.showErrorMessage(error.getUserMessage());
                    this.shownErrorTypes.add(KubectlErrorType.BinaryNotFound);
                }
                break;
            
            case KubectlErrorType.PermissionDenied:
                // Show warning for permission errors (these are actionable by the user)
                vscode.window.showWarningMessage(error.getUserMessage());
                break;
            
            case KubectlErrorType.ConnectionFailed:
                // Log but don't show notification - connection failures are expected
                // for unreachable clusters and would be too noisy
                console.log(`Connection failed to cluster ${clusterName}: ${error.getDetails()}`);
                break;
            
            case KubectlErrorType.Timeout:
                // Log but don't show notification - timeouts can be expected
                // for slow or overloaded clusters
                console.log(`Timeout connecting to cluster ${clusterName}: ${error.getDetails()}`);
                break;
            
            case KubectlErrorType.Unknown:
                // Log unknown errors but don't show notifications
                // to avoid confusing users with unclear error messages
                console.error(`Unknown error for cluster ${clusterName}: ${error.getDetails()}`);
                break;
        }
    }

    /**
     * Dispose of the tree provider and clean up resources.
     */
    dispose(): void {
        // Stop periodic connectivity checks
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = undefined;
        }
        
        // Clean up namespace context watcher subscription
        if (this.contextSubscription) {
            this.contextSubscription.dispose();
            this.contextSubscription = undefined;
        }
        
        // Clean up error tracking
        this.shownErrorTypes.clear();
        
        // Clear status cache
        this.clusterStatusCache.clear();
    }
}

