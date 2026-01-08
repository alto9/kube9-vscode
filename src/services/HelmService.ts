import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ChartSearchResult, ChartDetails, InstallParams, ListReleasesParams, UpgradeParams, ReleaseDetails, ReleaseRevision, HelmRelease, ReleaseStatus, UpgradeInfo, OperatorInstallationStatus } from '../webview/helm-package-manager/types';
import { getContextInfo } from '../utils/kubectlContext';
import { HelmError, parseHelmError } from './HelmError';

/**
 * Options for executing Helm commands.
 */
export interface ExecuteCommandOptions {
    /**
     * Optional input to write to stdin.
     */
    input?: string;
    
    /**
     * Optional timeout in milliseconds.
     * Default: 30000 (30 seconds)
     */
    timeout?: number;
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
 * Validation result for repository input.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Service for executing Helm CLI commands.
 * Wraps Helm 3.x command-line tool execution using Node.js child_process.spawn.
 */
export class HelmService {
    /**
     * Default timeout for Helm commands in milliseconds (30 seconds).
     */
    private static readonly DEFAULT_TIMEOUT_MS = 30000;

    /**
     * Parses a Helm timeout string (e.g., "5m", "10m", "1h") into milliseconds.
     * Adds a 10% buffer to account for overhead.
     * 
     * @param timeoutStr Helm timeout string (e.g., "5m", "10m30s", "1h")
     * @returns Timeout in milliseconds, or undefined if parsing fails
     */
    private static parseHelmTimeout(timeoutStr: string): number | undefined {
        // Helm timeout format: [number][s|m|h] (e.g., "5m", "10m30s", "1h")
        const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
        const match = timeoutStr.trim().match(regex);
        
        if (!match) {
            return undefined;
        }

        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);

        const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        // Add 10% buffer plus 30 seconds minimum overhead
        return totalMs + Math.max(totalMs * 0.1, 30000);
    }

    /**
     * Cache time-to-live in milliseconds for operator status (5 minutes).
     */
    private readonly OPERATOR_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

    /**
     * Cache storage for operator status, keyed by context name.
     */
    private operatorStatusCache: Map<string, { data: OperatorInstallationStatus; timestamp: number }> = new Map();

    /**
     * Creates a new HelmService instance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     */
    constructor(private readonly kubeconfigPath: string) {}

