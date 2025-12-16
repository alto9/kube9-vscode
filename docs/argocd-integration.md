# ArgoCD Integration Guide

Kube9 provides seamless ArgoCD integration for GitOps workflows, allowing you to view and manage your ArgoCD Applications directly from VS Code. Monitor GitOps deployments, detect configuration drift, and sync applications without leaving your IDE.

## Introduction

The ArgoCD integration feature enables you to:

- **View ArgoCD Applications** in the cluster tree view with real-time sync and health status
- **Monitor GitOps deployments** and detect configuration drift between Git and cluster state
- **Sync applications** directly from VS Code to apply Git changes to your cluster
- **Refresh application state** to detect cluster changes without syncing
- **View detailed application information** including drift details at the resource level
- **Track sync operations** with progress notifications and status updates

This feature is available in the **Free Tier** and works with ArgoCD 2.5+ installations.

## Prerequisites

Before using ArgoCD integration, ensure you have:

### Required Components

1. **ArgoCD 2.5+ Installed**
   - ArgoCD must be installed in your Kubernetes cluster
   - Minimum supported version: ArgoCD 2.5.0
   - Verify installation:
     ```bash
     kubectl get deployment -n argocd argocd-server
     ```

2. **kubectl Configured**
   - kubectl must be installed and configured
   - Your kubeconfig must have access to the cluster where ArgoCD is installed
   - Verify access:
     ```bash
     kubectl get applications.argoproj.io -n argocd
     ```

3. **RBAC Permissions**
   - Your kubeconfig user/service account needs permissions to:
     - **List and get** ArgoCD Application CRDs (`applications.argoproj.io`)
     - **Patch** ArgoCD Application CRDs (for sync/refresh actions)
     - **List** CustomResourceDefinitions (for detection in basic mode)
     - **Get** namespaces (for detection in basic mode)
     - **List** deployments (for detection in basic mode)

### RBAC Requirements

The extension requires the following RBAC permissions to function:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube9-argocd-access
rules:
  # Query ArgoCD Applications
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["get", "list", "patch"]
  
  # Detection (basic mode only)
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
```

**Note**: If you're using the kube9-operator (operated mode), these permissions are automatically included in the operator's ClusterRole.

## Detection

Kube9 automatically detects ArgoCD installations in your clusters. Detection works in two modes:

### Operated Mode (Recommended)

When the **kube9-operator** is installed in your cluster:

- Extension reads ArgoCD status from the operator's ConfigMap
- Operator automatically detects ArgoCD every 6 hours
- Supports custom ArgoCD namespaces (not just `argocd`)
- More reliable detection with version information
- No additional RBAC permissions needed for detection

**How it works:**
1. Extension queries the operator's status ConfigMap
2. Reads `status.argocd.detected` and `status.argocd.namespace`
3. Uses operator-provided namespace for application queries

### Basic Mode

When the **kube9-operator** is NOT installed:

- Extension performs direct CRD detection
- Checks for `applications.argoproj.io` CRD existence
- Finds ArgoCD server deployment for version information
- Assumes default namespace (`argocd`) unless detected otherwise
- Requires RBAC permissions for CRD and namespace access

**How it works:**
1. Extension checks for `applications.argoproj.io` CRD
2. Searches for ArgoCD server deployment in common namespaces
3. Falls back to default `argocd` namespace if not found

### Detection Status

ArgoCD detection status is cached for 5 minutes to improve performance. The extension will:

- Show "ArgoCD Applications" category in tree view when detected
- Hide the category when ArgoCD is not detected
- Automatically refresh detection when you manually refresh the tree view

## Features

### Tree View Integration

When ArgoCD is detected, an **"ArgoCD Applications"** category appears in the cluster tree view:

```
📦 my-cluster (docker-desktop) [Operated] ⚙️
  ├── 🚀 ArgoCD Applications (5)
  │   ├── ✅ guestbook (Synced, Healthy)
  │   ├── ⚠️  api-service (OutOfSync, Degraded)
  │   ├── 🔵 frontend (Synced, Progressing)
  │   ├── ✅ backend (Synced, Healthy)
  │   └── ❌ broken-app (OutOfSync, Missing)
