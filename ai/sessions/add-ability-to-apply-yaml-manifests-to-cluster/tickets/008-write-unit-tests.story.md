---
story_id: 008-write-unit-tests
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: pending
priority: medium
estimated_minutes: 30
---

# Write Unit Tests for Apply YAML Command

## Objective

Create unit tests for the `applyYAML` command handler to verify input resolution, mode selection, and error handling logic.

## Context

The codebase uses Mocha for testing with VS Code API mocks in `src/test/mocks/vscode.ts`. Tests should verify:
- Input resolution priority (URI > active editor > file picker)
- Correct kubectl command construction for each mode
- Output parsing for resource extraction
- Error handling for various failure cases

## Implementation Steps

1. Create new file `src/test/suite/commands/applyYAML.test.ts`
2. Import test utilities and mocks
3. Write tests for:
   - Input resolution with URI parameter
   - Input resolution with active editor
   - Input resolution with file picker
   - Mode selection quick pick
   - kubectl command construction for apply mode
   - kubectl command construction for dry-run-server mode
   - kubectl command construction for dry-run-client mode
   - Output parsing for single resource
   - Output parsing for multiple resources
   - Error handling for kubectl failures

## Files Affected

- `src/test/suite/commands/applyYAML.test.ts` - New test file (create)

## Test Cases

```typescript
suite('applyYAML Command Tests', () => {
  suite('Input Resolution', () => {
    test('uses URI parameter when provided', async () => { });
    test('uses active editor when no URI and YAML file open', async () => { });
    test('shows file picker when no URI and no YAML file', async () => { });
    test('cancels when file picker dismissed', async () => { });
  });
  
  suite('Mode Selection', () => {
    test('shows quick pick with three options', async () => { });
    test('cancels when quick pick dismissed', async () => { });
  });
  
  suite('kubectl Execution', () => {
    test('executes apply without dry-run flag', async () => { });
    test('executes with --dry-run=server for server mode', async () => { });
    test('executes with --dry-run=client for client mode', async () => { });
  });
  
  suite('Output Parsing', () => {
    test('parses single resource output', async () => { });
    test('parses multi-resource output', async () => { });
  });
  
  suite('Error Handling', () => {
    test('shows error notification on kubectl failure', async () => { });
    test('logs error to output channel', async () => { });
  });
});
```

## Acceptance Criteria

- [ ] Test file created at `src/test/suite/commands/applyYAML.test.ts`
- [ ] Tests cover input resolution logic
- [ ] Tests cover mode selection
- [ ] Tests cover kubectl command construction
- [ ] Tests cover output parsing
- [ ] Tests cover error handling
- [ ] All tests pass with `npm test`

## Dependencies

- Story 007 (full implementation must be complete before testing)

