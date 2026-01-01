---
spec_id: welcome-screen-spec
feature_id: [welcome-screen]
diagram_id: [welcome-screen-layout]
actor_id: [developer]
context_id: [vscode-extension-development]
---

# Welcome Screen Specification

## Overview

This specification defines the technical requirements for implementing the improved welcome screen UI/UX as described in GitHub issue #33. The welcome screen is a webview that displays on first activation of the Kube9 VS Code extension, providing users with an introduction to the Kube9 ecosystem and a quick start guide.

## Requirements Summary

| Requirement | Priority | Issue Ref |
|-------------|----------|-----------|
| Move "Don't Show Again" checkbox to top | High | #33.1 |
| Update ecosystem panel with 3 core components | High | #33.2 |
| Remove "What is" panel and move Quick Start up | Medium | #33.3 |
| Display actual icons in Quick Start guide | High | #33.4 |
| Remove "Visit Kube9 Portal" link | Low | #33.5 |
| Remove AI Features section | High | N/A |
| Add Cluster Organizer instructions | Medium | N/A |

Note: AI Features section has been removed per product direction decision. The VS Code extension will not have AI features.

## Component Architecture

### Welcome Screen Manager

**Purpose**: Manages the lifecycle and display logic of the welcome screen webview.

**Responsibilities**:
- Check if welcome screen should be displayed on activation
- Create and manage welcome screen webview panel
- Handle webview disposal and cleanup
- Manage user preferences for welcome screen display

### HTML/CSS Template

**Purpose**: Defines the visual structure and styling of the welcome screen.

**Responsibilities**:
- Render welcome screen layout following new structure
- Apply VSCode theme-aware styling
- Display ecosystem components with proper descriptions
- Render Quick Start guide with inline icons
- Provide responsive layout

### Icon Provider

**Purpose**: Supply actual icon assets to the webview for inline display.

**Responsibilities**:
- Load Kube9 activity bar icon from extension resources
- Convert icons to base64 data URIs for webview embedding
- Provide fallback text if icon loading fails
- Ensure proper icon sizing (16-20px)

## File Structure

```
src/
├── webview/
│   ├── WelcomeWebview.ts              # Main welcome screen manager
│   ├── WelcomeContentProvider.ts      # HTML content generation
│   └── templates/
│       └── welcome.html               # Welcome screen HTML template
├── resources/
│   └── icons/
│       └── kube9-activity-bar.svg     # Kube9 activity bar icon
└── extension.ts                        # Extension activation logic
```

## Data Structures

### Welcome Screen Configuration

```typescript
interface WelcomeScreenConfig {
  showOnStartup: boolean;          // User preference: show welcome on activation
  hasBeenShown: boolean;           // Track if welcome has been shown before
  lastShownVersion: string;        // Track extension version when last shown
}
```

### Ecosystem Component

```typescript
interface EcosystemComponent {
  name: string;                    // Component name (e.g., "Kube9 Operator")
  description: string;             // Brief description
  link: string;                    // URL to repository or documentation
  icon?: string;                   // Optional icon path or data URI
}
```

### Quick Start Step

```typescript
interface QuickStartStep {
  number: number;                  // Step number (1, 2, 3, etc.)
  text: string;                    // Instruction text
  icon?: string;                   // Optional inline icon (data URI)
  iconAlt?: string;                // Alt text for icon
}
```

## Implementation Details

### 1. Don't Show Again Checkbox (Issue #33.1)

**Location**: Below header, above all content panels

**HTML Structure**:
```html
<div class="header">
  <h1>Welcome to Kube9</h1>
</div>

<div class="dont-show-container">
  <label>
    <input type="checkbox" id="dont-show-again" />
    <span>Don't show this welcome screen again</span>
  </label>
</div>

<!-- Rest of content follows -->
```

**CSS Styling**:
```css
.dont-show-container {
  padding: 16px 24px;
  margin-bottom: 24px;
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.dont-show-container label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.dont-show-container input[type="checkbox"] {
  margin-right: 8px;
}
```

