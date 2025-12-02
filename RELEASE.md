# Release Process

kube9 uses automated versioning and publishing based on [Conventional Commits](https://www.conventionalcommits.org/).

## Pre-Publish Checklist

Before your first release, verify the following are configured:

### Package Configuration

**VSCode Extension (`package.json`):**
- ✅ `license` field present (MIT)
- ✅ `author` field present
- ✅ `keywords` array present for marketplace discoverability
- ✅ `categories` set appropriately
- ✅ `galleryBanner` configured for branding
- ✅ `bugs` and `homepage` URLs present
- ✅ `publisher` exists on marketplace (verify at https://marketplace.visualstudio.com/manage/publishers/alto9)
- ⚠️ `icon` field (optional but recommended - 128x128 PNG at root or media directory)

### GitHub Secrets

- ✅ `VSCE_PAT` configured in GitHub repository secrets
- ✅ `GITHUB_TOKEN` (automatically provided by GitHub Actions)

### Local Testing

Before pushing to main, test locally:

```bash
# Test VSCode extension packaging
npm run package
# Check the generated .vsix file

# Test semantic-release dry-run
npm run release -- --dry-run
```

## Automated Release Process

When you merge commits to the `main` branch, the release workflow automatically:

1. Analyzes commit messages to determine the next version
2. Updates `package.json` with the new version
3. Generates/updates `CHANGELOG.md`
4. Creates a git tag
5. Publishes the VSCode extension to the marketplace
6. Attaches the `.vsix` file to the GitHub release

## How It Works

### Commit Message Analysis

The system uses semantic-release to analyze commit messages and determine version bumps:

- **feat**: New feature → Minor version bump (0.1.0 → 0.2.0)
- **fix**: Bug fix → Patch version bump (0.1.0 → 0.1.1)
- **feat!** or **BREAKING CHANGE**: Breaking change → Major version bump (0.1.0 → 1.0.0)
- **docs**, **style**, **refactor**, **test**, **chore**, **ci**, **build**: No version bump

### Release Workflow

The `.github/workflows/release.yml` workflow runs on every push to `main`:

1. **Build**: Compiles the extension
2. **Test**: Runs unit tests
3. **Package extension (pre-release)**: Creates initial `.vsix` file with current version
4. **Release**: Runs semantic-release which:
   - Analyzes commits since last release
   - Determines next version
   - Updates version in `package.json`
   - Updates `CHANGELOG.md`
   - Creates a git tag and GitHub release with `.vsix` attached
5. **Re-package extension (post-release)**: Creates `.vsix` file with the new version
6. **Publish**: Publishes extension to marketplace using the versioned `.vsix` file

## Required Secrets

The following secrets are configured in GitHub repository settings:

### VSCE_PAT
- **Purpose**: Publishes VSCode extension to marketplace
- **Status**: ✅ Configured
- **How to get** (if needed):
  1. Go to https://dev.azure.com/YOUR_ORG/_usersSettings/tokens
  2. Create a new token with "Marketplace → Manage" scope (full access)
  3. Copy the token
  4. In GitHub repo: Settings → Secrets and variables → Actions → New repository secret
  5. Name: `VSCE_PAT`, Value: (paste token)

### GITHUB_TOKEN
- **Purpose**: Creates releases and tags (automatically provided by GitHub Actions)
- **Status**: ✅ Automatic
- **Note**: No action needed, this is automatically available in all workflows

## Testing Releases

You can test what would be released without actually publishing:

```bash
npm run release -- --dry-run
```

This shows:
- What version would be released
- Which commits would be included
- What would be published

## Manual Release (If Needed)

If you need to manually trigger a release or skip the automated process:

```bash
# Set version manually (not recommended)
npm version patch|minor|major

# Or use semantic-release manually
npm run release
```

## Skipping Releases

To skip a release, include `[skip release]` or `[no release]` in your commit message:

```bash
git commit -m "docs: update README [skip release]"
```

## Troubleshooting

### Release didn't trigger
- Check that commits use conventional commit format (`feat:`, `fix:`, etc.)
- Verify you're pushing to `main` or `master` branch
- Check GitHub Actions logs for errors
- Ensure at least one commit requires a version bump (not just `docs:` or `chore:`)

### Version not updating
- Ensure commit messages follow conventional format
- Check that semantic-release can access the repository
- Look for errors in the "Run semantic-release" step

### VSCode extension not publishing
- Verify `VSCE_PAT` secret is configured and has correct permissions
- Check that the extension builds successfully in the "Build" step
- Verify the `.vsix` file was created in "Re-package extension" step
- Review workflow logs for publishing errors
- Check that `vsce publish` command can find the `.vsix` file

### .vsix file not attached to GitHub release
- Ensure the `.vsix` file exists before semantic-release runs
- Check the path pattern in `.releaserc.json` matches the actual file
- Verify the "Package extension (pre-release)" step completed successfully

## Examples

### Patch Release (Bug Fix)
```bash
git commit -m "fix(ui): resolve cluster view refresh issue"
git push origin main
# → Releases 0.1.0 → 0.1.1
```

### Minor Release (New Feature)
```bash
git commit -m "feat(dashboard): add namespace resource metrics"
git push origin main
# → Releases 0.1.0 → 0.2.0
```

### Major Release (Breaking Change)
```bash
git commit -m "feat!: redesign cluster connection API

BREAKING CHANGE: Cluster connection method has changed"
git push origin main
# → Releases 0.1.0 → 1.0.0
```

## First-Time Publishing Verification

Before the first publish to marketplace:

1. **Verify publisher**: Ensure publisher "alto9" exists at https://marketplace.visualstudio.com/manage/publishers/alto9
2. **Test local packaging**: Run `npm run package` to create a `.vsix` file
3. **Install locally**: Test the `.vsix` file by installing it in VSCode
4. **Check VSCE_PAT permissions**: Ensure the token has "Marketplace (Manage)" scope
5. **Consider icon**: Add a 128x128 PNG icon for better marketplace visibility (optional but recommended)

### Repository Configuration

1. **GitHub secrets configured**: `VSCE_PAT` in repository settings
2. **Branch protection**: Ensure `main`/`master` branch is protected
3. **Workflow permissions**: Verify GitHub Actions has permission to create releases and push tags

## Configuration Files

- `.releaserc.json`: Semantic-release configuration
- `.github/workflows/release.yml`: GitHub Actions workflow
- `CHANGELOG.md`: Auto-generated changelog

