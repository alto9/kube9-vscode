import * as vscode from 'vscode';
import { KubectlContextState, NamespaceSelectionCache } from '../types/namespaceState';
import { getContextInfo as getContextInfoFromKubectl } from '../utils/kubectlContext';

/**
 * Time-to-live for namespace context cache in milliseconds.
 * Cache expires after 5 seconds to balance performance with responsiveness.
 */
const CACHE_TTL_MS = 5000;

/**
 * Polling interval for external context changes in milliseconds.
 * Extension checks for external kubectl context changes every 30 seconds.
 */
const POLLING_INTERVAL_MS = 30000;

/**
 * Cache for namespace selection state with TTL-based invalidation.
 * 
 * This cache minimizes kubectl command executions by storing the context state
 * with a time-to-live (TTL). The cache is invalidated after the TTL expires or
 * when the extension makes context changes.
 */
export class NamespaceCache {
    /**
     * Internal cache storage.
     */
    private cache: NamespaceSelectionCache | null = null;

    /**
     * Retrieves the cached context state if valid.
     * 
     * The cache is considered valid if:
     * - The cache exists
     * - isValid flag is true
     * - TTL has not expired (lastUpdated + ttl > now)
     * 
     * @returns Cached context state if valid, null otherwise
     */
    getCachedContext(): KubectlContextState | null {
        if (!this.cache) {
            return null;
        }

        // Check if cache is marked as invalid
        if (!this.cache.isValid) {
            return null;
        }

        // Check if TTL has expired
        const now = Date.now();
        const cacheAge = now - this.cache.contextState.lastUpdated.getTime();
        
        if (cacheAge >= this.cache.ttl) {
            // Cache has expired
            return null;
        }

        return this.cache.contextState;
    }

    /**
     * Updates the cache with new context state.
     * 
     * This method stores the provided context state and resets the TTL.
     * The cache is marked as valid.
     * 
     * @param state - The kubectl context state to cache
     */
    setCachedContext(state: KubectlContextState): void {
        this.cache = {
            contextState: state,
            ttl: CACHE_TTL_MS,
            isValid: true
        };
    }

    /**
     * Invalidates the cache by marking it as invalid.
     * 
     * This forces the next read operation to execute kubectl and refresh
     * the cache. Used when the extension makes context changes.
     */
    invalidateCache(): void {
        if (this.cache) {
            this.cache.isValid = false;
        }
    }
}

/**
 * Watcher for external kubectl context changes.
 * 
 * This class polls kubectl every 30 seconds to detect context changes made
 * outside the extension (e.g., via kubectl CLI). When changes are detected,
 * it emits events to notify the extension.
 */
export class NamespaceContextWatcher {
    /**
     * Event emitter for context change notifications.
     */
    private readonly _onDidChangeContext = new vscode.EventEmitter<KubectlContextState>();

    /**
     * Public event that fires when external context changes are detected.
     */
    readonly onDidChangeContext: vscode.Event<KubectlContextState> = this._onDidChangeContext.event;

    /**
     * Interval timer for polling.
     */
    private pollingInterval: NodeJS.Timeout | null = null;

    /**
     * Last known context state for comparison.
     */
    private lastKnownState: KubectlContextState | null = null;

    /**
     * Reference to the namespace cache for state comparison.
     */
    private cache: NamespaceCache;

    /**
     * Creates a new NamespaceContextWatcher.
     * 
     * @param cache - The namespace cache to use for state tracking
     */
    constructor(cache: NamespaceCache) {
        this.cache = cache;
    }

    /**
     * Starts polling for external context changes.
     * 
     * This method begins an interval that checks kubectl context every 30 seconds.
     * If already watching, this method does nothing.
     */
    startWatching(): void {
        if (this.pollingInterval) {
            // Already watching
            return;
        }

        // Perform initial check to establish baseline
        this.checkForChanges().catch(error => {
            console.error('Failed to perform initial context check:', error);
        });

        // Start polling interval
        this.pollingInterval = setInterval(() => {
            this.checkForChanges().catch(error => {
                console.error('Failed to check for context changes:', error);
            });
        }, POLLING_INTERVAL_MS);
    }

    /**
     * Stops polling for external context changes.
     * 
     * Clears the polling interval and cleans up resources.
     */
    stopWatching(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Disposes of the watcher and cleans up resources.
     * 
     * This should be called when the extension is deactivated.
     */
    dispose(): void {
        this.stopWatching();
        this._onDidChangeContext.dispose();
    }

    /**
     * Manually triggers an immediate check for context changes.
     * 
     * This method can be called to immediately check for context changes
     * instead of waiting for the next polling interval. Useful when the
     * extension makes context changes and wants immediate status bar updates.
     */
    async triggerCheck(): Promise<void> {
        await this.checkForChanges();
    }

    /**
     * Checks for context changes by querying kubectl.
     * 
     * Compares current context with last known state. If differences are detected,
     * fires the onDidChangeContext event with the new state marked as 'external'.
     */
    private async checkForChanges(): Promise<void> {
        try {
            // Query current context from kubectl
            // This bypasses the cache to detect external changes
            const currentState = await getContextInfoFromKubectl();

            // Initialize last known state on first check
            if (!this.lastKnownState) {
                this.lastKnownState = currentState;
                return;
            }

            // Compare with last known state
            const hasChanged = this.hasContextChanged(this.lastKnownState, currentState);

            if (hasChanged) {
                // Mark as external change
                const externalState: KubectlContextState = {
                    ...currentState,
                    source: 'external'
                };

                // Update last known state
                this.lastKnownState = externalState;

                // Invalidate cache since external change occurred
                this.cache.invalidateCache();

                // Emit change event
                this._onDidChangeContext.fire(externalState);
            }
        } catch (error) {
            // Log error but don't throw - we don't want polling failures to crash the extension
            console.error('Error checking for context changes:', error);
        }
    }

    /**
     * Compares two context states to detect changes.
     * 
     * Considers context changed if any of these fields differ:
     * - currentNamespace
     * - contextName
     * - clusterName
     * 
     * @param oldState - Previous context state
     * @param newState - Current context state
     * @returns true if context has changed, false otherwise
     */
    private hasContextChanged(oldState: KubectlContextState, newState: KubectlContextState): boolean {
        return (
            oldState.currentNamespace !== newState.currentNamespace ||
            oldState.contextName !== newState.contextName ||
            oldState.clusterName !== newState.clusterName
        );
    }
}

/**
 * Singleton instance of the namespace cache.
 * Use this instance throughout the extension for consistent caching.
 */
export const namespaceCache = new NamespaceCache();

/**
 * Singleton instance of the namespace context watcher.
 * Use this instance to monitor for external kubectl context changes.
 */
export const namespaceWatcher = new NamespaceContextWatcher(namespaceCache);