**Event Handling**:
```typescript
// In webview message handler
const checkbox = document.getElementById('dont-show-again');
checkbox.addEventListener('change', (event) => {
  const checked = (event.target as HTMLInputElement).checked;
  
  // Send message to extension
  vscode.postMessage({
    command: 'setWelcomePreference',
    showOnStartup: !checked
  });
});
```

**Extension Handler**:
```typescript
webviewPanel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === 'setWelcomePreference') {
    await context.globalState.update('kube9.showWelcomeOnStartup', message.showOnStartup);
  }
});
```

### 2. Ecosystem Panel Update (Issue #33.2)

**Data Definition**:
```typescript
const ecosystemComponents: EcosystemComponent[] = [
  {
    name: 'Kube9 Operator',
    description: 'Kubernetes operator that manages Kube9 resources and provides advanced cluster capabilities',
    link: 'https://github.com/alto9/kube9-operator'
  },
  {
    name: 'Kube9 VS Code',
    description: 'VS Code extension for Kubernetes cluster management (this extension)',
    link: 'https://github.com/alto9/kube9-vscode'
  },
  {
    name: 'Kube9 Desktop',
    description: 'Desktop application for Kubernetes management with integrated development tools',
    link: 'https://github.com/alto9/kube9-desktop'
  }
];
```

**HTML Template**:
```html
<div class="panel ecosystem-panel">
  <h2>Kube9 Ecosystem</h2>
  <div class="ecosystem-grid">
    {{#each ecosystemComponents}}
    <div class="ecosystem-item">
      <h3>{{name}}</h3>
      <p>{{description}}</p>
      <a href="{{link}}" class="ecosystem-link">Learn More →</a>
    </div>
    {{/each}}
  </div>
</div>
```

**CSS Grid Layout**:
```css
.ecosystem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.ecosystem-item {
  padding: 16px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
}

.ecosystem-item h3 {
  margin-top: 0;
  font-size: 16px;
  color: var(--vscode-foreground);
}

.ecosystem-item p {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.5;
}

.ecosystem-link {
  display: inline-block;
  margin-top: 12px;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  font-size: 13px;
}

.ecosystem-link:hover {
  color: var(--vscode-textLink-activeForeground);
  text-decoration: underline;
}
```

### 3. Remove "What is" Panel and Reorganize (Issue #33.3)

**Old Layout** (to be removed):
```html
<!-- REMOVE THIS -->
<div class="panel what-is-panel">
  <h2>What is Kube9?</h2>
  <p>...</p>
</div>

<div class="panel quickstart-panel">
  ...
</div>
```

**New Layout**:
```html
<div class="panel ecosystem-panel">
  ...
</div>

<!-- Quick Start immediately follows ecosystem panel -->
<div class="panel quickstart-panel">
  ...
</div>
```

**Updated CSS**:
```css
.quickstart-panel {
  margin-top: 32px;  /* More prominent spacing */
}

.quickstart-panel h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}
```

### 4. Display Actual Icons in Quick Start (Issue #33.4)

**Icon Loading**:
```typescript
class IconProvider {
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  /**
   * Get icon as base64 data URI for embedding in webview
   */
  getIconDataUri(iconName: string): string {
    try {
      const iconPath = this.context.asAbsolutePath(`resources/icons/${iconName}`);
      const iconBuffer = fs.readFileSync(iconPath);
      const base64 = iconBuffer.toString('base64');
      const ext = path.extname(iconName).substring(1);
      
      return `data:image/${ext};base64,${base64}`;
    } catch (error) {
      console.error(`Failed to load icon ${iconName}:`, error);
      return '';  // Return empty string for fallback
    }
  }
  
  /**
   * Get Kube9 activity bar icon
   */
  getKube9ActivityBarIcon(): string {
    return this.getIconDataUri('kube9-activity-bar.svg');
  }
}
```

