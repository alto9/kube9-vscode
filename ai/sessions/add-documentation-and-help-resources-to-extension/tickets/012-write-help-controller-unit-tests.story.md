---
story_id: 012-write-help-controller-unit-tests
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-commands
spec_id:
  - help-commands
status: pending
estimated_minutes: 25
---

# Write HelpController Unit Tests

## Objective

Write comprehensive unit tests for the HelpController class to verify URL construction, issue template generation, context mapping, and error handling.

## Context

Unit tests ensure the help system functions correctly and prevent regressions. Tests should mock VSCode APIs and verify behavior.

See:
- Feature: `ai/features/help/help-commands.feature.md`
- Spec: `ai/specs/help/help-commands.spec.md` (Testing section)

## Implementation

Create `src/test/suite/help/HelpController.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { HelpController } from '../../../help/HelpController';

suite('HelpController Test Suite', () => {
  let helpController: HelpController;
  let mockContext: vscode.ExtensionContext;
  
  setup(() => {
    mockContext = {
      subscriptions: [],
      extension: {
        packageJSON: { version: '1.0.0' }
      }
    } as any;
    
    helpController = new HelpController(mockContext);
  });
  
  test('should open documentation URL', async () => {
    const spy = sinon.spy(vscode.env, 'openExternal');
    await helpController['openDocumentation']();
    assert.ok(spy.calledWith(vscode.Uri.parse('https://alto9.github.io/kube9/')));
    spy.restore();
  });
  
  test('should build issue template with system info', () => {
    const template = helpController['buildIssueTemplate']();
    assert.ok(template.includes(process.platform));
    assert.ok(template.includes(vscode.version));
    assert.ok(template.includes('1.0.0')); // extension version
    assert.ok(template.includes(process.version));
    assert.ok(template.includes('**Describe the issue**'));
    assert.ok(template.includes('**Steps to reproduce**'));
    assert.ok(template.includes('**Expected behavior**'));
    assert.ok(template.includes('**Environment**'));
  });
  
  test('should map context to correct documentation URLs', async () => {
    const contexts = [
      { context: 'events-viewer', expected: 'https://alto9.github.io/kube9/features/events-viewer/' },
      { context: 'pod-logs', expected: 'https://alto9.github.io/kube9/features/pod-logs/' },
      { context: 'cluster-manager', expected: 'https://alto9.github.io/kube9/features/cluster-manager/' },
      { context: 'yaml-editor', expected: 'https://alto9.github.io/kube9/features/yaml-editor/' },
      { context: 'describe-webview', expected: 'https://alto9.github.io/kube9/features/describe-view/' }
    ];
    
    for (const { context, expected } of contexts) {
      const url = helpController['getContextualHelpUrl'](context);
      assert.strictEqual(url, expected);
    }
  });
  
  test('should default to homepage for unknown context', () => {
    const url = helpController['getContextualHelpUrl']('unknown-context');
    assert.strictEqual(url, 'https://alto9.github.io/kube9/');
  });
  
  test('should handle openUrl errors gracefully', async () => {
    const stub = sinon.stub(vscode.env, 'openExternal').resolves(false);
    const errorSpy = sinon.spy(vscode.window, 'showErrorMessage');
    
    await helpController['openUrl']('https://example.com');
    
    assert.ok(errorSpy.calledWith('Failed to open URL in browser. Please check your default browser settings.'));
    
    stub.restore();
    errorSpy.restore();
  });
  
  test('should register all help commands', () => {
    helpController.registerCommands();
    assert.strictEqual(mockContext.subscriptions.length, 3);
  });
});
```

## Files to Modify

- **CREATE**: `src/test/suite/help/HelpController.test.ts`

## Acceptance Criteria

- [ ] Test suite created for HelpController
- [ ] Tests verify documentation URL opening
- [ ] Tests verify issue template contains all system information
- [ ] Tests verify context to URL mapping for all contexts
- [ ] Tests verify unknown context defaults to homepage
- [ ] Tests verify error handling when URL fails to open
- [ ] Tests verify command registration
- [ ] All tests pass
- [ ] Code coverage > 80% for HelpController

## Testing Notes

Run tests with:
```bash
npm test
```

Verify all tests pass and check coverage report.

