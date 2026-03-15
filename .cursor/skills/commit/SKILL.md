---
name: commit
description: [git_flow|commit-code] Commit changes with conventional commit validation
---

# Commit

Use the provided script to commit staged changes. Validates branch and runs pre-commit checks.

## Usage

Run the script: `scripts/commit.js -m "<message>"`

## Commit Message Format

Use conventional commits: `type(scope): subject` (e.g. `feat(auth): add login validation`).

- **Types**: feat, fix, docs, style, refactor, test, chore
- **Scope** (optional): area of the codebase affected
- **Subject**: imperative mood, lowercase after the colon, no period at end

When changes warrant it, include a body (blank line after subject, then paragraphs) with:
- What changed and why
- Any breaking changes or migration notes

## Project-Specific Guidance

When present, read CONTRIBUTING.md and README.md in the repository root to determine:
- Commit message format (types, scopes, subject rules)
- Project SDLC: pre-commit validation steps, breaking change notation
- Project-specific examples

## Guidelines

- Avoid one-line messages for non-trivial changes; always provide enough context for reviewers.
- The agent generates the commit message from the changes and passes it with -m.
