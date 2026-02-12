<!-- forge-hash: 3b6b174d218d36abf1cc9a635fe4783161eb96b7f4cae8b8db4903bd55750bc4 -->

# Forge Push

This command helps you safely push code to the remote repository with proper validation, handling common scenarios, and ensuring all pre-push hooks pass.

## Prerequisites

- You must be on a feature branch (not main/master/develop directly)
- You must have commits to push
- Pre-push hooks must be configured (if applicable)

## What This Command Does

1. **Branch Validation**: Ensures you're not force-pushing to protected branches
2. **Pre-push Hooks**: Runs all pre-push hooks and validation
3. **Remote Status Check**: Checks if remote branch exists and its status
4. **Rebase Check**: Determines if rebase is needed
5. **Push Execution**: Pushes commits to remote with proper flags
6. **Response Handling**: Interprets git push responses and takes appropriate action
7. **Post-push Verification**: Verifies push succeeded and remote is up to date

## Workflow

### Step 1: Branch Safety Check
- Check current branch with `git rev-parse --abbrev-ref HEAD`
- Identify if pushing to protected branches (main/master/develop)
- Warn if pushing to protected branch without PR workflow
- Verify branch name follows conventions

### Step 2: Pre-push Validation
- Run `npm run lint` (or equivalent) if available
- Run `npm run test` (or equivalent) if available
- Run `npm run build` (or equivalent) if available
- Run any pre-push hooks configured in the repository
- If any checks fail, **STOP** and fix issues before pushing

### Step 3: Fetch Remote Status
- Execute `git fetch origin` to get latest remote state
- Check if remote branch exists with `git ls-remote --heads origin <branch>`
- Compare local and remote branches

### Step 4: Handle Remote Branch State

#### Case A: Remote Branch Doesn't Exist (First Push)
- Use `git push -u origin HEAD` to create remote branch
- Set upstream tracking automatically

#### Case B: Remote Branch Exists and Is Behind
- Local is ahead of remote
- Use `git push origin HEAD` to push changes
- No rebase needed

#### Case C: Remote Branch Has Diverged
- Remote has commits local doesn't have
- Check divergence with `git rev-list --left-right --count origin/<branch>...HEAD`
- **Recommend rebase**: Run `git pull --rebase origin <branch>`
- After successful rebase, push with `git push origin HEAD`

#### Case D: Remote Branch Is Ahead
- Remote has commits local doesn't have
- **Require rebase**: Must run `git pull --rebase origin <branch>` first
- **DO NOT push** until local is up to date

### Step 5: Execute Push
- Use `git push origin HEAD` for normal push
- Use `git push -u origin HEAD` for first-time push
- Use `git push --force-with-lease origin HEAD` ONLY if user explicitly requests and:
  - Not pushing to main/master/develop
  - User understands the implications
  - Team workflow allows it

### Step 6: Handle Push Responses

#### Success Response
```
To <repository>
   abc1234..def5678  feature-branch -> feature-branch
```
- Push succeeded
- Show success message with commit range

#### Rejected - Non-fast-forward
```
! [rejected]        feature-branch -> feature-branch (non-fast-forward)
error: failed to push some refs to '<repository>'
hint: Updates were rejected because the tip of your current branch is behind
```
- Remote has diverged
- Run `git pull --rebase origin <branch>`
- Resolve any conflicts
- Run `git push origin HEAD` again

#### Rejected - Pre-push Hook Failed
```
error: failed to push some refs to '<repository>'
To <repository>
 ! [remote rejected] feature-branch -> feature-branch (pre-receive hook declined)
```
- Pre-push hook validation failed
- Review hook output for specific errors
- Fix issues locally
- Try pushing again

#### Protected Branch
```
remote: error: GH006: Protected branch update failed
```
- Branch is protected on remote
- Cannot push directly to protected branch
- Must use Pull Request workflow

### Step 7: Post-push Verification
- Run `git status` to verify working directory state
- Run `git log origin/<branch>..HEAD` to verify all commits pushed
- Should show no commits (empty output means everything is pushed)
- Show remote branch URL for creating PR if needed

## Important Guidelines

### Branch Protection
- **NEVER force push to main/master/develop**
- Force push only to feature branches and only when necessary
- Use `--force-with-lease` instead of `--force` (safer)
- Always verify remote state before force pushing

### Rebase Best Practices
- Always rebase when remote has diverged
- Use `git pull --rebase origin <branch>` not `git pull`
- Resolve conflicts carefully
- Test after rebasing before pushing
- Use `git rebase --abort` if rebase goes wrong

### Pre-push Hook Compliance
- **NEVER skip pre-push hooks** with `--no-verify`
- If hooks fail, fix the issues
- Pre-push hooks protect code quality and team standards
- Only skip in extreme emergencies with team approval

### Common Scenarios

#### Scenario 1: First Push to New Branch
```bash
git push -u origin HEAD
```

#### Scenario 2: Normal Push (Remote Is Behind)
```bash
git push origin HEAD
```

#### Scenario 3: Remote Has Diverged
```bash
git fetch origin
git rebase origin/<branch>
# Resolve any conflicts
git push origin HEAD
```

#### Scenario 4: Need to Force Push (Feature Branch Only)
```bash
# After rewriting history (rebase, amend, etc.)
git push --force-with-lease origin HEAD
```

#### Scenario 5: Protected Branch Push Rejected
- Don't push directly
- Create Pull Request instead
- Use GitHub/GitLab/Bitbucket UI

## Error Handling

### Network Errors
- Retry the push command
- Check internet connection
- Verify remote URL with `git remote -v`

### Authentication Errors
- Verify credentials are configured
- Use SSH keys or Personal Access Token
- Check `git config --list` for user.name and user.email

### Repository Access Errors
- Verify you have push access to the repository
- Check with repository administrator

## Usage

1. Use the `forge-push` command in Cursor
2. The AI will:
   - Verify you're on a feature branch
   - Run pre-push validation
   - Check remote branch status
   - Determine if rebase is needed
   - Execute the appropriate push command
   - Handle any errors or rejections
   - Verify push succeeded
3. Review the push results
4. Create Pull Request if pushing to feature branch

## Force Push Warning

**🚨 CRITICAL**: Force pushing is dangerous and should be avoided unless absolutely necessary.

**When force push is acceptable:**
- Feature branch you own and no one else is using
- After rebasing or amending commits
- With team agreement and communication

**When force push is NEVER acceptable:**
- Main/master/develop branches
- Shared feature branches with multiple developers
- Any branch with active Pull Requests from others
- Without understanding the consequences

**Always use `--force-with-lease` instead of `--force`**:
- `--force-with-lease` verifies remote hasn't changed since last fetch
- `--force` blindly overwrites remote (dangerous)

## Goal

The goal of forge-push is to safely push code to the remote repository following industry best practices, handling common scenarios intelligently, and protecting against common mistakes like force-pushing to protected branches or skipping important validation hooks.