    /**
     * Executes a Helm command with the given arguments.
     * 
     * @param args Command arguments (e.g., ['repo', 'list', '--output', 'json'])
     * @param options Optional execution options
     * @returns Promise resolving to stdout output
     * @throws Error if command fails or Helm CLI is not found
     */
    public async executeCommand(
        args: string[],
        options?: ExecuteCommandOptions
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const helm = spawn('helm', args, {
                env: { ...process.env, KUBECONFIG: this.kubeconfigPath },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            // Collect stdout
            helm.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            // Collect stderr
            helm.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            // Set up timeout if specified
            let timeoutHandle: NodeJS.Timeout | undefined;
            const timeoutMs = options?.timeout ?? HelmService.DEFAULT_TIMEOUT_MS;
            if (timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    helm.kill();
                    const timeoutError = parseHelmError(
                        `Helm command timed out after ${timeoutMs}ms`,
                        ''
                    );
                    reject(timeoutError);
                }, timeoutMs);
            }

            // Write input to stdin if provided
            if (options?.input) {
                helm.stdin.write(options.input);
                helm.stdin.end();
            } else {
                helm.stdin.end();
            }

            // Handle process exit
            helm.on('close', (code: number | null) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }

                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    // Parse error and create structured HelmError
                    const helmError = parseHelmError(stderr, stdout);
                    
                    // Log detailed error for debugging
                    console.error('[Helm CLI Error]', {
                        args,
                        type: helmError.type,
                        message: helmError.message,
                        suggestion: helmError.suggestion,
                        retryable: helmError.retryable,
                        exitCode: code,
                        stderr: stderr || '(empty)',
                        stdout: stdout || '(empty)'
                    });
                    
                    reject(helmError);
                }
            });

            // Handle process errors (e.g., helm not found)
            helm.on('error', (error: Error) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }

                const errnoError = error as NodeJS.ErrnoException;
                let helmError: HelmError;
                
                if (errnoError.code === 'ENOENT') {
                    helmError = parseHelmError(
                        'Helm CLI not found. Please install Helm 3.x',
                        ''
                    );
                } else {
                    helmError = parseHelmError(
                        `Failed to spawn helm: ${error.message}`,
                        ''
                    );
                }
                
                // Log detailed error for debugging
                console.error('[Helm CLI Error]', {
                    args,
                    type: helmError.type,
                    message: helmError.message,
                    suggestion: helmError.suggestion,
                    retryable: helmError.retryable,
                    spawnError: error.message,
                    errorCode: errnoError.code
                });
                
                reject(helmError);
            });
        });
    }

    /**
     * Gets the Helm client version.
     * 
     * @returns Promise resolving to version string (e.g., "v3.12.0")
     * @throws Error if Helm CLI is not found or version command fails
     */
    public async version(): Promise<string> {
        const output = await this.executeCommand(['version', '--client', '--short']);
        // Extract version from output (e.g., "v3.12.0+g1234567" -> "v3.12.0")
        const match = output.match(/v(\d+)\.(\d+)\.(\d+)/);
        if (match) {
            return match[0];
        }
        return output.trim();
    }

    /**
     * Validates repository input (name and URL).
     * 
     * @param name Repository name
     * @param url Repository URL
     * @returns Validation result with errors array
     */
    public validateRepositoryInput(name: string, url: string): ValidationResult {
        const errors: string[] = [];

        // Validate name
        if (!name || name.trim().length === 0) {
            errors.push('Repository name is required');
        } else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
            errors.push('Repository name must contain only letters, numbers, hyphens, and underscores');
        }

        // Validate URL
        if (!url || url.trim().length === 0) {
            errors.push('Repository URL is required');
        } else {
            try {
                const urlObj = new URL(url);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    errors.push('Repository URL must use HTTP or HTTPS protocol');
                }
            } catch {
                errors.push('Repository URL is invalid');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Lists all configured Helm repositories.
     * 
     * @returns Promise resolving to array of repository information
     * @throws Error if command fails
     */
    public async listRepositories(): Promise<HelmRepository[]> {
        const output = await this.executeCommand(['repo', 'list', '--output', 'json']);
        
        // Parse JSON output
        const repos = JSON.parse(output) as Array<{
            name: string;
            url: string;
        }>;

        // Map to HelmRepository interface
        // Note: chartCount and lastUpdated are not available from helm repo list
        // These would need to be fetched separately or cached
        return repos.map(repo => ({
            name: repo.name,
            url: repo.url,
            chartCount: 0, // Fetched separately or cached
            lastUpdated: new Date() // Would need to be tracked separately
        }));
    }

    /**
     * Adds a new Helm repository.
     * 
     * @param name Repository name
     * @param url Repository URL
     * @returns Promise that resolves when repository is added
     * @throws Error if validation fails or command fails
     */
    public async addRepository(name: string, url: string): Promise<void> {
        // Validate input
        const validation = this.validateRepositoryInput(name, url);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        // Execute helm repo add command
        await this.executeCommand(['repo', 'add', name, url]);
    }

    /**
     * Updates a Helm repository index.
     * 
     * @param name Repository name to update
     * @returns Promise that resolves when repository is updated
     * @throws Error if command fails
     */
    public async updateRepository(name: string): Promise<void> {
        await this.executeCommand(['repo', 'update', name]);
    }

    /**
     * Removes a Helm repository.
     * 
     * @param name Repository name to remove
     * @returns Promise that resolves when repository is removed
     * @throws Error if command fails
     */
    public async removeRepository(name: string): Promise<void> {
        await this.executeCommand(['repo', 'remove', name]);
    }

    /**
     * Searches for Helm charts across configured repositories.
     * 
     * @param query Search query string
     * @param repository Optional repository name to limit search to
     * @returns Promise resolving to array of chart search results
     * @throws Error if command fails
     */
    public async searchCharts(query: string, repository?: string): Promise<ChartSearchResult[]> {
        const args = ['search', 'repo', query, '--output', 'json'];
        
        if (repository) {
            args.push('--regexp', `^${repository}/`);
        }
        
        try {
            const output = await this.executeCommand(args);
            
            // Handle empty output (no results)
            if (!output || output.trim().length === 0) {
                return [];
            }
            
            const results = JSON.parse(output) as Array<{
                name: string;
                version: string;
                app_version?: string;
                description: string;
            }>;
            
            // Handle empty array
            if (!Array.isArray(results) || results.length === 0) {
                return [];
            }
            
            return results.map(r => {
                const parts = r.name.split('/');
                return {
                    name: r.name,
                    chart: parts.length > 1 ? parts[1] : parts[0],
                    version: r.version,
                    appVersion: r.app_version,
                    description: r.description,
                    repository: parts.length > 1 ? parts[0] : undefined
                };
            });
        } catch (error) {
            // If error is "not found" or similar, return empty array instead of throwing
            const errorMessage = error instanceof Error ? error.message : String(error);
            const lowerError = errorMessage.toLowerCase();
            
            if (lowerError.includes('not found') || lowerError.includes('no results')) {
                return [];
            }
            
            // Re-throw other errors
            throw error;
        }
    }

    /**
     * Gets the README content for a Helm chart.
     * 
     * @param chart Chart name (e.g., "bitnami/postgresql")
     * @returns Promise resolving to README markdown content
     * @throws Error if chart not found or command fails
     */
    public async getChartReadme(chart: string): Promise<string> {
        const output = await this.executeCommand(['show', 'readme', chart]);
        return output;
    }

    /**
     * Gets the default values YAML for a Helm chart.
     * 
     * @param chart Chart name (e.g., "bitnami/postgresql")
     * @returns Promise resolving to values YAML content
     * @throws Error if chart not found or command fails
     */
    public async getChartValues(chart: string): Promise<string> {
        const output = await this.executeCommand(['show', 'values', chart]);
        return output;
    }

    /**
     * Gets detailed information about a Helm chart.
     * Fetches README, values, and chart metadata in parallel.
     * 
     * @param chart Chart name (e.g., "bitnami/postgresql")
     * @returns Promise resolving to chart details
     * @throws Error if chart not found or command fails
     */
    public async getChartDetails(chart: string): Promise<ChartDetails> {
        // Fetch readme, values, and chart.yaml in parallel
        const [readme, values, chartYaml] = await Promise.all([
            this.getChartReadme(chart),
            this.getChartValues(chart),
            this.executeCommand(['show', 'chart', chart, '--output', 'json'])
        ]);
        
        // Parse chart.yaml JSON
        const chartInfo = JSON.parse(chartYaml) as {
            name?: string;
            description?: string;
            maintainers?: Array<{ name: string; email?: string }>;
            keywords?: string[];
            home?: string;
        };
        
        return {
            name: chart,
            description: chartInfo.description || '',
            readme,
            values,
            versions: [], // Would need separate call or caching
            maintainers: chartInfo.maintainers || [],
            keywords: chartInfo.keywords || [],
            home: chartInfo.home || ''
        };
    }

    /**
     * Installs a Helm chart with the given parameters.
     * 
     * @param params Installation parameters
     * @returns Promise that resolves when installation is complete
     * @throws Error if installation fails
     */
    public async installChart(params: InstallParams): Promise<void> {
        // Build command arguments
        const args = [
            'install',
            params.releaseName,
            params.chart,
            '--namespace', params.namespace
        ];

        // Add optional flags
        if (params.createNamespace) {
            args.push('--create-namespace');
        }

        if (params.version) {
            args.push('--version', params.version);
        }

        if (params.wait) {
            args.push('--wait');
        }

        if (params.timeout) {
            args.push('--timeout', params.timeout);
        }

        // Create temporary values file if custom values provided
        let valuesFile: string | null = null;
        if (params.values) {
            const tmpDir = os.tmpdir();
            valuesFile = path.join(tmpDir, `helm-values-${Date.now()}.yaml`);
            await fs.promises.writeFile(valuesFile, params.values, 'utf8');
            args.push('--values', valuesFile);
        }

        try {
            // Calculate Node.js timeout based on Helm timeout
            // Add buffer to allow Helm to complete its work
            let nodeTimeout: number | undefined;
            if (params.timeout) {
                const helmTimeoutMs = HelmService.parseHelmTimeout(params.timeout);
                if (helmTimeoutMs) {
                    nodeTimeout = helmTimeoutMs;
                }
            }
            // If wait is enabled but no timeout specified, use a longer default
            if (!nodeTimeout && params.wait) {
                nodeTimeout = 10 * 60 * 1000; // 10 minutes for wait operations
            }

            // Execute the install command with appropriate timeout
            await this.executeCommand(args, { timeout: nodeTimeout });
        } finally {
            // Clean up temporary file if it was created
            if (valuesFile) {
                try {
                    await fs.promises.unlink(valuesFile);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Lists installed Helm releases.
     * 
     * @param params Parameters for listing releases
     * @returns Promise resolving to array of release information
     * @throws Error if command fails
     */
    public async listReleases(params: ListReleasesParams): Promise<HelmRelease[]> {
        const args = ['list', '--output', 'json'];

        if (params.allNamespaces) {
            args.push('--all-namespaces');
        } else if (params.namespace) {
            args.push('--namespace', params.namespace);
        }

        if (params.status) {
            args.push('--filter', params.status);
        }

        const output = await this.executeCommand(args);
        
        // Handle empty output
        if (!output || output.trim().length === 0) {
            return [];
        }

        const releases = JSON.parse(output) as Array<{
            name: string;
            namespace: string;
            chart: string;
            app_version?: string;
            revision: string;
            updated: string;
            status: string;
        }>;

        return releases.map(r => ({
            name: r.name,
            namespace: r.namespace,
            chart: r.chart,
            version: r.chart.split('-').slice(-1)[0] || '', // Extract version from chart name
            status: r.status as ReleaseStatus,
            revision: parseInt(r.revision, 10),
            updated: new Date(r.updated)
        }));
    }

    /**
     * Gets detailed information about a Helm release.
     * Fetches status, manifest, values, and history in parallel.
     * 
     * @param name Release name
     * @param namespace Release namespace
     * @returns Promise resolving to release details
     * @throws Error if release not found or command fails
     */
    public async getReleaseDetails(name: string, namespace: string): Promise<ReleaseDetails> {
        const [statusOutput, manifest, values, historyOutput] = await Promise.all([
            this.executeCommand(['status', name, '--namespace', namespace, '--output', 'json']),
            this.executeCommand(['get', 'manifest', name, '--namespace', namespace]),
            this.executeCommand(['get', 'values', name, '--namespace', namespace, '--all']),
            this.executeCommand(['history', name, '--namespace', namespace, '--output', 'json'])
        ]);

        const status = JSON.parse(statusOutput) as {
            name: string;
            namespace: string;
            info?: {
                status: string;
                revision: string;
                description?: string;
                notes?: string;
            };
            chart?: {
                metadata?: {
                    version?: string;
                    appVersion?: string;
                };
            };
            version?: string;
        };

        const history = JSON.parse(historyOutput) as Array<{
            revision: string;
            updated: string;
            status: string;
            chart: string;
            app_version?: string;
            description?: string;
        }>;

        const historyRevisions: ReleaseRevision[] = history.map(h => ({
            revision: parseInt(h.revision, 10),
            updated: new Date(h.updated),
            status: h.status,
            chart: h.chart,
            appVersion: h.app_version,
            description: h.description
        }));

        return {
            name: status.name,
            namespace: status.namespace,
            chart: status.chart?.metadata?.version ? `${name}-${status.chart.metadata.version}` : name,
            version: status.chart?.metadata?.version || status.version || '',
            appVersion: status.chart?.metadata?.appVersion,
            status: (status.info?.status || 'unknown') as ReleaseStatus,
            revision: parseInt(status.info?.revision || '0', 10),
            updated: new Date(),
            description: status.info?.description,
            notes: status.info?.notes,
            manifest,
            values,
            history: historyRevisions
        };
    }

    /**
     * Gets the revision history for a Helm release.
     * 
     * @param name Release name
     * @param namespace Release namespace
     * @returns Promise resolving to array of release revisions
     * @throws Error if release not found or command fails
     */
    public async getReleaseHistory(name: string, namespace: string): Promise<ReleaseRevision[]> {
        const output = await this.executeCommand([
            'history',
            name,
            '--namespace', namespace,
            '--output', 'json'
        ]);

        const history = JSON.parse(output) as Array<{
            revision: string;
            updated: string;
            status: string;
            chart: string;
            app_version?: string;
            description?: string;
        }>;

        return history.map(h => ({
            revision: parseInt(h.revision, 10),
            updated: new Date(h.updated),
            status: h.status,
            chart: h.chart,
            appVersion: h.app_version,
            description: h.description
        }));
    }

    /**
     * Gets upgrade information for a Helm release.
     * Fetches current values and available chart versions.
     * 
     * @param releaseName Release name
     * @param namespace Release namespace
     * @param chart Chart name (e.g., "bitnami/postgresql" or "postgresql-12.1.0")
     * @returns Promise resolving to upgrade information
     * @throws Error if release not found or command fails
     */
    public async getUpgradeInfo(releaseName: string, namespace: string, chart: string): Promise<UpgradeInfo> {
        // Fetch current values
        const currentValues = await this.executeCommand([
            'get', 'values',
            releaseName,
            '--namespace', namespace,
            '--all'
        ]).catch(() => ''); // Return empty string if no values

        // Extract chart name from chart string
        // Chart format can be: "repo/chart-name-version" or "chart-name-version" or "repo/chart-name"
        let chartName = chart;
        let repository: string | undefined;

        // Remove version suffix if present (format: "chart-name-version")
        const versionMatch = chart.match(/^(.+)-(\d+\.\d+\.\d+.*)$/);
        if (versionMatch) {
            chartName = versionMatch[1];
        }

        // Check if chart includes repository (format: "repo/chart-name")
        const parts = chartName.split('/');
        if (parts.length > 1) {
            repository = parts[0];
            chartName = parts[1];
        }

        // Search for available versions
        let availableVersions: string[] = [];
        try {
            const searchQuery = repository ? `${repository}/${chartName}` : chartName;
            const searchResults = await this.searchCharts(searchQuery, repository);
            
            // Extract unique versions from search results
            const versions = new Set<string>();
            searchResults.forEach(result => {
                if (result.version) {
                    versions.add(result.version);
                }
            });
            
            // Sort versions (newest first) - simple semantic version sorting
            availableVersions = Array.from(versions).sort((a, b) => {
                // Simple version comparison - split by dots and compare numerically
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);
                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    const aPart = aParts[i] || 0;
                    const bPart = bParts[i] || 0;
                    if (aPart !== bPart) {
                        return bPart - aPart; // Descending order
                    }
                }
                return 0;
            });
        } catch (error) {
            // If search fails, return empty versions array
            // This is not a critical error - user can still upgrade without version selection
            console.warn('Failed to fetch available versions:', error);
        }

        return {
            currentValues: currentValues.trim(),
            availableVersions
        };
    }

    /**
     * Upgrades a Helm release with the given parameters.
     * 
     * @param params Upgrade parameters
     * @returns Promise that resolves when upgrade is complete
     * @throws Error if upgrade fails
     */
    public async upgradeRelease(params: UpgradeParams): Promise<void> {
        const args = [
            'upgrade',
            params.releaseName,
            params.chart,
            '--namespace', params.namespace
        ];

        if (params.reuseValues) {
            args.push('--reuse-values');
        }

        if (params.version) {
            args.push('--version', params.version);
        }

        if (params.wait) {
            args.push('--wait');
        }

        if (params.timeout) {
            args.push('--timeout', params.timeout);
        }

        // Create temporary values file if custom values provided
        let valuesFile: string | null = null;
        if (params.values) {
            const tmpDir = os.tmpdir();
            valuesFile = path.join(tmpDir, `helm-values-${Date.now()}.yaml`);
            await fs.promises.writeFile(valuesFile, params.values, 'utf8');
            args.push('--values', valuesFile);
        }

        try {
            // Calculate Node.js timeout based on Helm timeout
            // Add buffer to allow Helm to complete its work
            let nodeTimeout: number | undefined;
            if (params.timeout) {
                const helmTimeoutMs = HelmService.parseHelmTimeout(params.timeout);
                if (helmTimeoutMs) {
                    nodeTimeout = helmTimeoutMs;
                }
            }
            // If wait is enabled but no timeout specified, use a longer default
            if (!nodeTimeout && params.wait) {
                nodeTimeout = 10 * 60 * 1000; // 10 minutes for wait operations
            }

            // Execute the upgrade command with appropriate timeout
            await this.executeCommand(args, { timeout: nodeTimeout });
        } finally {
            // Clean up temporary file if it was created
            if (valuesFile) {
                try {
                    await fs.promises.unlink(valuesFile);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Rolls back a Helm release to a specific revision.
     * 
     * @param name Release name
     * @param namespace Release namespace
     * @param revision Revision number to rollback to
     * @returns Promise that resolves when rollback is complete
     * @throws Error if rollback fails
     */
    public async rollbackRelease(name: string, namespace: string, revision: number): Promise<void> {
        await this.executeCommand([
            'rollback',
            name,
            revision.toString(),
            '--namespace', namespace
        ]);
    }

    /**
     * Uninstalls a Helm release.
     * 
     * @param name Release name
     * @param namespace Release namespace
     * @returns Promise that resolves when uninstall is complete
     * @throws Error if uninstall fails
     */
    public async uninstallRelease(name: string, namespace: string): Promise<void> {
        await this.executeCommand([
            'uninstall',
            name,
            '--namespace', namespace
        ]);
    }

    /**
     * Gets the installation status of the Kube9 Operator.
     * Checks if the operator is installed and whether upgrades are available.
     * Results are cached for 5 minutes.
     * 
     * @returns Promise resolving to operator installation status
     */
    public async getOperatorStatus(): Promise<OperatorInstallationStatus> {
        try {
            // Get current context name for cache key
            const contextInfo = await getContextInfo();
            const contextName = contextInfo.contextName;
            const cacheKey = `operator-status-${contextName}`;

            // Check cache first
            const cached = this.operatorStatusCache.get(cacheKey);
            if (cached) {
                const cacheAge = Date.now() - cached.timestamp;
                if (cacheAge < this.OPERATOR_STATUS_CACHE_TTL_MS) {
                    return cached.data;
                }
                // Cache expired, remove it
                this.operatorStatusCache.delete(cacheKey);
            }

            // Check installed releases
            const releases = await this.listReleases({ allNamespaces: true });
            const operatorRelease = releases.find(r => 
                r.name === 'kube9-operator' || 
                r.chart.includes('kube9-operator')
            );

            if (!operatorRelease) {
                const status: OperatorInstallationStatus = {
                    installed: false,
                    upgradeAvailable: false
                };
                // Cache the result
                this.operatorStatusCache.set(cacheKey, {
                    data: status,
                    timestamp: Date.now()
                });
                return status;
            }

            // Ensure kube9 repository is added
            await this.ensureKube9Repository();

            // Check for updates
            let latestVersion: string | undefined;
            let upgradeAvailable = false;
            try {
                const searchResults = await this.searchCharts('kube9-operator', 'kube9');
                if (searchResults.length > 0) {
                    latestVersion = searchResults[0].version;
                    const currentVersion = operatorRelease.version;
                    upgradeAvailable = latestVersion !== currentVersion;
                }
            } catch (error) {
                // If search fails, log warning but continue
                console.warn('Failed to search for operator chart versions:', error);
            }

            // Determine tier
            const tier = await this.detectOperatorTier(operatorRelease);

            const status: OperatorInstallationStatus = {
                installed: true,
                version: operatorRelease.version,
                namespace: operatorRelease.namespace,
                upgradeAvailable,
                latestVersion,
                tier
            };

            // Cache the result
            this.operatorStatusCache.set(cacheKey, {
                data: status,
                timestamp: Date.now()
            });

            return status;
        } catch (error) {
            // If any error occurs, return not installed status
            console.warn('Failed to get operator status:', error);
            return {
                installed: false,
                upgradeAvailable: false
            };
        }
    }

    /**
     * Ensures the kube9 repository is added and updated.
     * Adds the repository if it doesn't exist.
     * 
     * @returns Promise that resolves when repository is ensured
     */
    public async ensureKube9Repository(): Promise<void> {
        try {
            const repos = await this.listRepositories();
            const kube9Repo = repos.find(r => r.name === 'kube9');

            if (!kube9Repo) {
                await this.addRepository('kube9', 'https://charts.kube9.io');
                await this.updateRepository('kube9');
            }
        } catch (error) {
            // Log warning but don't throw - repository operations shouldn't block status check
            console.warn('Failed to ensure kube9 repository:', error);
        }
    }

    /**
     * Detects the operator tier (free or pro) from release information.
     * This is a placeholder implementation that can be enhanced later.
     * 
     * @param _release The operator release information (unused in current implementation)
     * @returns Operator tier or undefined if unable to determine
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async detectOperatorTier(_release: HelmRelease): Promise<'free' | 'pro' | undefined> {
        // TODO: Implement tier detection by checking release values or ConfigMap
        // For now, return undefined
        return undefined;
    }

    /**
     * Invalidates the operator status cache for the current context.
     * Call this when releases change to force a refresh.
     */
    public async invalidateOperatorStatusCache(): Promise<void> {
        try {
            const contextInfo = await getContextInfo();
            const contextName = contextInfo.contextName;
            const cacheKey = `operator-status-${contextName}`;
            this.operatorStatusCache.delete(cacheKey);
        } catch (error) {
            // If we can't get context info, clear all cache entries
            this.operatorStatusCache.clear();
        }
    }

}

