# kube9

**Visual Kubernetes Management for VS Code with AI-Powered Insights**

![kube9 Logo](https://img.shields.io/badge/Status-MVP-blue) ![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue) ![Kubernetes](https://img.shields.io/badge/Kubernetes-Supported-blue)

## Overview

kube9 is a VS Code extension that brings visual Kubernetes cluster management directly into your development environment. Start with powerful free features, then unlock advanced AI-powered insights and rich dashboards with a Pro account.

### Freemium Model

**Free Tier** - Visual kubectl replacement:
- ✅ Tree view cluster navigation
- ✅ Resource detail viewer (form + YAML)
- ✅ Edit and save resources to cluster
- ✅ Launch workloads with freeform YAML
- ✅ Multi-cluster support via kubeconfig

**Pro Tier** - AI-powered intelligence ([Learn More →](https://portal.kube9.dev)):
- ✨ Advanced dashboards with real-time charts
- ✨ AI-powered recommendations and insights
- ✨ Historical metrics and trends
- ✨ Log aggregation with advanced search
- ✨ Anomaly detection and alerts
- ✨ Team collaboration features

## Architecture

kube9 uses a **progressive enhancement** architecture that adapts to user tier:

```
┌─────────────────────────────────────┐
│  VSCode Extension (Smart Router)    │
│  ┌────────────────────────────────┐ │
│  │  Free Tier:                    │ │
│  │  - Generates HTML locally      │ │
│  │  - Simple webviews             │ │
│  │  - Basic CRUD operations       │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  Pro Tier (with operator):    │ │
│  │  - Loads from kube9-server    │ │
│  │  - Rich web applications      │ │
│  │  - No CSP restrictions        │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
                  │
                  ↓ (Pro users only)
┌─────────────────────────────────────┐
│  kube9-server                       │
│  - Receives metrics from operator   │
│  - Serves rich UI applications      │
│  - AI analysis and recommendations  │
└─────────────────────────────────────┘
                  ↑
                  │ (Pro users only)
┌─────────────────────────────────────┐
│  kube9-operator (in cluster)        │
│  - Collects sanitized metrics      │
│  - Pushes to kube9-server          │
│  - No cluster ingress needed       │
└─────────────────────────────────────┘
```

### How It Works

**Free Users:**
- Extension uses your kubeconfig to interact with clusters
- All UI is generated locally in VS Code webviews
- Simple, functional interfaces with CSP restrictions
- No data sent to external servers

**Pro Users:**
- Install [kube9-operator](../kube9-operator) in your cluster
- Operator pushes sanitized metrics to [kube9-server](../kube9-server)
- Extension loads rich web UIs from kube9-server in iframes
- Advanced features: AI insights, charts, historical data
- Your kubeconfig never leaves your machine

## Getting Started

### Installation

#### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (`Ctrl/Cmd + Shift + X`)
3. Search for "kube9"
4. Click Install

#### For Developers
```bash
git clone <repository-url>
cd kube9
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

### Quick Start (Free Tier)

1. **Open kube9**
   - Look for kube9 icon in VS Code activity bar
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

### Upgrade to Pro

#### Step 1: Install Operator
The operator runs in your cluster to enable Pro features. Visit [portal.kube9.dev](https://portal.kube9.dev) for complete installation instructions including API key setup.

**Option A: Automatic (requires Helm)**
```bash
# Extension detects Helm and offers one-click install
# Or run manually:
helm repo add kube9 https://charts.kube9.dev
helm install kube9-operator kube9/kube9-operator \
  --namespace kube9-system \
  --create-namespace
```

**Option B: Manual**
```bash
kubectl apply -f https://install.kube9.dev/operator.yaml
```

#### Step 2: Configure Operator
Follow the operator configuration instructions at [portal.kube9.dev](https://portal.kube9.dev) to enable Pro tier features.

That's it! The extension automatically detects the operator and enables Pro features.

## Features by Tier

### Free Tier Features

**Resource Management**
- Tree view navigation (clusters → namespaces → resources)
- Resource detail viewer with form and YAML tabs
- Edit common fields (replicas, image, labels, etc.)
- Save changes back to cluster
- Delete resources with confirmation

**YAML Operations**
- Syntax-highlighted YAML editor
- Apply arbitrary YAML manifests
- Dry-run validation
- Quick templates (Deployment, Service, Pod, ConfigMap)

**Multi-Cluster**
- Automatic kubeconfig parsing
- Switch between clusters and contexts
- Multiple kubeconfig file support

### Pro Tier Features

**Advanced Dashboards**
- Real-time cluster metrics with interactive charts
- Resource usage trends and forecasting
- Pod health visualization
- Network traffic analysis

**AI-Powered Insights**
- Intelligent recommendations for resource optimization
- Security vulnerability detection
- Cost optimization suggestions
- Configuration best practices
- Anomaly detection and alerts

**Enhanced Resource Views**
- Rich tabbed interfaces (Overview, Metrics, Logs, Events, YAML)
- Historical data and trend analysis
- Log aggregation with advanced search
- Event timeline visualization
- Dependency graph views

**Team Features**
- Shared cluster annotations
- Team activity feed
- Collaborative troubleshooting

## Project Structure

```
kube9/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── providers/
│   │   ├── ClusterTreeProvider.ts
│   │   └── NamespaceWebview.ts
│   ├── commands/              # Command implementations
│   ├── services/
│   │   ├── KubernetesService.ts
│   │   └── TierManager.ts     # Free vs Pro logic
│   ├── webviews/
│   │   ├── free/              # Local HTML generators
│   │   └── pro/               # Remote URL loaders
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

### Testing Tiers

**Testing Free Tier:**
- Don't install the kube9-operator
- Extension should show local webviews
- Verify basic CRUD operations work

**Testing Pro Tier:**
- Set up local kube9-server instance
- Install and configure kube9-operator in test cluster
- Extension should load remote webviews
- Verify advanced features appear

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

Pro tier features are automatically enabled when the kube9-operator is installed in your cluster.

## Related Projects

- **[kube9-server](../kube9-server)** - Backend API and UI server for Pro features
- **[kube9-operator](../kube9-operator)** - Kubernetes operator for metrics collection
- **[kube9-portal](../kube9-portal)** - User portal for account management

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

### Free Tier
- All data stays on your machine
- Uses your kubeconfig for cluster access
- No external API calls
- No data collection

### Pro Tier
- Operator sends only sanitized metrics (no secrets, credentials, or sensitive data)
- Communication over HTTPS
- Data sanitization at source (operator level)
- User controls what operator can access via RBAC
- API keys managed at operator level, not in VSCode extension

**To report a security vulnerability**, please email **security@alto9.com** (do not open a public issue).

## License

MIT License - see LICENSE file for details

## Support

- [Documentation](https://docs.kube9.dev)
- [GitHub Issues](https://github.com/alto9/kube9-vscode/issues) - Report bugs, request features
- [GitHub Discussions](https://github.com/alto9/kube9-vscode/discussions) - Ask questions, share ideas
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security reporting
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines
- [Portal Support](https://portal.kube9.dev/support)

---

**Built with ❤️ by Alto9 - Making Kubernetes management visual and intelligent**
