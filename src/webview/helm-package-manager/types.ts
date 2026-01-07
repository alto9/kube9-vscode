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
 * Helm release information.
 */
export interface HelmRelease {
    name: string;
    namespace: string;
    chart: string;
    version: string;
    status: 'deployed' | 'failed' | 'pending' | 'superseded';
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
    type: 'repositoriesLoaded' | 'releasesLoaded' | 'chartSearchResults' | 'chartDetails' | 'operationProgress' | 'operationComplete' | 'operationError';
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
    command: 'listRepositories' | 'addRepository' | 'updateRepository' | 'removeRepository' | 'searchCharts' | 'getChartDetails' | 'installChart' | 'listReleases' | 'getReleaseDetails' | 'upgradeRelease' | 'rollbackRelease' | 'uninstallRelease' | 'installOperator' | 'ready';
    /** Optional data payload */
    name?: string;
    url?: string;
    query?: string;
    chart?: string;
    namespace?: string;
    revision?: number;
    params?: unknown;
    apiKey?: string;
    data?: unknown;
}
