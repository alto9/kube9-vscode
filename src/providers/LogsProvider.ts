import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';

/**
 * Options for streaming pod logs from Kubernetes API.
 */
export interface LogOptions {
    follow: boolean;
    tailLines?: number;
    timestamps: boolean;
    previous: boolean;
}

/**
 * LogsProvider manages Kubernetes API connections and handles log streaming
 * for a specific cluster context.
 * 
 * Each panel instance gets its own LogsProvider to maintain independent
 * streaming connections. This class wraps the @kubernetes/client-node library
 * to stream pod logs from Kubernetes API.
 */
/**
 * Parameters for log streaming, stored for reconnection attempts.
 */
interface StreamParams {
    namespace: string;
    podName: string;
    containerName: string;
    options: LogOptions;
    onData: (chunk: string) => void;
    onError: (error: Error) => void;
    onClose: () => void;
}

export class LogsProvider {
    private kubeConfig: k8s.KubeConfig;
    private logApi: k8s.Log;
    private currentAbortController: AbortController | null = null;
    private currentStream: Writable | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private lastStreamParams: StreamParams | null = null;
    private isReconnecting = false;

    /**
     * Creates a new LogsProvider instance for the specified cluster context.
     * 
     * @param contextName - The kubectl context name to use for API connections
     */
    constructor(contextName: string) {
        this.kubeConfig = new k8s.KubeConfig();
        this.kubeConfig.loadFromDefault();
        this.kubeConfig.setCurrentContext(contextName);
        this.logApi = new k8s.Log(this.kubeConfig);
    }

    /**
     * Streams logs from a Kubernetes pod.
     * Stops any existing stream before starting a new one.
     * 
     * @param namespace - The namespace containing the pod
     * @param podName - The name of the pod
     * @param containerName - The name of the container (empty string for default container)
     * @param options - Log streaming options
     * @param onData - Callback invoked when log data is received
     * @param onError - Callback invoked when an error occurs
     * @param onClose - Callback invoked when the stream closes
     */
    public async streamLogs(
        namespace: string,
        podName: string,
        containerName: string,
        options: LogOptions,
        onData: (chunk: string) => void,
        onError: (error: Error) => void,
        onClose: () => void
    ): Promise<void> {
        // Stop any existing stream
        this.stopStream();

        // Store parameters for potential reconnection
        this.lastStreamParams = {
            namespace,
            podName,
            containerName,
            options,
            onData,
            onError,
            onClose
        };

        // Reset reconnect attempts on new stream
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        try {
            // Create a Writable stream to receive log data
            const writableStream = new Writable({
                write(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void) {
                    try {
                        onData(chunk.toString('utf8'));
                        callback();
                    } catch (error) {
                        callback(error as Error);
                    }
                }
            });

            // Handle stream errors
            writableStream.on('error', (error: Error) => {
                this.currentStream = null;
                this.currentAbortController = null;
                onError(error);
            });

            // Handle stream close
            writableStream.on('close', () => {
                this.currentStream = null;
                this.currentAbortController = null;
                onClose();
            });

            // Call log API with streaming parameters
            // The Log API takes a Writable stream and returns an AbortController
            const abortController = await this.logApi.log(
                namespace,
                podName,
                containerName || '',
                writableStream,
                {
                    follow: options.follow,
                    tailLines: options.tailLines,
                    pretty: false,
                    timestamps: options.timestamps,
                    previous: options.previous
                }
            );

            this.currentStream = writableStream;
            this.currentAbortController = abortController;

        } catch (error) {
            this.currentStream = null;
            this.currentAbortController = null;
            onError(error as Error);
        }
    }

    /**
     * Attempts to reconnect to the last stream with exponential backoff.
     * Only attempts reconnection for recoverable connection errors.
     * 
     * @param error - The error that occurred
     * @returns Promise that resolves when reconnection is attempted or max attempts reached
     */
    public async attemptReconnect(error: Error): Promise<void> {
        // Check if this is a recoverable connection error
        if (!this.isRecoverableError(error)) {
            // Not a recoverable error, don't attempt reconnection
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            const maxAttemptsError = new Error('Max reconnection attempts reached');
            if (this.lastStreamParams) {
                this.lastStreamParams.onError(maxAttemptsError);
            }
            this.isReconnecting = false;
            return;
        }

        if (!this.lastStreamParams) {
            // No previous stream parameters, can't reconnect
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            // Attempt to reconnect with stored parameters
            await this.streamLogs(
                this.lastStreamParams.namespace,
                this.lastStreamParams.podName,
                this.lastStreamParams.containerName,
                this.lastStreamParams.options,
                this.lastStreamParams.onData,
                this.lastStreamParams.onError,
                this.lastStreamParams.onClose
            );
            
            // Reset attempts on successful reconnection
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
        } catch (reconnectError) {
            // If reconnection fails, attempt again
            await this.attemptReconnect(reconnectError as Error);
        }
    }

