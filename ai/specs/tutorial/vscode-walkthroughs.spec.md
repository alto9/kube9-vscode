---
spec_id: vscode-walkthroughs
name: VSCode Walkthroughs API Implementation
description: Technical specification for implementing the interactive tutorial using VSCode's native Walkthroughs API
feature_id:
  - interactive-tutorial
diagram_id:
  - tutorial-flow
---

# VSCode Walkthroughs API Implementation

## Overview

This specification defines how to implement the kube9 interactive tutorial using VSCode's native Walkthroughs API. The implementation provides a 6-step guided onboarding experience integrated directly into VSCode's Getting Started workflow, with automatic progress tracking, completion validation, and replay capability.

## Architecture

See [tutorial-flow](../../diagrams/workflows/tutorial-flow.diagram.md) for the complete walkthrough flow architecture.

## Tutorial Philosophy

The tutorial is a **7-step** **instructional-first** experience that works whether or not users have clusters configured:

### With Resources Available
- Users interact with their actual clusters/namespaces/resources
- Completion events fire naturally through real interactions
- Provides hands-on practice with their own environment

### Without Resources Available
- Tutorial remains fully accessible and valuable
- High-quality PNG images show what features look like
- Descriptive text explains what's possible
- Manual "Mark Complete" buttons allow progression
- Encourages users to connect clusters but doesn't block learning

### Implementation Pattern
- **Never block tutorial progression** on resource availability
- **Always provide instructional value** through images and text
- **Offer graceful fallbacks** with manual completion options
- **Detect resource availability** and adapt messaging when helpful

This follows VSCode extension best practices (Docker, GitHub, Remote Development extensions all work this way).

## Package.json Configuration

### Walkthroughs Contribution

Add the following to `package.json` under the `contributes` section:

```json
{
  "contributes": {
    "walkthroughs": [
      {
        "id": "kube9.gettingStarted",
        "title": "Get Started with Kube9",
        "description": "Learn how to manage your Kubernetes clusters with Kube9",
        "when": "!kube9.tutorialCompleted",
        "steps": [
          {
            "id": "kube9.step1.exploreClusterView",
            "title": "Explore the Cluster View",
            "description": "Discover the Kube9 activity bar icon and learn about the tree structure that organizes clusters, namespaces, and resources.\n\n[Open Kube9 View](command:kube9.focus)",
            "media": {
              "image": "media/walkthrough/01-cluster-view.png",
              "altText": "Kube9 activity bar icon and cluster tree view"
            },
            "completionEvents": ["onView:kube9ClusterView"]
          },
          {
            "id": "kube9.step2.exploreClusterManager",
            "title": "Explore Cluster Manager",
            "description": "Learn how to customize your tree view organization with the Cluster Manager. Create custom views, organize namespaces, and tailor the interface to your workflow.\n\n[Open Cluster Manager](command:kube9.openClusterManager)",
            "media": {
              "image": "media/walkthrough/02-cluster-manager.png",
              "altText": "Cluster Manager UI showing customization options"
            },
            "completionEvents": ["onCommand:kube9.openClusterManager"]
          },
          {
            "id": "kube9.step3.navigateResources",
            "title": "Navigate Resources",
            "description": "Learn how to expand clusters and namespaces to explore Kubernetes resources organized in a hierarchical tree.\n\n**With clusters:** Try expanding a namespace in the kube9 view to see its resources.\n\n**Without clusters yet?** The image shows what you'll see when you connect a cluster. [Mark Complete](command:kube9.internal.completeStep3)",
            "media": {
              "image": "media/walkthrough/03-navigation.png",
              "altText": "Expanded namespace showing resource hierarchy"
            },
            "completionEvents": [
              "kube9.onNamespaceExpanded",
              "onCommand:kube9.internal.completeStep3"
            ]
          },
          {
            "id": "kube9.step4.viewResources",
            "title": "View Resources",
            "description": "View detailed information about any resource by clicking on it. See current status, conditions, events, and more in the describe webview.\n\n**With resources:** Click any pod in the tree view to see its details.\n\n**Without resources yet?** The image shows what you'll see. [Mark Complete](command:kube9.internal.completeStep4)",
            "media": {
              "image": "media/walkthrough/04-view-resource.png",
              "altText": "Resource describe webview showing pod status and details"
            },
            "completionEvents": [
              "kube9.onPodClicked",
              "onCommand:kube9.internal.completeStep4"
            ]
          },
          {
            "id": "kube9.step5.viewLogs",
            "title": "View Pod Logs",
            "description": "Access pod logs directly from the tree view for debugging and monitoring. Logs open in a dedicated viewer with filtering and search.\n\n[View Pod Logs](command:kube9.viewPodLogs)",
            "media": {
              "image": "media/walkthrough/05-logs.png",
              "altText": "Pod logs viewer interface"
            },
            "completionEvents": ["onCommand:kube9.viewPodLogs"]
          },
          {
            "id": "kube9.step6.manageResources",
            "title": "Manage Resources",
            "description": "Scale deployments and manage other workload resources. Right-click any workload to see management options like scale and delete.\n\n[Scale Workload](command:kube9.scaleWorkload)",
            "media": {
              "image": "media/walkthrough/06-management.png",
              "altText": "Resource management operations including scale and delete"
            },
            "completionEvents": ["onCommand:kube9.scaleWorkload"]
          },
          {
            "id": "kube9.step7.documentation",
            "title": "Documentation",
            "description": "You've learned the essentials! Find more help and resources:\n\n- Use **Cmd/Ctrl+Shift+P** to access all kube9 commands\n- Right-click resources for context menus\n- Check out [our documentation](https://alto9.github.io/kube9/) for detailed guides\n- Join our [community](https://github.com/alto9/kube9-vscode) for support\n\nHappy Kubernetes management! 🚀",
            "media": {
              "image": "media/walkthrough/07-documentation.png",
              "altText": "Documentation and help resources"
            }
          }
        ]
      }
    ]
  }
}
```

