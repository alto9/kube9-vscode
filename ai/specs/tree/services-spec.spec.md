---
spec_id: services-spec
feature_id: [tree-view-navigation]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# Services Implementation Specification

## Overview

This specification defines the technical implementation for displaying and managing Kubernetes Services in the tree view. Services are displayed under the Networking category as a subcategory, following the same patterns as ConfigMaps under Configuration.

## Architecture

### Component Structure

```
NetworkingCategory (parent)
  └── ServicesSubcategory (child)
      └── ServiceTreeItem[] (individual services)
```

### Class Responsibilities

#### NetworkingCategory
- **Location**: `src/tree/categories/networking/NetworkingCategory.ts`
- **Purpose**: Parent category handler for networking resources
- **Responsibilities**:
  - Returns subcategory tree items (currently just Services)
  - Follows the same pattern as `ConfigurationCategory`
  - Designed for future expansion (Ingress, NetworkPolicies, etc.)
- **Methods**:
  - `getNetworkingSubcategories(resourceData: TreeItemData): ClusterTreeItem[]`

#### ServicesSubcategory
- **Location**: `src/tree/categories/networking/ServicesSubcategory.ts`
- **Purpose**: Fetches and displays service resources
- **Responsibilities**:
  - Query services using kubectl via `ServiceCommands`
  - Create tree items for each service
  - Format service display (namespace/name with type in description)
  - Set appropriate icons and tooltips
  - Handle errors gracefully
- **Methods**:
  - `getServiceItems(resourceData: TreeItemData, kubeconfigPath: string, errorHandler: ErrorHandler): Promise<ClusterTreeItem[]>`

#### ServiceCommands
- **Location**: `src/kubectl/ServiceCommands.ts`
- **Purpose**: Kubectl command execution for services
- **Responsibilities**:
  - Execute `kubectl get services` commands
  - Parse JSON responses
  - Handle errors and timeouts
  - Return structured service information
- **Methods**:
  - `getServices(kubeconfigPath: string, contextName: string): Promise<ServicesResult>`
  - `getService(name: string, namespace: string, kubeconfigPath: string, contextName: string): Promise<ServiceResult>`

## Data Structures

### ServiceInfo Interface

```typescript
interface ServiceInfo {
  name: string;
  namespace: string;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  clusterIP: string;
  externalIP?: string; // Only for LoadBalancer/NodePort
  ports: ServicePort[];
  selectors: Record<string, string>;
  endpoints?: number; // Count of endpoints (may require separate query)
}

interface ServicePort {
  port: number;
  targetPort: string | number;
  protocol: 'TCP' | 'UDP' | 'SCTP';
  nodePort?: number; // Only for NodePort/LoadBalancer
}
```

### ServiceListResponse Interface

```typescript
interface ServiceListResponse {
  items?: ServiceItem[];
}

interface ServiceItem {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    type: string;
    clusterIP: string;
    externalIPs?: string[];
    ports: Array<{
      port: number;
      targetPort: string | number;
      protocol: string;
      nodePort?: number;
    }>;
    selector?: Record<string, string>;
  };
  status?: {
    loadBalancer?: {
      ingress?: Array<{
        ip?: string;
        hostname?: string;
      }>;
    };
  };
}
```

## Tree Item Configuration

### Networking Category Item

```typescript
{
  label: 'Networking',
  type: 'networking',
  collapsibleState: Collapsed,
  iconPath: ThemeIcon('globe'), // or 'link'
  tooltip: 'View networking resources (Services, Ingress, etc.)',
  contextValue: undefined // Categories don't have context menus
}
```

### Services Subcategory Item

```typescript
{
  label: 'Services',
  type: 'services',
  collapsibleState: Collapsed,
  iconPath: ThemeIcon('globe'), // or 'link'
  tooltip: 'View all services across all namespaces',
  contextValue: undefined // Subcategories don't have context menus
}
```

### Individual Service Item

```typescript
{
  label: `${namespace}/${name}`, // e.g., "production/api-service"
  type: 'service',
  collapsibleState: None,
  description: serviceType, // e.g., "ClusterIP", "LoadBalancer"
  iconPath: ThemeIcon('globe'), // or 'link'
  tooltip: `Service: ${name}\nNamespace: ${namespace}\nType: ${type}\nCluster IP: ${clusterIP}\nExternal IP: ${externalIP || 'N/A'}\nPorts: ${formattedPorts}\nSelectors: ${formattedSelectors}\nEndpoints: ${endpoints || 'N/A'}`,
  contextValue: 'resource:Service',
  resourceData: {
    ...resourceData,
    resourceName: name,
    namespace: namespace
  }
}
```

## Kubectl Commands

### Get All Services

```bash
kubectl get services --all-namespaces --output=json --kubeconfig=<path> --context=<context>
```

**Behavior**:
- If active namespace is set in kubectl context, omit `--all-namespaces` (kubectl uses context namespace)
- If no active namespace, use `--all-namespaces` to get all services
- Parse JSON response to extract service information
- Handle errors (permission denied, cluster unavailable, etc.)

### Get Specific Service

```bash
kubectl get service <name> --namespace=<namespace> --output=json --kubeconfig=<path> --context=<context>
```

**Behavior**:
- Used when opening YAML editor for a specific service
- Returns single service object
- Handles not found errors gracefully

## Tree Provider Integration

### TreeItemTypes.ts Updates

Add new types:
```typescript
export type TreeItemType = 
  | 'networking'  // Networking category
  | 'services'    // Services subcategory
  | 'service'    // Individual service item
  | ...existing types
```

### ClusterTreeProvider.ts Updates

