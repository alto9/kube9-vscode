---
spec_id: pvc-describe-webview-spec
name: PVC Describe Webview Specification
description: Technical specification for implementing graphical PersistentVolumeClaim describe functionality
feature_id:
  - pvc-describe-webview
---

# PVC Describe Webview Specification

## Overview

The PVC Describe Webview provides a graphical, user-friendly interface for viewing detailed PersistentVolumeClaim information. It displays PVC status, capacity, access modes, storage class, bound PV, volume mode, Pods using the PVC, conditions, events, and metadata.

## Architecture

The PVC describe webview follows the same architecture pattern as Pod and Namespace describe webviews:
- Uses shared DescribeWebview panel infrastructure
- React-based webview components
- Data provider pattern for fetching and formatting data
- Message-based communication between extension and webview

## Implementation Details

### PVCDescribeProvider

**File**: `src/providers/PVCDescribeProvider.ts`

Data provider that fetches and formats PVC information:

```typescript
interface PVCDescribeData {
  overview: PVCOverview;
  volumeDetails: VolumeDetails;
  usage: PVCUsage;
  conditions: PVCCondition[];
  events: PVCEvent[];
  metadata: PVCMetadata;
}

interface PVCOverview {
  name: string;
  namespace: string;
  status: PVCStatus;
  phase: string;
  requestedCapacity: string;
  actualCapacity?: string;
  accessModes: string[];
  storageClass: string;
  boundPV?: string;
  age: string;
  creationTimestamp: string;
}

interface PVCStatus {
  phase: 'Pending' | 'Bound' | 'Lost';
  reason?: string;
  message?: string;
  health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

interface VolumeDetails {
  volumeMode: string;
  finalizers: string[];
  requestedCapacity: string;
  actualCapacity?: string;
  storageClass: string;
  accessModes: string[];
}

interface PVCUsage {
  pods: PodUsageInfo[];
  totalPods: number;
}

interface PodUsageInfo {
  name: string;
  namespace: string;
  phase: string;
  mountPath?: string;
  readOnly?: boolean;
}

interface PVCCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

interface PVCEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  source: string;
  age: string;
}

interface PVCMetadata {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  uid: string;
  resourceVersion: string;
  creationTimestamp: string;
}
```

### DescribeWebview Integration

**File**: `src/webview/DescribeWebview.ts`

Add PVC support to DescribeWebview:

```typescript
// Add PVC provider and config
private static pvcProvider: PVCDescribeProvider | undefined;
private static currentPVCConfig: PVCTreeItemConfig | undefined;

// Add showPVCDescribe method
public static async showPVCDescribe(
  context: vscode.ExtensionContext,
  pvcConfig: PVCTreeItemConfig
): Promise<void>

// Route PersistentVolumeClaim resources in showFromTreeItem
if (kind === 'PersistentVolumeClaim') {
  await DescribeWebview.showPVCDescribe(context, {
    name,
    namespace,
    context: contextName
  });
  return;
}
```

### React Components

**Files**: `src/webview/pvc-describe/`

- `index.tsx` - Entry point that renders PVCDescribeApp
- `PVCDescribeApp.tsx` - Main app component managing state and tabs
- `types.ts` - Type definitions for messages and data
- `components/OverviewTab.tsx` - Overview tab component
- `components/VolumeDetailsTab.tsx` - Volume details tab component
- `components/UsageTab.tsx` - Usage tab showing Pods using PVC
- `components/ConditionsTab.tsx` - Conditions tab component
- `components/EventsTab.tsx` - Events tab component
- `components/MetadataTab.tsx` - Metadata tab component

### Webpack Configuration

**File**: `webpack.config.js`

Add PVC describe webview entry:

```javascript
const pvcDescribeConfig = {
  target: 'web',
  entry: './src/webview/pvc-describe/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'media', 'pvc-describe'),
    filename: 'index.js',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  // ... rest of config
};
```

## Data Fetching

### PVC Details

- Use `apiClient.core.readNamespacedPersistentVolumeClaim()` to fetch PVC
- Extract status, spec, and metadata
- Format overview information including phase, capacity, access modes, storage class

### Bound PV

- If PVC is bound (has `spec.volumeName`), fetch the PV using `apiClient.core.readPersistentVolume()`
- Extract PV details for display

### Pods Using PVC

- List all Pods in the PVC's namespace using `apiClient.core.listNamespacedPod()`
- For each Pod, check `spec.volumes[]` for volumes with `persistentVolumeClaim.claimName` matching the PVC name
- For matching volumes, find containers that mount the volume via `volumeMounts`
- Extract Pod name, namespace, phase, mount path, and read-only status

### Events

- Fetch PVC-related events using field selector: `involvedObject.name={pvcName},involvedObject.uid={pvcUid}`
- Group events by type and reason
- Format with timestamps and age calculations

### Conditions

- Extract conditions from `pvc.status.conditions`
- Format with type, status, last transition time, reason, and message

## UI Components

### Overview Tab

Displays:
- Status and health badge
- Namespace
- Requested and actual capacity
- Access modes
- Storage class
- Bound PV (if bound)
- Age and creation timestamp

### Volume Details Tab

Displays:
- Volume mode (Filesystem/Block)
- Storage class
- Requested and actual capacity
- Access modes
- Finalizers (if any)

### Usage Tab

Displays table of Pods using the PVC:
- Pod name (clickable to navigate)
- Namespace
- Phase
- Mount path
- Read-only indicator
- "View Pod" action button

### Conditions Tab

Displays table of PVC conditions:
- Type
- Status (with color indicator)
- Last transition time
- Reason
- Message

### Events Tab

Displays timeline of PVC events:
- Event type (Normal/Warning)
- Reason
- Message
- Count (if grouped)
- Age
- Source component
- Timestamps

### Metadata Tab

Displays:
- Basic information (UID, resource version, creation timestamp)
- Labels (key-value pairs)
- Annotations (key-value pairs)

## Message Protocol

### Extension to Webview

```typescript
{ command: 'updatePVCData', data: PVCDescribeData }
{ command: 'showError', data: { message: string } }
```

### Webview to Extension

```typescript
{ command: 'refresh' }
{ command: 'viewYaml' }
{ command: 'ready' }
{ command: 'navigateToPod', data: { name: string, namespace: string } }
```

## Error Handling

- Handle PVC not found errors gracefully
- Handle permission denied errors with helpful messages
- Handle network connectivity errors
- Show "N/A" or "Unknown" for missing optional fields
- Log errors to console for debugging

## Performance Considerations

- Cache PVC data where appropriate
- Fetch Pods and events in parallel where possible
- Use efficient field selectors for event queries
- Implement loading states during data fetch
- Cancel in-flight requests when switching PVCs

## Accessibility

- Use semantic HTML elements
- Provide ARIA labels for interactive elements
- Support keyboard navigation
- Ensure sufficient color contrast
- Support screen readers
