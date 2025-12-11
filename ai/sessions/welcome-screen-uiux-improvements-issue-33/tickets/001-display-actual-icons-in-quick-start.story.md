---
story_id: display-actual-icons-in-quick-start
session_id: welcome-screen-uiux-improvements-issue-33
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
status: pending
priority: high
estimated_time: 30min
---

# Display Actual Icons in Quick Start Guide

## Objective

Create an IconProvider class to load extension icons and display the actual Kube9 activity bar icon inline in the Quick Start guide, making it easier for users to visually identify what to click.

## Context

**GitHub Issue**: #33.4

Currently, the Quick Start guide uses text descriptions to reference icons. Users would benefit from seeing the actual Kube9 activity bar icon inline with the text, providing visual guidance.

The icon needs to be:
- Loaded from extension resources
- Converted to base64 data URI for webview embedding
- Rendered inline at 16-20px size
- Properly accessible with alt text
- Have fallback text if loading fails

## Acceptance Criteria

- [ ] IconProvider class created in TypeScript
- [ ] Kube9 activity bar icon loads from extension resources
- [ ] Icon is converted to base64 data URI
- [ ] Icon displays inline in Quick Start step 2
- [ ] Icon is sized appropriately (18px recommended)
- [ ] Icon has proper alt text for accessibility
- [ ] Fallback text displays if icon fails to load
- [ ] CSP allows data URIs for images

## Implementation Steps

### 1. Create IconProvider Class

Create new file `src/webview/IconProvider.ts`:

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * IconProvider loads icon assets and converts them to data URIs for webview embedding.
 */
export class IconProvider {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get icon as base64 data URI for embedding in webview.
     * 
     * @param iconPath - Relative path to icon from extension root
     * @returns Data URI string or empty string if loading fails
     */
    public getIconDataUri(iconPath: string): string {
        try {
            const fullPath = path.join(this.context.extensionPath, iconPath);
            
            if (!fs.existsSync(fullPath)) {
                console.error(`Icon not found: ${fullPath}`);
                return '';
            }

            const iconBuffer = fs.readFileSync(fullPath);
            const base64 = iconBuffer.toString('base64');
            const ext = path.extname(iconPath).substring(1).toLowerCase();
            
            // Determine MIME type
            const mimeType = this.getMimeType(ext);
            
            return `data:${mimeType};base64,${base64}`;
        } catch (error) {
            console.error(`Failed to load icon ${iconPath}:`, error);
            return '';
        }
    }

    /**
     * Get MIME type for image extension.
     */
    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeTypes[extension] || 'image/png';
    }

    /**
     * Get Kube9 activity bar icon.
     */
    public getKube9ActivityBarIcon(): string {
        // Try multiple possible icon locations
        const possiblePaths = [
            'resources/kube9-icon.svg',
            'resources/kube9-icon.png',
            'media/kube9-icon.svg',
            'media/kube9-icon.png',
            'resources/icon.svg',
            'resources/icon.png'
        ];

        for (const iconPath of possiblePaths) {
            const dataUri = this.getIconDataUri(iconPath);
            if (dataUri) {
                return dataUri;
            }
        }

        console.warn('Kube9 activity bar icon not found in any expected location');
        return '';
    }
}
```

### 2. Update WelcomeWebview.ts

Modify `src/webview/WelcomeWebview.ts`:

1. Import IconProvider at the top:
```typescript
import { IconProvider } from './IconProvider';
```

2. Update `getWebviewContent()` method (around line 107):
```typescript
private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    try {
        // Create icon provider
        const iconProvider = new IconProvider(context);
        const activityBarIcon = iconProvider.getKube9ActivityBarIcon();
        
        // Get the path to the HTML file
        const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'welcome.html');
        
        // Read the HTML file
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Replace icon placeholders
        htmlContent = htmlContent.replace(
            '{{ACTIVITY_BAR_ICON}}',
            activityBarIcon
        );
        
        // Replace CSP source placeholders
        htmlContent = htmlContent.replace(
            /content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"/,
            `content="default-src 'none'; img-src data: https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';"`
        );
        
        return htmlContent;
    } catch (error) {
        // ... existing error handling
    }
}
```

### 3. Update welcome.html

Modify Quick Start section (around line 507-509):

Change step 2 from:
```html
<li>Click the <strong>Kube9</strong> icon in the VS Code activity bar (left sidebar)</li>
```

To:
```html
<li>Click the <span class="icon-inline-wrapper">{{ACTIVITY_BAR_ICON}}</span> icon in the VS Code activity bar (left sidebar)</li>
```

### 4. Add CSS for Inline Icons

Add to `<style>` section (around line 315):

```css
/* Inline Icon Styling */
.icon-inline-wrapper {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    margin: 0 4px;
}

.icon-inline-wrapper img {
    display: inline-block;
    width: 18px;
    height: 18px;
    vertical-align: middle;
}

/* Fallback for missing icons */
.icon-inline-wrapper:empty::before {
    content: "[Kube9 Icon]";
    color: var(--vscode-descriptionForeground);
    font-size: 0.9em;
    font-style: italic;
}
```

### 5. Update HTML Icon Rendering

The TypeScript will replace `{{ACTIVITY_BAR_ICON}}` with either:
- `<img src="data:image/svg+xml;base64,..." alt="Kube9 Icon" class="inline-icon" />`  (if icon loads)
- `` (empty string if icon fails - CSS fallback displays "[Kube9 Icon]")

## Files Created

- `src/webview/IconProvider.ts` (new file)

## Files Modified

- `src/webview/WelcomeWebview.ts` (import IconProvider, replace placeholders)
- `src/webview/welcome.html` (add icon placeholder, add CSS)

## Testing Checklist

- [ ] Welcome screen displays Kube9 activity bar icon in Quick Start step 2
- [ ] Icon is sized at 18px (or close to it)
- [ ] Icon is aligned inline with text
- [ ] Icon is visually recognizable
- [ ] Icon has alt text "Kube9 Icon"
- [ ] If icon file missing, fallback text "[Kube9 Icon]" displays
- [ ] CSP allows data URI images
- [ ] Icon works in both light and dark themes
- [ ] No console errors if icon loads successfully
- [ ] Console warning logged if icon fails to load
- [ ] Screen reader announces icon with alt text

## Related Scenarios

From `welcome-screen.feature.md`:
- "Quick Start displays actual Kube9 activity bar icon"
- "Quick Start displays actual icons for all steps"
- "Icons are rendered with proper fallbacks"

## Notes

- This story focuses on the Kube9 activity bar icon (step 2 of Quick Start)
- Future enhancement: add more icons to other steps if needed
- The IconProvider class is reusable for adding icons elsewhere
- Base64 encoding adds ~33% overhead but ensures icons display even with restrictive CSP
- The icon paths in `getKube9ActivityBarIcon()` should be verified against actual project structure
- If the icon file doesn't exist in the expected location, it may need to be extracted from package.json icon or created