## Command Registration

### Show Tutorial Command

Register a command to manually open the tutorial:

```typescript
// In extension.ts activation
const showTutorialCommand = vscode.commands.registerCommand(
  'kube9.showTutorial',
  async () => {
    // Open the walkthrough using VSCode API
    await vscode.commands.executeCommand(
      'workbench.action.openWalkthrough',
      'alto9.kube9#kube9.gettingStarted',
      false // Don't open in a new window
    );
  }
);

context.subscriptions.push(showTutorialCommand);
```

Add to `package.json` commands section:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kube9.showTutorial",
        "title": "Show Getting Started Tutorial",
        "category": "Kube9"
      }
    ]
  }
}
```

## Resource Availability Handling

### Detection

Check if user has clusters/resources at various points:

```typescript
// Utility to check if user has any clusters
async function hasClusters(): Promise<boolean> {
  const clusters = await clusterProvider.getClusters();
  return clusters.length > 0;
}

// Utility to check if user has any namespaces in current context
async function hasNamespaces(): Promise<boolean> {
  const namespaces = await getCurrentContextNamespaces();
  return namespaces.length > 0;
}
```

### Fallback Completion Commands

Register manual completion commands for each interactive step:

```typescript
// Step 3 fallback (Navigate Resources)
const completeStep3 = vscode.commands.registerCommand(
  'kube9.internal.completeStep3',
  async () => {
    await vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onNamespaceExpanded'
    );
    vscode.window.showInformationMessage(
      'Great! When you connect a cluster, you can expand namespaces to explore resources.'
    );
  }
);

// Step 4 fallback (View Resources)
const completeStep4 = vscode.commands.registerCommand(
  'kube9.internal.completeStep4',
  async () => {
    if (!(await hasClusters())) {
      vscode.window.showInformationMessage(
        'Connect a cluster to view resource details. ' +
        'Click any pod to see its current status, conditions, and events.'
      );
    }
    // Still fire completion event
    await vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onPodClicked'
    );
  }
);

context.subscriptions.push(completeStep3, completeStep4);
```

### Adaptive Messaging

Commands can check for resources and show helpful guidance:

```typescript
async function viewResourceYAML(resource?: ResourceTreeItem) {
  // If called from tutorial without a resource
  if (!resource) {
    const hasResources = await hasNamespaces();
    if (!hasResources) {
      const action = await vscode.window.showInformationMessage(
        'No clusters detected. Would you like to connect a cluster first?',
        'Connect Cluster',
        'Learn More'
      );
      if (action === 'Connect Cluster') {
        vscode.commands.executeCommand('kube9.connectCluster');
      }
      return;
    }
    // Otherwise, prompt to select a resource
    resource = await quickPickResource();
  }
  
  // Normal resource YAML viewing logic...
}
```

## Custom Completion Events

Some steps require custom completion events that aren't built into VSCode. Implement these as follows:

### Namespace Expansion Tracking (Step 3)

```typescript
// In TreeDataProvider or TreeItem implementation
class NamespaceTreeItem extends vscode.TreeItem {
  constructor(/* ... */) {
    super(/* ... */);
    // ... other initialization
  }
}

