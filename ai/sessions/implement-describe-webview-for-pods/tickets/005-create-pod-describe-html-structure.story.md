---
story_id: 005-create-pod-describe-html-structure
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 20
---

# Create Pod Describe Webview HTML/CSS Structure

## Objective

Create the HTML template and CSS styles for the Pod Describe webview. This includes the header, tab navigation, and content area structure.

## Acceptance Criteria

- [ ] Create `media/describe/` directory
- [ ] Create `media/describe/index.html` with basic structure
- [ ] Create `media/describe/podDescribe.css` with styles
- [ ] HTML includes header with title and action buttons (Refresh, View YAML)
- [ ] HTML includes tab navigation (Overview, Containers, Conditions, Events)
- [ ] HTML includes main content area for tab content
- [ ] HTML includes loading and error state containers
- [ ] CSS uses VSCode CSS variables (`--vscode-*`)
- [ ] CSS includes styles for status badges (healthy/degraded/unhealthy)
- [ ] CSS includes styles for tab navigation (active/inactive states)
- [ ] CSS includes styles for container cards and event timeline
- [ ] CSS includes responsive design considerations
- [ ] Update DescribeWebview.getWebviewContent() to load this HTML template

## Files Involved

**New Files:**
- `media/describe/index.html`
- `media/describe/podDescribe.css`

**Modified Files:**
- `src/webview/DescribeWebview.ts` (update getWebviewContent method)

## Implementation Notes

Reference:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 685-825)

HTML structure:
```html
<div class="pod-describe-container">
  <header class="pod-header">
    <h1 id="pod-name"></h1>
    <div class="status-badge"></div>
    <div class="header-actions">
      <button id="refresh-btn">Refresh</button>
      <button id="view-yaml-btn">View YAML</button>
    </div>
  </header>
  
  <nav class="tab-navigation">
    <button class="tab-btn active" data-tab="overview">Overview</button>
    <button class="tab-btn" data-tab="containers">Containers</button>
    <button class="tab-btn" data-tab="conditions">Conditions</button>
    <button class="tab-btn" data-tab="events">Events</button>
  </nav>
  
  <main class="tab-content"></main>
  <div class="loading-state" style="display:none;"></div>
  <div class="error-state" style="display:none;"></div>
</div>
```

Follow pattern from `media/event-viewer/index.html` for structure.

## Dependencies

None - this is independent work.

## Testing

- [ ] HTML validates correctly
- [ ] CSS compiles without errors
- [ ] Webview displays HTML structure when opened
- [ ] VSCode theme variables apply correctly

