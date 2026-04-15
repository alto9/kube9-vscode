# Release Process

kube9 uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://semantic-release.gitbook.io/) to compute versions, update the changelog, create git tags and GitHub releases, and publish the VSIX. **Publishing is manual:** merging to `main` runs CI only; a maintainer runs the Release workflow when ready to ship.

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

### Maintainer checklist before clicking "Run workflow"

- Confirm the **latest commit on the branch you are releasing** has a **green CI** run (or rely on the Release workflow’s own build and test steps).
- Confirm repository **Actions** allows **workflow_dispatch** for this workflow (org/repo policy).
- Confirm these **secrets** exist for Actions (manual runs use the same secrets as before):
  - `GH_APP_ID` and `GH_APP_PRIVATE_KEY` (GitHub App used so semantic-release can push version commits and tags)
  - `VSCE_PAT` (VS Code Marketplace)
  - `OVSX_PAT` (Open VSX; optional if you skip that step when unset)
  - `SLACK_BOT_TOKEN` (Slack notification; step is best-effort if missing)

### GitHub Secrets

- ✅ `VSCE_PAT` configured in GitHub repository secrets
- ✅ `GITHUB_TOKEN` (automatically provided by GitHub Actions; semantic-release uses the GitHub App token from the workflow step)

### Local Testing

Before pushing to main, test locally:

```bash
# Test VSCode extension packaging
npm run package
# Check the generated .vsix file

# Test semantic-release dry-run
npm run release -- --dry-run
```

## Manual release process

Releases are **not** triggered by merges. When you want to publish:

1. Merge work to `main` (or `master`) using conventional commits as usual.
2. In GitHub: **Actions** → **Release** → **Run workflow**.
3. Choose the **branch** to run from (typically `main`). That branch is what gets checked out, versioned, tagged, and published.

The workflow then:

1. Builds and tests the extension
2. Runs **semantic-release**, which:
   - Analyzes commit messages since the last release
   - Determines the next version
   - Updates `package.json` and `package-lock.json`
   - Updates `CHANGELOG.md`
   - Creates a git tag and GitHub release (with VSIX asset per `.releaserc.json`)
3. Re-packages the VSIX at the new version
4. Publishes to the VS Code Marketplace and Open VSX

If there are no releasable commits, semantic-release exits without a new version; nothing is published to marketplaces.

## How It Works

### Commit Message Analysis

semantic-release analyzes commits (see `.releaserc.json` for exact rules). In general:

- **feat**: New feature → Minor version bump (0.1.0 → 0.2.0)
- **fix**: Bug fix → Patch version bump (0.1.0 → 0.1.1)
- **feat!** or **BREAKING CHANGE**: Breaking change → Major version bump (0.1.0 → 1.0.0)
- **chore**, **ci**, **docs** (per this repo’s `releaseRules`): Patch bump
- **style**, **refactor**, **test**, **build**: Depends on analyzer defaults and custom rules; see `.releaserc.json`

### Release Workflow

The [.github/workflows/release.yml](.github/workflows/release.yml) workflow runs **only** when started manually:

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
6. **Publish**: Publishes extension to marketplaces using the versioned `.vsix` file

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
- **Purpose**: Used for steps that call `gh` with the default token; semantic-release uses the GitHub App installation token from the workflow
- **Status**: ✅ Automatic
- **Note**: The workflow generates a GitHub App token for semantic-release so it can push commits and tags

## Testing Releases

You can test what would be released without actually publishing:

```bash
npm run release -- --dry-run
```

This shows:
- What version would be released
- Which commits would be included
- What would be published

## Local semantic-release (advanced)

To run semantic-release locally (requires appropriate credentials and a clean git state):

```bash
npm run release
```

Avoid ad-hoc `npm version` unless you have a specific reason; the normal path is the Actions workflow.

## Skipping Releases

To skip a release, include `[skip release]` or `[no release]` in your commit message:

```bash
git commit -m "docs: update README [skip release]"
```

## Troubleshooting

### Release did not publish a new version
- semantic-release found nothing to release (no version-worthy commits since the last tag). Use `npm run release:dry-run` locally to preview.
- Verify commits use conventional commit format where required (`feat:`, `fix:`, etc.)
- Look for errors in the "Run semantic-release" step

### Version not updating
- Ensure commit messages follow conventional format and `.releaserc.json` rules
- Check that semantic-release can push to the repository (GitHub App token and permissions)
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

### Patch release (after bug fix merged)

```bash
git commit -m "fix(ui): resolve cluster view refresh issue"
git push origin main
# After CI passes, run the Release workflow in Actions → Release → Run workflow (branch: main)
# → e.g. 0.1.0 → 0.1.1
```

### Minor release (new feature)

```bash
git commit -m "feat(dashboard): add namespace resource metrics"
git push origin main
# Run Release workflow when ready → e.g. 0.1.0 → 0.2.0
```

### Major release (breaking change)

```bash
git commit -m "feat!: redesign cluster connection API

BREAKING CHANGE: Cluster connection method has changed"
git push origin main
# Run Release workflow when ready → e.g. 0.1.0 → 1.0.0
```

## First-Time Publishing Verification

Before the first publish to marketplace:

1. **Verify publisher**: Ensure publisher "alto9" exists at https://marketplace.visualstudio.com/manage/publishers/alto9
2. **Test local packaging**: Run `npm run package` to create a `.vsix` file
3. **Install locally**: Test the `.vsix` file by installing it in VSCode
4. **Check VSCE_PAT permissions**: Ensure the token has "Marketplace (Manage)" scope
5. **Consider icon**: Add a 128x128 PNG icon for better marketplace visibility (optional but recommended)

### Repository Configuration

1. **GitHub secrets configured**: `VSCE_PAT`, GitHub App secrets, and others listed above
2. **Branch protection**: Ensure `main`/`master` branch is protected as appropriate
3. **Workflow permissions**: Verify GitHub Actions has permission to create releases; semantic-release uses the GitHub App for pushes

## Configuration Files

- `.releaserc.json`: Semantic-release configuration
- `.github/workflows/release.yml`: GitHub Actions workflow (manual dispatch)
- `CHANGELOG.md`: Auto-generated changelog
