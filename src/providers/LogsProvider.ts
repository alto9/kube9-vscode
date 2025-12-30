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
export class LogsProvider {
    private kubeConfig: k8s.KubeConfig;
    private logApi: k8s.Log;
    private currentAbortController: AbortController | null = null;
    private currentStream: Writable | null = null;

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
    }
}
