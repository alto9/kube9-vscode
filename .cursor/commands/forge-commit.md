<!-- forge-hash: 6fc80428264937e52bb0303f6bbf36bb7e3bd0af142034badfa7f477e1e6b2b9 -->

# Forge Commit

This command helps you properly commit code changes for the current branch with proper validation and commit message formatting, following project-specific contribution guidelines.

## Prerequisites

- You must be on a feature branch (not main/master/develop)
- You must have changes to commit (staged or unstaged)
- CONTRIBUTING.md and README.md files must be accessible in the repository root

## What This Command Does

1. **Read Contribution Guidelines**: Loads CONTRIBUTING.md and README.md to understand project-specific commit conventions
2. **Branch Validation**: Ensures you're not on a main branch (main/master/develop)
3. **Pre-commit Checks**: Runs all pre-commit hooks and validation
4. **Status Review**: Shows current git status with all changes
5. **Change Analysis**: Reviews all staged and unstaged changes
6. **Commit Message Generation**: Creates a clear, descriptive commit message following project-specific conventional commits format
7. **Commit Execution**: Commits the changes with the generated message
8. **Post-commit Validation**: Verifies the commit was successful

## Reading Contribution Guidelines

**CRITICAL**: Before creating any commit, you MUST read the project's contribution guidelines:

1. **Read CONTRIBUTING.md**:
   - Read the file at `CONTRIBUTING.md` in the repository root
   - Pay special attention to the "Commit Message Conventions" section
   - Note any project-specific commit types, scopes, or formatting requirements
   - Understand version bump implications for different commit types
   - Note any breaking change conventions

2. **Read README.md**:
   - Read the file at `README.md` in the repository root
   - Understand project structure and conventions
   - Note any project-specific guidelines or requirements
   - Understand the project's purpose and context

3. **Apply Guidelines**:
   - Use the commit message format specified in CONTRIBUTING.md
   - Follow project-specific type definitions and scopes
   - Respect version bump rules (if documented)
   - Follow any project-specific examples or patterns

## Commit Message Format

Uses Conventional Commits specification (as defined in CONTRIBUTING.md):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Standard Types** (verify against CONTRIBUTING.md for project-specific types):
- `feat`: New feature (typically increments minor version)
- `fix`: Bug fix (typically increments patch version)
- `docs`: Documentation changes (no version bump)
- `style`: Code style changes (no version bump)
- `refactor`: Code refactoring (no version bump)
- `perf`: Performance improvements (typically increments patch version)
- `test`: Adding or updating tests (no version bump)
- `build`: Build system changes (no version bump)
- `ci`: CI/CD changes (no version bump)
- `chore`: Maintenance tasks (no version bump)

**Subject Guidelines:**
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Maximum 72 characters

**Body Guidelines:**
- Wrap at 72 characters
- Explain what and why, not how
- Separate from subject with blank line
- Use bullet points for multiple changes

**Breaking Changes:**
- Add `!` after type/scope: `feat!: remove deprecated API`
- OR include `BREAKING CHANGE:` in footer
- Breaking changes typically increment major version

## Workflow

### Step 1: Read Contribution Guidelines
- Read `CONTRIBUTING.md` file from repository root
- Read `README.md` file from repository root
- Extract commit message conventions and project-specific requirements
- Note any project-specific scopes, types, or formatting rules

### Step 2: Branch Safety Check
- Check current branch with `git rev-parse --abbrev-ref HEAD`
- If on main/master/develop, **STOP** and warn the user
- Only proceed on feature branches

### Step 3: Pre-commit Validation
- Run `git status` to see all changes
- Run `npm run lint` (or equivalent) if available
- Run `npm run test` (or equivalent) if available
- Run any pre-commit hooks configured in the repository
- If any checks fail, **STOP** and fix issues before committing

### Step 4: Stage Changes
- Review unstaged changes with `git diff`
- Review staged changes with `git diff --cached`
- Stage relevant files with `git add` as needed
- Confirm all intended changes are staged

### Step 5: Generate Commit Message
- Analyze the nature of changes (feat/fix/docs/etc.)
- Determine appropriate scope based on files changed (use project-specific scopes from CONTRIBUTING.md if documented)
- Generate clear, descriptive subject line following project conventions
- Add body if changes need explanation
- Follow Conventional Commits format as specified in CONTRIBUTING.md
- Include breaking change indicators if applicable

### Step 6: Commit Changes
- Execute `git commit -m "message"` with generated message (or use `-m` for subject and `-m` for body)
- Verify commit succeeded with `git log -1`
- Show commit hash and summary

### Step 7: Post-commit Verification
- Verify working directory is clean with `git status`
- Show recent commit with `git log -1 --stat`
- Confirm commit is ready to push

## Important Guidelines

- **Read Guidelines First**: ALWAYS read CONTRIBUTING.md and README.md before committing
- **Follow Project Conventions**: Use project-specific commit types, scopes, and formats from CONTRIBUTING.md
- **Branch Safety**: NEVER commit to main/master/develop branches
- **Pre-commit Hooks**: Always run pre-commit hooks before committing
- **Clear Messages**: Write clear, descriptive commit messages that explain the "why"
- **Atomic Commits**: Each commit should represent a single logical change
- **Test Before Commit**: All tests must pass before committing
- **Review Changes**: Always review what you're committing before executing
- **No Secrets**: Never commit sensitive information (API keys, passwords, etc.)
- **Version Awareness**: Understand how commit types affect version bumps (if documented in CONTRIBUTING.md)

## Special Cases

### Multiple Logical Changes
If changes represent multiple logical units:
- Create separate commits for each logical unit
- Run forge-commit multiple times with different staged files

### Large Commits
If commit is very large:
- Consider breaking into smaller, logical commits
- Use `git add -p` for interactive staging

### Fixing Previous Commit
If you need to fix the last commit:
- Use `git commit --amend` only if commit hasn't been pushed
- Run forge-commit again for a new commit if already pushed

### Breaking Changes
If your commit introduces a breaking change:
- Add `!` after type/scope: `feat!: remove deprecated API`
- OR include `BREAKING CHANGE:` in footer with explanation
- Follow project-specific breaking change conventions from CONTRIBUTING.md

### Skipping Hooks
**AVOID** skipping hooks with `--no-verify`:
- Only skip if absolutely necessary and you understand the implications
- Pre-commit hooks exist for a reason (linting, testing, security)

## Usage

1. Use the `forge-commit` command in Cursor
2. The AI will:
   - Read CONTRIBUTING.md and README.md to understand project conventions
   - Verify you're on a feature branch
   - Run pre-commit validation
   - Review all changes
   - Generate a proper commit message following project conventions
   - Commit the changes
   - Verify the commit succeeded
3. Review the commit details
4. Use `forge-push` when ready to push to remote

## Files to Exclude

Never commit these files/patterns:
- `.env`, `.env.local`, `.env.*` (environment variables)
- `node_modules/` (dependencies)
- `dist/`, `build/`, `out/` (build artifacts)
- `*.log` (log files)
- `.DS_Store` (macOS files)
- IDE-specific files not in `.gitignore`
- Credentials, keys, or sensitive data

## Goal

The goal of forge-commit is to ensure every commit is clean, properly validated, and follows project-specific contribution guidelines. By reading CONTRIBUTING.md and README.md, commits will align with the project's conventions, making the git history readable, consistent, and useful for the entire team.