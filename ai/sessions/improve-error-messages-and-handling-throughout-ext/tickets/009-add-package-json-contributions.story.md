---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
  - timeout-errors
spec_id:
  - error-handler-utility
  - timeout-configuration
story_id: 009-add-package-json-contributions
---

# Add package.json Configuration and Commands

## Objective

Add configuration settings, command definitions, and context menu contributions to package.json for error handling features.

## Files to Modify

- `package.json`

## Dependencies

- Story 008 (commands exist)

## Implementation

Add to package.json:

### 1. Configuration Settings
Add under `contributes.configuration.properties`:

```json
"kube9.timeout.connection": {
  "type": "number",
  "default": 10000,
  "description": "Connection timeout in milliseconds"
},
"kube9.timeout.apiRequest": {
  "type": "number",
  "default": 30000,
  "description": "API request timeout in milliseconds"
},
"kube9.errors.showDetails": {
  "type": "boolean",
  "default": false,
  "description": "Show technical error details in notifications"
},
"kube9.errors.throttleWindow": {
  "type": "number",
  "default": 5000,
  "description": "Error throttle window in milliseconds"
}
```

### 2. Commands
Add under `contributes.commands`:

```json
{
  "command": "kube9.retryFailedOperation",
  "title": "Retry",
  "icon": "$(refresh)"
},
{
  "command": "kube9.viewErrorDetails",
  "title": "View Error Details"
},
{
  "command": "kube9.copyErrorDetails",
  "title": "Copy Error Details"
}
```

### 3. Context Menus
Add under `contributes.menus.view/item/context`:

```json
{
  "command": "kube9.retryFailedOperation",
  "when": "view == kube9Tree && viewItem == error",
  "group": "inline@1"
},
{
  "command": "kube9.viewErrorDetails",
  "when": "view == kube9Tree && viewItem == error",
  "group": "error@1"
},
{
  "command": "kube9.copyErrorDetails",
  "when": "view == kube9Tree && viewItem == error",
  "group": "error@2"
}
```

Use the specifications from `error-handler-utility.spec.md` and `tree-view-error-display.spec.md`.

## Acceptance Criteria

- [ ] 4 timeout/error configuration settings added
- [ ] 3 error commands defined with titles and icons
- [ ] 3 context menu items added for error tree items
- [ ] Context menus use correct view and viewItem conditions
- [ ] Retry command has inline group and refresh icon
- [ ] View/Copy commands in 'error' group
- [ ] package.json validates successfully

## Estimated Time

15 minutes

