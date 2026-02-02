<!-- forge-hash: 2ecf3df1e69ac87a1ff370cce36329ea0e01c87647a80a62c066b716d82237c9 -->

# Forge Scribe

**🚨 CRITICAL RESTRICTION: This command ONLY interacts with GitHub issues via the GitHub API. It does NOT read, write, modify, or delete ANY code files or any files in the codebase.**

This command validates and manages GitHub sub-issues to ensure they form a coherent, complete, and logical breakdown of the parent issue.

## Prerequisites

You must provide a GitHub issue link when using this command. The parent issue should be in "Scribe" status and have completed refinement.

## What This Command Does (AND DOES NOT DO)

### ✅ What This Command DOES:
1. **Reads the parent GitHub issue**: Fetches and understands the refined parent issue content
2. **Reads existing sub-issues**: Fetches all existing sub-issues linked to the parent issue
3. **Validates coherence**: Reviews ALL sub-issues together to ensure they are coherent, complete, and logical as a group
4. **Validates completeness**: Ensures all implementation steps from the parent issue are properly reflected across sub-issues
5. **Creates/updates/deletes sub-issues ONLY**: Uses GitHub API to create, update, or delete GitHub sub-issues
6. **Links sub-issues**: Automatically links sub-issues to the parent issue via GitHub API

### ❌ What This Command DOES NOT DO:
- **NO code file operations**: Do NOT read, write, modify, or delete ANY code files (no .ts, .js, .tsx, .jsx, .py, .java, etc.)
- **NO file system operations**: Do NOT read, write, modify, or delete ANY files in the codebase
- **NO code analysis**: Do NOT analyze code structure, patterns, or implementation details
- **NO manual task issues**: Do NOT create issues for manual tasks like testing, documentation, or configuration
- **NO separate testing issues**: Testing belongs in the Test Procedures and Acceptance Criteria sections of product change issues, not as separate issues
- **NO implementation planning**: Do NOT plan code changes or create implementation plans - only plan sub-issue creation/updates

## Critical Rules

### Rule 1: ONLY GitHub API Operations
- **ONLY use GitHub API**: Create, update, or delete GitHub issues via GitHub API
- **NO file operations**: Do NOT read, write, or modify ANY files in the codebase
- **NO code reading**: Do NOT read code files to understand implementation - work only from issue content
- **When in Plan mode**: Plan ONLY GitHub sub-issue operations (create/update/delete), NOT code changes

### Rule 2: Only Product Changes
- **Every sub-issue MUST relate to a product change** (code implementation, feature addition, bug fix, etc.)
- **NEVER create issues for**: Manual testing, documentation updates, configuration changes, or any non-code work
- **Testing goes INSIDE issues**: Include test procedures and acceptance criteria within each product change issue

### Rule 3: Coherence as a Group
- **Read ALL existing sub-issues first**: Fetch and review all current sub-issues before making changes
- **Validate coherence**: Ensure all sub-issues work together as a complete, logical set
- **Validate completeness**: All implementation steps from the parent issue must be reflected across sub-issues
- **Check dependencies**: Identify and document dependencies between sub-issues
- **Verify no gaps**: Make sure nothing is missing and nothing is redundant
- **Validate logic**: Ensure the breakdown makes logical sense and sub-issues can be implemented independently

### Rule 4: Small, Focused Work
- Each sub-issue should represent a focused piece of work (< 30 minutes ideally)
- Break large changes into multiple small, independent sub-issues where possible
- Each sub-issue should be implementable independently (or with clear dependencies)

## Sub-issue Structure

Each sub-issue MUST contain:

```markdown
## Implementation Steps
[Detailed technical steps to implement this product change]

## Test Procedures
[How to test this specific implementation - include validation steps here]

## Acceptance Criteria
[What must be completed for this sub-issue to be considered done - include validation requirements]
```

**Note**: Test Procedures and Acceptance Criteria are where validation/testing goes. Do NOT create separate issues for testing.

## Workflow

1. **Fetch parent issue**: Read the GitHub issue content (title, body, labels, etc.)
2. **Fetch existing sub-issues**: Read all existing sub-issues linked to the parent issue
3. **Validate current state**: Review existing sub-issues to check:
   - Are they coherent as a group?
   - Do they cover all implementation steps from the parent issue?
   - Are there gaps or redundancies?
   - Do they form a logical breakdown?
4. **Plan sub-issue operations**: Determine what sub-issues need to be:
   - Created (if missing)
   - Updated (if incomplete or incorrect)
   - Deleted (if redundant or incorrect)
5. **Execute GitHub API operations**: Create/update/delete sub-issues via GitHub API ONLY
   - **CRITICAL**: When creating a sub-issue, you MUST link it to the parent issue using GitHub's native sub-issues API
   - The linkage happens automatically via the API - no need to add "Parent issue: #X" text to the body
   - GitHub's API maintains the parent-child relationship natively
6. **Validate final state**: Review all sub-issues together to ensure coherence and completeness

## Usage

1. Use the `forge-scribe` command in Cursor
2. Provide the GitHub issue link: `https://github.com/owner/repo/issues/123`
3. The AI will:
   - Fetch the parent issue and all existing sub-issues
   - Validate coherence, completeness, and logic
   - Create/update/delete sub-issues via GitHub API ONLY
   - NO code files will be read or modified
4. Review the sub-issues and verify they work together as a group
5. Once satisfied, close the session and move the parent issue to 'Ready' status

## Plan Mode Behavior

When running in Plan mode:
- **Plan ONLY**: GitHub sub-issue operations (create X sub-issues, update Y sub-issues, delete Z sub-issues)
- **DO NOT plan**: Code changes, file modifications, or implementation steps
- **Focus on**: Validation, coherence checking, and sub-issue management

## Goal

The goal of Scribe mode is to validate and manage GitHub sub-issues so they form a coherent, complete, and logical breakdown of the parent issue. This is a planning/validation phase - implementation happens later using forge-build.