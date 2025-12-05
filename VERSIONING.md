# Automatic Versioning

This repository uses automatic version bumping on every merge to `main`.

## How It Works

- **Automatic**: Version is bumped automatically when changes are merged to `main`
- **Semantic Versioning**: Follows semver (major.minor.patch)
- **Git Tags**: Creates a git tag for each version (e.g., `v0.0.2`)

## Version Bump Rules

The version bump type is determined by keywords in your commit messages:

### Patch (0.0.x) - Default
- **Default behavior** if no keyword is found
- Use for: bug fixes, minor updates, documentation
- Example: `fix: resolve connection timeout`

### Minor (0.x.0)
- Include `#minor`, `#feature`, or `feat:` in commit message
- Use for: new features, non-breaking changes
- Example: `feat: add event viewer interface #minor`

### Major (x.0.0)
- Include `#major` or `BREAKING CHANGE:` in commit message
- Use for: breaking changes, major rewrites
- Example: `feat: migrate to new dashboard API #major`

## Skipping Version Bump

To skip the automatic version bump, include `[skip ci]` or `[ci skip]` in your commit message:

```
git commit -m "docs: update README [skip ci]"
```

## Current Version

The current version is always visible in:
- `package.json` - `version` field
- Git tags - `git tag -l`
- GitHub Releases - https://github.com/alto9/kube9-vscode/releases

## Examples

```bash
# Patch bump (0.0.1 → 0.0.2)
git commit -m "fix: correct cluster refresh logic"

# Minor bump (0.0.1 → 0.1.0)
git commit -m "feat: add ArgoCD integration #minor"

# Major bump (0.0.1 → 1.0.0)
git commit -m "feat: complete UI redesign #major"

# Skip bump
git commit -m "docs: update contribution guide [skip ci]"
```











