# Refine Issue

This command invokes the Refine agent to maintain development-ready GitHub issue(s). It refines issues so they are unambiguous and ready for development.

## Input

- GitHub issue link (`https://.../issues/123`, `owner/repo#123`, or `123`)

## Workflow

1. Retrieve issue text from GitHub using available tools.
2. Create parent branch from main.
3. Consult SME Agents (runtime, business_logic, data, interface, integration, operations) for technical information and implementation guides.
4. Update issue based on the issue template; ensure all required details are included.
5. Create sub-issues on the parent ticket (always at least one).
6. Create a branch for each sub-issue from the parent branch. Sub-issues merge into the parent branch for a single PR to main.

## Goal

Refined tickets ready for development with no ambiguity.
