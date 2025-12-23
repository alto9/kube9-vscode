import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import * as net from 'net';

/**
 * Configuration for starting a port forward.
 */
export interface PortForwardConfig {
    /** Name of the pod */
    podName: string;
    /** Namespace containing the pod */
    namespace: string;
    /** kubectl context name */
    context: string;
    /** Local port to bind (1024-65535) */
    localPort: number;
    /** Remote port on pod (1-65535) */
    remotePort: number;
    /** Optional: specific container (for multi-container pods) */
    containerName?: string;
}

/**
 * Status enumeration for port forwards.
 */
export enum PortForwardStatus {
    /** Process started, waiting for connection */
    Connecting = 'connecting',
    /** Successfully forwarding */
    Connected = 'connected',
    /** Lost connection but process alive */
    Disconnected = 'disconnected',
    /** Error state */
    Error = 'error',
    /** Intentionally stopped */
    Stopped = 'stopped'
}

/**
 * Internal tracking record for an active forward.
 */
interface PortForwardRecord {
    /** Unique identifier (UUID) */
    id: string;
    /** Original configuration */
    config: PortForwardConfig;
    /** kubectl process PID */
    processId: number;
    /** Node.js child process object */
    process: ChildProcess;
    /** Current status */
    status: PortForwardStatus;
    /** When forward was established */
    startTime: Date;
    /** Last known activity */
    lastActivity?: Date;
    /** Error message if status is 'error' */
    error?: string;
}

/**
 * Public information about a forward (returned to callers).
 */
export interface PortForwardInfo {
    /** Unique identifier */
    id: string;
    /** Pod name */
    podName: string;
    /** Namespace */
    namespace: string;
    /** Context */
    context: string;
    /** Local port */
    localPort: number;
    /** Remote port */
    remotePort: number;
    /** Current status */
    status: PortForwardStatus;
    /** Seconds since startTime */
    uptime: number;
    /** When forward was established */
    startTime: Date;
}

/**
 * Event types emitted by PortForwardManager.
 */
type PortForwardEvent =
    | { type: 'added'; forwardId: string; forwardInfo: PortForwardInfo }
    | { type: 'removed'; forwardId: string }
    | { type: 'updated'; forwardId: string; forwardInfo: PortForwardInfo };

/**
 * Singleton service for managing kubectl port-forward processes and tracking active forwards.
 * 
 * The PortForwardManager is the central hub for all port forwarding operations. It:
 * - Spawns and monitors kubectl port-forward processes
 * - Tracks active forwards in memory
 * - Provides port availability checking
 * - Manages status bar updates
 * - Handles cleanup on extension deactivate
 */
export class PortForwardManager {
    private static instance: PortForwardManager;
    private forwards: Map<string, PortForwardRecord>;
    private eventEmitter: vscode.EventEmitter<PortForwardEvent>;
    private statusBarItem!: vscode.StatusBarItem;

    /**
     * Private constructor for singleton pattern.
     */
    private constructor() {
        this.forwards = new Map();
        this.eventEmitter = new vscode.EventEmitter<PortForwardEvent>();
        this.initializeStatusBar();
    }

    /**
     * Get the singleton instance of PortForwardManager.
     * Creates a new instance on first call, returns the same instance on subsequent calls.
     * 
     * @returns The singleton PortForwardManager instance
     */
    public static getInstance(): PortForwardManager {
        if (!PortForwardManager.instance) {
            PortForwardManager.instance = new PortForwardManager();
        }
        return PortForwardManager.instance;
    }

    /**
     * Event emitted when port forwards are added, removed, or updated.
     * Primarily used for status bar updates. Tree view queries manager directly.
     */
    public get onForwardsChanged(): vscode.Event<PortForwardEvent> {
        return this.eventEmitter.event;
    }

    /**
     * Start a port forward.
     * 
     * @param config Port forward configuration
     * @returns Port forward information
     * @throws Error if configuration is invalid or forward cannot be started
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async startForward(config: PortForwardConfig): Promise<PortForwardInfo> {
        // Stub implementation - will be fully implemented in subsequent stories
        throw new Error('Not implemented');
    }

    /**
     * Stop a port forward by ID.
     * 
     * @param forwardId Unique identifier of the forward to stop
     * @throws Error if forward is not found
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async stopForward(forwardId: string): Promise<void> {
        // Stub implementation - will be fully implemented in subsequent stories
        throw new Error('Not implemented');
    }

    /**
     * Stop all active port forwards.
     */
    public async stopAllForwards(): Promise<void> {
        const forwardIds = Array.from(this.forwards.keys());
        for (const forwardId of forwardIds) {
            try {
                await this.stopForward(forwardId);
            } catch (error) {
                // Continue stopping other forwards even if one fails
                console.error(`Failed to stop forward ${forwardId}:`, error);
            }
        }
    }

