<!-- forge-hash: db0a710df9900348ae1631783dc6126f08fcb96bffdb5be016512e2a404b2d95 -->

# Forge Build

This command helps you implement a GitHub sub-issue by analyzing the codebase, issue content, parent issue context, and ensuring all tests pass.

## Prerequisites

You must provide a GitHub issue link when using this command. The issue should be a sub-issue ready for implementation.

## Workflow

### Step 1: Receive Issue Link
- Accept a GitHub issue link (e.g., `https://github.com/owner/repo/issues/123`)
- Parse the link to extract owner, repo, and issue number

### Step 2: Read Parent Issue
- **CRITICAL**: Read the parent issue of the sub-issue that was passed to it
- Use GitHub API to fetch the parent issue: `GET /repos/{owner}/{repo}/issues/{issue_number}/parent`
- If the issue doesn't have a parent (404), treat it as a standalone issue
- Understand the parent issue context to ensure the sub-issue implementation aligns with the overall goal

### Step 3: Branch Validation
- **CRITICAL**: Check that the user is NOT on a main branch (main, master, develop, etc.)
- Use `git rev-parse --abbrev-ref HEAD` to get the current branch name
- If on a main branch, **STOP** and instruct the user to create a feature branch first
- Prefer feature branch naming: `feature/issue-{number}` or `feature/{issue-title-slug}`
- Example: `git checkout -b feature/issue-123` or `git checkout -b feature/add-user-authentication`

### Step 4: Read Sub-Issue Content
- Fetch the sub-issue content (title, body, labels, etc.)
- Parse the issue body to extract:
  - **Implementation Steps**: Detailed technical steps to implement
  - **Test Procedures**: How to test this specific implementation
  - **Acceptance Criteria**: What must be completed for this sub-issue to be considered done

### Step 5: Analyze Development Environment
- **Analyze package.json**: Review `package.json` scripts for:
  - `lint`, `test`, `validate`, `build`, `dev`, `start` scripts
  - Dependencies and devDependencies
  - Test frameworks and tools
- **Analyze GitHub Actions**: Review `.github/workflows/` for:
  - CI/CD test and lint scripts
  - Build and validation procedures
  - Test execution patterns
- **Analyze documentation**: Check for:
  - README.md for local development setup
  - CONTRIBUTING.md for development guidelines
  - Any setup or development documentation

### Step 6: Implement Changes
- Perform the implementation steps outlined in the ticket
- Follow existing codebase patterns and conventions
- Write clean, maintainable code that matches the project's style

### Step 7: Update Automated Testing
- Update any automated testing required based on the changes made
- Create or update unit tests based on the test procedures in the issue
- Ensure test coverage for new functionality
- Update integration tests if needed

### Step 8: Validate After Each Change
- **CRITICAL**: After each significant change, run local validation:
  - Execute `npm run lint` (or equivalent) - **must pass**
  - Execute `npm run test` (or equivalent) - **must pass**
  - Execute `npm run build` (if applicable) - **must pass**
  - Execute any validation scripts found in package.json
- If any check fails, **fix the issues before proceeding**
- Do not mark the issue as complete until ALL checks pass

### Step 9: Mark Issue Complete
- Once all implementation is done and ALL tests pass:
  - Update the GitHub issue status to 'closed'
  - Optionally add a comment summarizing what was implemented

## Important Guidelines

- **Branch Safety**: NEVER work on main/master/develop branches - always use a feature branch
- **Parent Context**: Always read and understand the parent issue to ensure alignment
- **Test After Each Change**: Run lint/test/build after each significant change, not just at the end
- **Follow the Issue**: Implement exactly what the issue describes - don't add extra features
- **Match Patterns**: Follow the codebase's existing architecture and conventions
- **All Checks Must Pass**: The task is not considered complete until ALL tests, lint, and validation checks pass
- **Use Plan Mode**: When using in Cursor, use Plan mode to review the implementation plan before executing

## Usage

1. Use the `forge-build` command in Cursor
2. Provide the GitHub issue link: `https://github.com/owner/repo/issues/123`
3. The AI will:
   - Read the parent issue (if applicable)
   - Check the current branch (must be a feature branch)
   - Read the sub-issue content
   - Analyze package.json and GitHub Actions
   - Implement the changes
   - Update tests
   - Run validation after each change
   - Mark the issue as complete when all checks pass

## Testing Requirements

- **Analyze GitHub Actions**: Check `.github/workflows/` for CI/CD test and lint scripts
- **Analyze package.json**: Check `package.json` for `lint`, `test`, `validate`, `build` scripts
- **Run checks incrementally**: Execute lint/test/build after each significant change
- **All must pass**: The task is not considered complete until all tests, lint, and build checks pass
- **Local development**: Ensure local testing procedures from documentation are followed

The implementation will be consistent with your codebase patterns, aligned with the parent issue context, and all validation checks will pass.