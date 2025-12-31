---
story_id: 009-configure-webview-build-system
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 20
---

# Configure Build System for Pod Describe Webview

## Objective

Update webpack configuration to build the Pod Describe webview React components into a bundle that can be loaded in the webview.

## Acceptance Criteria

- [ ] Open `webpack.config.js`
- [ ] Add new entry point for pod-describe webview: `'pod-describe': './src/webview/pod-describe/index.tsx'`
- [ ] Configure output path to `dist/media/pod-describe/`
- [ ] Ensure TypeScript and React loaders are configured
- [ ] Add CSS loader for podDescribe.css
- [ ] Update DescribeWebview to reference bundled JavaScript file
- [ ] Test that webpack build completes successfully
- [ ] Verify output files are generated in correct location

## Files Involved

**Modified Files:**
- `webpack.config.js`
- `src/webview/DescribeWebview.ts` (update script reference in getWebviewContent)

## Implementation Notes

Follow pattern from existing webview configurations (event-viewer, cluster-manager).

Webpack entry configuration:
```javascript
entry: {
  extension: './src/extension.ts',
  'event-viewer': './src/webview/event-viewer/index.tsx',
  'pod-describe': './src/webview/pod-describe/index.tsx',  // NEW
  // ... other entries
}
```

Update DescribeWebview HTML to load bundle:
```typescript
const scriptUri = panel.webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'dist', 'media', 'pod-describe', 'index.js')
);
```

## Dependencies

- Story 006 (React components must exist)

## Testing

- [ ] Run `npm run compile` successfully
- [ ] Verify `dist/media/pod-describe/index.js` is generated
- [ ] Verify no webpack errors or warnings
- [ ] Webview loads JavaScript bundle correctly

