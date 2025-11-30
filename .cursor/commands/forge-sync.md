<!-- forge-hash: fbca6f7c97b5aaf316aac62323db4fd8258d00255479695874402fb847b9b7ef -->

# Forge Sync

This command synchronizes your Forge AI documentation with your actual codebase. Use this when:
- You've just installed Forge on an existing project with no documentation
- Your codebase has changed and the AI documentation is out of date
- You've manually modified code without updating the design documentation

## Prerequisites

None. This command can be run at any time, with or without an active design session.

## What This Command Does

1. **Calls MCP Tools**: Uses `get_forge_about` to understand the Forge workflow and documentation structure
2. **Deep codebase analysis**: Systematically analyzes your entire codebase to understand:
   - Project structure and architecture
   - Component hierarchy and relationships
   - API endpoints and contracts
   - Data models and schemas
   - Business logic and workflows
   - Dependencies and integrations
   - Existing documentation (README, comments, etc.)
3. **Reads existing AI documentation**: Reviews all existing AI files:
   - Features (*.feature.md)
   - Diagrams (*.diagram.md)
   - Specs (*.spec.md)
   - Models (*.model.md)
   - Actors (*.actor.md)
   - Contexts (*.context.md)
4. **Identifies gaps and inconsistencies**:
   - Missing documentation for existing code
   - Outdated documentation that doesn't match current implementation
   - Undocumented features, APIs, or data structures
   - Inconsistent or conflicting information
5. **Creates or updates AI files**: Systematically updates documentation to reflect reality:
   - Create missing features, diagrams, specs, models
   - Update outdated information
   - Ensure all linkages are correct (feature_id, spec_id, diagram_id, etc.)
   - Maintain proper file structure and naming conventions
6. **Generates a sync report**: Provides summary of changes made

## Sync Strategy

### Phase 1: Discovery
- Scan the entire codebase to map:
  - File structure and organization
  - Key components, services, modules
  - API routes and handlers
  - Database models and schemas
  - Configuration and environment
  - External dependencies

### Phase 2: Analysis
- Compare discovered code with existing AI documentation
- Identify what exists in code but not in docs
- Identify what exists in docs but not in code (potentially obsolete)
- Check for version mismatches and inconsistencies

### Phase 3: Actors & Contexts (Always Editable)
- Create/update **Actors** first (who/what uses the system)
- Create/update **Contexts** for technologies used (AWS, React, Node.js, etc.)
- These are foundational and don't require a session

### Phase 4: Design Documentation (May Require Session)
- Create/update **Features** for user-facing functionality
- Create/update **Diagrams** for architecture visualization
- Create/update **Specs** for technical contracts and APIs
- Create/update **Models** for data structures
- **Note**: If no active session exists, provide recommendations but do not create these files

### Phase 5: Linkages & Validation
- Ensure all cross-references are correct (feature_id, spec_id, diagram_id, model_id)
- Validate frontmatter completeness
- Check for orphaned or unreferenced files
- Verify file naming conventions

## Important Constraints

- **Read the code, don't modify it**: This command ONLY updates AI documentation, never implementation code
- **Be thorough**: Don't skip files or make assumptions; actually read and analyze the code
- **Maintain accuracy**: Documentation must reflect actual implementation, not aspirational design
- **Preserve existing docs**: Update rather than replace when possible; don't lose valuable context
- **Respect Forge patterns**: Use correct file types, formats (Gherkin, react-flow JSON), and frontmatter
- **Session awareness**: Actors and Contexts can be created freely; Features/Diagrams/Specs may require a session

## Output Format

After sync, provide a summary report:

### Created
- List of new AI files created with brief description

### Updated
- List of existing AI files updated with what changed

### Warnings
- Files that need attention (obsolete docs, missing linkages, etc.)

### Recommendations
- Suggestions for design sessions to address major gaps
- Areas that need deeper documentation

## Usage

1. Run this command from the project root
2. The AI will call `get_forge_about` MCP tool
3. The AI will systematically analyze your codebase
4. The AI will read and compare existing AI documentation
5. The AI will create or update AI files to match reality
6. Review the sync report and any recommendations
7. Consider starting a design session to address any major architectural changes

This command ensures your Forge documentation stays in sync with your actual implementation.