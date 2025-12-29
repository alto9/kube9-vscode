---
story_id: 002-create-logsprovider-class
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Create LogsProvider Class for Kubernetes API Integration

## Objective

Create the `LogsProvider` class that manages Kubernetes API connections and handles log streaming for a specific cluster context.

## Context

LogsProvider wraps the `@kubernetes/client-node` library to stream pod logs from Kubernetes API. Each panel instance gets its own LogsProvider to maintain independent streaming connections.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Kubernetes API Integration section
- `ai/diagrams/webview/pod-logs-viewer/pod-logs-architecture.diagram.md` - LogsProvider component

## Files to Create/Modify

- `src/providers/LogsProvider.ts` (new)
- `src/providers/index.ts` (export)

## Implementation Steps

1. Create `src/providers/LogsProvider.ts`
2. Import `@kubernetes/client-node`
3. Define `LogOptions` interface:
   ```typescript
   interface LogOptions {
     follow: boolean;
     tailLines?: number;
     timestamps: boolean;
     previous: boolean;
   }
   ```
4. Create `LogsProvider` class:
   - Constructor takes `contextName: string`
   - Initialize `KubeConfig` and set current context
   - Create `Log` API instance
5. Implement `streamLogs()` method:
   - Parameters: namespace, podName, containerName, options, callbacks
   - Stop any existing stream
   - Call `logApi.log()` with streaming parameters
   - Set up event handlers: data, error, close
   - Store stream reference
6. Implement `stopStream()` method:
   - Destroy current stream if exists
   - Clear stream reference
7. Implement `dispose()` method:
   - Call stopStream()
   - Clean up resources

## Acceptance Criteria

- [ ] LogsProvider class exists with Kubernetes API integration
- [ ] `streamLogs()` method starts streaming from Kubernetes API
- [ ] Stream data events are captured and forwarded via callback
- [ ] Stream error events are captured and forwarded via callback
- [ ] `stopStream()` cleanly terminates active streams
- [ ] `dispose()` releases all resources
- [ ] Multiple LogsProvider instances can exist independently

## Estimated Time

30 minutes

