# Review PR

This command activates the staged review workflow from a PR link. It resolves PR context, checks out the PR branch, then routes through review-stage subagents.

## Input

- GitHub pull request reference (`https://.../pull/123`, `owner/repo#123`, or `123`)

## Skill Resolution

- Resolve assigned skills from `.forge/skill_registry.json` at `command_assignments.review-pr`.
- For each assigned skill ID, execute using the matching `skills[]` entry `script_path` and `usage`.
- Do not duplicate script command strings in this command document.

## Workflow

1. Parse and validate PR reference.
2. Retrieve PR details using available tools (e.g. MCP GitHub, gh CLI).
3. Checkout PR source branch using available tools.
4. Handoff to staged review agents:
   - `review_implementation`
   - `review_security`
   - `review_wrap`

## Goal

Establish PR/issue context and execute a staged review pipeline ending in explicit review disposition (no merge; human performs merge).
