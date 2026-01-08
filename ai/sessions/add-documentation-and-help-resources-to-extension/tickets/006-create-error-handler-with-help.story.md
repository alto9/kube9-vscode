---
story_id: 006-create-error-handler-with-help
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: completed
estimated_minutes: 25
---

# Create ErrorHandler with Help Links

## Objective

Create an ErrorHandler class that enriches error messages with "Learn More" and "Report Issue" buttons linking to contextual documentation.

## Context

Error messages with help links guide users to solutions when they encounter problems. Each error code maps to specific troubleshooting documentation.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios: Error message includes "Learn More" link, Error "Learn More" opens troubleshooting documentation, and all error-specific scenarios)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Error Message Integration section)

## Implementation

Create `src/errors/ErrorHandler.ts`:

```typescript
import * as vscode from 'vscode';

export class ErrorHandler {
  private static readonly ERROR_URL_MAP: Record<string, string> = {
    'KUBECONFIG_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/kubeconfig/',
    'CLUSTER_UNREACHABLE': 'https://alto9.github.io/kube9/troubleshooting/connection/',
    'RBAC_PERMISSION_DENIED': 'https://alto9.github.io/kube9/troubleshooting/permissions/',
    'RESOURCE_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/resources/',
    'OPERATOR_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/operator/',
    'TIMEOUT': 'https://alto9.github.io/kube9/troubleshooting/timeout/'
  };
  
  public static async showErrorWithHelp(
    message: string,
    errorCode: string,
    helpUrl?: string
  ): Promise<void> {
    const learnMore = 'Learn More';
    const reportIssue = 'Report Issue';
    
    const action = await vscode.window.showErrorMessage(
      `${message} (Error: ${errorCode})`,
      learnMore,
      reportIssue
    );
    
    if (action === learnMore) {
      const url = helpUrl || this.getErrorHelpUrl(errorCode);
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } else if (action === reportIssue) {
      await vscode.commands.executeCommand('kube9.reportIssue');
    }
  }
  
  private static getErrorHelpUrl(errorCode: string): string {
    return this.ERROR_URL_MAP[errorCode] || 'https://alto9.github.io/kube9/troubleshooting/';
  }
}
```

## Files to Modify

- **CREATE**: `src/errors/ErrorHandler.ts`

## Acceptance Criteria

- [ ] ErrorHandler class created with static methods
- [ ] ERROR_URL_MAP contains all error codes:
  - KUBECONFIG_NOT_FOUND
  - CLUSTER_UNREACHABLE
  - RBAC_PERMISSION_DENIED
  - RESOURCE_NOT_FOUND
  - OPERATOR_NOT_FOUND
  - TIMEOUT
- [ ] showErrorWithHelp() displays error with code
- [ ] Error message includes "Learn More" and "Report Issue" buttons
- [ ] "Learn More" opens appropriate troubleshooting URL
- [ ] "Report Issue" runs kube9.reportIssue command
- [ ] Unknown error codes default to general troubleshooting page
- [ ] Custom helpUrl parameter overrides default mapping

## Testing Notes

Unit tests to verify:
- Error message format: "{message} (Error: {code})"
- Correct URL for each error code
- Fallback to general troubleshooting for unknown codes
- Custom helpUrl parameter works

Manual testing:
- Call with known error code - correct documentation opens
- Call with unknown error code - general troubleshooting opens
- "Report Issue" button runs report command

