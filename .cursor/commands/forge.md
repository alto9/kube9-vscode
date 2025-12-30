<!-- forge-hash: 2f66ceb2804457c2ec37971c65fd6bde69ff79f3646d2cf4b1d6be247a3a8ac9 -->

# Forge

Forge is a session-driven context engineering system for AI-assisted development.

## 1. What is Forge?

Forge helps you design software systematically by:
- **Tracking changes** during design sessions
- **Converting design decisions** into minimal implementation stories
- **Providing complete context** for AI agents to implement changes
- **Following a session-driven workflow** from design to implementation

### Value Proposition

- **Context Engineering**: Build comprehensive context without overload
- **Session-Driven**: Track what changes and why during design work
- **Minimal Stories**: Break work into < 30 minute implementation stories
- **Complete Linkage**: Connect features, specs, diagrams, and code seamlessly

## 2. The Forge Workflow

### Phase 1: Start a Design Session

```
1. Run "Forge: Start Design Session" command
2. Provide problem statement
3. Session file created in ai/sessions/ with status: design
4. Changed files tracking begins (feature files only)
```

**What happens**:
- Session file created: `ai/sessions/<session-id>/<session-id>.session.md`
- Status set to `design`
- `changed_files` array tracks feature modifications at scenario-level
- `start_commit` records git SHA for comparison

### Phase 2: Design Changes

During an active session, you update AI documentation:

**TRACKED** (recorded in `changed_files`):
- ✅ **Features** (*.feature.md) - User-facing behavior with Gherkin scenarios

**NOT TRACKED** (always editable):
- ⚪ **Specs** (*.spec.md) - Technical implementation details
- ⚪ **Diagrams** (*.diagram.md) - Visual architecture with React Flow
- ⚪ **Actors** (*.actor.md) - System personas and roles

**Why Only Features?**
Features are **DIRECTIVE** (they drive code changes). Specs and diagrams are **INFORMATIVE** (they explain how to implement). Only tracking features keeps sessions focused while allowing specs to evolve freely.

### Phase 3: Distill Session

```
1. End design session (status changes to 'scribe')
2. Run "Forge: Distill Session" command
3. System analyzes changed feature files
4. Follows linkages to discover related specs and diagrams
5. Creates Stories (code work) and Tasks (non-code work)
6. Places them in ai/sessions/<session-id>/tickets/
7. Status changes to 'development'
```

**Distillation Magic**:
- Reads all changed feature files
- Follows `spec_id` linkages to find related specs
- Follows `diagram_id` linkages for architecture context
- Creates minimal stories (< 30 minutes each)
- Ensures complete context without overload

### Phase 4: Build Implementation

```
1. Select a story file from ai/sessions/<session-id>/tickets/
2. Run "Forge: Build Story" command
3. AI reads story with complete linked context
4. AI implements the code changes
5. AI writes tests
6. Review and commit
```

## 3. File Types and Structure

### Sessions (ai/sessions/)

**Purpose**: Track design work and changes

**File Format**: `<session-id>.session.md`

**Structure**:
```yaml
---
session_id: unique-session-id
start_time: ISO timestamp
end_time: ISO timestamp (when ended)
status: design | scribe | development
problem_statement: What are we solving?
changed_files:
  - path: ai/features/path/to/feature.feature.md
    change_type: added | modified | removed
    scenarios_added: [list of scenario names]
    scenarios_modified: [list of scenario names]
    scenarios_removed: [list of scenario names]
start_commit: git SHA at session start
---
```

**Status Lifecycle**:
- `design` → Active session, making changes
- `scribe` → Design complete, ready to distill into stories
- `development` → Stories created, ready for implementation

### Features (ai/features/)

**Purpose**: Define WHAT users can do (user-facing behavior)

**File Format**: `<feature-name>.feature.md`

**Structure**:
```yaml
---
feature_id: unique-feature-id
name: Human Readable Name
description: Brief description
spec_id:
  - related-spec-id-1
  - related-spec-id-2
---

\`\`\`gherkin
Scenario: Scenario name
  Given a precondition
  When an action occurs
  Then an expected outcome happens
  And additional assertions
\`\`\`
```

