import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';

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
    public async startForward(config: PortForwardConfig): Promise<PortForwardInfo> {
        // 1. Validate configuration
        this.validateConfig(config);

        // 2. Check port availability
        const portAvailable = await this.isPortAvailable(config.localPort);
        if (!portAvailable) {
            const alternativePort = await this.findNextAvailablePort(config.localPort + 1).catch(() => null);
            const suggestion = alternativePort ? ` Try port ${alternativePort} instead.` : '';
            throw new Error(`Local port ${config.localPort} is already in use.${suggestion}`);
        }

        // 3. Check for existing forward (prevent duplicates)
        const existingForward = this.findExistingForward(config);
        if (existingForward) {
            if (existingForward.status === PortForwardStatus.Connected) {
                // Return existing forward info
                return this.getForwardInfo(existingForward);
            } else if (existingForward.status === PortForwardStatus.Connecting || 
                       existingForward.status === PortForwardStatus.Disconnected) {
                // Stop existing forward and proceed with new one
                await this.stopForward(existingForward.id).catch(() => {
                    // Continue even if stop fails
                });
            }
        }

        // 4. Build kubectl command
        const args = this.buildKubectlCommand(config);

        // 5. Spawn kubectl process
        const kubectlProcess = spawn('kubectl', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        // Handle spawn error (kubectl not found, etc.)
        if (!kubectlProcess.pid) {
            throw new Error('Failed to start kubectl process: Process PID is undefined');
        }

        // 6. Generate UUID for forward ID
        const forwardId = uuidv4();

        // 7. Create PortForwardRecord with status 'connecting'
        const record: PortForwardRecord = {
            id: forwardId,
            config: config,
            processId: kubectlProcess.pid,
            process: kubectlProcess,
            status: PortForwardStatus.Connecting,
            startTime: new Date()
        };

        // 8. Store record in forwards Map
        this.forwards.set(forwardId, record);

        // 9. Set up process monitoring
        this.setupProcessMonitoring(record);

        // 10. Wait for connection confirmation (10 second timeout)
        try {
            await this.waitForConnection(record, 10000);
        } catch (error) {
            // Clean up on timeout or error
            this.forwards.delete(forwardId);
            if (kubectlProcess.pid) {
                kubectlProcess.kill('SIGTERM');
            }
            throw error;
        }

        // 11. Update status bar and emit event
        this.emitForwardsChanged({
            type: 'added',
            forwardId: forwardId,
            forwardInfo: this.getForwardInfo(record)
        });
        this.updateStatusBar();

        // 12. Return PortForwardInfo
        return this.getForwardInfo(record);
    }

    /**
     * Stop a port forward by ID.
     * 
     * @param forwardId Unique identifier of the forward to stop
     * @throws Error if forward is not found
     */
    public async stopForward(forwardId: string): Promise<void> {
        // Retrieve forward record
        const record = this.forwards.get(forwardId);
        if (!record) {
            throw new Error(`Forward ${forwardId} not found`);
        }

        // Update status to 'stopped' before killing process to prevent handleProcessExit from double-processing
        record.status = PortForwardStatus.Stopped;

        // Kill the process gracefully
        await this.killProcess(record.process);

        // Remove from state
        this.forwards.delete(forwardId);

        // Emit event and update status bar
        this.emitForwardsChanged({
            type: 'removed',
            forwardId: forwardId
        });
        this.updateStatusBar();
    }

    /**
     * Stop all active port forwards.
     */
    public async stopAllForwards(): Promise<void> {
        const forwardIds = Array.from(this.forwards.keys());
        await Promise.all(
            forwardIds.map(id => this.stopForward(id).catch(err => {
                console.error(`Failed to stop forward ${id}:`, err);
            }))
        );
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

    /**
     * Find an existing forward with matching configuration.
     * 
     * @param config Port forward configuration to match
     * @returns Existing forward record or undefined if not found
     */
    private findExistingForward(config: PortForwardConfig): PortForwardRecord | undefined {
        return Array.from(this.forwards.values()).find(record =>
            record.config.podName === config.podName &&
            record.config.namespace === config.namespace &&
            record.config.context === config.context &&
            record.config.localPort === config.localPort
        );
    }

    /**
     * Wait for connection to be established with timeout.
     * 
     * @param record Port forward record to wait for
     * @param timeoutMs Timeout in milliseconds
     * @returns Promise that resolves when connected or rejects on timeout
     */
    private waitForConnection(record: PortForwardRecord, timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            // If already connected, resolve immediately
            if (record.status === PortForwardStatus.Connected) {
                resolve();
                return;
            }

            // Set up timeout
            const timeout = setTimeout(() => {
                // Clean up on timeout
                this.forwards.delete(record.id);
                if (record.process.pid) {
                    record.process.kill('SIGTERM');
                }
                reject(new Error(`Connection timeout: Port forward did not establish within ${timeoutMs}ms`));
            }, timeoutMs);

            // Watch for status change to connected
            const checkInterval = setInterval(() => {
                if (record.status === PortForwardStatus.Connected) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve();
                } else if (record.status === PortForwardStatus.Error || record.status === PortForwardStatus.Stopped) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    const errorMsg = record.error || 'Port forward failed';
                    reject(new Error(errorMsg));
                }
            }, 100); // Check every 100ms

            // Clean up interval on timeout
            timeout.refresh();
        });
    }

    /**
     * Set up process monitoring for stdout, stderr, exit, and error events.
     * 
     * @param record Port forward record to monitor
     */
    private setupProcessMonitoring(record: PortForwardRecord): void {
        // Monitor stdout for connection success
        record.process.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            record.lastActivity = new Date();

            // Detect successful connection
            if (output.includes('Forwarding from')) {
                this.handleConnectionEstablished(record);
            }
        });

        // Monitor stderr for errors
        record.process.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            record.lastActivity = new Date();

            // Detect specific errors
            if (error.includes('unable to forward') || error.includes('error forwarding port')) {
                this.handleForwardError(record, 'Port forwarding failed');
            } else if (error.includes('Forbidden') || error.includes('permission denied')) {
                this.handleForwardError(record, 'Permission denied: Check RBAC permissions');
            } else if (error.includes('pod') && error.includes('not found')) {
                this.handleForwardError(record, 'Pod not found');
            }
        });

        // Monitor process exit
        record.process.on('exit', (code: number | null, signal: string | null) => {
            this.handleProcessExit(record, code, signal);
        });

        // Monitor process spawn error
        record.process.on('error', (err: Error) => {
            this.handleProcessSpawnError(record, err);
        });
    }

    /**
     * Handle connection established event.
     * 
     * @param record Port forward record
     */
    private handleConnectionEstablished(record: PortForwardRecord): void {
        if (record.status === PortForwardStatus.Connecting) {
            record.status = PortForwardStatus.Connected;
            this.emitForwardsChanged({
                type: 'updated',
                forwardId: record.id,
                forwardInfo: this.getForwardInfo(record)
            });
            this.updateStatusBar();
        }
    }

    /**
     * Handle forward error event.
     * 
     * @param record Port forward record
     * @param error Error message
     */
    private handleForwardError(record: PortForwardRecord, error: string): void {
        record.status = PortForwardStatus.Error;
        record.error = error;
        this.emitForwardsChanged({
            type: 'updated',
            forwardId: record.id,
            forwardInfo: this.getForwardInfo(record)
        });
        this.updateStatusBar();
    }

    /**
     * Handle process exit event.
     * 
     * @param record Port forward record
     * @param code Exit code
     * @param signal Exit signal
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleProcessExit(record: PortForwardRecord, code: number | null, signal: string | null): void {
        // Don't process if already marked as stopped (intentional)
        if (record.status === PortForwardStatus.Stopped) {
            return;
        }

        // Mark as disconnected
        record.status = PortForwardStatus.Disconnected;

        // Remove from active forwards
        this.forwards.delete(record.id);

        this.emitForwardsChanged({
            type: 'removed',
            forwardId: record.id
        });
        this.updateStatusBar();

        // Show notification if unexpected exit
        if (code !== 0 && code !== null) {
            vscode.window.showWarningMessage(
                `Port forward stopped unexpectedly: localhost:${record.config.localPort} → ${record.config.namespace}/${record.config.podName}:${record.config.remotePort}`
            );
        }
    }

    /**
     * Handle process spawn error event.
     * 
     * @param record Port forward record
     * @param err Error object
     */
    private handleProcessSpawnError(record: PortForwardRecord, err: Error): void {
        // Handle ENOENT (kubectl not found)
        const errnoError = err as NodeJS.ErrnoException;
        if (errnoError.code === 'ENOENT') {
            record.status = PortForwardStatus.Error;
            record.error = 'kubectl not found: Please install kubectl and ensure it is in your PATH';
        } else {
            record.status = PortForwardStatus.Error;
            record.error = err.message || 'Failed to spawn kubectl process';
        }

        // Remove from forwards Map
        this.forwards.delete(record.id);

        this.emitForwardsChanged({
            type: 'removed',
            forwardId: record.id
        });
        this.updateStatusBar();
    }

    /**
     * Gracefully terminate a child process with SIGTERM, then SIGKILL if needed.
     * 
     * @param process Child process to terminate
     * @returns Promise that resolves when process is terminated
     */
    private async killProcess(process: ChildProcess): Promise<void> {
        return new Promise((resolve) => {
            if (!process.pid) {
                resolve();
                return;
            }
            
            process.kill('SIGTERM');
            
            const timeout = setTimeout(() => {
                if (!process.killed) {
                    process.kill('SIGKILL');
                }
                resolve();
            }, 1000);
            
            process.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }
}