// In TreeDataProvider.getChildren() or similar
private async onNamespaceExpanded(namespace: NamespaceTreeItem): Promise<void> {
  // Fire custom completion event
  await vscode.commands.executeCommand(
    'workbench.action.fireWalkthroughCompletionEvent',
    'kube9.onNamespaceExpanded'
  );
}
```

Hook this into the tree expansion event:

```typescript
// In extension.ts activation
const treeView = vscode.window.createTreeView('kube9ClusterView', {
  treeDataProvider: clusterProvider,
  showCollapseAll: true
});

treeView.onDidExpandElement((event) => {
  if (event.element.contextValue === 'namespace') {
    // Fire completion event for step 3
    vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onNamespaceExpanded'
    );
  }
});
```

### Pod Click Tracking (Step 4)

Track when users click on pods to view resource details:

```typescript
// In tree item click handler or onDidChangeSelection event
treeView.onDidChangeSelection((event) => {
  if (event.selection.length > 0) {
    const item = event.selection[0];
    if (item.contextValue === 'pod') {
      // Fire completion event for step 4
      vscode.commands.executeCommand(
        'workbench.action.fireWalkthroughCompletionEvent',
        'kube9.onPodClicked'
      );
    }
  }
});
```

## Completion Tracking

### Global State Management

Track tutorial completion status:

```typescript
// In extension.ts activation
export async function activate(context: vscode.ExtensionContext) {
  // Check if tutorial has been completed
  const tutorialCompleted = context.globalState.get<boolean>(
    'kube9.tutorialCompleted',
    false
  );

  // Set context for 'when' clause
  await vscode.commands.executeCommand(
    'setContext',
    'kube9.tutorialCompleted',
    tutorialCompleted
  );

  // Listen for tutorial completion
  // Note: VSCode doesn't provide a direct event, but we can infer completion
  // when step 6 is viewed
  const checkTutorialCompletion = vscode.commands.registerCommand(
    'kube9.internal.markTutorialComplete',
    async () => {
      await context.globalState.update('kube9.tutorialCompleted', true);
      await vscode.commands.executeCommand(
        'setContext',
        'kube9.tutorialCompleted',
        true
      );
    }
  );

  context.subscriptions.push(checkTutorialCompletion);
}
```

### Detecting Step 7 Completion

Since step 7 has no explicit action, track when it becomes visible:

```typescript
// This is an approximation; VSCode doesn't provide direct walkthrough events
// Consider step 7 complete when step 6 is completed
// The 'when' clause will prevent auto-showing after this
```

Alternatively, add a simple action button in step 7:

```json
{
  "id": "kube9.step7.documentation",
  "title": "Documentation",
  "description": "...\n\n[Mark Tutorial Complete](command:kube9.internal.markTutorialComplete)",
  "media": { "image": "media/walkthrough/07-documentation.png" },
  "completionEvents": ["onCommand:kube9.internal.markTutorialComplete"]
}
```

## Visual Assets

### Asset Requirements

Create 6 PNG images following these specifications:

**Technical Specs:**
- Format: PNG (not SVG, for security)
- Resolution: 1600x1200 pixels (2x for retina displays)
- File size: < 200KB each (use PNG compression tools)
- Color: Full color with annotations (arrows, highlights, text overlays)
- Theme: Design for visibility in both light and dark themes

**Content Guidelines:**
- Use clear, annotated screenshots of the actual UI
- Add arrows pointing to key UI elements
- Include brief text labels directly on image
- Use contrasting colors for annotations (avoid pure white/black)
- Show realistic but safe content (avoid real cluster names/data)

**Files to Create:**
1. `media/walkthrough/01-cluster-view.png` - Activity bar icon highlighted, tree view visible
2. `media/walkthrough/02-cluster-manager.png` - Cluster Manager UI showing customization options
3. `media/walkthrough/03-navigation.png` - Expanded namespace with resources shown
4. `media/walkthrough/04-view-resource.png` - Describe webview showing pod details and status
5. `media/walkthrough/05-logs.png` - Pod logs webview displaying log output
6. `media/walkthrough/06-management.png` - Context menu showing scale/delete options
7. `media/walkthrough/07-documentation.png` - Documentation links and help resources

### Image Creation Workflow

1. Take screenshots of actual extension UI (or mockups during development)
2. Open in image editor (Figma, Photoshop, or similar)
3. Add annotations:
   - Arrows pointing to key elements
   - Text labels explaining what to look at
   - Highlight boxes around important areas
4. Export as PNG at 1600x1200
5. Compress using tools like ImageOptim, TinyPNG, or pngquant
6. Test visibility in both VS Code light and dark themes

## Welcome Screen Integration

### Adding Start Tutorial Button

Update the welcome screen webview to include a prominent tutorial button:

```html
<!-- In welcome screen HTML -->
<div class="welcome-actions">
  <button id="startTutorial" class="primary-button">
    <span class="icon">📚</span>
    Start Interactive Tutorial
  </button>
  <button id="getStarted" class="secondary-button">
    Explore on My Own
  </button>
