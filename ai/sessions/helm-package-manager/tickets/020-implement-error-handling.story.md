---
story_id: 020-implement-error-handling
session_id: helm-package-manager
feature_id:
  - helm-package-manager-access
  - helm-repository-management
  - helm-chart-installation
  - helm-release-management
spec_id:
  - helm-cli-integration
status: pending
---

# Story: Implement Comprehensive Error Handling

## Objective

Add comprehensive error handling throughout the Helm Package Manager with user-friendly messages and recovery options.

## Context

Helm operations can fail for various reasons (CLI not installed, network issues, invalid input). Users need clear feedback and recovery paths. All features require robust error handling.

## Acceptance Criteria

- [ ] Detect Helm CLI not installed on extension activation
- [ ] Show user-friendly error messages for common failures
- [ ] Provide actionable suggestions in error messages
- [ ] Implement error boundaries in React components
- [ ] Handle network errors (repository unreachable)
- [ ] Handle authentication errors (if applicable)
- [ ] Add retry buttons for transient failures
- [ ] Log detailed errors for debugging
- [ ] Show different error UI for critical vs non-critical errors

## Implementation Notes

```typescript
// Error types
enum HelmErrorType {
  CLI_NOT_FOUND = 'CLI_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  RELEASE_EXISTS = 'RELEASE_EXISTS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

class HelmError extends Error {
  constructor(
    public type: HelmErrorType,
    message: string,
    public suggestion?: string,
    public retryable: boolean = false
  ) {
    super(message);
  }
}

// Error parser
function parseHelmError(stderr: string): HelmError {
  if (stderr.includes('not found') || stderr.includes('command not found')) {
    return new HelmError(
      HelmErrorType.CLI_NOT_FOUND,
      'Helm CLI is not installed or not in PATH',
      'Install Helm 3.x from https://helm.sh/docs/intro/install/',
      false
    );
  }
  
  if (stderr.includes('connection refused') || stderr.includes('timeout')) {
    return new HelmError(
      HelmErrorType.NETWORK_ERROR,
      'Cannot connect to repository',
      'Check your internet connection and try again',
      true
    );
  }
  
  if (stderr.includes('already exists')) {
    return new HelmError(
      HelmErrorType.RELEASE_EXISTS,
      'A release with this name already exists',
      'Choose a different name or uninstall the existing release',
      false
    );
  }
  
  if (stderr.includes('not found')) {
    return new HelmError(
      HelmErrorType.RESOURCE_NOT_FOUND,
      'Resource not found',
      'Ensure the chart or release exists and try again',
      false
    );
  }
  
  return new HelmError(
    HelmErrorType.UNKNOWN,
    stderr || 'An unknown error occurred',
    'Check the error details and try again',
    true
  );
}

// In HelmService
async executeCommand(args: string[]): Promise<string> {
  try {
    // ... spawn helm process
  } catch (error) {
    const helmError = parseHelmError(error.message);
    
    // Log for debugging
    console.error('[Helm CLI Error]', {
      args,
      type: helmError.type,
      message: helmError.message
    });
    
    throw helmError;
  }
}

// React error boundary
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React error:', error, errorInfo);
    vscode.postMessage({
      command: 'logError',
      error: error.message,
      stack: error.stack
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Error notification component
interface ErrorMessageProps {
  error: HelmError;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry, onDismiss }) => {
  return (
    <div className={`error-message ${error.type}`}>
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <strong>{error.message}</strong>
        {error.suggestion && <p className="error-suggestion">{error.suggestion}</p>}
      </div>
      <div className="error-actions">
        {error.retryable && onRetry && (
          <button onClick={onRetry}>Retry</button>
        )}
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/services/HelmService.ts` (error parsing)
- `src/webview/helm-package-manager/components/ErrorBoundary.tsx` (create new)
- `src/webview/helm-package-manager/components/ErrorMessage.tsx` (create new)
- Update all components to use error handling

## Dependencies

- Applies across all stories
- Should be integrated incrementally

## Estimated Time

30 minutes

