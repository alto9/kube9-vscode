---
task_id: 007-create-demo-cluster-readme
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
  - demo-cluster-scenarios
  - demo-cluster-vscode-integration
status: pending
---

# Create Demo Cluster README Documentation

## Objective

Create comprehensive README documentation in `scripts/demo-cluster/README.md` that explains the demo cluster system, usage, scenarios, and troubleshooting.

## Context

Documentation is essential for developers to understand and use the demo cluster system effectively. This README should be the primary reference for all demo cluster operations.

## Files to Create

- `scripts/demo-cluster/README.md` (new file)

## Documentation Sections to Include

### 1. Overview

- Purpose of demo cluster system
- Benefits (safe testing, marketing screenshots, QA workflows)
- Complete isolation guarantees

### 2. Prerequisites

- Minikube installation instructions (macOS, Linux, WSL2)
- kubectl installation
- Docker or appropriate driver

### 3. Quick Start

Step-by-step guide:
```bash
# 1. Start demo cluster
./scripts/demo-cluster/start.sh

# 2. Populate with scenario
./scripts/demo-cluster/populate.sh with-operator

# 3. Launch VSCode debug
# Press F5, select "Extension (Demo Cluster)"
```

### 4. Scripts Reference

Document each script:
- **start.sh** - Purpose, usage, output
- **stop.sh** - Purpose, usage, when to use
- **reset.sh** - Purpose, usage, warning about data loss
- **populate.sh** - Purpose, usage, scenario switching

### 5. Scenarios Reference

Document each scenario:
- **with-operator** - Pro Tier, what resources it creates, when to use
- **without-operator** - Free Tier, what resources it creates, when to use
- **healthy** - All healthy, what resources it creates, testing normal operations
- **degraded** - Error states, what errors it creates, testing troubleshooting

### 6. VSCode Integration

- How launch configuration works
- KUBECONFIG environment variable explanation
- How to verify isolation
- Switching between demo and real clusters

### 7. Common Workflows

Examples:
- Daily development workflow
- Marketing screenshot workflow
- QA regression testing workflow
- Demo presentation workflow

### 8. Troubleshooting

Common issues and solutions:
- Demo cluster not starting
- Extension shows real clusters instead of demo
- Cannot connect to demo cluster
- Scenario deployment fails
- Wrong kubeconfig being used

### 9. Platform-Specific Notes

- macOS considerations
- Linux considerations
- Windows WSL2 considerations

### 10. Extending

- How to create custom scenarios
- How to modify existing scenarios
- Labeling conventions

## Acceptance Criteria

- [ ] File `scripts/demo-cluster/README.md` created
- [ ] All 10 sections included with content
- [ ] Code examples are correct and tested
- [ ] Troubleshooting section covers common issues
- [ ] Installation instructions for all platforms
- [ ] Quick start is clear and actionable
- [ ] Markdown formatting is correct
- [ ] Links to related documentation (if any)
- [ ] Examples use correct file paths

## Time Estimate

30-40 minutes (documentation task)
