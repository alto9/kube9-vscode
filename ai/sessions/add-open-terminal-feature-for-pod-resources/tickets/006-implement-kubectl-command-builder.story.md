---
story_id: 006-implement-kubectl-command-builder
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: pending
priority: high
estimated_minutes: 15
---

## Objective

Implement the kubectl exec command string builder that constructs the proper command based on pod metadata and selected container.

## Context

We need to build the kubectl exec command with all the proper flags for interactive terminal access. The command format is: `kubectl exec -it <pod> -n <namespace> --context <context> [-c <container>] -- /bin/sh`

## Implementation Steps

1. Open `src/commands/openTerminal.ts`
2. Create `buildKubectlExecCommand` helper function:
   - Parameters: podName, namespace, context, containerName (optional)
   - Build command string with components:
     - Base: `kubectl exec -it ${podName}`
     - Add namespace: `-n ${namespace}`
     - Add context: `--context ${context}`
     - Add container flag ONLY if containerName provided: `-c ${containerName}`
     - Add shell: `-- /bin/sh`
   - Return complete command string
3. Create `buildTerminalName` helper function:
   - Parameters: podName, namespace, containerName (optional)
   - Format: `Kube9: ${namespace}/${podName}` for single-container
   - Format: `Kube9: ${namespace}/${podName} (${containerName})` for multi-container
   - Note: Use "Kube9" with capital K (as per feature spec)
   - Return terminal name string
4. In main command handler:
   - Call `buildKubectlExecCommand` with pod metadata and selected container
   - Call `buildTerminalName` with pod metadata and selected container
   - Store both for terminal creation in next step

## Files Affected

- `src/commands/openTerminal.ts` - Add command builder functions

## Acceptance Criteria

- [ ] Command includes `-it` flags for interactive TTY
- [ ] Command includes `-n` flag with namespace
- [ ] Command includes `--context` flag with context name
- [ ] Command includes `-c` flag ONLY for multi-container pods
- [ ] Command ends with `-- /bin/sh` as the shell
- [ ] Terminal name format matches: `Kube9: namespace/pod-name` or `Kube9: namespace/pod-name (container)`
- [ ] Terminal name uses capital K in "Kube9"
- [ ] Command string is properly formatted for execution

## Dependencies

- Story 005 must be completed (container selection logic exists)

