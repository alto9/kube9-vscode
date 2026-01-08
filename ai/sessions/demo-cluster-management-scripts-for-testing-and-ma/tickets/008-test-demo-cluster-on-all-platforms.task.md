---
task_id: 008-test-demo-cluster-on-all-platforms
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
  - demo-cluster-scenarios
  - demo-cluster-vscode-integration
status: pending
---

# Test Demo Cluster System on All Platforms

## Objective

Manually test the complete demo cluster system on macOS, Linux, and Windows WSL2 to ensure cross-platform compatibility.

## Context

Shell scripts and Minikube behavior can vary across platforms. Thorough testing on all supported platforms ensures a consistent experience for all developers.

## Testing Checklist

### macOS Testing

**Environment:**
- macOS (Homebrew)
- Minikube via brew
- kubectl via brew
- Docker Desktop

**Test Cases:**
- [ ] start.sh creates cluster successfully
- [ ] start.sh detects existing cluster
- [ ] stop.sh stops cluster
- [ ] reset.sh with confirmation works
- [ ] reset.sh cancellation works
- [ ] populate.sh with each scenario works
- [ ] populate.sh validates invalid scenarios
- [ ] Kubeconfig isolation verified
- [ ] VSCode launch config works
- [ ] Extension loads only demo cluster
- [ ] No interference with real clusters

### Linux Testing

**Environment:**
- Linux (Ubuntu/Debian preferred)
- Minikube installed manually
- kubectl installed manually
- Docker or KVM2 driver

**Test Cases:**
- [ ] All macOS test cases repeated on Linux
- [ ] Docker driver works
- [ ] KVM2 driver works (if available)
- [ ] File permissions correct on scripts
- [ ] Paths work correctly

### Windows WSL2 Testing

**Environment:**
- Windows 11 with WSL2
- Ubuntu on WSL2
- Docker Desktop with WSL2 backend
- Minikube in WSL2

**Test Cases:**
- [ ] All macOS test cases repeated on WSL2
- [ ] Script execution works in bash
- [ ] Kubeconfig path resolution works
- [ ] VSCode integration from Windows works
- [ ] Extension Development Host works with WSL paths

## Scenario Testing

For each platform, test all scenarios:

### with-operator Scenario
- [ ] Deploys successfully
- [ ] kube9-system namespace created
- [ ] kube9-operator pod running
- [ ] Multiple namespaces visible
- [ ] ~15-20 resources created

### without-operator Scenario
- [ ] Deploys successfully
- [ ] No kube9-system namespace
- [ ] No operator pod
- [ ] Simpler resource set
- [ ] ~8-10 resources created

### healthy Scenario
- [ ] All pods reach Running state
- [ ] All readiness probes pass
- [ ] All deployments reach desired replicas
- [ ] No error events

### degraded Scenario
- [ ] CrashLoopBackOff pods present
- [ ] ImagePullBackOff pods present
- [ ] Pending pods present
- [ ] Failed readiness probes present
- [ ] Error events visible

## VSCode Integration Testing

For each platform:
- [ ] launch.json configuration appears in debug dropdown
- [ ] "Extension (Demo Cluster)" launches Extension Development Host
- [ ] Extension loads with demo kubeconfig
- [ ] Tree view shows only kube9-demo cluster
- [ ] Real clusters not visible
- [ ] Can interact with demo cluster resources
- [ ] Can reload extension (Ctrl+R / Cmd+R)
- [ ] Closing dev host doesn't affect main VSCode

## Error Handling Testing

Test error scenarios on at least one platform:
- [ ] Minikube not installed - shows helpful error
- [ ] Cluster not running for populate.sh - shows error
- [ ] Invalid scenario name - shows available scenarios
- [ ] Kubeconfig doesn't exist - extension handles gracefully

## Documentation Verification

- [ ] README instructions work as written
- [ ] All code examples in README are correct
- [ ] Troubleshooting guide is accurate
- [ ] Platform-specific notes are accurate

## Issue Tracking

If any issues found:
1. Document the issue with platform, error message, and steps to reproduce
2. Note any platform-specific workarounds needed
3. Update documentation or code as necessary
4. Retest after fixes

## Acceptance Criteria

- [ ] All test cases pass on macOS
- [ ] All test cases pass on Linux
- [ ] All test cases pass on Windows WSL2
- [ ] All four scenarios work on all platforms
- [ ] VSCode integration works on all platforms
- [ ] Error handling works correctly
- [ ] README instructions verified on all platforms
- [ ] Any platform-specific issues documented and resolved

## Time Estimate

60-90 minutes (manual testing across platforms)

## Notes

Testing can be done in parallel across multiple machines or sequentially on a single machine with multiple OS environments (VM, dual boot, etc.).
