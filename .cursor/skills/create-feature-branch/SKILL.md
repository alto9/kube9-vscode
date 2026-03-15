---
name: create-feature-branch
description: [git_flow|branch-create] Create a feature branch from the root branch
---

# Create Feature Branch

Use the provided script to create a new branch from the specified root branch.

## Usage

Run the script: `scripts/create-feature-branch.js <branch-name> [root-branch]`

Default root branch is main. Parent issue: branch from main. Sub-issues: branch from the parent issue branch (e.g. feature/issue-123). All sub-issues merge into the parent branch for a single PR to main.

When present, check CONTRIBUTING.md for project-specific branching conventions (e.g. feature/issue-N, fix/scope).