    /**
     * Get all active port forwards.
     * 
     * @returns Array of port forward information
     */
    public getAllForwards(): PortForwardInfo[] {
        return Array.from(this.forwards.values()).map(record => this.getForwardInfo(record));
    }

    /**
     * Get a specific port forward by ID.
     * 
     * @param forwardId Unique identifier of the forward
     * @returns Port forward information or undefined if not found
     */
    public getForward(forwardId: string): PortForwardInfo | undefined {
        const record = this.forwards.get(forwardId);
        return record ? this.getForwardInfo(record) : undefined;
    }

    /**
     * Check if a local port is available.
     * 
     * @param port Port number to check
     * @returns Promise resolving to true if port is available, false otherwise
     */
    public async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '127.0.0.1');
        });
    }

    /**
     * Find the next available port starting from the given port.
     * 
     * @param startPort Starting port number
     * @returns Promise resolving to the next available port number
     * @throws Error if no port is available in the valid range
     */
    public async findNextAvailablePort(startPort: number): Promise<number> {
        // Validate start port
        if (startPort < 1024 || startPort > 65535) {
            throw new Error('Start port must be between 1024 and 65535');
        }

        // Check ports sequentially up to 65535
        for (let port = startPort; port <= 65535; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }

        throw new Error(`No available port found starting from ${startPort}`);
    }

    /**
     * Dispose of the manager and clean up all resources.
     * Stops all active forwards, disposes status bar item, and disposes event emitter.
     */
    public dispose(): void {
        this.stopAllForwards().catch(error => {
            console.error('Error stopping all forwards during dispose:', error);
        });
        this.statusBarItem.dispose();
        this.eventEmitter.dispose();
    }

    /**
     * Initialize the status bar item.
     * Creates the status bar item and hides it by default.
     */
    private initializeStatusBar(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            200 // Higher priority than namespace status bar (100)
        );
        this.statusBarItem.tooltip = 'Click to view port forwards';
        this.statusBarItem.hide();
    }

    /**
     * Update the status bar display based on active forward count.
     * Shows status bar when forwards are active, hides when none.
     */
    private updateStatusBar(): void {
        const count = this.forwards.size;
        if (count === 0) {
            this.statusBarItem.hide();
        } else {
            const text = count === 1 
                ? '$(zap) kube9: 1 forward active'
                : `$(zap) kube9: ${count} forwards active`;
            this.statusBarItem.text = text;
            this.statusBarItem.show();
        }
    }

    /**
     * Validate port forward configuration.
     * 
     * @param config Configuration to validate
     * @throws Error if configuration is invalid
     */
    private validateConfig(config: PortForwardConfig): void {
        // Validate pod name is non-empty
        if (!config.podName || config.podName.trim() === '') {
            throw new Error('Pod name is required');
        }

        // Validate namespace is non-empty
        if (!config.namespace || config.namespace.trim() === '') {
            throw new Error('Namespace is required');
        }

        // Validate context is non-empty
        if (!config.context || config.context.trim() === '') {
            throw new Error('Context is required');
        }

        // Validate local port range (non-privileged ports)
        if (config.localPort < 1024 || config.localPort > 65535) {
            throw new Error('Local port must be between 1024 and 65535');
        }

        // Validate remote port range
        if (config.remotePort < 1 || config.remotePort > 65535) {
            throw new Error('Remote port must be between 1 and 65535');
        }
    }

    /**
     * Build kubectl port-forward command arguments.
     * 
     * @param config Port forward configuration
     * @returns Array of command arguments
     */
    private buildKubectlCommand(config: PortForwardConfig): string[] {
        const args = [
            'port-forward',
            config.podName,
            `${config.localPort}:${config.remotePort}`,
            '-n', config.namespace,
            '--context', config.context
        ];

        if (config.containerName) {
            args.push('-c', config.containerName);
        }

        return args;
    }

    /**
     * Convert a PortForwardRecord to PortForwardInfo.
     * 
     * @param record Internal forward record
     * @returns Public forward information
     */
    private getForwardInfo(record: PortForwardRecord): PortForwardInfo {
        const now = new Date();
        const uptime = Math.floor((now.getTime() - record.startTime.getTime()) / 1000);

        return {
            id: record.id,
            podName: record.config.podName,
            namespace: record.config.namespace,
            context: record.config.context,
            localPort: record.config.localPort,
            remotePort: record.config.remotePort,
            status: record.status,
            uptime: uptime,
            startTime: record.startTime
        };
    }

    /**
     * Emit a forwards changed event.
     * 
     * @param event Event to emit
     */
    private emitForwardsChanged(event: PortForwardEvent): void {
        this.eventEmitter.fire(event);
    }
}

