---
story_id: implement-describe-raw-for-deployments
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Implement Describe (Raw) for Deployments

## Objective

Ensure the "Describe (Raw)" context menu command works for deployment resources, showing raw `kubectl describe` output in a text editor.

## Context

The `kube9.describeResourceRaw` command already exists and works generically for all resources. This story verifies it works correctly for deployments and handles namespace parameter properly.

## Acceptance Criteria

- [ ] Right-click → "Describe (Raw)" works on deployment tree items
- [ ] Opens read-only text editor with kubectl describe output
- [ ] Tab title includes deployment name and namespace
- [ ] Namespace parameter passed correctly to kubectl
- [ ] Output shows complete kubectl describe deployment information
- [ ] Error handling shows user-friendly messages if kubectl fails

## Implementation Steps

1. Open `src/commands/describeRaw.ts`
2. Verify `describeRawCommand()` function handles deployment kind correctly
3. Check that namespace extraction works for deployment tree items:
```typescript
const namespace = treeItem.resourceData.namespace;
```
4. Verify kubectl command includes namespace:
```typescript
const args: string[] = ['describe', 'deployment', name];
if (namespace) {
    args.push('-n', namespace);
}
args.push(`--kubeconfig=${kubeconfigPath}`, `--context=${contextName}`);
```
5. Test by right-clicking a deployment and selecting "Describe (Raw)"
6. Verify output matches `kubectl describe deployment <name> -n <namespace>`

## Files to Verify

- `src/commands/describeRaw.ts` - Verify deployment handling

## Notes

- This command should already work generically; this story is mainly verification
- If issues found, fix them; otherwise mark as complete after testing
- The generic implementation should handle all resource types including deployments

