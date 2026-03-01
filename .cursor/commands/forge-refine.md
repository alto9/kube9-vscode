<!-- forge-hash: 76c10028cbfede92f7b88e6a647fe7415499de7f3cc6d7d861c7f5b24114b44d -->

# Forge Refine

This command helps you refine GitHub issues to ensure they are in the most informed state possible, excluding technical implementation details.

## Prerequisites

You must provide a GitHub issue link when using this command. The issue should be in "Refinement" status on the project board.

## What This Command Does

1. **Reads the GitHub issue**: Understands the current state of the issue
2. **Assesses issue complexity**: Examines the issue and counts how many sub-issues would be needed (0, 1, or 2+)
3. **Applies single sub-issue rule**: If only 1 sub-issue would be needed, refines the parent issue directly without creating any sub-issues
4. **Determines issue type**: Identifies whether this is a bug report or feature request
5. **Loads appropriate template**: Reads the corresponding template file (bug_report.yml or feature_request.yml) to understand required fields
6. **Clarifies business value**: Ensures the business value is clearly spelled out and accurate
7. **Defines testing procedures**: Fills out testing procedures from a BAU (Business As Usual) perspective
8. **Defines success and failure**: Ensures clear definitions of success and failure criteria
9. **Updates the issue**: Saves refined content back to the GitHub issue
10. **Handles sub-issues only if 2+ needed**: Only if 2+ sub-issues are needed, creates and refines them as part of the refinement process

## Issue Type Detection

**CRITICAL**: Before refining the issue, you MUST determine the issue type:

1. **Read the GitHub issue** using the GitHub MCP tools to get:
   - Issue labels (check for "bug" or "enhancement" labels)
   - Issue title (check for "[Bug]" or "[Feature]" prefixes)
   - Issue body structure

2. **Determine issue type**:
   - If the issue has a "bug" label OR title starts with "[Bug]" → **Bug Report**
   - If the issue has an "enhancement" label OR title starts with "[Feature]" → **Feature Request**

3. **Load the appropriate template**:
   - **Bug Report**: Read `.github/ISSUE_TEMPLATE/bug_report.yml`
   - **Feature Request**: Read `.github/ISSUE_TEMPLATE/feature_request.yml`

4. **Extract required fields** from the template file:
   - Parse the YAML structure to identify all form fields
   - Note which fields are marked as `required: true` in the validations
   - Map template field IDs to the sections that need to be refined
   - Use the template's field labels and descriptions to guide refinement

## Important Guidelines

- **Focus on business value**: Do NOT include technical implementation details
- **BAU perspective**: Testing procedures should be written from a business-as-usual perspective, not technical testing
- **Clear definitions**: Success and failure criteria must be unambiguous
- **Work with GitHub issues directly**: All changes are made to the GitHub issue, not local files
- **Use template fields**: Required fields are determined dynamically from the template file, not hardcoded
- **Template enforcement**: The rule enforces project-specific templates - fields come from the template files

## Issue Structure

The GitHub issue body structure depends on the issue type and is defined by the template file:

- **Bug Reports**: Fields from `bug_report.yml` (e.g., Bug Description, Steps to Reproduce, Expected Behavior, Actual Behavior, Version info, etc.)
- **Feature Requests**: Fields from `feature_request.yml` (e.g., Problem Statement, Proposed Solution, Alternatives Considered, Use Cases, Priority, etc.)

**Required fields** are determined by the template file's `validations.required: true` settings.

## Complexity Assessment and Sub-Issue Handling

**CRITICAL**: Before refining, you MUST assess the issue complexity and determine how many sub-issues would be needed:

1. **Examine the issue**: Read the issue content to understand its scope and complexity
2. **Count potential sub-issues**: Determine how many independent, potentially shippable pieces the work would break into
3. **Apply the single sub-issue rule**:
   - **🚨 ABSOLUTE RULE**: If only 1 sub-issue would be created → **DO NOT create any sub-issues**. Refine the parent issue directly and skip sub-issue creation entirely.
   - **Only if 2+ sub-issues**: Only create sub-issues when the work can be broken into 2 or more independent, potentially shippable pieces.

4. **Sub-issue creation criteria** (only applies when 2+ sub-issues are needed):
   - The work can be logically broken into **2 or more** independent, potentially shippable pieces
   - Each sub-issue represents a complete, working increment of value
   - The breakdown improves clarity and parallelization
   - Each sub-issue results in a working, testable state (no broken states between sub-issues)

5. **Refinement scope**:
   - **Parent issues**: Always refine the parent issue. If 2+ sub-issues are needed, create and refine them as part of refining the parent issue.
   - **Sub-issues**: Sub-issues are NEVER refined individually. They are only created and refined as part of refining their parent issue.
   - **Single sub-issue scenario**: If only 1 sub-issue would be needed, refine the parent issue with all necessary details and do NOT create any sub-issues.

6. **Decision flow**:
   - Assess complexity → Count potential sub-issues
   - If 1 sub-issue → Refine parent issue only, NO sub-issues created → Skip Scribe mode
   - If 2+ sub-issues → Refine parent issue AND create/refine sub-issues → Progress to Scribe mode
   - If 0 sub-issues (simple fix) → Refine parent issue only → Skip Scribe mode

## Usage

1. Use the `forge-refine` command in Cursor
2. Provide the GitHub issue link: `https://github.com/owner/repo/issues/123`
3. The AI will:
   - Read the issue to assess its complexity
   - Determine issue type (bug or feature)
   - Load the appropriate template file
   - Extract required fields from the template
   - Help refine each required section of the issue
   - If 2+ sub-issues are needed, create and refine them as part of the refinement process
   - **CRITICAL**: If only 1 sub-issue would be needed, do NOT create it - refine the parent issue directly
4. Review and save changes back to GitHub
5. **If 0-1 sub-issues would be needed**: Refinement is complete, skip Scribe mode entirely
6. **If 2+ sub-issues were created**: Once all required fields are complete for both parent and sub-issues, progress to Scribe mode

## Goal

The goal of Refinement mode is to get the original ticket in the most informed state possible, excluding technical implementation details. The business value must be clearly spelled out and accurate at the end of the refinement phase. 

**CRITICAL RULE**: If only 1 sub-issue would be needed, do NOT create it - refine the parent issue directly. Sub-issues are only created when 2+ are needed. Simple fixes and single-sub-issue scenarios are refined directly without any sub-issues. Complex issues requiring 2+ sub-issues are refined along with their sub-issues, ensuring both parent and children are properly refined together. Sub-issues are never refined individually - they are only created and refined as part of refining their parent issue. The refinement process uses project-specific templates to ensure consistency and completeness.