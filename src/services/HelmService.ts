import { spawn } from 'child_process';

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

