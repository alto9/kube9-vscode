---
story_id: 004-enhance-describe-webview-for-pods
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
diagram_id:
  - pod-describe-architecture
status: completed
estimated_minutes: 30
---

# Enhance DescribeWebview to Handle Pod Resources

## Objective

Replace the "Coming soon" stub in DescribeWebview with Pod-specific handling. Add `showPodDescribe()` method that fetches Pod data and sends it to the webview.

## Acceptance Criteria

- [x] Open `src/webview/DescribeWebview.ts`
- [x] Add `PodDescribeProvider` as a private property
- [x] Initialize PodDescribeProvider in constructor or show() method
- [x] Add `showPodDescribe(podConfig)` public method
- [x] Method creates or reveals webview panel
- [x] Set webview title to `Pod / {podName}`
- [x] Call `podProvider.getPodDetails()` to fetch Pod data
- [x] Send Pod data to webview via `postMessage({ command: 'updatePodData', data })`
- [x] Handle errors and send error message to webview via `postMessage({ command: 'showError', data })`
- [x] Update `getWebviewContent()` to return proper HTML structure (not stub)
- [x] Set up message handling for webview-to-extension messages (refresh, viewYaml)

## Files Involved

**Modified Files:**
- `src/webview/DescribeWebview.ts`

**Dependencies:**
- `src/providers/PodDescribeProvider.ts` (import)

## Implementation Notes

Reference:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 447-489)
- `ai/diagrams/webview/pod-describe-architecture.diagram.md` for data flow

The `showPodDescribe()` method should:
1. Show or create webview
2. Update title
3. Fetch Pod data
4. Post message to webview
5. Handle errors gracefully

Message protocol:
```typescript
// Extension to Webview
{ command: 'updatePodData', data: PodDescribeData }
{ command: 'showError', data: { message: string } }

// Webview to Extension
{ command: 'refresh' | 'viewYaml' | 'openTerminal' | 'startPortForward' }
```

## Dependencies

- Story 002 (PodDescribeProvider must exist)

## Testing

- [x] TypeScript compilation succeeds
- [x] No linter errors
- [x] showPodDescribe() method exists and accepts pod configuration
- [x] Method attempts to fetch Pod data
- [x] Errors are handled without crashing

