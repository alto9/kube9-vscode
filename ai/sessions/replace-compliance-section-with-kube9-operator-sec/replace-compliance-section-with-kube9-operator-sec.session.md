---
session_id: replace-compliance-section-with-kube9-operator-sec
start_time: '2026-01-02T14:39:27.670Z'
status: completed
problem_statement: Replace Compliance Section with Kube9 Operator Section and Health Report
changed_files:
  - path: ai/features/navigation/reports-menu.feature.md
    change_type: modified
    scenarios_added:
      - Expanding Reports category shows Kube9 Operator subcategory
      - Expanding Kube9 Operator subcategory shows Health report
      - Clicking Health report opens Health webview
      - Kube9 Operator subcategory has appropriate icon
      - Health report item has appropriate icon
    scenarios_removed:
      - Expanding Reports category shows Compliance subcategory
      - Expanding Compliance subcategory shows Data Collection report
      - Clicking Data Collection report shows placeholder
      - Compliance subcategory has appropriate icon
      - Data Collection report item has appropriate icon
  - path: ai/features/webview/operator-health-report.feature.md
    change_type: added
    scenarios_added:
      - Clicking Health report opens Health webview with operator status
      - Health report shows healthy operated status
      - Health report shows healthy enabled status
      - Health report shows degraded status with error
      - Health report shows basic status when operator not installed
      - Health report shows stale status warning
      - User refreshes Health report to get latest status
      - Health report displays operator version information
      - Health report shows timestamp in human-readable format
      - Health report displays cluster ID for enabled tier
      - Health report handles status query failures gracefully
      - Health report is responsive to operator status changes
      - Health report shows minimal placeholder for future expansion
      - Health report provides installation guidance for basic mode
      - Health report webview uses consistent styling
start_commit: 8f786fdedff82e901b17cf75c90ce4ce533daf74
end_time: '2026-01-02T14:43:12.457Z'
---
## Problem Statement

Replace Compliance Section with Kube9 Operator Section and Health Report

## Goals

- Replace the Compliance subcategory under Reports with a new Kube9 Operator subcategory
- Replace the Data Collection Report with a Health Report
- Display comprehensive operator health and status information
- Design for extensibility as the operator evolves
- Provide clear UI for basic mode (no operator) vs operated/enabled modes

## Approach

1. **Update Reports Menu Feature**: Modified `reports-menu.feature.md` to replace Compliance with Kube9 Operator subcategory and Data Collection with Health report
2. **Create Operator Health Report Feature**: Created comprehensive feature file with Gherkin scenarios covering all operator status modes (basic, operated, enabled, degraded)
3. **Create Health Report Spec**: Created technical specification with complete implementation details including:
   - Data structures for operator status
   - Extension-side webview panel implementation (HealthReportPanel.ts)
   - React component architecture (operator-health-report/index.tsx)
   - Tree integration (OperatorSubcategory and HealthReportItem)
   - Styling and UI guidelines
   - Testing requirements

## Key Decisions

- **Leverage Existing Infrastructure**: The Health report uses the existing `OperatorStatusClient` and operator status ConfigMap system, requiring no new backend integration
- **Start Minimal, Design for Growth**: The webview shows current available operator status with placeholder sections for future metrics as the operator evolves
- **Mode-Specific UI**: Different UI states for basic (no operator), operated (free tier), enabled (pro tier), and degraded modes
- **Refresh Capability**: Users can force-refresh the status, bypassing the 5-minute cache
- **Installation Guidance**: Basic mode shows benefits and installation guidance rather than just an empty state
- **Reusable Patterns**: Follow existing webview patterns (like NodeDescribeWebview) for consistency

## Notes

- The Health report is designed to be the primary visibility point for the Kube9 Operator's status
- All operator status fields are sourced from the existing `kube9-operator-status` ConfigMap in the `kube9-system` namespace
- The report is intentionally minimal at launch but structured to easily accommodate additional health metrics as the operator develops
- Tree structure changes: Reports → Kube9 Operator → Health (replacing Reports → Compliance → Data Collection)
- Files to be renamed/replaced in implementation:
  - `ComplianceSubcategory.ts` → `OperatorSubcategory.ts`
  - `DataCollectionReportPanel.ts` → `HealthReportPanel.ts`
  - Command: `kube9.openDataCollectionReport` → `kube9.openOperatorHealthReport`
- Future enhancements could include: historical metrics, real-time updates, resource metrics, log viewing, and alerting
