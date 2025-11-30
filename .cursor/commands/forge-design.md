<!-- forge-hash: 55ad5cab1a0af4efe59ba43d7082cf4db4a620990edece381b9921d57b8e1b02 -->

# Forge Design

This command guides AI agents when working within Forge design sessions to update documentation.

## Prerequisites

You must have an active design session before making changes to AI documentation.

## What This Command Does

1. **Calls MCP Tools**: Uses `get_forge_about` to understand the Forge workflow and session-driven approach
2. **Checks for active session**: Ensures you're working within a structured design workflow
3. **Reads AI documentation**: Understands existing design patterns and structure
4. **Guides documentation updates**: Helps create or modify features, diagrams, specs, actors, and contexts
5. **Tracks all changes**: Ensures changed files are tracked in the active session's `changed_files` array

## File Type Guidance

When working in design sessions, use the correct file type for each purpose:

### Features (*.feature.md)
- **Purpose**: Define WHAT users can do (user-facing behavior)
- **Format**: Gherkin scenarios in code blocks
- **Contains**: Background, Rules, Scenarios with Given/When/Then steps
- **Example**: "User can log in with email and password"

### Diagrams (*.diagram.md)
- **Purpose**: Visualize HOW the system is structured
- **Format**: JSON diagram data in markdown code blocks
- **Contains**: ONE visual representation (infrastructure, components, flows, states)
- **Example**: "User authentication flow through API gateway to Lambda"
- **Keep it visual**: No pseudocode or implementation details

### Specs (*.spec.md)
- **Purpose**: Define WHAT must be built (technical contracts)
- **Format**: Markdown with tables, interfaces, rules
- **Contains**: API contracts, data structures, validation rules, constraints
- **Does NOT contain**: Diagrams (use diagram files instead), implementation code (use context files)
- **Example**: "Login API endpoint accepts email/password, returns JWT token"

### Actors (*.actor.md)
- **Purpose**: Define who/what interacts with the system
- **Format**: Markdown descriptions
- **Contains**: Responsibilities, characteristics, context
- **Note**: Always editable (no session required)

### Contexts (*.context.md)
- **Purpose**: Provide HOW-TO implementation guidance
- **Format**: Gherkin scenarios with technical guidance
- **Contains**: When to use patterns, code examples, best practices
- **Note**: Always editable (no session required)

## Intelligent Linkage and Grouping

When working with Forge documentation, it's essential to understand and respect the existing organizational structure:

- **Analyze folder structure**: Before creating new files, examine the existing `ai/` subfolder structure to understand how elements are logically grouped
- **Follow existing patterns**: Contribute to existing grouping patterns rather than creating new arbitrary structures
- **Respect nesting**: Folder nesting reflects logical relationships - preserve and extend these relationships when adding new files
- **Utilize linkages effectively**: Use all element linkages (feature_id, spec_id, context_id) to build complete context, but avoid over-verbosity
- **Group logically**: Place related files together in nested folders that reflect their relationships and dependencies
- **Maintain consistency**: When adding new documentation, follow the same organizational patterns already established in the project

Understanding the existing structure helps maintain coherence and makes the documentation easier to navigate and understand.

## Important Constraints

- **This is a Forge design session**: You are working within a structured design workflow
- **Only modify AI documentation files**: Work exclusively within the `ai/` folder
- **Do NOT modify implementation code**: This command is for updating features, diagrams, specs, actors, and contexts only
- **Track all changes**: Ensure changed files are tracked in the active session's `changed_files` array
- **Use proper formats**: Features use Gherkin in code blocks, Diagrams use react-flow JSON format, Specs use markdown only
- **Call MCP tools**: Always start by calling `get_forge_about` to understand the current Forge workflow

## Usage

1. Ensure you have an active design session
2. Run this command
3. The AI will call `get_forge_about` MCP tool
4. The AI will analyze existing AI documentation
5. The AI will update documentation in the ai/ folder
6. All changes will be tracked in the active design session

The documentation updates will be consistent with your existing design patterns and the Forge workflow.