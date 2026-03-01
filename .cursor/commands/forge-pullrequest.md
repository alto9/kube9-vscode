<!-- forge-hash: 862d6f90e7956e54e46093ad7898faaf58f2310f8584de247b4f595de088b857 -->

# Forge Pull Request

This command helps you create a pull request for the current branch with conventional commit validation and GitHub integration.

## Prerequisites

- You must be on a feature branch (not main/master/develop)
- You must have commits to create a PR for
- The branch must be pushed to remote (use `forge-push` first if needed)
- GitHub repository must be configured

## What This Command Does

1. **Branch Validation**: Ensures you're on a feature branch (not main/master/develop)
2. **Conventional Commit Validation**: Validates all commits follow Conventional Commits specification
3. **Base Branch Detection**: Determines the appropriate base branch (main/master/develop)
4. **Commit Analysis**: Reviews commit messages to ensure they follow conventional format
5. **PR Creation**: Creates a pull request using GitHub MCP (preferred) or GH CLI (fallback)
6. **PR Details**: Generates PR title and description from commit messages
7. **Verification**: Confirms PR was created successfully

## Conventional Commit Validation

**CRITICAL**: All commits must follow Conventional Commits specification before creating a PR.

### Valid Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Required Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI/CD configuration
- `chore`: Other changes that don't modify src or test files

### Validation Rules

1. **Type is required**: First word must be a valid type
2. **Scope is optional**: Can be in parentheses after type
3. **Subject is required**: Must be present after type/scope
4. **Subject format**: 
   - Use imperative mood ("add" not "added" or "adds")
   - Don't capitalize first letter
   - No period at the end
   - Maximum 72 characters
5. **Body is optional**: Can provide additional context
6. **Footer is optional**: Can reference issues (e.g., "Closes #123")

### Invalid Commit Examples

❌ `update readme` - Missing type
❌ `feat: Update README` - Capitalized subject
❌ `feat: update readme.` - Period at end
❌ `feat update readme` - Missing colon
❌ `feature: add new button` - Invalid type (should be `feat`)

### Valid Commit Examples

✅ `feat: add user authentication`
✅ `fix(api): resolve timeout issue`
✅ `docs: update installation guide`
✅ `refactor(utils): simplify error handling`
✅ `feat(auth): add login functionality\n\nImplements OAuth2 flow for user authentication`

## Workflow

### Step 1: Branch Safety Check
- Check current branch with `git rev-parse --abbrev-ref HEAD`
- If on main/master/develop, **STOP** and warn the user
- Only proceed on feature branches

### Step 2: Verify Branch is Pushed
- Check if branch exists on remote with `git ls-remote --heads origin <branch>`
- If branch not on remote, prompt user to push first (use `forge-push`)
- **DO NOT** create PR for unpushed branches

### Step 3: Determine Base Branch
- Check default branch with `git symbolic-ref refs/remotes/origin/HEAD`
- Common defaults: `main`, `master`, `develop`
- Use detected default branch as base
- If detection fails, prompt user for base branch

### Step 4: Validate Conventional Commits
- Get commits between base and current branch: `git log <base>..HEAD --oneline`
- For each commit, validate the commit message format:
  - Extract commit message with `git log -1 --format=%B <commit-sha>`
  - Check if it matches conventional commit pattern
  - Validate type is in allowed list
  - Validate subject format (imperative, lowercase, no period, max 72 chars)
- **If any commit fails validation**: 
  - List all invalid commits
  - **STOP** and instruct user to fix commits (use `git commit --amend` or `git rebase -i`)
  - **DO NOT** create PR with invalid commits

### Step 5: Generate PR Details
- **Title**: Use the most recent commit's subject (or first commit if multiple)
- **Description**: 
  - List all commits with their types and subjects
  - Group by type (Features, Fixes, Docs, etc.)
  - Include any commit bodies if present
  - Format as markdown

### Step 6: Create Pull Request