#### getCategories() Method
Add Networking category to the categories array:
```typescript
const categories = [
  TreeItemFactory.createNodesCategory(resourceData),
  TreeItemFactory.createNamespacesCategory(resourceData),
  TreeItemFactory.createWorkloadsCategory(resourceData),
  TreeItemFactory.createStorageCategory(resourceData),
  TreeItemFactory.createNetworkingCategory(resourceData), // NEW
  TreeItemFactory.createHelmCategory(resourceData),
  TreeItemFactory.createConfigurationCategory(resourceData),
  TreeItemFactory.createCustomResourcesCategory(resourceData)
];
```

#### getCategoryChildren() Method
Add cases for networking and services:
```typescript
case 'networking':
  return NetworkingCategory.getNetworkingSubcategories(
    categoryElement.resourceData
  );

case 'services':
  return ServicesSubcategory.getServiceItems(
    categoryElement.resourceData,
    this.kubeconfig.filePath,
    (error, clusterName) => this.handleKubectlError(error, clusterName)
  );
```

#### isCategoryType() Method
Add networking and services to category type check:
```typescript
private isCategoryType(type: TreeItemType): boolean {
  return type === 'dashboard' ||
         // ... existing types
         type === 'networking' ||
         type === 'services' ||
         // ... rest of types
}
```

### TreeItemFactory.ts Updates

Add factory method:
```typescript
static createNetworkingCategory(resourceData: TreeItemData): ClusterTreeItem {
  const item = new ClusterTreeItem(
    'Networking',
    'networking',
    vscode.TreeItemCollapsibleState.Collapsed,
    resourceData
  );
  item.iconPath = new vscode.ThemeIcon('globe'); // or 'link'
  item.tooltip = 'View networking resources (Services, Ingress, etc.)';
  return item;
}
```

## Context Menu Integration

### Context Value
Services use `contextValue = 'resource:Service'` to enable context menu actions.

### Required Updates

#### extension.ts
Add Service to kind extraction helpers:
```typescript
function extractKindFromContextValue(contextValue?: string): string {
  if (!contextValue || !contextValue.startsWith('resource:')) {
    return '';
  }
  const kind = contextValue.replace('resource:', '');
  // Map to Kubernetes API kind
  const kindMap: Record<string, string> = {
    'Service': 'Service',
    'Deployment': 'Deployment',
    // ... other mappings
  };
  return kindMap[kind] || kind;
}

function getApiVersionForKind(kind: string): string {
  const apiVersionMap: Record<string, string> = {
    'Service': 'v1',
    'Deployment': 'apps/v1',
    // ... other mappings
  };
  return apiVersionMap[kind] || 'v1';
}
```

### Context Menu Actions

All standard context menu actions work automatically for Services:
- **View YAML**: Opens YAML editor (already implemented)
- **Edit**: Opens YAML editor in edit mode (already implemented)
- **Delete**: Deletes service with confirmation (already implemented)
- **Describe**: Shows service details in graphical webview with Overview, Endpoints, Events, and Metadata tabs (implemented)
- **Copy Name**: Copies service name to clipboard (requires implementation)
- **Copy YAML**: Copies service YAML to clipboard (requires implementation)

## Error Handling

### Kubectl Errors
- **Permission Denied**: Display user-friendly error message
- **Resource Not Found**: Handle gracefully (service may have been deleted)
- **Cluster Unavailable**: Show connection error
- **Timeout**: Display timeout message with retry option

### Error Handler Pattern
Follow existing pattern from `ConfigMapsSubcategory`:
```typescript
if (result.error) {
  errorHandler(result.error, clusterName);
  return [];
}
```

## Tooltip Formatting

### Service Tooltip Content

```
Service: api-service
Namespace: production
Type: LoadBalancer
Cluster IP: 10.96.0.1
External IP: 192.168.1.100
Ports: 80:8080/TCP, 443:8443/TCP
Selectors: app=api, version=v1
Endpoints: 3
```

### Port Formatting
Format ports as: `port:targetPort/protocol`
- Example: `80:8080/TCP`
- If targetPort is a number, display as-is
- If targetPort is a string (named port), display as-is

### Selector Formatting
Format selectors as comma-separated key=value pairs:
- Example: `app=api, version=v1`
- If no selectors, display "None"

## Endpoints Count

### Implementation Options

1. **Query Endpoints Resource** (Recommended):
   - Execute `kubectl get endpoints <service-name> -n <namespace>`
   - Parse endpoints to count addresses
   - More accurate but requires additional kubectl call

2. **Parse Service Status**:
   - Service status may contain endpoint information
   - Less reliable, may not always be available

3. **Defer Implementation**:
   - Show "N/A" initially
   - Add endpoints count in future iteration

## File Structure

```
src/
  tree/
    categories/
      networking/
        NetworkingCategory.ts
        ServicesSubcategory.ts
    TreeItemFactory.ts (updated)
    ClusterTreeProvider.ts (updated)
    TreeItemTypes.ts (updated)
  kubectl/
    ServiceCommands.ts (new)
```

## Dependencies

- Existing tree view infrastructure
- YAML editor (for View YAML and Edit actions)
- Context menu system (for resource actions)
- Error handling utilities (`KubectlError`, error handlers)

## Future Enhancements

- **Ingress Resources**: Add as another subcategory under Networking
- **NetworkPolicies**: Add as another subcategory under Networking
- **Endpoints**: Display as child items under services (similar to Pods under Deployments)
- **Port Forwarding**: Add context menu action for port forwarding
- **Service Endpoints Detail**: Expand service to show endpoint details

