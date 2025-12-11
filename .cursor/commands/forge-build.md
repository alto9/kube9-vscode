<!-- forge-hash: 885953da8dc45d7114907764bb0ea726d1f3bbb20c67d770861453c867543a72 -->

# Forge Build

This command helps you implement a Forge story by analyzing both the codebase and AI documentation.

## Prerequisites

If you're not familiar with Forge, run `/forge` first to understand the documentation system.

You must provide a story file (*.story.md) when running this command.

## What This Command Does

1. **Reads the story file**: Understands what needs to be implemented
2. **Reads all linked AI documentation**: Follows linkages to gather complete context:
   - Features (expected behavior with Gherkin scenarios)
   - Specs (technical implementation details with diagram references)
   - Diagrams (visual architecture)
   - Actors (system personas)
3. **Reads the session**: Understands the session context from `ai/sessions/<session-id>/<session-id>.session.md`
4. **Analyzes the existing codebase**: Understands current implementation patterns and structure
5. **Implements the changes**: Writes actual code as described in the story
6. **Runs linting**: Seeks out and runs lint packages after each change
7. **Runs tests**: Seeks out and runs test packages after each change
8. **Marks story complete**: Updates story status to 'completed' when all work is done and tests pass

## Important Guidelines

- **Follow the story**: Implement exactly what the story describes (< 30 minutes of work)
- **Read all linked documentation**: Follow `feature_id` and `spec_id` linkages to gather complete context
- **Read the session**: Understand the problem statement and session context
- **Use AI documentation as reference**: Features and specs define the intended behavior
- **Match existing patterns**: Follow the codebase's existing architecture and conventions
- **Write tests**: Include unit tests as specified in the story
- **Run linting**: After each change, seek out lint packages (ESLint, Prettier, etc.) and run them
- **Run tests**: After each change, seek out test packages (Jest, Vitest, etc.) and run them
- **Stay focused**: If the story is too large, break it into smaller stories
- **Mark story as completed**: Update the story file's status field to 'completed' when all work is done and all tests pass

## Usage

1. Select a story file from `ai/sessions/<session-id>/tickets/`
2. Run this command
3. The AI will read the story, linked documentation, and session
4. The AI will implement the changes with tests
5. The AI will run linting and tests after each change
6. The AI will mark the story as completed when done
7. Review and commit the implementation

The implementation will be consistent with your documented design and existing codebase patterns.