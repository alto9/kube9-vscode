# Deployment Environments

## Runtime Environment

- Runs inside VS Code extension host on developer workstations.
- Targets any Kubernetes environment reachable by user kubeconfig (local, cloud, on-prem).

## Distribution Environments

- VS Code Marketplace
- Open VSX marketplace

## CI Release Environment

CI builds and tests on every push to the default branches; it does **not** publish. The separate **Release** workflow builds, tests, packages, runs semantic-release (version, tag, GitHub release), and publishes to marketplaces when a maintainer runs it manually from the Actions tab.
