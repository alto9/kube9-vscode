---
story_id: 004-implement-kubectl-execution
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: completed
priority: high
estimated_minutes: 25
---

# Implement kubectl Apply Execution

## Objective

Implement the kubectl command execution logic that applies the YAML manifest to the cluster, with support for dry-run modes.

## Context

The extension already uses `execFileAsync` from `child_process` for kubectl commands (see `YAMLContentProvider.ts`, `ConfigurationCommands.ts`). This story follows the established pattern and adds the apply-specific command construction.

Key patterns from existing code:
- Use `execFileAsync` for async kubectl execution
- Set appropriate timeout (5000ms standard)
- Capture stdout and stderr
- Use `KubectlError.fromExecError()` for error handling

## Implementation Steps

1. Open `src/commands/applyYAML.ts`
2. Add imports:
   ```typescript
   import { execFile } from 'child_process';
   import { promisify } from 'util';
   import { KubectlError } from '../kubernetes/KubectlError';
   ```
3. Add `execFileAsync` constant
4. Implement `executeKubectlApply()` function:
   - Build command args based on mode (apply vs dry-run)
   - Execute with `execFileAsync`
   - Parse output for success/error patterns
   - Return structured result

## Files Affected

- `src/commands/applyYAML.ts` - Add kubectl execution logic

## Code Structure

```typescript
const execFileAsync = promisify(execFile);
const KUBECTL_TIMEOUT_MS = 10000; // Longer timeout for apply operations

async function executeKubectlApply(
  filePath: string,
  mode: ApplyMode
): Promise<ApplyYAMLResult> {
  // Build command arguments
  const args = ['apply', '-f', filePath];
  
  if (mode === 'dry-run-server') {
    args.push('--dry-run=server');
  } else if (mode === 'dry-run-client') {
    args.push('--dry-run=client');
  }
  
  try {
    const { stdout, stderr } = await execFileAsync('kubectl', args, {
      timeout: KUBECTL_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      env: { ...process.env }
    });
    
    // Parse resources from output
    const resourcesAffected = parseApplyOutput(stdout);
    
    return {
      success: true,
      output: stdout,
      resourcesAffected
    };
  } catch (error) {
    const kubectlError = KubectlError.fromExecError(error, 'apply');
    throw kubectlError;
  }
}

function parseApplyOutput(output: string): string[] {
  // Parse lines like "deployment.apps/my-app created"
  const lines = output.trim().split('\n');
  return lines.filter(line => line.length > 0);
}
```

## Acceptance Criteria

- [x] kubectl apply command is constructed correctly for all three modes
- [x] Dry-run flags are added when appropriate
- [x] Command timeout is set (10 seconds for apply operations)
- [x] stdout is captured and parsed
- [x] stderr is captured for error handling
- [x] KubectlError is used for structured error handling
- [x] Multi-document YAML files are handled (kubectl native support)

## Dependencies

- Story 003 (mode selection must be complete)