    /**
     * Checks if an error is recoverable and should trigger auto-reconnect.
     * Connection errors (ECONNREFUSED, ETIMEDOUT) are recoverable.
     * API errors (404, 403) are not recoverable.
     * 
     * @param error - The error to check
     * @returns True if error is recoverable, false otherwise
     */
    private isRecoverableError(error: Error): boolean {
        // Check for Node.js connection error codes
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ECONNREFUSED' || nodeError.code === 'ETIMEDOUT') {
            return true;
        }

        // Check for Kubernetes API error status codes
        const apiError = error as { response?: { statusCode?: number } };
        if (apiError.response?.statusCode) {
            const statusCode = apiError.response.statusCode;
            // 404 and 403 are not recoverable (pod not found, permission denied)
            if (statusCode === 404 || statusCode === 403) {
                return false;
            }
            // Other 4xx/5xx errors might be recoverable (network issues, temporary server errors)
            return statusCode >= 500 || statusCode === 408 || statusCode === 429;
        }

        // Check error message for connection-related keywords
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('econnrefused') || 
            errorMessage.includes('etimedout') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('network')) {
            return true;
        }

        // Default to not recoverable for unknown errors
        return false;
    }

    /**
     * Gets whether a reconnection attempt is currently in progress.
     * 
     * @returns True if reconnecting, false otherwise
     */
    public getIsReconnecting(): boolean {
        return this.isReconnecting;
    }

    /**
     * Resets reconnection state (used when manually stopping reconnection).
     */
    public resetReconnection(): void {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
    }

    /**
     * Gets the list of container names for a pod.
     * Includes both regular containers and init containers.
     * 
     * @param namespace - The namespace containing the pod
     * @param podName - The name of the pod
     * @returns Promise resolving to an array of container names
     * @throws Error if the pod cannot be fetched or accessed
     */
    public async getPodContainers(namespace: string, podName: string): Promise<string[]> {
        const coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
        const pod = await coreApi.readNamespacedPod({
            name: podName,
            namespace: namespace
        });
        const containers: string[] = [];
        
        if (pod.spec?.containers) {
            containers.push(...pod.spec.containers.map((c: k8s.V1Container) => c.name || ''));
        }
        if (pod.spec?.initContainers) {
            containers.push(...pod.spec.initContainers.map((c: k8s.V1Container) => c.name || ''));
        }
        
        return containers;
    }

    /**
     * Stops the current log stream if one is active.
     * Aborts the request and cleans up the stream reference.
     */
    public stopStream(): void {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
        if (this.currentStream) {
            this.currentStream.destroy();
            this.currentStream = null;
        }
    }

    /**
     * Checks if a container has crashed/restarted by examining pod status.
     * A container is considered crashed if restartCount > 0 or lastState.terminated is defined.
     * 
     * @param namespace - The namespace containing the pod
     * @param podName - The name of the pod
     * @param containerName - The name of the container to check
     * @returns Promise resolving to true if container has crashed, false otherwise
     */
    public async hasContainerCrashed(
        namespace: string,
        podName: string,
        containerName: string
    ): Promise<boolean> {
        try {
            const coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
            const pod = await coreApi.readNamespacedPod({
                name: podName,
                namespace: namespace
            });
            
            const containerStatus = pod.status?.containerStatuses?.find(
                (cs: k8s.V1ContainerStatus) => cs.name === containerName
            );
            
            if (!containerStatus) {
                return false;
            }
            
            // Container has crashed if restartCount > 0 or lastState.terminated is defined
            return (containerStatus.restartCount ?? 0) > 0 || containerStatus.lastState?.terminated !== undefined;
        } catch (error) {
            // If we can't fetch pod status, assume no crash
            console.error(`Failed to check crash status for container ${containerName}:`, error);
            return false;
        }
    }

    /**
     * Disposes of all resources held by this provider.
     * Stops any active streams and cleans up.
     */
    public dispose(): void {
        this.stopStream();
        this.resetReconnection();
        this.lastStreamParams = null;
    }
}
