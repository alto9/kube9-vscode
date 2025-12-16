/**
 * TTL-based caching layer for Kubernetes resources.
 * Minimizes redundant API calls and improves tree view responsiveness.
 * 
 * The cache uses different TTL values based on resource volatility:
 * - Nodes and namespaces: 30 seconds (change infrequently)
 * - Pods: 5 seconds (change frequently)
 * - Deployments: 10 seconds
 * - Services: 30 seconds
 * - Cluster info: 60 seconds
 * 
 * Cache entries are automatically expired and removed when accessed after TTL.
 * The cache uses context-aware keys to prevent cross-contamination between clusters.
 */

/**
 * Cache entry interface for storing cached data with TTL.
 * @template T - The type of data being cached
 */
interface CacheEntry<T> {
    /** The cached data */
    data: T;
    /** Timestamp when the entry was cached (milliseconds since epoch) */
    timestamp: number;
    /** Time-to-live in milliseconds */
    ttl: number;
}

/**
 * Resource cache implementation with TTL support.
 * Provides in-memory caching for Kubernetes resources with automatic expiration.
 */
export class ResourceCache {
    private cache: Map<string, CacheEntry<unknown>>;

    /**
     * Creates a new ResourceCache instance.
     * Initializes an empty cache map.
     */
    constructor() {
        this.cache = new Map();
    }

    /**
     * Store data in cache with TTL.
     * @template T - The type of data being stored
     * @param key - Cache key (should include context name to prevent cross-cluster contamination)
     * @param data - Data to cache
     * @param ttl - Time-to-live in milliseconds
     */
    public set<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Retrieve data from cache if valid.
     * Automatically removes expired entries when accessed.
     * @template T - The type of data being retrieved
     * @param key - Cache key
     * @returns Cached data if valid, null if expired or not found
     */
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Invalidate specific cache entry.
     * @param key - Cache key to remove
     */
    public invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all cache entries matching pattern.
     * Useful for bulk invalidation (e.g., all entries for a specific context).
     * @param pattern - Regular expression to match against cache keys
     */
    public invalidatePattern(pattern: RegExp): void {
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear entire cache.
     * Removes all cached entries regardless of TTL.
     */
    public clear(): void {
        this.cache.clear();
    }
}

/**
 * Cache TTL configurations in milliseconds.
 * Values balance freshness requirements with performance gains.
 */
export const CACHE_TTL = {
    /** TTL for node resources (30 seconds) */
    NODES: 30000,
    /** TTL for namespace resources (30 seconds) */
    NAMESPACES: 30000,
    /** TTL for pod resources (5 seconds - pods change frequently) */
    PODS: 5000,
    /** TTL for deployment resources (10 seconds) */
    DEPLOYMENTS: 10000,
    /** TTL for service resources (30 seconds) */
    SERVICES: 30000,
    /** TTL for cluster info resources (60 seconds) */
    CLUSTER_INFO: 60000
};

/**
 * Private module-level variable to hold the singleton instance.
 */
let resourceCacheInstance: ResourceCache | null = null;

/**
 * Gets the singleton ResourceCache instance.
 * Creates a new instance on first call, returns the same instance on subsequent calls.
 * 
 * @returns The singleton ResourceCache instance
 */
export function getResourceCache(): ResourceCache {
    if (!resourceCacheInstance) {
        resourceCacheInstance = new ResourceCache();
    }
    return resourceCacheInstance;
}

/**
 * Resets the singleton ResourceCache instance.
 * Used primarily for testing to ensure clean state between tests.
 * The next call to getResourceCache() will create a new instance.
 */
export function resetResourceCache(): void {
    resourceCacheInstance = null;
}