```

**Features:**
- Application count badge showing total number of applications
- Status icons indicating sync and health status
- Color-coded indicators:
  - ✅ Green: Synced and Healthy
  - ⚠️ Yellow/Orange: OutOfSync or Degraded
  - 🔵 Blue: Progressing (deployment in progress)
  - ❌ Red: Missing or critical errors
  - ⏸️ Gray: Suspended
  - ❓ Gray: Unknown status

### Application Status Indicators

Each application displays its current status:

**Sync Status:**
- **Synced**: Git state matches cluster state
- **OutOfSync**: Drift detected between Git and cluster
- **Unknown**: Sync status cannot be determined

**Health Status:**
- **Healthy**: All resources are healthy
- **Degraded**: One or more resources are unhealthy
- **Progressing**: Application is being updated/deployed
- **Suspended**: Application is intentionally paused
- **Missing**: Required resources are missing
- **Unknown**: Health cannot be determined

### Application Details Webview

Click any application in the tree view to open a detailed webview panel with:

**Overview Tab:**
- Application metadata (name, namespace, project)
- Sync status with visual indicator
- Health status with visual indicator
- Git source information (repository, path, branch/tag)
- Current deployed revision (Git SHA)
- Target revision (Git branch/tag)
- Last sync timestamp
- Deployment destination (cluster, namespace)

**Drift Details Tab:**
- Resource-level sync status
- List of out-of-sync resources with details
- List of synced resources
- Status messages for each resource
- Resource health information

### Available Actions

Right-click any application in the tree view or use buttons in the webview to:

**Sync Application**
- Applies Git state to cluster
- Triggers ArgoCD sync operation
- Shows progress notification
- Updates status automatically when complete

**Refresh Application**
- Compares Git state with cluster state
- Updates sync status without modifying cluster
- Detects drift without syncing
- Faster than sync (no resource modifications)

**Hard Refresh Application**
- Clears ArgoCD cache before comparing
- Useful when Git state seems incorrect
- Requires confirmation dialog
- May take longer than normal refresh

**View Details**
- Opens application details webview
- Shows overview and drift information
- Provides action buttons

**Copy Name / Copy Namespace**
- Quick clipboard actions for application metadata

## Usage Guide

### Viewing Applications

1. **Open Kube9 Tree View**
   - Click the Kube9 icon in VS Code activity bar
   - Expand your cluster in the tree view

2. **Locate ArgoCD Applications**
   - Look for "ArgoCD Applications" category (appears automatically when ArgoCD is detected)
   - The category shows total application count: `(5)`

3. **Expand Category**
   - Click to expand and see all applications
   - Applications are sorted alphabetically
   - Each application shows sync/health status

4. **View Application Details**
   - Click any application to open details webview
   - Or right-click and select "View Details"

### Understanding Status Indicators

**Synced + Healthy (✅ Green)**
- Application is up-to-date and all resources are healthy
- No action needed

**OutOfSync + Healthy (⚠️ Yellow)**
- Git has changes not yet applied to cluster
- Consider syncing to apply changes

**OutOfSync + Degraded (⚠️ Orange)**
- Git has changes AND some resources are unhealthy
- Review drift details before syncing

**Synced + Progressing (🔵 Blue)**
- Application is currently being deployed
- Wait for deployment to complete

**OutOfSync + Missing (❌ Red)**
- Critical issue: required resources are missing
- Review application configuration

### Syncing Applications

1. **From Tree View**
   - Right-click application
   - Select "Sync Application"
   - Progress notification appears
   - Status updates automatically when complete

2. **From Webview**
   - Open application details
   - Click "Sync" button in Overview tab
   - Progress notification appears
   - Webview updates when complete

3. **Monitor Progress**
   - Notification shows current operation phase
   - Tree view shows syncing indicator
   - Webview buttons are disabled during operation
   - Final status appears when complete

### Refreshing Application State

**Normal Refresh:**
- Right-click application → "Refresh Application"
- Updates sync status by comparing Git vs cluster
- No cluster modifications
- Faster than sync

**Hard Refresh:**
- Right-click application → "Hard Refresh Application"
- Confirmation dialog appears
- Clears ArgoCD cache before comparing
- Useful when Git state seems incorrect
- Takes longer than normal refresh

### Viewing Drift Details

1. **Open Application Details**
   - Click application in tree view
   - Webview opens with Overview tab

2. **Switch to Drift Details Tab**
   - Click "Drift Details" tab
   - View resource-level sync status

3. **Review Out-of-Sync Resources**
   - See which specific resources have drift
   - View status messages for each resource
   - Understand what changes would be applied

## Operated vs Basic Mode

### Operated Mode (kube9-operator installed)

**Advantages:**
- More reliable detection with version information
- Supports custom ArgoCD namespaces automatically
- Operator handles detection logic (re-checks every 6 hours)
- No additional RBAC permissions needed for detection
- Better performance (uses cached operator status)

**How to Enable:**
1. Install kube9-operator in your cluster
2. Extension automatically uses operator status
3. No additional configuration needed

### Basic Mode (kube9-operator not installed)

**Advantages:**
- Works without kube9-operator
- No additional components required
- Direct CRD detection

**Limitations:**
- Assumes default `argocd` namespace (unless detected)
- Requires RBAC permissions for CRD/namespace access
- Extension performs detection directly (may be slower)
- Less reliable for custom namespace installations

**How it Works:**
1. Extension checks for `applications.argoproj.io` CRD
2. Searches for ArgoCD server deployment
3. Falls back to default namespace if not found

### Choosing a Mode

- **Use Operated Mode** if you have kube9-operator installed (recommended)
- **Use Basic Mode** if you don't have kube9-operator and want ArgoCD integration
- Both modes provide the same functionality for viewing and managing applications

## Troubleshooting

### ArgoCD Not Detected

**Symptoms:**
- "ArgoCD Applications" category doesn't appear in tree view
- Extension shows no ArgoCD-related features

**Solutions:**

1. **Verify ArgoCD Installation**
   ```bash
   kubectl get deployment -n argocd argocd-server
   ```
   If not found, ArgoCD may be in a different namespace or not installed.

2. **Check ArgoCD Version**
   ```bash
   kubectl get deployment -n argocd argocd-server -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```
   Ensure version is 2.5.0 or higher.

3. **Verify CRD Exists**
   ```bash
   kubectl get crd applications.argoproj.io
   ```
   If not found, ArgoCD CRDs may not be installed.

4. **Check Detection Cache**
   - Manually refresh the tree view (right-click cluster → Refresh)
   - Detection cache expires after 5 minutes
   - Force refresh bypasses cache

5. **Operated Mode Issues**
   - Check operator status: `kubectl get configmap kube9-operator-status -n kube9-system`
   - Verify operator detected ArgoCD: `kubectl get configmap kube9-operator-status -n kube9-system -o jsonpath='{.data.status}' | jq '.argocd'`
   - Operator re-checks every 6 hours - wait or restart operator

### Permission Denied Errors

**Symptoms:**
- Error notifications: "Permission denied: Cannot list ArgoCD Applications"
- Applications don't load when expanding category

**Solutions:**

1. **Verify RBAC Permissions**
   ```bash
   kubectl auth can-i list applications.argoproj.io --namespace=argocd
   kubectl auth can-i get applications.argoproj.io --namespace=argocd
   kubectl auth can-i patch applications.argoproj.io --namespace=argocd
   ```

2. **Check Service Account Permissions**
   If using a service account, verify ClusterRoleBinding:
   ```bash
   kubectl get clusterrolebinding | grep <your-service-account>
   ```

3. **Required Permissions**
   Ensure your kubeconfig user/service account has:
   - `get`, `list` on `applications.argoproj.io` resources
   - `patch` on `applications.argoproj.io` resources (for sync/refresh)
   - `get`, `list` on `customresourcedefinitions` (basic mode detection)
   - `get` on `namespaces` (basic mode detection)
   - `get`, `list` on `deployments` (basic mode detection)

4. **Create RBAC Resources**
   If permissions are missing, create ClusterRole and ClusterRoleBinding:
   ```yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: ClusterRole
   metadata:
     name: kube9-argocd-access
   rules:
     - apiGroups: ["argoproj.io"]
       resources: ["applications"]
       verbs: ["get", "list", "patch"]
   ---
   apiVersion: rbac.authorization.k8s.io/v1
   kind: ClusterRoleBinding
   metadata:
     name: kube9-argocd-access
   roleRef:
     apiGroup: rbac.authorization.k8s.io
     kind: ClusterRole
     name: kube9-argocd-access
   subjects:
     - kind: User
       name: <your-username>
       apiGroup: rbac.authorization.k8s.io
   ```

### Applications Not Showing

**Symptoms:**
- "ArgoCD Applications" category shows `(0)` badge
- Category expands but shows "No applications found"

**Solutions:**

1. **Verify Applications Exist**
   ```bash
   kubectl get applications.argoproj.io -n argocd
   ```
   If no applications found, create some ArgoCD Applications first.

2. **Check Namespace**
   - Extension queries applications in the ArgoCD namespace
   - Default namespace is `argocd`
   - In operated mode, uses operator-detected namespace
   - Verify namespace: `kubectl get applications.argoproj.io --all-namespaces`

3. **Check Application Namespace**
   - Applications may be in a different namespace than ArgoCD server
   - Extension queries all namespaces for applications
   - Verify: `kubectl get applications.argoproj.io --all-namespaces`

4. **Refresh Tree View**
   - Right-click cluster → Refresh
   - Applications cache expires after 30 seconds
   - Force refresh bypasses cache

5. **Check VS Code Output**
   - Open Output panel (View → Output)
   - Select "kube9" from dropdown
   - Look for error messages about application queries

### Sync Operations Failing

**Symptoms:**
- Sync notification shows "Failed" status
- Error message in notification or webview
- Application status doesn't update

**Solutions:**

1. **Check Application Status**
   ```bash
   kubectl get application <app-name> -n argocd -o yaml
   ```
   Look for `status.operationState.message` for error details.

2. **Verify Git Repository Access**
   - ArgoCD must have access to Git repository
   - Check ArgoCD repository credentials
   - Verify repository URL and path are correct

3. **Check Resource Conflicts**
   - Some resources may be locked or have conflicts
   - Review `status.operationState.syncResult.resources` for failed resources
   - Check resource status in cluster

4. **Verify RBAC for Sync**
   ```bash
   kubectl auth can-i patch applications.argoproj.io --namespace=argocd
   ```
   Ensure you have `patch` permission on applications.

5. **Check ArgoCD Server Logs**
   ```bash
   kubectl logs -n argocd deployment/argocd-server
   ```
   Look for errors related to sync operations.

6. **Review Application Configuration**
   - Check `spec.source` for correct repository URL and path
   - Verify `spec.destination` matches target cluster/namespace
   - Ensure application project allows sync

### Applications Showing Incorrect Status

**Symptoms:**
- Status icons don't match actual application state
- Sync status shows "Synced" but resources are out-of-sync

**Solutions:**

1. **Refresh Application State**
   - Right-click application → "Refresh Application"
   - Updates status by comparing Git vs cluster
   - May reveal actual drift

2. **Hard Refresh**
   - Right-click application → "Hard Refresh Application"
   - Clears ArgoCD cache before comparing
   - Useful when status seems incorrect

3. **Check ArgoCD Server**
   - ArgoCD server may be experiencing issues
   - Verify server is running: `kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server`
   - Check server logs for errors

4. **Manual Verification**
   ```bash
   kubectl get application <app-name> -n argocd -o jsonpath='{.status.sync.status}'
   kubectl get application <app-name> -n argocd -o jsonpath='{.status.health.status}'
   ```
   Compare with extension display.

### Performance Issues

**Symptoms:**
- Tree view loads slowly
- Application details take time to load
- Frequent timeouts

**Solutions:**

1. **Reduce Application Count**
   - Extension queries all applications
   - Large numbers of applications may slow down
   - Consider filtering or organizing applications

2. **Check Network Connectivity**
   - Slow cluster connection affects performance
   - Verify kubectl connectivity: `kubectl cluster-info`

3. **Clear Extension Cache**
   - Detection cache: 5 minutes TTL
   - Application cache: 30 seconds TTL
   - Manual refresh bypasses cache
   - Restart VS Code to clear all caches

4. **Check Cluster Resources**
   - ArgoCD server may be resource-constrained
   - Verify server has adequate CPU/memory

## Screenshots

> **Note**: Screenshots will be added in a future update. Placeholder sections are included below for future documentation enhancements.

### Tree View with ArgoCD Applications

*Screenshot showing the cluster tree view with "ArgoCD Applications" category expanded, displaying multiple applications with various sync and health status indicators.*

### Application Webview - Overview Tab

*Screenshot showing the application details webview with Overview tab selected, displaying application metadata, sync/health status, Git source information, and action buttons.*

### Application Webview - Drift Details Tab

*Screenshot showing the application details webview with Drift Details tab selected, displaying resource-level sync status with out-of-sync resources highlighted.*

## Additional Resources

- **ArgoCD Official Documentation**: https://argo-cd.readthedocs.io/
- **ArgoCD Getting Started Guide**: https://argo-cd.readthedocs.io/en/stable/getting_started/
- **ArgoCD Application CRD Reference**: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications
- **Kube9 Documentation**: https://docs.kube9.dev
- **Kube9 GitHub Issues**: https://github.com/alto9/kube9-vscode/issues
- **Kube9 GitHub Discussions**: https://github.com/alto9/kube9-vscode/discussions

## Support

If you encounter issues not covered in this guide:

1. **Check VS Code Output Panel**
   - View → Output → Select "kube9"
   - Look for error messages or warnings

2. **Review ArgoCD Logs**
   ```bash
   kubectl logs -n argocd deployment/argocd-server
   kubectl logs -n argocd deployment/argocd-application-controller
   ```

3. **Open a GitHub Issue**
   - Include VS Code version, extension version, ArgoCD version
   - Describe steps to reproduce
   - Include relevant logs from Output panel

4. **Ask in GitHub Discussions**
   - Community may have encountered similar issues
   - Share solutions and workarounds

---

**Happy GitOps! 🚀**

