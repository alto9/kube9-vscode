---
story_id: create-service-commands
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [services-spec]
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Create `ServiceCommands` class in `src/kubectl/ServiceCommands.ts` following the pattern of `ConfigurationCommands.ts` to fetch services from Kubernetes clusters.

## Context

This class provides the data layer for services, executing kubectl commands and parsing JSON responses. It follows the same pattern as `ConfigurationCommands.getConfigMaps()` and `ConfigurationCommands.getConfigMaps()`.

## Implementation Steps

1. Create new file `src/kubectl/ServiceCommands.ts`
2. Import required dependencies:
   - `execFile` from `child_process` and `promisify` from `util`
   - `KubectlError`, `KubectlErrorType` from `../kubernetes/KubectlError`
   - `getCurrentNamespace` from `../utils/kubectlContext`
3. Define interfaces:
   - `ServiceInfo` interface with: name, namespace, type, clusterIP, externalIP?, ports, selectors, endpoints?
   - `ServicePort` interface with: port, targetPort, protocol, nodePort?
   - `ServiceListResponse` interface
   - `ServiceItem` interface matching Kubernetes Service API structure
   - `ServicesResult` interface with services array and optional error
   - `ServiceResult` interface for single service queries
4. Implement `getServices()` method:
   - Check current namespace using `getCurrentNamespace()`
   - Build kubectl command args: `['get', 'services']`
   - Add `--all-namespaces` if no active namespace, otherwise omit it
   - Add `--output=json`, `--kubeconfig`, `--context` flags
   - Execute kubectl command with timeout (30000ms) and 50MB buffer
   - Parse JSON response
   - Map items to `ServiceInfo[]` format:
     - Extract name, namespace from metadata
     - Extract type from spec.type
     - Extract clusterIP from spec.clusterIP
     - Extract externalIP from status.loadBalancer.ingress or spec.externalIPs
     - Map ports array to ServicePort[]
     - Extract selectors from spec.selector
     - Set endpoints to undefined initially (deferred implementation)
   - Return `ServicesResult` with services array or error
5. Implement `getService()` method for single service queries:
   - Build kubectl command: `['get', 'service', name, '--namespace=<namespace>', '--output=json', ...]`
   - Execute and parse similar to `getServices()`
   - Return `ServiceResult` with single service or error
6. Handle errors following `ConfigurationCommands` pattern:
   - Catch execFile errors
   - Parse kubectl error messages
   - Create `KubectlError` objects with appropriate type
   - Return error in result object

## Files Affected

- `src/kubectl/ServiceCommands.ts` - New file

## Acceptance Criteria

- [ ] `ServiceCommands` class exists with `getServices()` and `getService()` methods
- [ ] All interfaces defined matching spec requirements
- [ ] `getServices()` handles namespace context correctly (all-namespaces vs single namespace)
- [ ] Service data properly extracted from Kubernetes API response
- [ ] Error handling follows existing patterns
- [ ] TypeScript compilation succeeds without errors
- [ ] Code follows same structure as `ConfigurationCommands.ts`

## Dependencies

- 001-add-networking-tree-item-types (types may be referenced in error handling)

