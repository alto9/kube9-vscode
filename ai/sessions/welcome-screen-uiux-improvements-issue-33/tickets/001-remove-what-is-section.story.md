---
story_id: remove-what-is-section
session_id: welcome-screen-uiux-improvements-issue-33
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
status: pending
priority: medium
estimated_time: 10min
---

# Remove "What is" Section and Promote Quick Start

## Objective

Remove the "What is Kube9 VS Code?" section entirely to reduce clutter and make the Quick Start guide more prominent.

## Context

**GitHub Issue**: #33.3

Currently, the welcome screen has a large "What is Kube9 VS Code?" section (lines 467-481) that takes up significant space. Removing this section will:
- Reduce scrolling required to reach Quick Start guide
- Make the Quick Start guide more prominent
- Simplify the welcome screen layout
- Reduce information overload for new users

The ecosystem panel already provides context about what Kube9 is, making this section redundant.

## Acceptance Criteria

- [ ] "What is Kube9 VS Code?" section is completely removed
- [ ] Quick Start guide now appears immediately after ecosystem panel
- [ ] No "What is" heading or content remains
- [ ] Quick Start guide is more prominent in the layout
- [ ] Quick Start guide requires less scrolling to see

## Implementation Steps

1. **Delete the entire "What is" section** (lines 467-481 in `src/webview/welcome.html`):
   
   Remove this entire block:
   ```html
   <div class="section">
       <h2><span class="section-icon">🚀</span> What is Kube9 VS Code?</h2>
       <p>Kube9 VS Code brings powerful Kubernetes cluster management directly into your development environment. View, explore, and manage your clusters without leaving your editor.</p>
       
       <div class="success-notice">
           <strong>✓ No configuration required!</strong> Kube9 works with your existing kubeconfig and is ready to use immediately.
       </div>

       <ul class="feature-list">
           <li><strong>Cluster Overview:</strong> Browse all clusters from your kubeconfig with instant access to cluster dashboards</li>
           <li><strong>Resource Explorer:</strong> Navigate namespaces, workloads (deployments, pods, statefulsets), services, and more</li>
           <li><strong>Real-time Dashboards:</strong> View cluster statistics, workload distribution, and node health at a glance</li>
           <li><strong>AI-Powered Insights:</strong> Get intelligent recommendations to optimize performance, reduce costs, and improve reliability</li>
       </ul>
   </div>
   ```

2. **Update Quick Start section styling** (modify CSS around line 505):
   
   Add increased prominence to the Quick Start section:
   ```css
   /* Quick Start Section - More Prominent */
   .section h2 {
       margin-top: 0;
       margin-bottom: 16px;
       color: var(--vscode-foreground);
       font-size: 22px;
       font-weight: 600;
       display: flex;
       align-items: center;
       gap: 10px;
   }

   .quickstart-section {
       margin-top: 8px;  /* Reduced from default, closer to ecosystem */
   }

   .quickstart-section h2 {
       font-size: 24px;  /* Larger than other sections */
       font-weight: 600;
   }
   ```

3. **Add class to Quick Start section** (around line 505):
   
   Change:
   ```html
   <div class="section">
       <h2><span class="section-icon">⚡</span> Quick Start Guide</h2>
   ```
   
   To:
   ```html
   <div class="section quickstart-section">
       <h2><span class="section-icon">⚡</span> Quick Start Guide</h2>
   ```

## Files Modified

- `src/webview/welcome.html` (HTML structure and CSS)

## Testing Checklist

- [ ] Welcome screen opens without "What is" section
- [ ] No "What is Kube9 VS Code?" heading visible
- [ ] No feature list about cluster overview, resource explorer, etc.
- [ ] Quick Start guide appears immediately after ecosystem panel
- [ ] Quick Start guide is more prominent (larger heading)
- [ ] Less scrolling required to see Quick Start guide
- [ ] Page layout flows naturally from ecosystem to quick start
- [ ] No broken styling or layout issues

## Related Scenarios

From `welcome-screen.feature.md`:
- "What is panel is removed"
- "Quick Start guide is prominently displayed"

## Notes

- This is a deletion-only story with minimal CSS adjustments
- The feature list from the "What is" section is not moved elsewhere - it's intentionally removed
- The ecosystem panel provides sufficient context about Kube9
- The Quick Start guide becomes the primary actionable content
- Consider the "success-notice" content is also removed - users can still use without config, but we don't need to advertise it prominently