**Quick Start Data with Icons**:
```typescript
function getQuickStartSteps(iconProvider: IconProvider): QuickStartStep[] {
  const activityBarIcon = iconProvider.getKube9ActivityBarIcon();
  
  return [
    {
      number: 1,
      text: 'Click the {icon} icon in the VS Code activity bar',
      icon: activityBarIcon,
      iconAlt: 'Kube9 Icon'
    },
    {
      number: 2,
      text: 'Select a cluster from the cluster selector dropdown',
      icon: undefined,
      iconAlt: undefined
    },
    {
      number: 3,
      text: 'Explore namespaces, workloads, and other Kubernetes resources in the tree view',
      icon: undefined,
      iconAlt: undefined
    }
  ];
}
```

**HTML Template with Icon Rendering**:
```html
<div class="panel quickstart-panel">
  <h2>Quick Start Guide</h2>
  <ol class="quickstart-steps">
    {{#each quickStartSteps}}
    <li class="quickstart-step">
      <span class="step-number">{{number}}.</span>
      <span class="step-content">
        {{#if icon}}
          {{renderTextWithIcon text icon iconAlt}}
        {{else}}
          {{text}}
        {{/if}}
      </span>
    </li>
    {{/each}}
  </ol>
</div>
```

**Text with Icon Rendering Helper**:
```typescript
function renderTextWithIcon(text: string, iconDataUri: string, iconAlt: string): string {
  // Replace {icon} placeholder with actual icon
  if (!iconDataUri) {
    // Fallback to text
    return text.replace('{icon}', `[${iconAlt}]`);
  }
  
  const iconHtml = `<img src="${iconDataUri}" alt="${iconAlt}" class="inline-icon" />`;
  return text.replace('{icon}', iconHtml);
}
```

**CSS for Inline Icons**:
```css
.inline-icon {
  display: inline-block;
  width: 18px;
  height: 18px;
  vertical-align: middle;
  margin: 0 4px;
}

.quickstart-step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.6;
}

.step-number {
  font-weight: 600;
  margin-right: 8px;
  color: var(--vscode-foreground);
}

.step-content {
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
```

### 5. Remove "Visit Kube9 Portal" Link (Issue #33.5)

**Remove from HTML**:
```html
<!-- DELETE THIS ENTIRE SECTION -->
<div class="portal-link-container">
  <a href="..." class="portal-link">Visit Kube9 Portal</a>
</div>
```

**Remove from CSS**:
```css
/* DELETE THESE STYLES */
.portal-link-container { ... }
.portal-link { ... }
```

## Extension Settings

### Configuration Schema

Add to `package.json`:
```json
{
  "contributes": {
    "configuration": {
      "title": "Kube9",
      "properties": {
        "kube9.showWelcomeScreen": {
          "type": "boolean",
          "default": true,
          "description": "Show welcome screen when the extension is activated for the first time"
        }
      }
    }
  }
}
```

### Settings Access

```typescript
function shouldShowWelcomeScreen(context: vscode.ExtensionContext): boolean {
  // Check user setting
  const config = vscode.workspace.getConfiguration('kube9');
  const showWelcome = config.get<boolean>('showWelcomeScreen', true);
  
  if (!showWelcome) {
    return false;
  }
  
  // Check if already shown this session
  const hasBeenShown = context.globalState.get<boolean>('kube9.welcomeShown', false);
  
  return !hasBeenShown;
}
```

## VSCode Command

### Command Registration

```typescript
// Register command for manual welcome screen access
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.showWelcomeScreen', () => {
    showWelcomeScreen(context);
  })
);
```

### package.json Command

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kube9.showWelcomeScreen",
        "title": "Show Welcome Screen",
        "category": "Kube9"
      }
    ]
  }
}
```

## Webview Panel Configuration

```typescript
function createWelcomeWebview(context: vscode.ExtensionContext): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'kube9Welcome',
    'Welcome to Kube9',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'resources')
      ]
    }
  );
  
  // Generate HTML content
  const iconProvider = new IconProvider(context);
  const htmlContent = generateWelcomeHTML(context, iconProvider);
  
  panel.webview.html = htmlContent;
  
  // Handle disposal
  panel.onDidDispose(() => {
    // Mark as shown when disposed
    context.globalState.update('kube9.welcomeShown', true);
  });
  
  return panel;
}
```

## Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               img-src ${webview.cspSource} data: https:; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               script-src ${webview.cspSource};">
```

