<!-- forge-hash: 7d7b6419b04961fe69dcdb16267543b98f4f0a62e774e395198086795df3554f -->

# Forge Design

This command guides AI agents when working within Forge design sessions to update documentation.

## Prerequisites

You must have an active design session before making changes to AI documentation.

## What This Command Does

1. **Provides complete schema information**: All document schemas embedded below for self-contained design guidance
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

## Intelligent Linkage and Grouping

When working with Forge documentation, it's essential to understand and respect the existing organizational structure:

- **Analyze folder structure**: Before creating new files, examine the existing `ai/` subfolder structure to understand how elements are logically grouped
- **Follow existing patterns**: Contribute to existing grouping patterns rather than creating new arbitrary structures
- **Respect nesting**: Folder nesting reflects logical relationships - preserve and extend these relationships when adding new files
- **Utilize linkages effectively**: Use all element linkages (feature_id, spec_id) to build complete context, but avoid over-verbosity
- **Group logically**: Place related files together in nested folders that reflect their relationships and dependencies
- **Maintain consistency**: When adding new documentation, follow the same organizational patterns already established in the project

Understanding the existing structure helps maintain coherence and makes the documentation easier to navigate and understand.

## Important Constraints

- **This is a Forge design session**: You are working within a structured design workflow
- **Only modify AI documentation files**: Work exclusively within the `ai/` folder
- **Do NOT modify implementation code**: This command is for updating features, diagrams, specs, actors only
- **Track all changes**: Ensure changed files are tracked in the active session's `changed_files` array
- **Use proper formats**: Features use Gherkin in code blocks, Diagrams use react-flow JSON format, Specs use markdown only
- **No MCP tools needed**: All schemas and guidance are embedded in this command - completely self-contained

## Usage

1. Ensure you have an active design session
2. Run this command
3. The AI will use embedded schemas to understand file formats
4. The AI will analyze existing AI documentation
5. The AI will update documentation in the ai/ folder
6. All changes will be tracked in the active design session

The documentation updates will be consistent with your existing design patterns and the Forge workflow.