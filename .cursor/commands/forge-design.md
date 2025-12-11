<!-- forge-hash: c6a15a9e822b1263185c8d986beef9a51ca15d315fcfaef349bf3e30445f6bf5 -->

# Forge Design

This command guides AI agents when working within Forge design sessions to update documentation.

## Prerequisites

If you're not familiar with Forge, run `/forge` first to understand the documentation system.

You must have an active design session before making changes to AI documentation.

## What This Command Does

1. **Provides complete schema information**: All document schemas embedded below
2. **Checks for active session**: Ensures you're working within a structured design workflow
3. **Reads AI documentation**: Understands existing design patterns and structure
4. **Guides documentation updates**: Helps create or modify features, diagrams, specs, actors
5. **Tracks all changes**: Ensures changed files are tracked in the active session's `changed_files` array

## Document Schemas

### Actor Schema (*.actor.md)

**Purpose**: Define system actors and personas

**File Naming**: `<actor-name>.actor.md` (kebab-case)

**Location**: `ai/actors/` (nestable)

**Frontmatter**:
```yaml
---
actor_id: unique-actor-id  # kebab-case, matches filename
name: Human Readable Actor Name
type: user | system | external  # Actor type
description: Brief description of the actor
---
```

**Content Structure**:
```markdown
# Actor Name

## Overview
Brief description of who/what this actor is

## Responsibilities
- What this actor does in the system
- Actions they can take
- Interactions they have

## Characteristics
- Key attributes
- Permissions/access levels
- Context for their role

## Examples
Example scenarios showing this actor in action
```

**Example**:
```markdown
---
actor_id: authenticated-user
name: Authenticated User
type: user
description: A user who has successfully logged into the system
---

# Authenticated User

## Overview
A user who has completed the authentication process and has an active session.

## Responsibilities
- Access protected resources
- Manage their profile
- Perform authorized actions

## Characteristics
- Has valid session token
- Associated with user account
- Has specific role-based permissions

## Examples
An authenticated user accessing their dashboard or updating their settings.
```

### Feature Schema (*.feature.md)

**Purpose**: Define user-facing behavior with Gherkin scenarios

**File Naming**: `<feature-name>.feature.md` (kebab-case)

**Location**: `ai/features/` (nestable)

**Frontmatter**:
```yaml
---
feature_id: unique-feature-id  # kebab-case, matches filename
name: Human Readable Feature Name
description: Brief description of the feature
spec_id:  # List of related specs (optional)
  - spec-id-1
  - spec-id-2
---
```