</div>
```

```typescript
// In welcome screen webview script
document.getElementById('startTutorial')?.addEventListener('click', () => {
  // Post message to extension
  vscode.postMessage({ command: 'startTutorial' });
});

// In extension message handler
panel.webview.onDidReceiveMessage(
  async (message) => {
    if (message.command === 'startTutorial') {
      await vscode.commands.executeCommand('kube9.showTutorial');
    }
  },
  undefined,
  context.subscriptions
);
```

## Testing Checklist

### Functional Testing
- [ ] Walkthrough appears in VSCode's Getting Started
- [ ] All 6 steps are visible and navigable
- [ ] PNG images load correctly for each step
- [ ] Action buttons trigger correct commands
- [ ] Completion events fire when actions performed
- [ ] Progress persists across VSCode restarts
- [ ] `kube9.showTutorial` command opens walkthrough
- [ ] Welcome screen button opens walkthrough
- [ ] Context key `kube9.tutorialCompleted` sets correctly

### Theme Testing
- [ ] Images visible in Light theme
- [ ] Images visible in Dark theme
- [ ] Images visible in High Contrast theme
- [ ] Text readable in all themes
- [ ] Annotations visible in all themes

### Edge Cases
- [ ] Tutorial accessible and valuable when no clusters configured
- [ ] All steps can be completed without clusters (manual fallbacks)
- [ ] Action buttons show helpful messages when resources unavailable
- [ ] Steps work in empty workspace
- [ ] Tutorial survives extension updates
- [ ] Multiple VSCode windows don't conflict
- [ ] Tutorial accessible after completion (via command)

### Resource Availability Testing
- [ ] Test tutorial with 0 clusters configured
- [ ] Test tutorial with 1 cluster, no namespaces
- [ ] Test tutorial with clusters but no pods/deployments
- [ ] Test tutorial with full cluster (normal path)
- [ ] Verify manual completion buttons work
- [ ] Verify helpful messages show when resources missing

### Accessibility
- [ ] Keyboard navigation works through steps
- [ ] Action buttons keyboard-accessible
- [ ] Screen reader announces step content
- [ ] Alt text provided for all images
- [ ] High contrast mode fully functional

## Performance Considerations

- **Asset Loading**: PNG images are loaded on-demand by VSCode (no performance impact)
- **Event Listeners**: Custom completion events should debounce if fired frequently
- **State Management**: GlobalState operations are async but very fast
- **Memory**: Walkthrough UI managed by VSCode (no extension memory overhead)

## Dependencies

- **VSCode Version**: Requires VS Code 1.80.0 or higher (Walkthroughs API fully stable)
- **Extension Dependencies**: None (uses only VSCode built-in APIs)
- **Build Dependencies**: None (assets bundled with extension)

## Estimated Implementation Effort

- **Package.json Configuration**: 1-2 hours (7 steps)
- **Command Registration**: 1 hour
- **Custom Completion Events**: 3-4 hours (namespace expansion + pod click tracking)
- **State Management**: 2 hours
- **Welcome Screen Integration**: 2-3 hours
- **Visual Asset Creation**: 7-10 hours (7 PNG images with annotations)
- **Testing & Polish**: 5-7 hours
- **Total**: 21-29 hours

## Future Enhancements

- **Conditional Steps**: Show different steps based on cluster availability
- **Video/GIF Media**: Add animated guides (VSCode supports video in walkthroughs)
- **Localization**: Translate tutorial steps for international users
- **Analytics**: Track completion rates and step drop-off (if telemetry enabled)
- **Advanced Tutorial**: Create second walkthrough for advanced features
- **Interactive Playground**: Provide safe demo cluster for tutorial practice

