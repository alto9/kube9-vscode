---
story_id: create-services-subcategory
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [services-spec]
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Create `ServicesSubcategory` class in `src/tree/categories/networking/ServicesSubcategory.ts` following the pattern of `ConfigMapsSubcategory.ts` to fetch and display service resources in the tree view.

## Context

This class queries services using `ServiceCommands`, creates tree items for each service, and formats them with proper labels, descriptions, icons, and tooltips.

## Implementation Steps

1. Create new file `src/tree/categories/networking/ServicesSubcategory.ts`
2. Import required dependencies:
   - `vscode` from `vscode`
   - `ClusterTreeItem` from `../../ClusterTreeItem`
   - `TreeItemData` from `../../TreeItemTypes`
   - `ServiceCommands` from `../../../kubectl/ServiceCommands`
   - `KubectlError` from `../../../kubernetes/KubectlError`
3. Define `ErrorHandler` type: `(error: KubectlError, clusterName: string) => void`
4. Create `ServicesSubcategory` class with static method:
   - `getServiceItems(resourceData: TreeItemData, kubeconfigPath: string, errorHandler: ErrorHandler): Promise<ClusterTreeItem[]>`
5. Implement `getServiceItems()`:
   - Extract contextName and clusterName from resourceData
   - Call `ServiceCommands.getServices(kubeconfigPath, contextName)`
   - Handle errors: if `result.error`, call errorHandler and return empty array
   - If no services, return empty array
   - Map services to tree items:
     - Create `ClusterTreeItem` for each service:
       - Label: `${serviceInfo.namespace}/${serviceInfo.name}`
       - Type: `'service'`
       - CollapsibleState: `None`
       - Description: `serviceInfo.type` (e.g., "ClusterIP", "LoadBalancer")
       - Icon: `ThemeIcon('globe')` or `ThemeIcon('link')`
       - ContextValue: `'resource:Service'`
       - ResourceData: include resourceName and namespace
     - Build tooltip string with:
       - Service name
       - Namespace
       - Type
       - Cluster IP
       - External IP (if applicable, otherwise "N/A")
       - Ports formatted as "port:targetPort/protocol" (comma-separated)
       - Selectors formatted as "key=value" pairs (comma-separated, or "None")
       - Endpoints: "N/A" (deferred implementation)
   - Return array of service tree items
6. Create helper function `formatPorts()`:
   - Format ports array as "port:targetPort/protocol"
   - Handle both numeric and string targetPorts
   - Return comma-separated string
7. Create helper function `formatSelectors()`:
   - Format selectors object as "key=value" pairs
   - Return comma-separated string or "None" if empty

## Files Affected

- `src/tree/categories/networking/ServicesSubcategory.ts` - New file

## Acceptance Criteria

- [ ] `ServicesSubcategory` class exists with `getServiceItems()` method
- [ ] Method queries services using `ServiceCommands.getServices()`
- [ ] Service tree items created with correct format: "namespace/name"
- [ ] Service type displayed in description field
- [ ] Tooltips show all required information (name, namespace, type, IPs, ports, selectors)
- [ ] Ports formatted correctly as "port:targetPort/protocol"
- [ ] Selectors formatted correctly as "key=value" pairs
- [ ] Error handling follows existing patterns
- [ ] Code follows same structure as `ConfigMapsSubcategory.ts`
- [ ] TypeScript compilation succeeds without errors

## Dependencies

- 001-add-networking-tree-item-types (requires 'service' type)
- 002-create-service-commands (requires ServiceCommands class)

