---
story_id: 006-create-react-health-report-component
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - operator-health-report
spec_id:
  - operator-health-report-spec
status: completed
---

# Create React Component for Operator Health Report

## Objective

Create the React TypeScript component for the Operator Health Report webview that displays operator status information with appropriate UI states for basic, operated, enabled, and degraded modes.

## Dependencies

- Story 005 must be complete (HealthReportPanel sends data via postMessage)

## Files to Create

- `src/webview/operator-health-report/index.tsx`
- `src/webview/operator-health-report/styles.css`
- `src/webview/operator-health-report/tsconfig.json`

## Changes

### index.tsx

Create main React component with:

1. **TypeScript interfaces** (matching data from story 005):
   ```typescript
   interface HealthReportData {
       clusterContext: string;
       operatorStatus: OperatorStatusData;
       timestamp: number;
       cacheAge: number;
   }
   
   interface OperatorStatusData {
       mode: 'basic' | 'operated' | 'enabled' | 'degraded';
       tier?: 'free' | 'pro';
       version?: string;
       health?: 'healthy' | 'degraded' | 'unhealthy';
       registered?: boolean;
       lastUpdate?: string;
       error?: string | null;
       clusterId?: string;
   }
   ```

2. **Main component** `OperatorHealthReport`:
   - State: `data`, `error`, `loading`
   - useEffect hook to listen for postMessage
   - Handle 'update' and 'error' commands
   - Render header with title and refresh button
   - Show stale status warning if cacheAge > 5 minutes
   - Conditionally render BasicModeView or OperatorStatusView

3. **BasicModeView component**:
   - Show "Kube9 Operator Not Installed" message
   - Display benefits list
   - "How to Install" button (non-functional for now)

4. **OperatorStatusView component**:
   - Status grid with StatusCard components
   - Display: Mode, Tier, Health, Version, Registered, Last Update
   - Cluster ID section with copy button (sends 'copyClusterId' message)
   - Error section (if error exists)
   - Placeholder section for future metrics

5. **StatusCard component**:
   - Props: label, value, status (optional)
   - Apply color classes based on status

6. **Helper functions**:
   - `getModeDisplay()`: Format mode string
   - `formatTimestamp()`: Human-readable time ("2 minutes ago")
   - `formatCacheAge()`: Human-readable cache age

7. **Event handlers**:
   - `handleRefresh()`: Post 'refresh' message to extension
   - `handleCopyClusterId()`: Post 'copyClusterId' message

8. **Initialize**:
   ```typescript
   const container = document.getElementById('root');
   if (container) {
       const root = createRoot(container);
       root.render(<OperatorHealthReport />);
   }
   
   declare const acquireVsCodeApi: () => any;
   const vscode = acquireVsCodeApi();
   ```

### styles.css

Create comprehensive styles:

1. Base layout styles (padding, font-family, colors)
2. Header styles (flex, title, refresh button)
3. Warning banner styles
4. Cluster info styles
5. Status grid (CSS grid, responsive)
6. Status card styles with status-specific colors:
   - `.status-healthy` → green
   - `.status-degraded` → yellow/orange
   - `.status-unhealthy` → red
   - `.status-enabled` → blue
   - `.status-operated` → purple
7. Cluster ID section styles
8. Error section styles
9. Future metrics placeholder styles
10. Basic mode view styles
11. All using VS Code CSS variables for theming

### tsconfig.json

Create TypeScript config for the webview:
```json
{
    "extends": "../tsconfig.json",
    "compilerOptions": {
        "jsx": "react",
        "module": "esnext",
        "target": "es2020",
        "lib": ["es2020", "dom"]
    },
    "include": ["*.tsx", "*.ts"]
}
```

## Acceptance Criteria

- [ ] React component structure complete with all subcomponents
- [ ] Component listens for postMessage 'update' and 'error' commands
- [ ] BasicModeView displays when mode is 'basic'
- [ ] OperatorStatusView displays for other modes
- [ ] Status cards show appropriate colors for health states
- [ ] Refresh button sends 'refresh' message to extension
- [ ] Copy cluster ID button sends 'copyClusterId' message
- [ ] Stale warning appears when cache > 5 minutes old
- [ ] Timestamps formatted as human-readable ("2 minutes ago")
- [ ] All styles use VS Code theme variables
- [ ] TypeScript compiles without errors

## Estimated Time

30 minutes

## Notes

This story focuses on the React component structure and basic rendering. The webpack build configuration for compiling this React code will be handled in story 007.

