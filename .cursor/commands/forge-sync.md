<!-- forge-hash: 2b2e996c49a23027ca3de422be5c0332550bf7caa34a6e884424d501e61d8ad6 -->

# Forge Sync

This command synchronizes your Forge AI documentation with your actual codebase. Use this when:
- You've just installed Forge on an existing project with no documentation
- Your codebase has changed and the AI documentation is out of date
- You've manually modified code without updating the design documentation

## Prerequisites

If you're not familiar with Forge, run `/forge` first to understand the documentation system.

If you need to understand file schemas, run `/forge-design` to see complete schemas for all document types.

## What This Command Does

1. **Examines the codebase fully**: Systematically analyzes your entire codebase to understand:
   - Project structure and architecture
   - Component hierarchy and relationships
   - API endpoints and contracts
   - Data models and schemas
   - Business logic and workflows
   - Dependencies and integrations
   - Existing documentation (README, comments, etc.)

2. **Reads existing AI documentation**: Reviews all existing AI files:
   - Features (*.feature.md)
   - Diagrams (*.diagram.md)
   - Specs (*.spec.md)
   - Actors (*.actor.md)

3. **Represents the codebase**:
   - **Technically**: With diagrams and specs
   - **Behaviorally**: With actors and features

4. **Generates documentation**:
   - **Technical diagrams**: Infrastructure, components, flows, states
   - **Workflow diagrams**: User flows and process flows
   - **Specs**: Technical contracts based on diagram objects
   - **Actors**: System users and external systems
   - **Features**: User-facing behavior with Gherkin scenarios

5. **Ensures proper linkages**: Links all generated files using the linkage system

## Sync Strategy

### Phase 1: Codebase Analysis
- Scan the entire codebase systematically
- Map file structure and organization
- Identify key components, services, modules
- Discover API routes and handlers
- Understand data models and schemas
- Analyze business logic and workflows

### Phase 2: Technical Representation
- **Create diagrams** that visualize:
  - Infrastructure and deployment architecture
  - Component relationships and interactions
  - Technical flows and data flows
- **Create specs** based on diagram objects:
  - API contracts from API components
  - Data structures from data components
  - Service contracts from service components

### Phase 3: Behavioral Representation
- **Create actors** for:
  - System users (from authentication/user code)
  - External systems (from integration code)
  - System services (from service code)
- **Create features** for:
  - User-facing functionality (from UI/API endpoints)
  - User workflows (from flow analysis)
  - Business processes (from business logic)

### Phase 4: Linkages
- Link features to specs via `spec_id`
- Link specs to diagrams via `diagram_id`
- Link diagrams to specs via `spec_id`
- Link features to actors (implicitly through behavior)
- Ensure bidirectional relationships where appropriate

## Important Constraints

- **Read the code, don't modify it**: This command ONLY updates AI documentation, never implementation code
- **Be thorough**: Don't skip files or make assumptions; actually read and analyze the code
- **Timeless documentation**: Write about ideal state, not changes or decisions
- **Diagram-first**: Create diagrams before specs, derive specs from diagram objects
- **Respect Forge patterns**: Use correct file types, formats (Gherkin, react-flow JSON), and frontmatter
- **Complete representation**: Ensure both technical (diagrams/specs) and behavioral (actors/features) aspects are covered

## Output Format

After sync, provide a summary report:

### Created
- List of new AI files created with brief description
- Organized by type (diagrams, specs, actors, features)

### Updated
- List of existing AI files updated with what changed

### Linkages
- Summary of linkages created between files

### Recommendations
- Areas that may need deeper documentation
- Suggestions for design sessions if major gaps exist

## Usage

1. Run `/forge` if needed to understand the system
2. Run `/forge-design` if needed to understand schemas
3. Run this command from the project root
4. The AI will systematically analyze your codebase
5. The AI will generate technical and workflow diagrams, actors, features, and specs
6. Review the sync report and verify linkages

This command ensures your Forge documentation accurately represents your codebase.