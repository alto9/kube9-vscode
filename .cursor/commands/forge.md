<!-- forge-hash: 18edf270f80a5d21428e41b500a07a567c20e2046a343d48aa9e66fdf56793e3 -->

# Forge

Forge is a session-driven context engineering system for AI-assisted development. This command introduces you to the Forge documentation system and how its elements work together.

## What is Forge?

Forge helps you design software systematically by tracking design changes during sessions and converting them into minimal implementation stories with complete context.

## Documentation Elements

### Sessions (ai/sessions/)

**Purpose**: Track design work and changes over time

Sessions are the only time-bound element in Forge. They capture:
- What problem is being solved
- Which features changed during the session
- The progression from design → scribe → development

**Status Lifecycle**:
- `design` - Active session, making design changes
- `scribe` - Design complete, ready to distill into stories
- `development` - Stories created, ready for implementation

### Features (ai/features/)

**Purpose**: Define WHAT users can do (user-facing behavior)

Features describe user-facing functionality using Gherkin scenarios. They are **DIRECTIVE** - they drive code changes and are tracked during design sessions.

**Key Characteristics**:
- Uses Gherkin format in code blocks
- Tracked at scenario-level during sessions
- Links to specs via `spec_id` field
- Folders can have `index.md` with Background and Rules

### Specs (ai/specs/)

**Purpose**: Define HOW features should be implemented (technical contracts)

Specs describe technical implementation details, API contracts, data structures, and validation rules. They are **INFORMATIVE** - they explain how to implement features.

**Key Characteristics**:
- NOT tracked in sessions (always editable)
- Links to features via `feature_id` field
- Links to diagrams via `diagram_id` field
- Contains contracts, not implementation code

### Diagrams (ai/diagrams/)

**Purpose**: Visualize system architecture and workflows

Diagrams provide visual representation of system structure using React Flow JSON format. They support both technical implementations and user workflows.

**Key Characteristics**:
- Uses React Flow JSON format
- Types: infrastructure, components, flows, states
- NOT tracked in sessions (always editable)
- Links to specs via `spec_id` field
- Links to features via `feature_id` field

### Actors (ai/actors/)

**Purpose**: Define who/what interacts with the system

Actors describe system users, external systems, and other entities that interact with the system.

**Key Characteristics**:
- Types: user, system, external
- NOT tracked in sessions (always editable)
- Informs feature design and UX decisions

### Tickets (ai/sessions/<session-id>/tickets/)

**Purpose**: Implementation work items generated from sessions

Tickets are created during session distillation:
- **Stories** (*.story.md) - Code implementation work (< 30 minutes each)
- **Tasks** (*.task.md) - Manual/external work

## How the System Works

### The Linkage System

Files link together through ID references:
- Features link to Specs (`spec_id`)
- Specs link to Features (`feature_id`) and Diagrams (`diagram_id`)
- Diagrams link to Specs (`spec_id`) and Features (`feature_id`)
- Tickets link to Features (`feature_id`) and Specs (`spec_id`)

These linkages enable systematic context gathering - when working with a feature, you can follow links to discover all related specs and diagrams.

### Session-Driven Workflow

1. **Design**: Create/modify features during a design session
2. **Scribe**: Distill changed features into stories and tasks
3. **Development**: Implement stories using linked documentation

Only features are tracked during sessions. Specs, diagrams, and actors are always editable and evolve independently.

## Key Principles

- **Timeless Documentation**: All documents (except sessions) describe the ideal state, not changes or decisions
- **Complete Context**: Linkages ensure all related documentation is discoverable
- **Minimal Stories**: Each story should take < 30 minutes to implement
- **Nestable Structure**: Folders can be nested to group related concepts

## When to Use This Command

Use `/forge` when you need to understand:
- What Forge is and how it works
- The purpose of each documentation element
- How the linkage system enables context gathering
- The session-driven workflow

For detailed schemas and implementation guidance, use `/forge-design`.