#### Preferred: GitHub MCP
1. **Check for GitHub MCP**: Verify `mcp_github_create_pull_request` tool is available
2. **Get repository info**: Extract owner/repo from `git remote get-url origin`
3. **Call MCP tool**: Use `mcp_github_create_pull_request` with:
   - `owner`: Repository owner
   - `repo`: Repository name
   - `head`: Current branch name
   - `base`: Base branch (main/master/develop)
   - `title`: Generated PR title
   - `body`: Generated PR description
4. **Handle MCP response**: Extract PR URL and number from response

#### Fallback: GitHub CLI
1. **Check for GH CLI**: Verify `gh` command is available (`gh --version`)
2. **Authenticate check**: Verify `gh auth status` shows authenticated
3. **Create PR**: Execute `gh pr create --base <base> --head <head> --title "<title>" --body "<body>"`
4. **Parse output**: Extract PR URL from command output

#### Error Handling
- If MCP fails: Fall back to GH CLI
- If GH CLI fails: Show error and provide manual instructions
- If both fail: Provide manual PR creation steps

### Step 7: Post-Creation Verification
- Verify PR was created successfully
- Display PR URL and number
- Show PR details (title, base branch, head branch)
- Provide next steps (review, add reviewers, etc.)

## Important Guidelines

### Conventional Commit Enforcement
- **STRICT**: All commits MUST follow conventional commit format
- **No exceptions**: Invalid commits will block PR creation
- **Fix before PR**: Use `git commit --amend` or `git rebase -i` to fix commits
- **Validation is mandatory**: Cannot skip or bypass validation

### Branch Safety
- **NEVER create PR from main/master/develop**: Must be on feature branch
- **Push before PR**: Branch must exist on remote before creating PR
- **Base branch**: Always use main/master/develop as base, never feature branches

### GitHub Integration Priority
1. **First choice**: GitHub MCP (`mcp_github_create_pull_request`)
2. **Second choice**: GitHub CLI (`gh pr create`)
3. **Last resort**: Manual instructions for user

### PR Title and Description
- **Title**: Should be clear and descriptive, based on most significant commit
- **Description**: Should list all commits grouped by type
- **Format**: Use markdown for better readability
- **Context**: Include relevant information from commit bodies

## Usage

1. Use the `forge-pullrequest` command in Cursor
2. The AI will:
   - Verify you're on a feature branch
   - Check that branch is pushed to remote
   - Validate all commits follow conventional format
   - Determine the base branch
   - Generate PR title and description
   - Create PR using GitHub MCP (preferred) or GH CLI (fallback)
   - Verify PR was created successfully
3. Review the PR details
4. Add reviewers, labels, or make changes as needed

## Error Scenarios

### Invalid Commits Detected
```
Error: Found commits that don't follow Conventional Commits:
- abc1234: update readme (missing type)
- def5678: feat: Add feature (capitalized subject)

Please fix these commits before creating a PR:
1. Use `git commit --amend` for the last commit
2. Use `git rebase -i <base>` to fix multiple commits
```

### Branch Not Pushed
```
Error: Branch 'feature/xyz' is not pushed to remote.

Please push the branch first:
1. Use `forge-push` command to push safely
2. Then run `forge-pullrequest` again
```

### On Main Branch
```
Error: Cannot create PR from main branch.

Please switch to a feature branch:
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Push your changes: `forge-push`
3. Create PR: `forge-pullrequest`
```

### GitHub MCP Not Available
```
Warning: GitHub MCP not available, falling back to GitHub CLI.

Attempting to create PR with `gh pr create`...
```

### Both MCP and CLI Unavailable
```
Error: Neither GitHub MCP nor GitHub CLI is available.

Please create PR manually:
1. Go to: https://github.com/<owner>/<repo>/compare/<base>...<head>
2. Fill in PR title and description
3. Click "Create Pull Request"
```

## Goal

The goal of forge-pullrequest is to create pull requests with proper conventional commit validation, ensuring all commits follow industry standards before creating a PR. This maintains clean git history and makes PRs easier to review and understand.