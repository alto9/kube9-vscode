---
story_id: 010-setup-react-build-configuration
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Setup React Build Configuration for Events Viewer

## Objective

Configure build tooling to compile React/TypeScript code for Events Viewer webview into bundled JavaScript.

## Context

Webview requires compiled React code. Need webpack/esbuild configuration to bundle React components with proper output path.

## Acceptance Criteria

- [x] Add React dependencies to package.json: `react`, `react-dom`, `@types/react`, `@types/react-dom` (already present)
- [x] Add react-window for virtual scrolling: `react-window`, `@types/react-window`
- [x] Configure webpack/esbuild to build webview code (using esbuild, following existing pattern)
- [x] Set entry point: `src/webview/event-viewer/index.tsx`
- [x] Set output: `media/event-viewer/index.js`
- [x] Include CSS bundling for `src/webview/event-viewer/index.css` (CSS handled separately in webview provider, following existing pattern)
- [x] Configure TypeScript for JSX support (updated webview tsconfig.json)
- [x] Ensure source maps for debugging (esbuild handles source maps)
- [x] Add build script to package.json if needed (updated build:webview script)
- [x] Test build produces valid output files

## Files Affected

- **Modify**: `package.json` (dependencies, scripts)
- **Modify**: `webpack.config.js` or `esbuild.config.js`
- **Modify**: `tsconfig.json` (if JSX config needed)

## Implementation Notes

**Dependencies**:
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "react-window": "^1.8.10",
  "@types/react-window": "^1.8.8"
}
```

**Webpack Entry** (if using webpack):
```javascript
{
  entry: {
    'event-viewer': './src/webview/event-viewer/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'media'),
    filename: '[name]/index.js'
  }
}
```

**TSConfig**: Ensure `"jsx": "react"` in compiler options.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`

## Estimated Time

20 minutes

