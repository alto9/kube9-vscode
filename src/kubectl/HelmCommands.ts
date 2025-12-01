import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { getCurrentNamespace } from '../utils/kubectlContext';

/**
 * Timeout for helm commands in milliseconds.
 */
const HELM_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Information about a Helm release.
 */
export interface HelmReleaseInfo {
    /** Name of the release */
    name: string;
    /** Namespace where the release is installed */
    namespace: string;
    /** Status of the release (deployed, failed, pending, etc.) */
    status: string;
    /** Chart name */
    chart: string;
    /** Chart version */
    version: string;
}

/**
 * Result of a helm releases query operation.
 */
export interface HelmReleasesResult {
    /**
     * Array of helm release information, empty if query failed.
     */
    releases: HelmReleaseInfo[];
    
    /**
     * Error information if the helm query failed.
     */
    error?: KubectlError;
}

/**
 * Interface for helm list response items.
 * Note: Property names match Helm's JSON output format.
 */
interface HelmReleaseItem {
    name?: string;
    namespace?: string;
    status?: string;
    chart?: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    app_version?: string;
}

/**
 * Utility class for helm CLI operations.
 */
export class HelmCommands {
    /**
     * Retrieves the list of helm releases from a cluster using helm CLI.
     * Uses helm list command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns HelmReleasesResult with releases array and optional error information
     */
    public static async getHelmReleases(
        kubeconfigPath: string,
        contextName: string
    ): Promise<HelmReleasesResult> {
        console.log(`[DEBUG HELM] getHelmReleases called for context: ${contextName}`);
        try {
            // Check if a namespace is set in kubectl context
            // Default to 'default' namespace if none is set
            let currentNamespace: string = 'default';
            try {
                const ns = await getCurrentNamespace();
                if (ns) {
                    currentNamespace = ns;
                }
            } catch (error) {
                console.warn('Failed to get current namespace, using default namespace:', error);
            }

            // Build helm command arguments
            // Always use the namespace (either from context or 'default')
            const args = [
                'list',
                '--namespace', currentNamespace,
                '--output=json',
                `--kube-context=${contextName}`
            ];

            // Execute helm list with JSON output for the specific namespace
            const { stdout } = await execFileAsync(
                'helm',
                args,
                {
                    timeout: HELM_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { 
                        ...process.env,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        KUBECONFIG: kubeconfigPath
                    }
                }
            );

            // Parse the JSON response (helm returns an array directly)
            console.log(`[DEBUG HELM] Successfully got stdout, length: ${stdout.length}`);
            const response: HelmReleaseItem[] = JSON.parse(stdout);
            console.log(`[DEBUG HELM] Parsed ${response.length} releases`);
            
            // Extract helm release information from the array
            const releases: HelmReleaseInfo[] = response.map((item: HelmReleaseItem) => {
                const name = item.name || 'Unknown';
                const namespace = item.namespace || 'default';
                const status = item.status || 'Unknown';
                
                // Parse chart name and version from the chart field
                // Chart field format is typically "chart-name-version"
                const chart = item.chart || 'Unknown';
                let chartName = chart;
                let version = '';
                
                // Try to extract version from chart string
                // Format is usually "chart-name-version" where version starts with a number
                const lastDashIndex = chart.lastIndexOf('-');
                if (lastDashIndex > 0) {
                    const potentialVersion = chart.substring(lastDashIndex + 1);
                    // Check if it looks like a version (starts with a digit)
                    if (/^\d/.test(potentialVersion)) {
                        chartName = chart.substring(0, lastDashIndex);
                        version = potentialVersion;
                    }
                }
                
                return {
                    name,
                    namespace,
                    status,
                    chart: chartName,
                    version
                };
            });
            
            // Sort releases alphabetically by name
            releases.sort((a, b) => a.name.localeCompare(b.name));
            
            return { releases };
        } catch (error: unknown) {
            console.log(`[DEBUG HELM] Error caught:`, error);
            // Check if stdout contains valid JSON even though an error was thrown
            // This can happen if helm writes warnings to stderr but valid data to stdout
            const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; code?: string };
            console.log(`[DEBUG HELM] Error code:`, err.code);
            const stdout = err.stdout 
                ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
                : '';
            console.log(`[DEBUG HELM] stdout available:`, !!stdout, `length:`, stdout.length);
            
            if (stdout) {
                try {
                    // Try to parse stdout as valid JSON
                    const response: HelmReleaseItem[] = JSON.parse(stdout);
                    
                    // Extract helm release information from the array
                    const releases: HelmReleaseInfo[] = response.map((item: HelmReleaseItem) => {
                        const name = item.name || 'Unknown';
                        const namespace = item.namespace || 'default';
                        const status = item.status || 'Unknown';
                        
                        // Parse chart name and version from the chart field
                        // Chart field format is typically "chart-name-version"
                        const chart = item.chart || 'Unknown';
                        let chartName = chart;
                        let version = '';
                        
                        // Try to extract version from chart string
                        // Format is usually "chart-name-version" where version starts with a number
                        const lastDashIndex = chart.lastIndexOf('-');
                        if (lastDashIndex > 0) {
                            const potentialVersion = chart.substring(lastDashIndex + 1);
                            // Check if it looks like a version (starts with a digit)
                            if (/^\d/.test(potentialVersion)) {
                                chartName = chart.substring(0, lastDashIndex);
                                version = potentialVersion;
                            }
                        }
                        
                        return {
                            name,
                            namespace,
                            status,
                            chart: chartName,
                            version
                        };
                    });
                    
                    // Sort releases alphabetically by name
                    releases.sort((a, b) => a.name.localeCompare(b.name));
                    
                    return { releases };
                } catch (parseError) {
                    // stdout is not valid JSON, treat as real error
                }
            }
            
            // helm CLI failed - handle helm-specific errors
            // err is already declared above with code property
            
            // If helm is not installed, create a specific error for it
            if (err.code === 'ENOENT') {
                const helmError = new KubectlError(
                    KubectlErrorType.BinaryNotFound,
                    'Helm is not installed or not in PATH. Install helm to view Helm releases.',
                    'helm command not found',
                    contextName
                );
                return {
                    releases: [],
                    error: helmError
                };
            }
            
            // For other errors, use the standard error handler
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                releases: [],
                error: kubectlError
            };
        }
    }
}

