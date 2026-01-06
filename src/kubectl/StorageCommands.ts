import { KubectlError } from '../kubernetes/KubectlError';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';


/**
 * Information about a Kubernetes persistent volume.
 */
export interface PersistentVolumeInfo {
    /** Name of the persistent volume */
    name: string;
    /** Storage capacity (e.g., "10Gi") */
    capacity: string;
    /** Status of the PV (Available, Bound, Released, Failed) */
    status: string;
    /** Reference to the claim if bound */
    claimRef?: string;
}

/**
 * Information about a Kubernetes persistent volume claim.
 */
export interface PersistentVolumeClaimInfo {
    /** Name of the persistent volume claim */
    name: string;
    /** Namespace of the persistent volume claim */
    namespace: string;
    /** Storage capacity (e.g., "5Gi") */
    capacity: string;
    /** Status of the PVC (Pending, Bound, Lost) */
    status: string;
}

/**
 * Information about a Kubernetes storage class.
 */
export interface StorageClassInfo {
    /** Name of the storage class */
    name: string;
    /** Provisioner type (e.g., "kubernetes.io/aws-ebs") */
    provisioner: string;
    /** Whether this is the default storage class */
    isDefault: boolean;
}

/**
 * Result of a persistent volume query operation.
 */
export interface PersistentVolumesResult {
    /**
     * Array of persistent volume information, empty if query failed.
     */
    persistentVolumes: PersistentVolumeInfo[];
    
    /**
     * Error information if the persistent volume query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a persistent volume claim query operation.
 */
export interface PersistentVolumeClaimsResult {
    /**
     * Array of persistent volume claim information, empty if query failed.
     */
    persistentVolumeClaims: PersistentVolumeClaimInfo[];
    
    /**
     * Error information if the persistent volume claim query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a storage class query operation.
 */
export interface StorageClassesResult {
    /**
     * Array of storage class information, empty if query failed.
     */
    storageClasses: StorageClassInfo[];
    
    /**
     * Error information if the storage class query failed.
     */
    error?: KubectlError;
}



/**
 * Utility class for kubectl storage operations.
 */
export class StorageCommands {
    /**
     * Retrieves the list of persistent volumes from the cluster using the Kubernetes API client.
     * Uses direct API calls to fetch PersistentVolume resources.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns PersistentVolumesResult with persistentVolumes array and optional error information
     */
    public static async getPersistentVolumes(
        kubeconfigPath: string,
        contextName: string
    ): Promise<PersistentVolumesResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:persistentvolumes`;
            const cached = cache.get<PersistentVolumeInfo[]>(cacheKey);
            if (cached) {
                return { persistentVolumes: cached };
            }
            
            // Fetch from API
            const response = await apiClient.core.listPersistentVolume({
                timeoutSeconds: 10
            });
            
            // Transform k8s.V1PersistentVolume[] to PersistentVolumeInfo[] format
            const persistentVolumes: PersistentVolumeInfo[] = response.items.map(pv => {
                const name = pv.metadata?.name || 'Unknown';
                const capacity = pv.spec?.capacity?.storage || 'Unknown';
                const status = pv.status?.phase || 'Unknown';
                
                // Build claim reference if the PV is bound
                let claimRef: string | undefined;
                if (pv.spec?.claimRef) {
                    const claimNamespace = pv.spec.claimRef.namespace;
                    const claimName = pv.spec.claimRef.name;
                    if (claimNamespace && claimName) {
                        claimRef = `${claimNamespace}/${claimName}`;
                    }
                }
                
                return {
                    name,
                    capacity,
                    status,
                    claimRef
                };
            });
            
            // Sort persistent volumes alphabetically by name
            persistentVolumes.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache result
            cache.set(cacheKey, persistentVolumes, CACHE_TTL.DEPLOYMENTS); // Use same TTL as deployments
            
            return { persistentVolumes };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Persistent volume query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                persistentVolumes: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of persistent volume claims from the cluster using the Kubernetes API client.
     * Uses direct API calls to fetch PersistentVolumeClaim resources across all namespaces.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns PersistentVolumeClaimsResult with persistentVolumeClaims array and optional error information
     */
    public static async getPersistentVolumeClaims(
        kubeconfigPath: string,
        contextName: string
    ): Promise<PersistentVolumeClaimsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:persistentvolumeclaims`;
            const cached = cache.get<PersistentVolumeClaimInfo[]>(cacheKey);
            if (cached) {
                return { persistentVolumeClaims: cached };
            }
            
            // Fetch from API - get all PVCs across all namespaces
            const response = await apiClient.core.listPersistentVolumeClaimForAllNamespaces({
                timeoutSeconds: 10
            });
            
            // Transform k8s.V1PersistentVolumeClaim[] to PersistentVolumeClaimInfo[] format
            const persistentVolumeClaims: PersistentVolumeClaimInfo[] = response.items.map(pvc => {
                const name = pvc.metadata?.name || 'Unknown';
                const namespace = pvc.metadata?.namespace || 'Unknown';
                const capacity = pvc.spec?.resources?.requests?.storage || 'Unknown';
                const status = pvc.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace,
                    capacity,
                    status
                };
            });
            
            // Sort persistent volume claims by namespace first, then by name
            persistentVolumeClaims.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            // Cache result
            cache.set(cacheKey, persistentVolumeClaims, CACHE_TTL.DEPLOYMENTS); // Use same TTL as deployments
            
            return { persistentVolumeClaims };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Persistent volume claim query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                persistentVolumeClaims: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of storage classes from the cluster using the Kubernetes API client.
     * Uses direct API calls to fetch StorageClass resources.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns StorageClassesResult with storageClasses array and optional error information
     */
    public static async getStorageClasses(
        kubeconfigPath: string,
        contextName: string
    ): Promise<StorageClassesResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:storageclasses`;
            const cached = cache.get<StorageClassInfo[]>(cacheKey);
            if (cached) {
                return { storageClasses: cached };
            }
            
            // Fetch from API
            const response = await apiClient.storage.listStorageClass({
                timeoutSeconds: 10
            });
            
            // Transform k8s.V1StorageClass[] to StorageClassInfo[] format
            const storageClasses: StorageClassInfo[] = response.items.map(sc => {
                const name = sc.metadata?.name || 'Unknown';
                const provisioner = sc.provisioner || 'Unknown';
                
                // Check if this is the default storage class
                // The annotation key is "storageclass.kubernetes.io/is-default-class"
                const isDefault = sc.metadata?.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true';
                
                return {
                    name,
                    provisioner,
                    isDefault
                };
            });
            
            // Sort storage classes alphabetically by name
            storageClasses.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache result
            cache.set(cacheKey, storageClasses, CACHE_TTL.DEPLOYMENTS); // Use same TTL as deployments
            
            return { storageClasses };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Storage class query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                storageClasses: [],
                error: kubectlError
            };
        }
    }
}