**Key Points**:
- **DIRECTIVE**: Features drive code changes
- Uses Gherkin format in code blocks
- Tracked at scenario-level during sessions
- Every features folder should have `index.md` with Background and Rules

### Specs (ai/specs/)

**Purpose**: Define HOW features should be implemented (technical contracts)

**File Format**: `<spec-name>.spec.md`

**Structure**:
```yaml
---
spec_id: unique-spec-id
name: Human Readable Name
description: Brief description
feature_id:
  - related-feature-id-1
diagram_id:
  - related-diagram-id-1
---

# Spec Name

## Overview
High-level technical overview

## Architecture
See [diagram-name](../diagrams/path/diagram.diagram.md)

## Implementation Details
API contracts, data structures, validation rules, constraints

## Technical Requirements
Technologies, versions, dependencies
```

**Key Points**:
- **INFORMATIVE**: Specs explain implementation details
- NOT tracked in sessions, always editable
- Links to diagrams for visual architecture
- Contains contracts, not implementation code

### Diagrams (ai/diagrams/)

**Purpose**: Visualize system architecture and flows

**File Format**: `<diagram-name>.diagram.md`

**Structure**:
```yaml
---
diagram_id: unique-diagram-id
name: Human Readable Name
description: What the diagram shows
type: infrastructure | components | flows | states
spec_id:
  - related-spec-id-1
feature_id:
  - related-feature-id-1
---

# Diagram Name

Brief description

\`\`\`json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Component", "description": "Details" }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "Connection",
      "type": "smoothstep"
    }
  ]
}
\`\`\`
```

**Key Points**:
- Uses React Flow JSON format
- NOT tracked in sessions
- Types: infrastructure, components, flows, states
- Keep visual, avoid pseudocode

### Actors (ai/actors/)

**Purpose**: Define who/what interacts with the system

**File Format**: `<actor-name>.actor.md`

**Structure**:
```yaml
---
actor_id: unique-actor-id
name: Human Readable Name
type: user | system | external
description: Brief description
---

# Actor Name

## Overview
Who/what this actor is

## Responsibilities
- What they do
- Actions they take

## Characteristics
- Key attributes
- Permissions/access levels
```

**Key Points**:
- NOT tracked in sessions, always editable
- Describes system users and external systems
- Informs feature design and UX decisions

### Tickets (ai/sessions/<session-id>/tickets/)

**Purpose**: Implementation work items generated from sessions

**File Formats**:
- `<number>-<name>.story.md` - Code implementation (< 30 minutes)
- `<number>-<name>.task.md` - Manual/external work

**Story Structure**:
```yaml
---
story_id: unique-story-id
session_id: parent-session-id
feature_id:
  - related-feature-id
spec_id:
  - related-spec-id
status: pending | in_progress | completed
---

# Story Title

## Objective
Clear goal

## Context
Why this matters

## Files to Modify
- path/to/file.ts

## Implementation Steps
1. Step one
2. Step two

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Estimated Time
< 30 minutes
```

## 4. Key Principles

### Gherkin Format

All Gherkin MUST use code blocks:

```gherkin
Feature: Feature Name

Scenario: Scenario Name
  Given a precondition
  When an action occurs
  Then an expected outcome happens
```

**Why?** Consistent formatting, syntax highlighting, clear structure.

### Minimal Stories

- **Each story < 30 minutes** to implement
- **Break complex changes** into multiple small stories
- **One focused change** per story
- **Clear acceptance criteria** for verification

**Example**:
❌ "Implement user authentication" (too big)
✅ "Add login API endpoint" (15 min)
✅ "Add password validation logic" (20 min)
✅ "Create login UI component" (25 min)

### Nestable Structure

- **All folders are nestable** to group related concepts
- **Features folders have index.md** with Background and Rules
- **index.md never shows** in tree views
- **Nesting reflects** logical relationships

**Example**:
```
ai/features/
  └── authentication/
      ├── index.md (Background, Rules)
      ├── login.feature.md
      ├── logout.feature.md
      └── password-reset/
          ├── index.md
          ├── request-reset.feature.md
          └── confirm-reset.feature.md
```

