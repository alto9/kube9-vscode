<!-- forge-hash: 31dd5dc939bb8ec6bd6161e7c247cb5001e35ea52a7dd383913f0808ad754f1d -->

# Forge Scribe

This command distills a completed design session into actionable Stories and Tasks.

## Prerequisites

You must have a session in 'scribe' status before running this command.

## What This Command Does

1. **Calls MCP Tools**: Uses `get_forge_about` and `get_forge_schema` to understand distillation principles
2. **Analyzes session changes**: Reviews all changed files and their scenario-level modifications
3. **Creates Stories**: Generates implementation stories (< 30 minutes each) for code changes
4. **Creates Tasks**: Generates manual work items for non-code activities
5. **Updates session status**: Transitions session from 'scribe' to 'development'

## When to Use This Command

Run `forge-scribe` after:
- Ending a design session (status: 'scribe')
- All design changes have been committed and reviewed
- You're ready to break the design down into implementable work items

## How It Works

The command will:
1. Read the session file at `ai/sessions/<session-id>/<session-id>.session.md`
2. Analyze the `changed_files` array with scenario-level granularity
3. Review git diffs (if available) to understand precise changes
4. Follow context linkages to gather implementation guidance
5. Create story/task files in `ai/sessions/<session-id>/tickets/`
6. Update session status to 'development'

## Intelligent Context Building

**CRITICAL**: Before creating any tickets, you must systematically gather complete context through the following methodical procedure. This ensures tickets are informed by all relevant design artifacts, technical guidance, and architectural understanding.

### Phase 1: Global Context Discovery
1. **Find and read ALL global contexts**
   - Search for `ai/contexts/*.context.md` files (including nested folders)
   - Read every global context file found
   - Global contexts provide overarching technical guidance that applies to all tickets

### Phase 2: Feature and Spec Context Discovery
1. **Read all changed features and specs**
   - Read each file listed in the session's `changed_files` array
   - Pay special attention to `*.feature.md` and `*.spec.md` files
   
2. **Extract context linkages**
   - From each feature and spec, identify the `context_id` property
   - Read each context file referenced in `context_id` arrays
   - These provide specific guidance for the technologies/patterns used

### Phase 3: Spec Linkage Discovery
1. **Follow feature-to-spec relationships**
   - For each modified `*.feature.md` file, examine the `spec_id` property
   - Read all specs referenced in the `spec_id` array
   - This ensures you understand the technical implementation behind each feature
   
2. **Cross-reference bidirectionally**
   - Also check if any specs reference the modified features in their `feature_id` property
   - Capture the complete bidirectional relationship graph

### Phase 4: Object Type Context Discovery
1. **Extract technical object types**
   - Scan all modified specs for object type references (format: `<object-type>ObjectName`)
   - Common examples:
     - `<lambda>MyFunction` → object type: "lambda"
     - `<dynamodb>UsersTable` → object type: "dynamodb"
     - `<api>UserEndpoint` → object type: "api"
     - `<component>LoginForm` → object type: "component"
   
2. **Query MCP for object-specific guidance**
   - For each unique object type found, call `get_forge_context` with the object type
   - Example: `get_forge_context("lambda")` for AWS Lambda guidance
   - This provides just-in-time technical guidance for each technology involved

### Phase 5: Architectural Understanding
1. **Read all diagram files**
   - Examine every diagram file referenced in modified specs
   - Understand:
     - System architecture
     - Component relationships
     - Data flow
     - Integration points
     - Sequence diagrams for complex interactions
   
2. **Synthesize architectural context**
   - Build a mental model of how components interact
   - Identify integration boundaries
   - Understand dependencies between stories

### Phase 6: Synthesis and Validation
1. **Build complete context map**
   - Combine all gathered context into a comprehensive understanding
   - Map relationships between features, specs, contexts, and object types
   - Identify potential story dependencies
   
2. **Validate coverage**
   - Ensure every changed file has been analyzed
   - Confirm all context linkages have been followed
   - Verify all object types have been queried for guidance

### Context Building Checklist

Before creating tickets, verify:
- [ ] All global contexts read
- [ ] All feature/spec `context_id` references read
- [ ] All `spec_id` linkages followed
- [ ] All object types extracted and queried via `get_forge_context`
- [ ] All diagram files analyzed
- [ ] Complete architectural understanding achieved
- [ ] Context map synthesized

**Only after completing this methodical context gathering should you proceed to create tickets.** This ensures every story and task is informed by complete, accurate context and technical guidance.

## Story vs Task Decision

**Create Stories (*.story.md)** for:
- Code implementations
- New features or feature modifications
- Technical debt improvements
- Refactoring work
- API changes
- Database migrations

**Create Tasks (*.task.md)** for:
- Manual configuration in external systems
- Third-party service setup (AWS, Stripe, etc.)
- Documentation updates outside code
- Manual testing procedures
- DevOps configuration

## Critical Requirements

### 1. Keep Stories Minimal
Each story should take **< 30 minutes** to implement. Break large changes into multiple small stories.

### 2. Complete Context
Each story must include:
- Clear objective
- Acceptance criteria
- File paths involved
- Links to feature_id, spec_id
- Link to session_id

### 3. Sequential Numbering
All stories and tasks must use sequential numbering in their filenames to indicate implementation order:

- **Format**: Use three-digit numbers with leading zeros (001-, 002-, 003-, etc.)
- **Sequential dependencies**: Tickets that must be done in order get sequential numbers
- **Parallel work**: Tickets that can be done synchronously (no dependencies) share the same number
- **Example**: 
  - `001-implement-user-login.story.md` (must be done first)
  - `002-add-jwt-validation.story.md` (depends on 001)
  - `003-setup-auth0-integration.task.md` (can be done in parallel with next two)
  - `003-add-error-handling.story.md` (can be done in parallel with previous)
  - `003-update-documentation.task.md` (can be done in parallel with previous two)
  - `004-add-logging.story.md` (depends on 003 tickets being complete)

This numbering system helps track implementation order and identifies opportunities for parallel work.

### 4. Proper File Structure
All tickets go in: `ai/sessions/<session-id>/tickets/`

Example structure:
```
ai/sessions/
  └── session-123/
      ├── session-123.session.md
      └── tickets/
          ├── 001-implement-user-login.story.md
          ├── 002-setup-auth0-integration.task.md
          ├── 003-add-jwt-validation.story.md
          └── ...
```

### 5. Follow Schemas
All files must adhere to:
- Story schema (call `get_forge_schema story`)
- Task schema (call `get_forge_schema task`)

### 6. Link Everything
Every story/task MUST include:
```yaml
session_id: '<session-id>'
feature_id: [] # From changed files
spec_id: [] # From changed files
```

## Output Format

After distillation, provide a summary:

### Stories Created
- List of story files with brief description

### Tasks Created
- List of task files with brief description

### Coverage Report
- Which changed files are covered by which stories/tasks
- Ensure 100% coverage (every changed file accounted for)

## Example Usage

1. User ends design session → status changes to 'scribe'
2. User runs `@forge-scribe`
3. AI calls `get_forge_about` and `get_forge_schema`
4. AI reads session file and changed files
5. AI creates 5-10 small stories in `ai/sessions/<session-id>/tickets/`
6. AI updates session status to 'development'
7. User can now implement stories using `@forge-build`

This command ensures clean, minimal, implementable work items with complete context.