**Notes**:
- `data:` required for base64-encoded icons
- `https:` allows external links to open
- `'unsafe-inline'` for inline styles (minimal use)

## Theme Integration

```typescript
function getThemeStyles(): string {
  return `
    :root {
      --background: var(--vscode-editor-background);
      --foreground: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --link: var(--vscode-textLink-foreground);
      --link-hover: var(--vscode-textLink-activeForeground);
      --description: var(--vscode-descriptionForeground);
    }
    
    body {
      background-color: var(--background);
      color: var(--foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      padding: 0;
      margin: 0;
    }
  `;
}
```

## Accessibility Requirements

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order must be logical (checkbox → ecosystem links → command palette)
- Focus indicators must be clearly visible

### Screen Reader Support

```html
<!-- Checkbox with proper label -->
<label for="dont-show-again">
  <input type="checkbox" id="dont-show-again" aria-label="Don't show this welcome screen again" />
  <span>Don't show this welcome screen again</span>
</label>

<!-- Icons with alt text -->
<img src="..." alt="Kube9 activity bar icon" class="inline-icon" />

<!-- Links with descriptive text -->
<a href="..." aria-label="Learn more about Kube9 Operator">Learn More →</a>
```

### Color Contrast

- All text must meet WCAG AA standards (4.5:1 contrast ratio)
- Icons must have sufficient contrast or text alternatives
- Links must be distinguishable from body text

## Error Handling

### Icon Loading Failures

```typescript
function renderQuickStartStep(step: QuickStartStep): string {
  if (step.icon) {
    // Icon is available
    return renderTextWithIcon(step.text, step.icon, step.iconAlt || 'Icon');
  } else {
    // No icon or icon failed to load - use text fallback
    const fallback = step.iconAlt ? `[${step.iconAlt}]` : '';
    return step.text.replace('{icon}', fallback);
  }
}
```

### Link Validation

```typescript
function validateEcosystemLinks(components: EcosystemComponent[]): void {
  for (const component of components) {
    try {
      new URL(component.link);  // Validate URL format
    } catch (error) {
      console.error(`Invalid link for ${component.name}: ${component.link}`);
      // Optionally remove link from component
      component.link = '';
    }
  }
}
```

## Testing Strategy

### Unit Tests

- Icon loading and fallback logic
- HTML content generation
- Settings persistence
- URL validation

### Integration Tests

- Welcome screen displays on first activation
- Checkbox state persists correctly
- Links open in external browser
- Theme colors apply correctly
- Icons render inline with proper sizing

### Manual Testing Checklist

- [ ] Welcome screen appears on first activation
- [ ] "Don't Show Again" checkbox is visible at top without scrolling
- [ ] Checking checkbox prevents welcome screen on next activation
- [ ] Ecosystem panel shows exactly 3 components with correct descriptions
- [ ] All ecosystem links open in browser
- [ ] "What is" panel is not present
- [ ] Quick Start guide appears immediately after ecosystem panel
- [ ] Kube9 activity bar icon displays inline in step 1
- [ ] Icon is sized appropriately (16-20px)
- [ ] "Visit Kube9 Portal" link is not present anywhere
- [ ] Cluster Organizer section appears after Quick Start guide
- [ ] Cluster Organizer section explains features (folders, aliases, hiding)
- [ ] Cluster Organizer section shows how to access via Command Palette
- [ ] Command palette "Kube9: Show Welcome Screen" works
- [ ] Welcome screen adapts to light/dark themes
- [ ] Tab navigation works through all interactive elements
- [ ] Screen reader announces all content correctly

## Performance Considerations

- Icon loading should be asynchronous and non-blocking
- HTML content generation should be cached if welcome screen is reopened
- Base64 encoding of icons adds ~33% overhead - acceptable for small icons
- Webview should dispose when closed to free resources

## Future Enhancements

- Add animation or transition effects when welcome screen opens
- Include video tutorial in Quick Start guide
- Add "Getting Started" tasks/checklist
- Provide personalized recommendations based on cluster configuration
- Add telemetry to track which links users click most