### Complete Context

- **Stories link** to features, specs, diagrams
- **Distillation follows** all linkages to gather context
- **Context building** ensures nothing is missed
- **No overload** - only relevant context included

## 5. When to Create Stories vs Tasks

### Create Stories (*.story.md) When:

✅ **Code implementations**
- Writing or modifying application code
- Adding new features or endpoints
- Refactoring existing code
- Fixing bugs in codebase

✅ **Testable work**
- Changes are verifiable through tests
- Implementation can be validated
- Takes < 30 minutes to complete

✅ **Within codebase**
- Work happens in version-controlled code
- Changes committed to git
- Affects application functionality

### Create Tasks (*.task.md) When:

📋 **Manual work**
- Configuration in external systems
- Third-party service setup (AWS, Auth0, Stripe)
- Manual testing procedures
- Documentation outside codebase

📋 **Coordination required**
- Human decision-making needed
- External approvals or reviews
- Research or investigation
- DevOps configuration

📋 **Non-code activities**
- README updates
- Wiki documentation
- Process changes
- Manual data migrations

## 6. The Linkage System

### How Files Link Together

```
Features ←→ Specs ←→ Diagrams
   ↓           ↓
Stories     Stories
```

**Linkage Fields**:
- `feature_id` - Links features to specs and stories
- `spec_id` - Links specs to features, diagrams, and stories
- `diagram_id` - Links diagrams to specs

**Bidirectional**:
- Features reference specs (`spec_id: []`)
- Specs reference features (`feature_id: []`)
- Both directions work for context gathering

### Context Gathering Process

When distilling a session:

1. **Start with changed features**
   - Read all modified feature files
   - Understand what behavior changed

2. **Follow feature_id → spec_id**
   - For each feature, find linked specs
   - Understand technical implementation details

3. **Follow spec_id → diagram_id**
   - For each spec, find linked diagrams
   - Understand architecture and visual context

4. **Include all discovered context**
   - Stories get complete context from chain
   - No manual hunting for related files

5. **Ensure complete picture**
   - Nothing missed through systematic linkage
   - No context overload, only relevant info

**Example**:
```
Feature: user-login.feature.md
  spec_id: [authentication-api]
  
Spec: authentication-api.spec.md
  feature_id: [user-login]
  diagram_id: [auth-flow]
  
Diagram: auth-flow.diagram.md
  spec_id: [authentication-api]

Story: 001-implement-login-endpoint.story.md
  feature_id: [user-login]
  spec_id: [authentication-api]
  // Gets complete context from feature + spec + diagram
```

## 7. Session Status Management

### Session Statuses

| Status | Meaning | Actions Available |
|--------|---------|------------------|
| `design` | Active design session | Edit features, specs, diagrams |
| `scribe` | Design complete | Ready to distill into stories |
| `development` | Stories created | Implement stories with /forge-build |

### Status Transitions

```
[Start Session] → design
      ↓
[End Session] → scribe
      ↓
[Distill Session] → development
      ↓
[Implement Stories] → (back to design for new session)
```

### Status Rules

**design status**:
- Features can be edited (tracked in changed_files)
- Specs/diagrams/actors always editable (not tracked)
- Session file shows status: design

**scribe status**:
- Design work complete
- Ready for distillation
- Run "Forge: Distill Session" command
- System creates stories and tasks

**development status**:
- Stories created in ai/sessions/<session-id>/tickets/
- Ready for implementation
- Use "Forge: Build Story" command
- Implement, test, commit, repeat

## Usage Patterns

### Combined with other commands

```
/forge /forge-design
# Provides complete workflow context + design guidance

/forge /forge-build <story-file>
# Provides complete workflow context + build guidance

/forge /forge-scribe <session-id>
# Provides complete workflow context + distillation guidance
```

### When to use /forge

Use `/forge` when you need to understand:
- The complete Forge workflow
- How sessions work
- File types and their purposes
- How to structure documentation
- The linkage system
- When to create stories vs tasks

This command provides foundational context that other Forge commands build upon.