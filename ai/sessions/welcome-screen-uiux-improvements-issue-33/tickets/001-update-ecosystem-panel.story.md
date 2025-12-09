---
story_id: update-ecosystem-panel
session_id: welcome-screen-uiux-improvements-issue-33
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
status: pending
priority: high
estimated_time: 20min
---

# Update Ecosystem Panel with 4 Core Components

## Objective

Update the "The Kube9 Ecosystem" section to display the correct 4 core Kube9 components: Operator, Server, UI, and VS Code extension. Replace incorrect items (Portal, CLI) with accurate descriptions.

## Context

**GitHub Issue**: #33.2

Currently, the ecosystem section (lines 483-503) shows:
- Kube9 Operator ✓ (correct)
- Kube9 Portal ✗ (should be "Kube9 Server")
- Kube9 CLI ✗ (should be "Kube9 UI")
- Missing: Kube9 VS Code (this extension)

The ecosystem panel should accurately represent the actual Kube9 product lineup.

## Acceptance Criteria

- [ ] Ecosystem panel displays exactly 4 components
- [ ] First component: "Kube9 Operator" with operator description
- [ ] Second component: "Kube9 Server" with server description
- [ ] Third component: "Kube9 UI" with UI description
- [ ] Fourth component: "Kube9 VS Code" with extension description
- [ ] Each component has a brief description
- [ ] Each component has a link to its repository or documentation
- [ ] Links open in external browser when clicked
- [ ] CSS Grid layout remains responsive

## Implementation Steps

1. **Update ecosystem section HTML** (lines 487-500 in `src/webview/welcome.html`):
   
   Replace the entire `.ecosystem-grid` div with:
   ```html
   <div class="ecosystem-grid">
       <div class="ecosystem-card">
           <h3>Kube9 Operator</h3>
           <p>Kubernetes operator that manages Kube9 resources and provides advanced cluster capabilities.</p>
           <a href="https://github.com/alto9/kube9-operator" onclick="openExternal('https://github.com/alto9/kube9-operator'); return false;">View on GitHub →</a>
       </div>
       <div class="ecosystem-card">
           <h3>Kube9 Server</h3>
           <p>Backend server providing API services and cluster management functionality.</p>
           <a href="https://github.com/alto9/kube9-server" onclick="openExternal('https://github.com/alto9/kube9-server'); return false;">View on GitHub →</a>
       </div>
       <div class="ecosystem-card">
           <h3>Kube9 UI</h3>
           <p>Web-based dashboard for visualizing and managing Kubernetes resources.</p>
           <a href="https://github.com/alto9/kube9-ui" onclick="openExternal('https://github.com/alto9/kube9-ui'); return false;">View on GitHub →</a>
       </div>
       <div class="ecosystem-card">
           <h3>Kube9 VS Code</h3>
           <p>VS Code extension for Kubernetes cluster management (this extension).</p>
           <a href="https://github.com/alto9/kube9-vscode" onclick="openExternal('https://github.com/alto9/kube9-vscode'); return false;">View on GitHub →</a>
       </div>
   </div>
   ```

2. **Add link styling to ecosystem cards** (add to `.ecosystem-card` CSS around line 168):
   ```css
   .ecosystem-card a {
       display: inline-block;
       margin-top: 12px;
       color: var(--vscode-textLink-foreground);
       text-decoration: none;
       font-size: 13px;
       font-weight: 500;
   }

   .ecosystem-card a:hover {
       color: var(--vscode-textLink-activeForeground);
       text-decoration: underline;
   }

   .ecosystem-card a:focus-visible {
       outline: 1px solid var(--vscode-focusBorder);
       outline-offset: 2px;
       border-radius: 2px;
   }
   ```

3. **Update the closing paragraph** (line 502):
   
   Change from:
   ```html
   <p style="margin-top: 24px;">Learn more about the complete ecosystem at <a href="https://kube9.io" onclick="openExternal('https://kube9.io'); return false;">kube9.io</a></p>
   ```
   
   To:
   ```html
   <p style="margin-top: 24px;">Learn more about the complete ecosystem at <a href="https://alto9.github.io/" onclick="openExternal('https://alto9.github.io/'); return false;">alto9.github.io</a></p>
   ```

4. **Verify JavaScript handler** (line 560):
   - The existing `openExternal()` function already handles all external links
   - No changes needed to JavaScript

## Files Modified

- `src/webview/welcome.html` (HTML content and CSS)

## Testing Checklist

- [ ] Ecosystem section displays exactly 4 cards
- [ ] Cards appear in order: Operator, Server, UI, VS Code
- [ ] Each card has correct title
- [ ] Each card has appropriate description
- [ ] Each card has a "View on GitHub" link
- [ ] All links open in external browser
- [ ] Cards are responsive (stack on narrow screens, side-by-side on wide screens)
- [ ] Hover effects work on cards
- [ ] Keyboard navigation works (tab through links)
- [ ] Screen reader announces card content correctly
- [ ] Links have proper focus indicators

## Related Scenarios

From `welcome-screen.feature.md`:
- "Ecosystem panel displays four core components"
- "Kube9 Operator ecosystem item"
- "Kube9 Server ecosystem item"
- "Kube9 UI ecosystem item"
- "Kube9 VS Code ecosystem item"

## Notes

- Descriptions are based on the spec at `ai/specs/webview/welcome-screen-spec.spec.md`
- All GitHub repository links use the `alto9` organization
- Links use the existing `openExternal()` JavaScript function
- CSS Grid layout with `repeat(auto-fit, minmax(250px, 1fr))` ensures responsiveness

