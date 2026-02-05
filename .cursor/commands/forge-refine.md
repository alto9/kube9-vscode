<!-- forge-hash: 74b181f0df7917f6a6dc98c44890120002a9e7814f34cecb406d96dae281f394 -->

# Forge Refine

This command helps you refine GitHub issues to ensure they are in the most informed state possible, excluding technical implementation details.

## Prerequisites

You must provide a GitHub issue link when using this command. The issue should be in "Refinement" status on the project board.

## What This Command Does

1. **Reads the GitHub issue**: Understands the current state of the issue
2. **Clarifies business value**: Ensures the business value is clearly spelled out and accurate
3. **Defines testing procedures**: Fills out testing procedures from a BAU (Business As Usual) perspective
4. **Defines success and failure**: Ensures clear definitions of success and failure criteria
5. **Updates the issue**: Saves refined content back to the GitHub issue

## Important Guidelines

- **Focus on business value**: Do NOT include technical implementation details
- **BAU perspective**: Testing procedures should be written from a business-as-usual perspective, not technical testing
- **Clear definitions**: Success and failure criteria must be unambiguous
- **Work with GitHub issues directly**: All changes are made to the GitHub issue, not local files
- **Required fields**: The following fields must be filled out before progressing to Scribe mode:
  - Problem Statement
  - Business Value
  - Testing Procedures (BAU perspective)
  - Definition of Success
  - Definition of Failure

## When to Progress to Scribe Mode

**CRITICAL**: Before progressing to Scribe mode, evaluate whether sub-issues are needed:

- **If only 1 sub-issue would be created**: **DO NOT** create a sub-issue. Instead, refine the parent issue with implementation details and skip Scribe mode entirely. There is no need for a single sub-issue - the parent issue can be implemented directly.
- **Only create sub-issues if it makes sense**: Sub-issues should only be created when:
  - The work can be logically broken into multiple independent, potentially shippable pieces
  - Each sub-issue represents a complete, working increment of value
  - The breakdown improves clarity and parallelization
- **Each sub-issue must be 'potentially shippable'**: 
  - No broken state in between sub-issues
  - Each sub-issue should result in a working, testable state
  - The system should be functional after each sub-issue is completed
  - Avoid creating sub-issues that leave the system in an incomplete or broken state

**Decision Flow**:
1. After refining the issue, assess if it needs to be broken down
2. If breakdown would result in only 1 sub-issue → Skip Scribe mode, refine parent issue with implementation details
3. If breakdown would result in 2+ sub-issues that are each potentially shippable → Progress to Scribe mode
4. If breakdown would result in sub-issues that leave the system broken → Don't create sub-issues, refine parent issue instead

## Issue Structure

The GitHub issue body should contain the following sections:

```markdown
### Problem Statement
[What problem does this feature solve?]

### Business Value
[What is the business value of this feature?]

### Testing Procedures
[How should this be tested from a BAU perspective?]

### Definition of Success
[What defines success for this feature?]

### Definition of Failure
[What defines failure for this feature?]
```

## Usage

1. Use the `forge-refine` command in Cursor
2. Provide the GitHub issue link: `https://github.com/owner/repo/issues/123`
3. The AI will help refine each section of the issue
4. Review and save changes back to GitHub
5. Evaluate whether sub-issues are needed:
   - If only 1 sub-issue would be created → Skip Scribe mode, refine parent issue with implementation details
   - If 2+ potentially shippable sub-issues make sense → Progress to Scribe mode
   - If sub-issues would leave system broken → Don't create sub-issues, refine parent issue instead

## Goal

The goal of Refinement mode is to get the original ticket in the most informed state possible, excluding technical implementation details. The business value must be clearly spelled out and accurate at the end of the refinement phase.