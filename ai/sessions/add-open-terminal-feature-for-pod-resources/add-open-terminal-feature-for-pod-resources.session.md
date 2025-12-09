---
session_id: add-open-terminal-feature-for-pod-resources
start_time: '2025-12-09T03:20:35.517Z'
status: development
problem_statement: Add Open Terminal feature for Pod resources
changed_files:
  - path: ai/features/cluster/pod-terminal.feature.md
    change_type: added
    scenarios_added:
      - Open terminal in single-container pod from tree view
      - Open terminal in multi-container pod with container selection
      - Cancel container selection for multi-container pod
      - Open terminal with custom shell (bash)
      - Terminal naming for different namespaces
      - Multiple terminal sessions to same pod
      - Handle pod not in running state
      - Handle pod not found error
      - Handle RBAC permission denied
      - Handle kubectl not found
      - Handle connection errors gracefully
      - Terminal respects current kubectl context
      - Terminal handles special characters in pod names
      - Open Terminal context menu only appears for Pods
      - Terminal integration with VS Code terminal features
      - Query pod to get container list before showing selection
      - Handle init containers separately from regular containers
      - Terminal command uses correct flags
      - Terminal closes when pod is deleted
      - Terminal feedback during connection
      - Works in Free and Pro tiers equally
      - Terminal provides clear user experience
    scenarios_modified:
      - Open terminal in single-container pod from tree view
      - Open terminal in multi-container pod with container selection
      - Terminal naming for different namespaces
      - Multiple terminal sessions to same pod
      - Terminal handles special characters in pod names
start_commit: 18b33da588014548b7535d466b8b94117264ae37
end_time: '2025-12-09T03:28:56.436Z'
---
## Problem Statement

Add Open Terminal feature for Pod resources to allow developers to quickly open an interactive shell session into any running pod directly from the VS Code tree view, without needing to manually type kubectl exec commands.

## Goals

1. **Seamless Pod Access**: Enable one-click access to pod terminals from tree view
2. **Multi-Container Support**: Handle pods with multiple containers gracefully
3. **Error Handling**: Provide clear, actionable error messages for common failure scenarios
4. **Context Awareness**: Respect kubectl context and namespace settings
5. **Free Tier Feature**: Works without operator dependency using kubectl exec

## Approach

### Feature Design
- Created comprehensive Gherkin scenarios covering all user interactions
- Defined behavior for single-container and multi-container pods
- Specified error handling for common failure cases (pod not running, RBAC permissions, etc.)
- Ensured feature works identically in Free and Pro tiers

### Technical Architecture
- Use VS Code Terminal API (`vscode.window.createTerminal()`)
- Execute `kubectl exec -it` commands to establish interactive sessions
- Query pod status and container list before attempting connection
- Show container selection dialog for multi-container pods
- Proper terminal naming: `kube9: <namespace>/<pod-name> (<container>)`

### Integration Points
- Context menu entry for Pod resources only
- Extract pod metadata from `ClusterTreeItem.resourceData`
- Use existing kubectl integration patterns from scale/restart commands
- Respect kubeconfig path from tree provider

## Key Decisions

1. **Shell Selection**: Default to `/bin/sh` for maximum compatibility, with potential future enhancement to detect bash
2. **Terminal Naming**: Use format `kube9: <namespace>/<pod-name>` for single-container, add `(<container>)` for multi-container
3. **Container Selection**: For multi-container pods, show quick pick before opening terminal
4. **Error Messages**: Provide specific, actionable error messages for each failure scenario
5. **No Operator Dependency**: Feature uses only kubectl exec, works in both Free and Pro tiers identically
6. **Multiple Sessions**: Allow multiple terminal sessions to same pod (independent sessions)
7. **Init Containers**: Exclude init containers from selection by default

## Notes

### Related Features
- This complements existing pod management features (scale, restart, delete)
- Similar user experience pattern to existing workload commands
- Terminal opened via `kubectl exec` rather than implementing custom connection logic

### Future Enhancements
- Shell detection (query pod for available shells)
- Custom command execution (not just shells)
- Init container support (optional)
- Terminal session reconnection on pod restart
- Command history integration

### Implementation Considerations
- Spec file created at `ai/specs/cluster/pod-terminal-spec.spec.md`
- Detailed implementation guidance including command format, error scenarios, and validation rules
- Integration tests should cover single-container, multi-container, and error cases
- Performance: Pod status query is single kubectl call (~200-500ms), terminal opens immediately
