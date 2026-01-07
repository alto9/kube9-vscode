import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ChartSearchResult, ChartDetails, InstallParams } from '../webview/helm-package-manager/types';

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
                    reject(new Error(`Helm command timed out after ${timeoutMs}ms`));
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
                    // Parse stderr for user-friendly error message
                    const errorMessage = this.parseHelmError(stderr || stdout);
                    const error = new Error(errorMessage);
                    (error as Error & { code?: number; stderr?: string; stdout?: string }).code = code || undefined;
                    (error as Error & { code?: number; stderr?: string; stdout?: string }).stderr = stderr;
                    (error as Error & { code?: number; stderr?: string; stdout?: string }).stdout = stdout;
                    reject(error);
                }
            });

            // Handle process errors (e.g., helm not found)
            helm.on('error', (error: Error) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }

                const errnoError = error as NodeJS.ErrnoException;
                if (errnoError.code === 'ENOENT') {
                    reject(new Error('Helm CLI not found. Please install Helm 3.x'));
                } else {
                    reject(new Error(`Failed to spawn helm: ${error.message}`));
                }
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
            // Execute the install command
            await this.executeCommand(args);
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
     * Parses Helm error output to create user-friendly error messages.
     * 
     * @param stderr The stderr output from Helm command
     * @returns User-friendly error message
     */
    private parseHelmError(stderr: string): string {
        const lowerStderr = stderr.toLowerCase();

        if (lowerStderr.includes('not found')) {
            return 'Chart or release not found';
        } else if (lowerStderr.includes('already exists')) {
            return 'Release already exists';
        } else if (lowerStderr.includes('connection refused') || lowerStderr.includes('unable to connect')) {
            return 'Unable to connect to Kubernetes cluster';
        } else if (lowerStderr.includes('permission denied') || lowerStderr.includes('forbidden')) {
            return 'Permission denied: insufficient permissions to perform this operation';
        } else if (lowerStderr.includes('timeout')) {
            return 'Operation timed out';
        } else if (lowerStderr.includes('invalid') || lowerStderr.includes('error')) {
            // Return the original stderr if it contains error information
            return stderr.trim() || 'Helm command failed';
        }

        // Return original stderr if no known patterns match
        return stderr.trim() || 'Helm command failed';
    }
}

