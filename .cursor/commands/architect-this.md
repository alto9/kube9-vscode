# Architect This

This command invokes the Architect agent to analyze a prompt and update `.forge` documents through SME subagents and the Planner.

## Input

- Free-form string describing the architectural change or direction

## Workflow

1. Architect retrieves `vision.json` and determines if any adjustments should be made.
2. **Clarity check:** Have enough clarity to prompt SME agents? If no, loop back to user for clarification.
3. Examine user input to determine which SME subagents to invoke (async): Runtime, BusinessLogic, Data, Interface, Integration, Operations.
4. Each SME: examine prompt input; examine files within its domain; make concise updates.
5. Invoke Planner subagent with recap of changes made.

## Goal

Successful update of `.forge` documents aligned with vision and domain contracts.
