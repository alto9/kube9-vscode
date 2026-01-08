# Contributing to kube9-vscode

Thank you for your interest in contributing to kube9! We welcome contributions from the community and are grateful for your help in making Kubernetes management better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Questions?](#questions)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js 22+** (LTS recommended) - Use [NVM](https://github.com/nvm-sh/nvm) to manage versions
- **VS Code 1.80.0+** - For developing and testing the extension
- **kubectl** - Configured with access to a Kubernetes cluster for testing
- **npm** or **yarn** - Package manager
- **Git** - Version control

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/alto9/kube9-vscode.git
   cd kube9-vscode
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile TypeScript:**
   ```bash
   npm run build
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

5. **Run in Extension Development Host:**
   - Press `F5` in VS Code
   - This opens a new VS Code window with the extension loaded
   - Use this window to test your changes

6. **Watch mode for development:**
   ```bash
   npm run watch
   ```
   This will automatically recompile when you make changes.

## How to Contribute

### Reporting Bugs

Before reporting a bug, please:
- Check existing [GitHub Issues](https://github.com/alto9/kube9-vscode/issues) to see if it's already reported
- Try to reproduce the issue with the latest version
- Check the [troubleshooting guide](https://alto9.github.io/) if available

When reporting a bug, use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:
- VS Code version
- Extension version
- Kubernetes version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs (check VS Code Output panel)

### Suggesting Features

We welcome feature suggestions! Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) and include:
- Problem statement (what problem does this solve?)
- Proposed solution
- Use cases
- Alternatives considered

### Contributing Code

1. **Find an issue to work on:**
   - Check [GitHub Issues](https://github.com/alto9/kube9-vscode/issues)
   - Look for issues labeled `good first issue` if you're new
   - Comment on the issue to let others know you're working on it

2. **Create a branch:**
   ```bash
   git checkout -b feature/my-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes:**
   - Write clean, maintainable code
   - Follow the [code style guidelines](#code-style)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes:**
   ```bash
   npm run lint    # Check code style
   npm test        # Run tests
   ```

5. **Commit your changes:**
   ```bash
   git commit -m "feat: add port forwarding support"
   ```
   Use [conventional commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Test changes
   - `chore:` - Build process or auxiliary tool changes

6. **Push and create a Pull Request:**
   ```bash
   git push origin feature/my-feature-name
   ```
   Then create a PR on GitHub using the [pull request template](.github/pull_request_template.md).

   **Note:** A pre-push hook will automatically run `npm test` and `npm run build` before allowing the push. If either fails, the push will be blocked. This ensures code quality and prevents broken builds from being pushed. To bypass the hook in emergency situations (not recommended), you can use `git push --no-verify`.

## Development Workflow

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality through git hooks:

**Pre-push Hook:**
- Automatically runs before every `git push`
- Executes `npm test` to ensure all tests pass
- Executes `npm run build` to ensure the project builds successfully
- Blocks the push if either command fails

**Setup:**
Git hooks are automatically installed when you run `npm install` (via the `prepare` script).

**Bypassing Hooks:**
In emergency situations, you can bypass the hooks with:
```bash
git push --no-verify
```
⚠️ **Warning:** This is strongly discouraged as it can introduce broken code into the repository.

### Project Structure

```
kube9-vscode/
├── src/                    # TypeScript source code
│   ├── extension.ts        # Main entry point
│   ├── commands/           # Command implementations
│   ├── tree/               # Tree view providers
│   ├── webview/            # Webview panels
│   ├── yaml/               # YAML editor functionality
│   └── ...
├── ai/                     # Forge design documentation
│   ├── features/           # Feature definitions
│   ├── specs/             # Technical specifications
│   └── ...
├── dist/                   # Compiled output (gitignored)
└── tests/                  # Test files
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch  # If available

# Run specific test file
npm test -- --grep "ClusterTreeProvider"
```

### Debugging

1. **Set breakpoints** in your TypeScript source files
2. **Press F5** to launch Extension Development Host
3. **Open the debug console** in VS Code to see logs
4. **Check Output panel** - Select "kube9" from dropdown to see extension logs

### Testing with Kubernetes

You'll need a Kubernetes cluster for testing. Options:
- **minikube** - Local development cluster
- **kind** - Kubernetes in Docker
- **Docker Desktop** - Built-in Kubernetes
- **Cloud cluster** - GKE, EKS, AKS

Make sure your `~/.kube/config` is configured correctly.

## Code Style

### TypeScript Guidelines

- Use **TypeScript strict mode** (already configured)
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for public functions
- Use **const** for immutable values, **let** for mutable
- Avoid **any** - use proper types or `unknown`

### Naming Conventions

- **Classes**: PascalCase (`ClusterTreeProvider`)
- **Functions/Variables**: camelCase (`getClusterInfo`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: kebab-case (`cluster-tree-provider.ts`)

### Code Organization

- **One class/interface per file** (when possible)
- **Group related functionality** in directories
- **Keep functions focused** - single responsibility
- **Extract complex logic** into separate functions
- **Add JSDoc comments** for public APIs

### Example

```typescript
/**
 * Gets cluster information from kubeconfig.
 * @param contextName - The kubectl context name
 * @returns Cluster info including version and node count
 * @throws Error if cluster is unreachable
 */
export async function getClusterInfo(contextName: string): Promise<ClusterInfo> {
  // Implementation
}
```

### ESLint

We use ESLint for code quality. Run:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

## Testing

### Writing Tests

- Place test files next to source files: `src/tree/ClusterTreeProvider.test.ts`
- Use **Mocha** test framework (already configured)
- Use **assert** for assertions
- Test both success and error cases
- Mock external dependencies (Kubernetes API, VS Code API)

### Test Structure

```typescript
import { assert } from 'chai';
import { describe, it } from 'mocha';
import { ClusterTreeProvider } from './ClusterTreeProvider';

describe('ClusterTreeProvider', () => {
  it('should refresh tree view when cluster changes', async () => {
    // Arrange
    const provider = new ClusterTreeProvider();
    
    // Act
    await provider.refresh();
    
    // Assert
    assert.isTrue(provider.isRefreshed);
  });
});
```

### Integration Tests

For integration tests that require a real Kubernetes cluster:
- Place in `tests/integration/`
- Document cluster requirements
- Use test fixtures for consistent setup

## Submitting Changes

### Pull Request Process

1. **Update your branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/my-feature
   git rebase main
   ```

2. **Ensure all checks pass:**
   - Tests pass: `npm test`
   - Linter passes: `npm run lint`
   - Build succeeds: `npm run build`

3. **Create Pull Request:**
   - Use the PR template
   - Reference related issues: `Fixes #123`
   - Add screenshots/GIFs for UI changes
   - Describe testing done

4. **Respond to feedback:**
   - Address review comments promptly
   - Make requested changes
   - Re-request review when ready

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Commit messages follow conventional commits
- [ ] PR description is clear and complete

## Design Documentation

This project uses [Forge](https://github.com/alto9/forge) for structured context engineering:

- **Features** (`ai/features/`) - Feature definitions with Gherkin scenarios
- **Specs** (`ai/specs/`) - Technical specifications
- **Sessions** (`ai/sessions/`) - Design session tracking
- **Contexts** (`ai/contexts/`) - Implementation guidance

When implementing features:
1. Check `ai/features/` for feature definitions
2. Review `ai/specs/` for technical details
3. Follow patterns in existing code
4. Update documentation if needed

## Questions?

- **GitHub Discussions** - Ask questions, share ideas
- **GitHub Issues** - Report bugs, request features
- **Discord** - Chat with the community (if available)

## Thank You!

Your contributions make kube9 better for everyone. We appreciate your time and effort!

---

**Happy coding! 🚀**

