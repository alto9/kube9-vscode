# Kube9 VS Code

**Kubernetes Management in Your Favorite IDE**

![kube9 Logo](https://img.shields.io/badge/Status-Active-green) ![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue) ![Kubernetes](https://img.shields.io/badge/Kubernetes-Supported-blue)

## Overview

Kube9 VS Code is an extension that brings visual Kubernetes cluster management directly into your development environment. It provides a modern, intuitive interface for managing your Kubernetes resources without leaving your IDE.

### Key Features

- 🌲 Tree view cluster navigation
- 📝 Resource detail viewer (form + YAML)
- ✏️ Edit and save resources to cluster
- 🚀 Launch workloads with freeform YAML
- 🔄 Multi-cluster support via kubeconfig
- 📦 ArgoCD integration with drift detection and application monitoring
- 📊 Enhanced metrics and monitoring with kube9-operator

## Architecture

Kube9 VS Code provides a clean separation between local development tooling and cluster-side monitoring:

```
┌─────────────────────────────────────┐
│  VSCode Extension                   │
│  - Generates HTML locally           │
│  - Webviews for resource management │
│  - Direct kubectl operations        │
│  - Uses your kubeconfig             │
└─────────────────────────────────────┘
                  │
                  ↓ (kubectl API)
┌─────────────────────────────────────┐
│  Kubernetes Cluster                 │
│  - Your workloads and resources     │
│  - Optional: kube9-operator         │
└─────────────────────────────────────┘
```

### How It Works

**Core Extension:**
- Uses your kubeconfig to interact with clusters
- All UI is generated locally in VS Code webviews
- Direct kubectl operations for resource management
- No data sent to external servers
- Your kubeconfig never leaves your machine

**Enhanced with kube9-operator (Optional):**
- Install [kube9-operator](../kube9-operator) in your cluster for enhanced monitoring
- Operator collects metrics and cluster health data
- Extension automatically detects operator and provides enhanced views
- Sanitized metrics only (no secrets, credentials, or sensitive data)
- No cluster ingress needed

## Getting Started

### Installation

#### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (`Ctrl/Cmd + Shift + X`)
3. Search for "Kube9"
4. Click Install

#### For Developers
```bash
git clone <repository-url>
cd kube9-vscode
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

### Quick Start

1. **Open Kube9**
   - Look for the Kube9 icon in VS Code activity bar
   - Extension automatically reads your `~/.kube/config`

2. **Navigate Your Cluster**
   - Expand clusters in tree view
   - Click namespaces to view resources
   - Click resources to view/edit details

3. **Edit Resources**
   - Form view for common fields
   - YAML view for advanced editing
   - Save changes directly to cluster

4. **Launch Workloads**
   - Use "Launch Workload" command
   - Paste or write YAML manifests
   - Apply to cluster with one click

### Optional: Install kube9-operator for Enhanced Monitoring

The kube9-operator enhances the extension with cluster metrics and monitoring capabilities. It runs in your cluster and provides enriched data to the extension.

**Install with Helm:**
```bash
helm repo add kube9 https://charts.kube9.io
helm install kube9-operator kube9/kube9-operator \
  --namespace kube9-system \
  --create-namespace
```

Once installed, the extension automatically detects the operator and provides enhanced resource views with metrics and health data. See the [kube9-operator documentation](../kube9-operator) for configuration options.

### ArgoCD Integration

Kube9 VS Code provides seamless ArgoCD integration for GitOps workflows. View and manage your ArgoCD Applications directly from VS Code.

**Prerequisites:**
- ArgoCD 2.5+ installed in your cluster
- kubectl configured and accessible
- RBAC permissions for ArgoCD CRD access

**Quick Start:**
1. Ensure ArgoCD is installed in your cluster
2. Open the Kube9 tree view - ArgoCD Applications will appear automatically when detected
3. Expand "ArgoCD Applications" to see all applications with sync/health status
4. Click any application to view details and drift information
5. Right-click applications to sync, refresh, or perform hard refresh

For detailed setup instructions, usage guide, and troubleshooting, see [ArgoCD Integration Documentation](docs/argocd-integration.md).

## Features

### Resource Management
- Tree view navigation (clusters → namespaces → resources)
- Resource detail viewer with form and YAML tabs
- Graphical `kubectl describe` functionality for Pods, PVCs, PVs, Secrets, and more
- Edit common fields (replicas, image, labels, etc.)
- Save changes back to cluster
- Delete resources with confirmation

### YAML Operations
- Syntax-highlighted YAML editor
- Apply arbitrary YAML manifests
- Dry-run validation
- Quick templates (Deployment, Service, Pod, ConfigMap)

### Multi-Cluster Support
- Automatic kubeconfig parsing
- Switch between clusters and contexts
- Multiple kubeconfig file support
- Manage multiple clusters from one interface

### ArgoCD Integration
- View ArgoCD Applications in tree view with sync/health status
- Monitor GitOps deployments and detect configuration drift
- Sync, refresh, and hard refresh applications directly from VS Code
- Application details webview with drift information
- Works with ArgoCD 2.5+ in both operated and basic modes

### Enhanced Monitoring (with kube9-operator)
When the kube9-operator is installed in your cluster:
- Resource metrics and usage data
- Cluster health monitoring
- Enhanced resource views with real-time data
- Historical trend information

## Project Structure

```
kube9-vscode/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── providers/
│   │   ├── ClusterTreeProvider.ts
│   │   └── NamespaceWebview.ts
│   ├── commands/              # Command implementations
│   ├── services/
│   │   └── KubernetesService.ts
│   ├── webviews/              # Local HTML generators
│   └── utils/
├── ai/                        # Forge context files
│   ├── contexts/
│   ├── decisions/
│   ├── features/
│   └── specs/
└── dist/                      # Compiled output
```

## Development

### Prerequisites
- Node.js 22+ (LTS recommended)
- npm or yarn
- kubectl configured for testing
- VS Code 1.80.0+

### Setup
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run extension (opens Extension Development Host)
# Press F5 in VS Code

# Run tests
npm test

# Package extension
npm run package
```

### Testing

**Basic Extension Testing:**
- Extension should show local webviews
- Verify resource navigation works
- Verify CRUD operations work
- Test ArgoCD integration if available

**Testing with kube9-operator:**
- Install kube9-operator in test cluster
- Extension should detect operator
- Verify enhanced metrics views appear
- Test operator-provided data display

### Local cluster (kube9-localcluster)

Cluster creation and demo scenarios live in the **[kube9-localcluster](https://github.com/alto9/kube9-localcluster)** repository (not in this repo). Clone it next to `kube9-vscode`, then:

```bash
cd ../kube9-localcluster
./scripts/start.sh
./scripts/populate.sh with-operator   # or another scenario
export KUBECONFIG="$PWD/out/kubeconfig"
```

In VS Code, use **Extension (Demo Cluster)** — it sets `KUBECONFIG` to `../kube9-localcluster/out/kubeconfig` (sibling checkout). If your path differs, set `KUBECONFIG` yourself or adjust `.vscode/launch.json`.

That cluster uses a dedicated Minikube profile and is isolated from your default kubeconfig — suitable for feature work, screenshots, QA, and demos.

## Technology Stack

- **Framework**: VS Code Extension API
- **Language**: TypeScript (ES2020)
- **Runtime**: Node.js 22+ (LTS)
- **Kubernetes**: kubectl CLI + @kubernetes/client-node
- **Build**: webpack + TypeScript compiler
- **Package Manager**: npm

## Configuration

### Settings

```json
{
  // Optional: Enable debug logging
  "kube9.debugMode": false
}
```

Enhanced monitoring features are automatically enabled when the kube9-operator is detected in your cluster.

## Related Projects

- **[kube9-localcluster](https://github.com/alto9/kube9-localcluster)** - Local Minikube cluster scripts and scenarios for developing this extension and kube9-operator.
- **[kube9-operator](../kube9-operator)** - Kubernetes operator for enhanced cluster monitoring and metrics collection. Install this in your cluster to unlock enhanced monitoring features in the VS Code extension.
- **[kube9-desktop](../kube9-desktop)** - Desktop application for Kubernetes management with integrated development tools.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- How to set up your development environment
- Our code style and conventions
- How to submit pull requests
- Our development workflow

This project uses the [Forge methodology](https://github.com/alto9/forge) for context engineering:

1. Check `ai/tasks/` for current priorities
2. Review `ai/decisions/` for architectural context
3. Follow specifications in `ai/specs/`
4. Update progress in `ai/tasks/`

### Quick Start for Contributors

```bash
# Fork and clone
git clone https://github.com/alto9/kube9-vscode.git
cd kube9-vscode

# Install dependencies
npm install

# Run in development mode
npm run watch
# Press F5 in VS Code to launch Extension Development Host
```

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

### Extension Security
- All data stays on your machine
- Uses your kubeconfig for cluster access
- No external API calls
- No data collection
- Your kubeconfig never leaves VS Code

### With kube9-operator (Optional)
When using the kube9-operator:
- Operator sends only sanitized metrics (no secrets, credentials, or sensitive data)
- Data sanitization at source (operator level)
- User controls what operator can access via RBAC
- All communication uses standard Kubernetes RBAC and authentication

**To report a security vulnerability**, please email **security@alto9.com** (do not open a public issue).

## License

MIT License - see LICENSE file for details

## Support

- [Documentation](https://alto9.github.io/)
- [GitHub Issues](https://github.com/alto9/kube9-vscode/issues) - Report bugs, request features
- [GitHub Discussions](https://github.com/alto9/kube9-vscode/discussions) - Ask questions, share ideas
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security reporting
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

---

**Built with ❤️ by Alto9 - Making Kubernetes management visual and intelligent**
