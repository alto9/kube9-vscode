# Build from GitHub

This command activates the staged build workflow from a GitHub issue link. It prepares issue context and hands execution to build-stage subagents.

## Input

- GitHub issue link (`https://.../issues/123`, `owner/repo#123`, or `123`)

## Skill Resolution

- Resolve assigned skills from `.forge/skill_registry.json` at `command_assignments.build-from-github`.
- For each assigned skill ID, execute using the matching `skills[]` entry `script_path` and `usage`.
- Do not duplicate script command strings in this command document.

## Workflow

1. Parse and validate issue reference.
2. Retrieve issue details using available tools (e.g. MCP GitHub, gh CLI).
3. Handoff to staged build agents:
   - `build_development`
   - `build_security`
   - `build_wrap`

## Goal

Produce a prepared branch and normalized issue context that flows through the staged build pipeline, ending in a GitHub pull request.
