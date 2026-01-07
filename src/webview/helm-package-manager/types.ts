/**
 * VS Code Webview API interface.
 * Matches the API provided by acquireVsCodeApi() in webview contexts.
 */
export interface VSCodeAPI {
    /**
     * Post a message to the extension host.
     * @param message The message to send
     */
    postMessage(message: WebviewToExtensionMessage): void;

    /**
     * Get the current state of the webview.
     * @returns The current state object
     */
    getState(): unknown;

    /**
     * Set the state of the webview.
     * @param state The state to set
     */
    setState(state: unknown): void;
}

/**
 * Helm repository information.
 */
export interface HelmRepository {
    name: string;
    url: string;
    chartCount: number;
    lastUpdated: Date;
}

/**
 * Helm release status type.
 */
export type ReleaseStatus = 'deployed' | 'failed' | 'pending-install' | 'pending-upgrade' | 'pending-rollback' | 'superseded' | 'uninstalled' | 'uninstalling' | 'unknown';

/**
 * Helm release information.
 */
export interface HelmRelease {
    name: string;
    namespace: string;
    chart: string;
    version: string;
    status: ReleaseStatus;
    revision: number;
    updated: Date;
    upgradeAvailable?: string;
}

/**
 * Featured chart information.
 */
export interface FeaturedChart {
    name: string;
    chart: string;
    description: string;
    version: string;
    installed: boolean;
    upgradeAvailable?: string;
}

/**
 * Chart search result information.
 */
export interface ChartSearchResult {
    name: string;
    chart: string;
    description: string;
    version: string;
    appVersion?: string;
    repository?: string;
}

/**
 * Chart details information.
 */
export interface ChartDetails {
    name: string;
    description: string;
    readme: string;
    values: string;
    versions: string[];
    maintainers: Array<{ name: string; email?: string }>;
    keywords: string[];
    home: string;
}

/**
 * Release filters for filtering installed releases.
 */
export interface ReleaseFilters {
    namespace: string | 'all';
    status: ReleaseStatus | 'all';
    searchQuery: string;
}

/**
 * Chart installation parameters.
 */
export interface InstallParams {
    chart: string;
    releaseName: string;
    namespace: string;
    createNamespace: boolean;
    values?: string;
    version?: string;
    wait?: boolean;
    timeout?: string;
}

/**
 * Operator installation status information.
 */
export interface OperatorInstallationStatus {
    /** Whether the operator is installed */
    installed: boolean;
    /** Installed version (if installed) */
    version?: string;
    /** Namespace where operator is installed */
    namespace?: string;
    /** Whether an upgrade is available */
    upgradeAvailable: boolean;
    /** Latest available version (if upgrade available) */
    latestVersion?: string;
}

/**
 * Helm state interface for the React component.
 */
export interface HelmState {
    repositories: HelmRepository[];
    releases: HelmRelease[];
    featuredCharts: FeaturedChart[];
    searchResults: ChartSearchResult[];
    loading: boolean;
    error: string | null;
    currentCluster: string;
}

/**
 * Message sent from extension to webview.
 */
export interface ExtensionToWebviewMessage {
    /** Message type */
    type: 'repositoriesLoaded' | 'releasesLoaded' | 'chartSearchResults' | 'chartDetails' | 'operationProgress' | 'operationComplete' | 'operationError' | 'namespacesLoaded';
    /** Message data */
    data?: unknown;
    /** Operation name (for progress/complete/error messages) */
    operation?: string;
    /** Progress value (0-100) */
    progress?: number;
    /** Success flag (for operationComplete) */
    success?: boolean;
    /** Error message (for operationError) */
    error?: string;
    /** Success/error message (for operationComplete) */
    message?: string;
}

/**
 * Message sent from webview to extension.
 */
export interface WebviewToExtensionMessage {
    /** Command type */
    command: 'listRepositories' | 'addRepository' | 'updateRepository' | 'removeRepository' | 'searchCharts' | 'getChartDetails' | 'installChart' | 'listReleases' | 'getReleaseDetails' | 'upgradeRelease' | 'rollbackRelease' | 'uninstallRelease' | 'installOperator' | 'ready' | 'getNamespaces';
    /** Optional data payload */
    name?: string;
    url?: string;
    query?: string;
    repository?: string;
    chart?: string;
    namespace?: string;
    revision?: number;
    params?: unknown;
    apiKey?: string;
    data?: unknown;
}
