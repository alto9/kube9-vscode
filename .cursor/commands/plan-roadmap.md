# Plan Roadmap

This command invokes the Planner agent to sync and maintain the product roadmap milestones and top-level issues.

## Input

- `.forge/roadmap.json` (existing local roadmap)

## Workflow

1. Retrieve `vision.json` and `knowledge_map.json`.
2. Retrieve milestones and milestone issues from GitHub using available tools.
3. Retrieve `roadmap.json` from code.
4. **Clarity check:** Have enough clarity to generate roadmap? If no, loop back to user.
5. Verify accuracy of `roadmap.json` or correct.
6. Sync the roadmap with GitHub; do not update past or in-flight tickets.

## Goal

Updated `roadmap.json` and synchronized GitHub milestones and issues.