**Content Structure**:
- Gherkin scenarios in code blocks (\`\`\`gherkin)
- Each scenario describes specific behavior
- Use Given/When/Then format

**Example**:
```markdown
---
feature_id: user-login
name: User Login
description: Users can authenticate with email and password
spec_id:
  - authentication-api
---

# User Login

\`\`\`gherkin
Scenario: Successful login with valid credentials
  Given a registered user with email "user@example.com"
  And the password is "SecurePass123"
  When they submit the login form
  Then they should be redirected to the dashboard
  And they should have an active session token
\`\`\`

\`\`\`gherkin
Scenario: Failed login with invalid password
  Given a registered user with email "user@example.com"
  And the password is incorrect
  When they submit the login form
  Then they should see an error message "Invalid credentials"
  And they should remain on the login page
\`\`\`
```

**Index Files**: Features folders should have `index.md` with Background and Rules:
```markdown
---
folder_id: feature-group-id
name: Feature Group Name
description: Description of feature group
---

# Feature Group Name

## Background

\`\`\`gherkin
Background: Shared context for all features
  Given some common precondition
  And another shared setup
  When using these features
  Then they all operate within this context
\`\`\`

## Rules

\`\`\`gherkin
Rule: Shared rule for feature group
  Given a condition
  When something happens
  Then this rule applies to all features
\`\`\`
```

### Spec Schema (*.spec.md)

**Purpose**: Define technical implementation details

**File Naming**: `<spec-name>.spec.md` (kebab-case)

**Location**: `ai/specs/` (nestable)

**Frontmatter**:
```yaml
---
spec_id: unique-spec-id  # kebab-case, matches filename
name: Human Readable Spec Name
description: Brief description of the technical specification
feature_id:  # List of related features (optional)
  - feature-id-1
  - feature-id-2
diagram_id:  # List of related diagrams (optional)
  - diagram-id-1
  - diagram-id-2
---
```

**Content Structure**:
```markdown
# Spec Name

## Overview
High-level technical overview

## Architecture
Reference to related diagrams:
See [diagram-name](../diagrams/path/diagram-name.diagram.md) for architecture.

## Implementation Details
Detailed technical specifications, including:
- API contracts
- Data structures
- Validation rules
- Constraints
- Configuration

## Technical Requirements
Required technologies, versions, dependencies

## Best Practices
Implementation guidance and patterns
```

**Example**:
```markdown
---
spec_id: authentication-api
name: Authentication API
description: REST API endpoints for user authentication
feature_id:
  - user-login
  - user-logout
diagram_id:
  - auth-flow
---

# Authentication API

## Overview
REST API for handling user authentication with JWT tokens.

## Architecture
See [auth-flow](../diagrams/auth/auth-flow.diagram.md) for authentication flow.

## Implementation Details

### POST /api/auth/login
Request:
\`\`\`json
{
  "email": "string",
  "password": "string"
}
\`\`\`

Response (200):
\`\`\`json
{
  "token": "jwt-token-string",
  "userId": "user-id",
  "expiresAt": "2024-12-31T23:59:59Z"
}
\`\`\`

Response (401):
\`\`\`json
{
  "error": "Invalid credentials"
}
\`\`\`

## Technical Requirements
- Node.js >=22.14.0
- jsonwebtoken library
- bcrypt for password hashing
- Token expiration: 24 hours
```

### Diagram Schema (*.diagram.md)

**Purpose**: Provide visual architecture using React Flow JSON format

**File Naming**: `<diagram-name>.diagram.md` (kebab-case)

**Location**: `ai/diagrams/` (nestable)

**Frontmatter**:
```yaml
---
diagram_id: unique-diagram-id  # kebab-case, matches filename
name: Human Readable Diagram Name
description: Brief description of what the diagram shows
type: infrastructure | components | flows | states  # Diagram type
spec_id:  # List of related specs (optional)
  - spec-id-1
feature_id:  # List of related features (optional)
  - feature-id-1
---
```

**Content Structure**:
```markdown
# Diagram Name

Brief description of the diagram's purpose.

\`\`\`json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { 
        "label": "Node Label",
        "description": "Node description"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "Edge label",
      "type": "smoothstep"
    }
  ]
}
\`\`\`

## Diagram Notes

Additional context, explanations, or important details about the diagram.
```

**Example**:
```markdown
---
diagram_id: auth-flow
name: Authentication Flow
description: Visual representation of user authentication process
type: flows
spec_id:
  - authentication-api
feature_id:
  - user-login
---

# Authentication Flow

This diagram shows the complete flow of user authentication from login request to session establishment.

\`\`\`json
{
  "nodes": [
    {
      "id": "client",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Client", "description": "Web/Mobile client" }
    },
    {
      "id": "api",
      "type": "default",
      "position": { "x": 300, "y": 100 },
      "data": { "label": "API Gateway", "description": "REST API" }
    },
    {
      "id": "auth",
      "type": "default",
      "position": { "x": 500, "y": 100 },
      "data": { "label": "Auth Service", "description": "Authentication logic" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "client",
      "target": "api",
      "label": "POST /auth/login",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "api",
      "target": "auth",
      "label": "Validate credentials",
      "type": "smoothstep"
    }
  ]
}
\`\`\`

## Flow Steps

1. Client submits credentials to API
2. API forwards to Auth Service
3. Auth Service validates and generates token
4. Token returned to client
```

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

## The Linkage System

### How Files Link Together

Files connect through ID references in their frontmatter:

```
Features ←→ Specs ←→ Diagrams
   ↓           ↓
Tickets     Tickets
```

**Linkage Fields**:
- `feature_id` - Links features to specs and tickets
- `spec_id` - Links specs to features, diagrams, and tickets
- `diagram_id` - Links diagrams to specs

**Bidirectional Relationships**:
- Features reference specs (`spec_id: []`)
- Specs reference features (`feature_id: []`)
- Both directions work for context gathering

**Multiple Relationships**:
- Multiple diagram objects can share the same spec if it makes sense
- A diagram can link to multiple specs
- A spec can link to multiple diagrams
- Relationships are not mutually exclusive

### Context Gathering Process

When following linkages:

1. **Start with a feature or spec**
2. **Follow `spec_id` or `feature_id`** to discover related files
3. **Follow `diagram_id`** to find visual architecture
4. **Build complete context** by following all linkages
5. **Ensure nothing is missed** through systematic traversal

**Example**:
```
Feature: user-login.feature.md
  spec_id: [authentication-api]
  
Spec: authentication-api.spec.md
  feature_id: [user-login]
  diagram_id: [auth-flow, api-architecture]
  
Diagram: auth-flow.diagram.md
  spec_id: [authentication-api]
  
Diagram: api-architecture.diagram.md
  spec_id: [authentication-api, user-management-api]
```

## Diagram-First Approach

### Create Diagrams Before Specs

**CRITICAL**: When designing new functionality, create diagrams first, then derive specs from diagram objects.

**Workflow**:
1. **Create diagrams** that visualize:
   - Technical implementations (infrastructure, components)
   - User workflows (flows, states)
2. **Analyze diagram objects** (nodes, edges, components)
3. **Create specs** based on what the diagrams show
4. **Link specs to diagrams** via `diagram_id`

### Diagram Types

Diagrams should support both:
- **Technical implementations**: Infrastructure, components, system architecture
- **User workflows**: Flows, states, user journeys

**Types**:
- `infrastructure` - System infrastructure and deployment
- `components` - Component architecture and relationships
- `flows` - Process flows and user workflows
- `states` - State machines and state transitions

### Spec Creation from Diagrams

When creating specs based on diagrams:
- **Identify diagram objects** that need technical contracts
- **Group related objects** into logical specs
- **Multiple diagram objects can share a spec** if they represent the same technical concept
- **Prefer specs that reflect diagram structure** rather than arbitrary groupings

**Example**: If a diagram shows "API Gateway → Auth Service → Database", create specs for:
- API Gateway contract (based on API Gateway node)
- Auth Service contract (based on Auth Service node)
- Database schema (based on Database node)

These specs link back to the diagram via `diagram_id`.

## Timeless Documentation

**CRITICAL**: All Forge documents (except sessions) must describe the **ideal state**, not changes or decisions.

**Do NOT**:
- ❌ Describe what changed or why
- ❌ Reference specific decisions or alternatives considered
- ❌ Use language like "we decided to..." or "changed from X to Y"
- ❌ Include timestamps or version history
- ❌ Describe implementation status

**DO**:
- ✅ Describe what the system IS
- ✅ Describe how it SHOULD work
- ✅ Use present tense ("The system authenticates users...")
- ✅ Focus on the ideal, complete state
- ✅ Write as if the system already exists perfectly

**Example**:

❌ **Bad**: "We decided to use JWT tokens for authentication. This replaced the previous session-based approach."

✅ **Good**: "The system authenticates users using JWT tokens. Tokens are issued upon successful login and included in subsequent requests."

Sessions are the only exception - they track changes over time. All other documentation is timeless.

## Intelligent Linkage and Grouping

When working with Forge documentation:

- **Analyze folder structure**: Examine existing `ai/` subfolder structure to understand grouping patterns
- **Follow existing patterns**: Contribute to existing patterns rather than creating arbitrary structures
- **Respect nesting**: Folder nesting reflects logical relationships
- **Utilize linkages effectively**: Use all element linkages to build complete context
- **Group logically**: Place related files together in nested folders
- **Maintain consistency**: Follow established organizational patterns

## Important Constraints

- **This is a Forge design session**: You are working within a structured design workflow
- **Only modify AI documentation files**: Work exclusively within the `ai/` folder
- **Do NOT modify implementation code**: This command is for updating features, diagrams, specs, actors only
- **Track all changes**: Ensure changed files are tracked in the active session's `changed_files` array (features only)
- **Use proper formats**: Features use Gherkin in code blocks, Diagrams use react-flow JSON format, Specs use markdown only
- **Timeless documentation**: Write about ideal state, not changes or decisions
- **Diagram-first**: Create diagrams before specs, derive specs from diagram objects
- **Follow linkages**: Use the linkage system to discover related documentation

## Usage

1. Run `/forge` if you need to understand the Forge system
2. Ensure you have an active design session
3. Run this command
4. Use embedded schemas to understand file formats
5. Analyze existing AI documentation
6. Update documentation following diagram-first approach and timeless principles
7. Track all feature changes in the active session

The documentation updates will be consistent with your existing design patterns and the Forge workflow.