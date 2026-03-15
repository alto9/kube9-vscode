---
name: start-issue-build
description: [git_flow|workspace-bootstrap] Reset to clean state for issue work - checkout main, pull, npm install
---

# Start Issue Build

Use the provided script to reset the working directory to a clean state before starting work on an issue.

## Usage

Run the script: `node scripts/start-issue-build.js`

The script checks out the default branch, pulls latest, and runs the package manager install (npm/pnpm/yarn).

When present, the agent may read CONTRIBUTING.md and README.md for project SDLC: commit message format, testing requirements, validation steps.
