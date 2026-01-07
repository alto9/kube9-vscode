---
story_id: 001-create-helm-service-class
session_id: helm-package-manager
feature_id:
  - helm-repository-management
  - helm-chart-discovery
  - helm-chart-installation
  - helm-release-management
spec_id:
  - helm-cli-integration
status: pending
---

# Story: Create Helm Service Class with CLI Integration

## Objective

Create the `HelmService` class that wraps Helm CLI command execution using `child_process.spawn`, similar to the existing kubectl integration pattern.

## Context

The Helm Package Manager needs a service layer to execute Helm 3.x CLI commands. This service will be used by all Helm operations (repositories, charts, releases). See [helm-cli-integration](../../specs/helm/helm-cli-integration.spec.md) for complete specification.

## Acceptance Criteria

- [ ] Create `src/services/HelmService.ts` with class implementation
- [ ] Implement `executeCommand(args: string[]): Promise<string>` method using `child_process.spawn`
- [ ] Configure Helm commands to use current cluster's kubeconfig
- [ ] Implement `version(): Promise<string>` method to check Helm CLI availability
- [ ] Implement error handling that parses stderr for user-friendly messages
- [ ] Export singleton instance or factory function for use by extension
- [ ] Add TypeScript interfaces for service method parameters

## Implementation Notes

```typescript
// Use spawn pattern similar to kubectl integration
const helm = spawn('helm', args, {
  env: { ...process.env, KUBECONFIG: this.kubeconfigPath },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

- Capture stdout for successful command output
- Capture stderr for error messages
- Reject promise on non-zero exit codes
- Parse JSON output where available (--output json flag)

## Files Involved

- `src/services/HelmService.ts` (create new)
- `src/services/index.ts` (update exports)

## Dependencies

- Node.js `child_process` module
- Existing kubeconfig path from extension context

## Estimated Time

25 minutes

