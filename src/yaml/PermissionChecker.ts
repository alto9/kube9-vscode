import { ResourceIdentifier } from './YAMLEditorManager';
import { logError } from './ErrorHandler';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as k8s from '@kubernetes/client-node';


/**
 * Permission levels for Kubernetes resources.
 */
export enum PermissionLevel {
    /** No access to the resource */
    none = 'none',
    /** Can only read the resource */
    readOnly = 'readonly',
    /** Can read and write the resource */
    readWrite = 'readwrite',
    /** Permission status is unknown (e.g., due to errors) */
    unknown = 'unknown'
}

/**
 * Checks user permissions for Kubernetes resources using the SelfSubjectAccessReview API.
 * Determines whether users can view, edit, or have no access to resources.
 */
export class PermissionChecker {
    /**
     * Checks the permission level a user has for a specific Kubernetes resource.
     * 
     * This method performs two checks:
     * 1. Can the user update the resource? (ReadWrite)
     * 2. Can the user get the resource? (ReadOnly)
     * 
     * @param resource - The resource identifier specifying which resource to check
     * @returns Promise resolving to the permission level
     */
    public async checkResourcePermissions(resource: ResourceIdentifier): Promise<PermissionLevel> {
        try {
            // First check if user can update (write) this resource
            const updateResult = await this.checkPermission(resource, 'update');
            
            if (updateResult === true) {
                console.log(`User has ReadWrite permissions for ${resource.kind}/${resource.name}`);
                return PermissionLevel.readWrite;
            }
            
            if (updateResult === null) {
                // kubectl command failed, cannot determine permissions
                console.warn(`Unable to check update permissions for ${resource.kind}/${resource.name}`);
                return PermissionLevel.unknown;
            }
            
            // User cannot update, check if they can at least read (get)
            const getResult = await this.checkPermission(resource, 'get');
            
            if (getResult === true) {
                console.log(`User has ReadOnly permissions for ${resource.kind}/${resource.name}`);
                return PermissionLevel.readOnly;
            }
            
            if (getResult === null) {
                // kubectl command failed, cannot determine permissions
                console.warn(`Unable to check get permissions for ${resource.kind}/${resource.name}`);
                return PermissionLevel.unknown;
            }
            
            // User has neither update nor get permissions
            console.log(`User has no permissions for ${resource.kind}/${resource.name}`);
            return PermissionLevel.none;
            
        } catch (error) {
            // If permission checking fails, default to Unknown for safety
            console.warn(`Failed to check permissions for ${resource.kind}/${resource.name}`);
            console.warn('Defaulting to Unknown permission level for safety');
            
            // Log error to output channel for debugging
            logError(
                `checking permissions for ${resource.kind}/${resource.name}`,
                error instanceof Error ? error : String(error)
            );
            
            return PermissionLevel.unknown;
        }
    }
    
    /**
     * Checks if a user can perform a specific verb on a resource.
     * Uses the SelfSubjectAccessReview API.
     * 
     * @param resource - The resource to check permissions for
     * @param verb - The verb to check (e.g., 'get', 'update', 'delete')
     * @returns Promise resolving to true if permitted, false if denied, null if check failed
     */
    private async checkPermission(resource: ResourceIdentifier, verb: string): Promise<boolean | null> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(resource.cluster);
            
            // Pluralize the resource kind for the API
            const pluralizedKind = this.pluralizeKind(resource.kind.toLowerCase());
            
            // Create SelfSubjectAccessReview request
            const review: k8s.V1SelfSubjectAccessReview = {
                apiVersion: 'authorization.k8s.io/v1',
                kind: 'SelfSubjectAccessReview',
                spec: {
                    resourceAttributes: {
                        verb: verb,
                        group: this.getResourceGroup(resource.kind),
                        resource: pluralizedKind,
                        name: resource.name,
                        namespace: resource.namespace
                    }
                }
            };
            
            // Execute the access review
            const response = await apiClient.authorization.createSelfSubjectAccessReview({
                body: review
            });
            
            // Check the result
            const allowed = response.status?.allowed || false;
            
            console.log(`SelfSubjectAccessReview ${verb} ${resource.kind}/${resource.name}: ${allowed ? 'allowed' : 'denied'}`);
            
            return allowed;
            
        } catch (error: unknown) {
            // API call may fail due to various reasons:
            // - Connection issues
            // - Invalid cluster/context
            // - Authentication problems
            // - Invalid resource type
            // Return null to indicate we couldn't determine permissions
            console.warn(`SelfSubjectAccessReview ${verb} failed`);
            
            // Log error to output channel for debugging
            logError(
                `SelfSubjectAccessReview ${verb} for ${resource.kind}/${resource.name}`,
                error instanceof Error ? error : String(error)
            );
            
            return null;
        }
    }
    
    /**
     * Gets the API group for a Kubernetes resource kind.
     * 
     * @param kind - The resource kind (e.g., "Deployment", "Pod")
     * @returns The API group (e.g., "apps", "" for core)
     */
    private getResourceGroup(kind: string): string {
        const kindLower = kind.toLowerCase();
        
        // Apps API group
        if (['deployment', 'statefulset', 'daemonset', 'replicaset'].includes(kindLower)) {
            return 'apps';
        }
        
        // Batch API group
        if (['job', 'cronjob'].includes(kindLower)) {
            return 'batch';
        }
        
        // Storage API group
        if (['storageclass'].includes(kindLower)) {
            return 'storage.k8s.io';
        }
        
        // Core API group (empty string)
        return '';
    }
    
    /**
     * Pluralizes a Kubernetes resource kind for kubectl commands.
     * Handles common Kubernetes resource types and their irregular plurals.
     * 
     * @param kind - The singular resource kind (e.g., "pod", "service")
     * @returns The pluralized resource kind (e.g., "pods", "services")
     */
    private pluralizeKind(kind: string): string {
        // Map of irregular plurals for Kubernetes resources
        const irregularPlurals: Record<string, string> = {
            'endpoints': 'endpoints',
            'horizontalpodautoscaler': 'horizontalpodautoscalers',
            'ingress': 'ingresses',
            'networkpolicy': 'networkpolicies',
            'podsecuritypolicy': 'podsecuritypolicies',
            'storageclass': 'storageclasses'
        };
        
        const lowerKind = kind.toLowerCase();
        
        // Check if it's in the irregular plurals map
        if (lowerKind in irregularPlurals) {
            return irregularPlurals[lowerKind];
        }
        
        // Handle words ending in 'ss' (add 'es')
        if (lowerKind.endsWith('ss')) {
            return lowerKind + 'es';
        }
        
        // Handle words ending in 'y' preceded by a consonant (change 'y' to 'ies')
        if (lowerKind.length > 1 && lowerKind.endsWith('y')) {
            const beforeY = lowerKind[lowerKind.length - 2];
            if (!/[aeiou]/.test(beforeY)) {
                return lowerKind.slice(0, -1) + 'ies';
            }
        }
        
        // Default: add 's'
        return lowerKind + 's';
    }
}

