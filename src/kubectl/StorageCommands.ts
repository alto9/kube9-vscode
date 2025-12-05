import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';
import { getCurrentNamespace } from '../utils/kubectlContext';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 5000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

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
 * Interface for kubectl persistent volume response items.
 */
interface PersistentVolumeItem {
    metadata?: {
        name?: string;
    };
    spec?: {
        capacity?: {
            storage?: string;
        };
        claimRef?: {
            namespace?: string;
            name?: string;
        };
    };
    status?: {
        phase?: string;
    };
}

/**
 * Interface for kubectl persistent volume list response.
 */
interface PersistentVolumeListResponse {
    items?: PersistentVolumeItem[];
}

/**
 * Interface for kubectl persistent volume claim response items.
 */
interface PersistentVolumeClaimItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        resources?: {
            requests?: {
                storage?: string;
            };
        };
    };
    status?: {
        phase?: string;
    };
}

/**
 * Interface for kubectl persistent volume claim list response.
 */
interface PersistentVolumeClaimListResponse {
    items?: PersistentVolumeClaimItem[];
}

/**
 * Interface for kubectl storage class response items.
 */
interface StorageClassItem {
    metadata?: {
        name?: string;
        annotations?: {
            [key: string]: string;
        };
    };
    provisioner?: string;
}

/**
 * Interface for kubectl storage class list response.
 */
interface StorageClassListResponse {
    items?: StorageClassItem[];
}

/**
 * Utility class for kubectl storage operations.
 */
export class StorageCommands {
    /**
     * Retrieves the list of persistent volumes from the cluster using kubectl.
     * Uses kubectl get pv command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns PersistentVolumesResult with persistentVolumes array and optional error information
     */
    public static async getPersistentVolumes(
        kubeconfigPath: string,
        contextName: string
    ): Promise<PersistentVolumesResult> {
        try {
            // Execute kubectl get pv with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'pv',
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: PersistentVolumeListResponse = JSON.parse(stdout);
            
            // Extract persistent volume information from the items array
            const persistentVolumes: PersistentVolumeInfo[] = response.items?.map((item: PersistentVolumeItem) => {
                const name = item.metadata?.name || 'Unknown';
                const capacity = item.spec?.capacity?.storage || 'Unknown';
                const status = item.status?.phase || 'Unknown';
                
                // Build claim reference if the PV is bound
                let claimRef: string | undefined;
                if (item.spec?.claimRef) {
                    const claimNamespace = item.spec.claimRef.namespace;
                    const claimName = item.spec.claimRef.name;
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
            }) || [];
            
            // Sort persistent volumes alphabetically by name
            persistentVolumes.sort((a, b) => a.name.localeCompare(b.name));
            
            return { persistentVolumes };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
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
     * Retrieves the list of persistent volume claims from the cluster using kubectl.
     * Uses kubectl get pvc command with --all-namespaces and JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns PersistentVolumeClaimsResult with persistentVolumeClaims array and optional error information
     */
    public static async getPersistentVolumeClaims(
        kubeconfigPath: string,
        contextName: string
    ): Promise<PersistentVolumeClaimsResult> {
        try {
            // Check if a namespace is set in kubectl context
            // Default to 'default' namespace if none is set
            try {
                await getCurrentNamespace();
            } catch (error) {
                console.warn('Failed to get current namespace, using default namespace:', error);
            }
            try {
                await getCurrentNamespace();
            } catch (error) {
                console.warn('Failed to get current namespace, using default namespace:', error);
            }

            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'pvc',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get pvc with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: PersistentVolumeClaimListResponse = JSON.parse(stdout);
            
            // Extract persistent volume claim information from the items array
            const persistentVolumeClaims: PersistentVolumeClaimInfo[] = response.items?.map((item: PersistentVolumeClaimItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'Unknown';
                const capacity = item.spec?.resources?.requests?.storage || 'Unknown';
                const status = item.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace,
                    capacity,
                    status
                };
            }) || [];
            
            // Sort persistent volume claims by namespace first, then by name
            persistentVolumeClaims.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            return { persistentVolumeClaims };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
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
     * Retrieves the list of storage classes from the cluster using kubectl.
     * Uses kubectl get storageclass command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns StorageClassesResult with storageClasses array and optional error information
     */
    public static async getStorageClasses(
        kubeconfigPath: string,
        contextName: string
    ): Promise<StorageClassesResult> {
        try {
            // Execute kubectl get storageclass with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'storageclass',
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: StorageClassListResponse = JSON.parse(stdout);
            
            // Extract storage class information from the items array
            const storageClasses: StorageClassInfo[] = response.items?.map((item: StorageClassItem) => {
                const name = item.metadata?.name || 'Unknown';
                const provisioner = item.provisioner || 'Unknown';
                
                // Check if this is the default storage class
                // The annotation key is "storageclass.kubernetes.io/is-default-class"
                const isDefault = item.metadata?.annotations?.['storageclass.kubernetes.io/is-default-class'] === 'true';
                
                return {
                    name,
                    provisioner,
                    isDefault
                };
            }) || [];
            
            // Sort storage classes alphabetically by name
            storageClasses.sort((a, b) => a.name.localeCompare(b.name));
            
            return { storageClasses };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
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

