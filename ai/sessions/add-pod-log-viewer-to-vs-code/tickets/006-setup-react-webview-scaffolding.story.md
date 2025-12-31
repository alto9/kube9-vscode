---
story_id: 006-setup-react-webview-scaffolding
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: completed
---

# Set Up React Webview Scaffolding and Webpack Configuration

## Objective

Set up the React project structure for the pod logs webview with webpack configuration for bundling.

## Context

The webview UI is built with React and needs proper build configuration to compile TypeScript/React into JavaScript that can run in the webview context.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Build Configuration section
- Other webviews in `src/webview/*` for patterns

## Files to Create/Modify

- `src/webview/pod-logs/index.tsx` (new - entry point)
- `src/webview/pod-logs/App.tsx` (new - main component)
- `src/webview/pod-logs/styles.css` (new)
- `webpack.webview.config.js` (modify - add pod-logs entry)
- `package.json` (modify - add scripts if needed)

## Implementation Steps

1. Create directory: `src/webview/pod-logs/`
2. Create `index.tsx`:
   ```tsx
   import React from 'react';
   import ReactDOM from 'react-dom';
   import { App } from './App';
   import './styles.css';
   
   ReactDOM.render(<App />, document.getElementById('root'));
   ```
3. Create `App.tsx` with placeholder:
   ```tsx
   export const App: React.FC = () => {
     return <div className="pod-logs-viewer">
       <h1>Pod Logs Viewer</h1>
       <p>Loading...</p>
     </div>;
   };
   ```
4. Create `styles.css` with basic theme variables
5. Add webpack entry in `webpack.webview.config.js`:
   ```js
   entry: {
     'pod-logs': './src/webview/pod-logs/index.tsx'
   }
   ```
6. Configure output: `dist/media/pod-logs/main.js`
7. Test build: `npm run build` or `npm run watch`

## Acceptance Criteria

- [x] React project structure exists in `src/webview/pod-logs/`
- [x] Build builds successfully (using esbuild, following codebase pattern)
- [x] Output file created at `media/pod-logs/main.js`
- [x] Placeholder App component renders basic HTML

## Estimated Time

20 minutes

