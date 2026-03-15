# Agent Flow and Responsibility Delegation

This document describes the intended flow of responsibility among Forge agents. Use it to understand when to invoke which agent and how work should be delegated.

## Commands and Flows

Five canonical commands orchestrate the agent flows:

| Command | Input | Output |
|---------|-------|--------|
| `/architect-this {string}` | User prompt | Updated `.forge` documents |
| `/plan-roadmap` | `.forge/roadmap.json` | Updated roadmap, synced GitHub milestones/issues |
| `/refine-issue {link}` | GitHub issue link | Refined tickets ready for development |
| `/build-from-github` | GitHub issue link | GitHub pull request |
| `/review-pr {link}` | GitHub PR link | PR with review (human performs merge) |

---

## 1. Architecting Flow (`/architect-this`)

```
User ──► Architect Agent ──► [Clarity check]
                                    │
                    ┌───────────────┴───────────────┐
                    │ No clarity                    │ Yes
                    ▼                               ▼
              Loop to user              Examine input for SME subagents
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
              Runtime Agent            BusinessLogic Agent           Data Agent
              Interface Agent          Integration Agent           Operations Agent
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                               ▼
                                    Invoke Planner with recap
```

**Steps:**
1. Architect retrieves `vision.json` and determines if adjustments are needed.
2. **Clarity check:** Have enough clarity to prompt SME agents? If no, loop back to user.
3. Examine user input to determine which SME subagents to invoke (async).
4. Each SME: examine prompt input; examine files in domain; make concise updates.
5. Invoke Planner subagent with recap of changes made.

---

## 2. Planning Flow (`/plan-roadmap`)

```
User ──► Planner Agent ──► Retrieve vision.json, knowledge_map.json, roadmap.json
                    │
                    ▼
         Retrieve milestones and issues from GitHub
                    │
                    ▼
              [Clarity check]
                    │
        ┌───────────┴───────────┐
        │ No                   │ Yes
        ▼                      ▼
   Loop to user      Verify/correct roadmap.json
                              │
                              ▼
                    Sync roadmap with GitHub
                    (avoid past/in-flight tickets)
```

**Steps:**
1. Retrieve `vision.json` and `knowledge_map.json`.
2. Retrieve milestones and milestone issues from GitHub (use available tools).
3. Retrieve `roadmap.json` from code.
4. **Clarity check:** Have enough clarity to generate roadmap? If no, loop to user.
5. Verify accuracy of `roadmap.json` or correct.
6. Sync the roadmap with GitHub; do not update past or in-flight tickets.

---

## 3. Refining Flow (`/refine-issue`)

```
User (Github Issue Link) ──► Refine Agent
                                    │
                                    ▼
                    Retrieve issue text from GitHub
                                    │
                                    ▼
                    create-feature-branch parent from main
                                    │
                                    ▼
              Consult SME Agents for technical info and implementation guides
                                    │
                                    ▼
                    Update issue based on template
                                    │
                                    ▼
                    Create sub-issues on parent (always at least one)
                                    │
                                    ▼
                    create-feature-branch each sub-issue from parent
```

**Steps:**
1. Retrieve issue text from GitHub (use available tools).
2. Create parent branch from main: `create-feature-branch feature/issue-{parent-number} main`.
3. Consult SME Agents (runtime, business_logic, data, interface, integration, operations) for technical information and implementation guides.
4. Update the issue based on the issue template; ensure all required details are included.
5. Create sub-issues on the parent ticket (always at least one).
6. Create sub-issue branches from the parent branch: `create-feature-branch feature/issue-{child-number} feature/issue-{parent-number}`. Sub-issues merge into the parent branch for a single PR to main.

---

## 4. Building Flow (`/build-from-github`)

```
User (Github Issue Link) ──► Build Development Agent
                                    │
                                    ▼
                         Retrieve sub-issue details
                         Checkout branch (create from parent if missing)
                                    │
                                    ▼
                         Perform code changes
                         unit-test, integration-test, lint-test
                                    │
                                    ▼
              Build Security Agent
              - Scan for vulnerabilities
                    │
                    ▼
              Build Wrap Agent
              - commit, push-branch
              - Create GitHub PR (use available tools)
```

**Steps:**
1. Build Development: retrieve sub-issue details; ensure branch exists and checkout (create from parent branch if missing).
2. Build Development: perform code changes; validate with unit-test, integration-test, lint-test.
3. Build Security: scan changes for security vulnerabilities.
4. Build Wrap: commit, push-branch; create GitHub pull request (use available tools). When creating the PR, build_wrap uses `.github/pull_request_template.md` if present, otherwise a standard fallback template.

---

## 5. Reviewing Flow (`/review-pr`)

```
User (Github PR Link) ──► Review Implementation Agent
                                    │
                                    ▼
                         Retrieve PR details
                         Checkout PR source branch
                         Review implementation for accuracy
                                    │
                                    ▼
                         Review Security Agent
                         - Check for vulnerabilities in changeset
                                    │
                                    ▼
                         Review Wrap Agent
                         - Add review to PR (do not merge; human performs merge)
```

**Steps:**
1. Review Implementation: retrieve PR details; checkout PR source branch; review implementation for accuracy.
2. Review Security: check for security vulnerabilities introduced in the changeset.
3. Review Wrap: add the review to the PR to aid manual human approval. Do not merge; a human will perform the merge.

---

## Hierarchy

```
Visionary (vision.json)
    │
    ▼
Architect ──────────────────────────────────────────────────────────┐
    │                                                                 │
    │  Delegates to subject matter experts when scope matches         │
    │                                                                 │
    ├──► Runtime        (.forge/runtime/)                             │
    ├──► Business Logic (.forge/business_logic/)                       │
    ├──► Data           (.forge/data/)                                │
    ├──► Interface      (.forge/interface/)                           │
    ├──► Integration    (.forge/integration/)                          │
    └──► Operations     (.forge/operations/)                          │
                                                                      │
Planner (roadmap.json) ◄────────────────────────────────────────────┘
    │
    ▼
Refine (decomposes tickets)
    │
    ▼
Build / Review (implementation and validation)
```

## Domain Subagents: Subject Matter Experts

Each domain subagent owns its contracts and performs updates:

| Subagent | Owns | Responsibilities |
|----------|------|-------------------|
| **runtime** | `.forge/runtime/` | Configuration, startup, lifecycle, execution model |
| **business_logic** | `.forge/business_logic/` | Domain model, user stories, error handling |
| **data** | `.forge/data/` | Data model, persistence, serialization, consistency |
| **interface** | `.forge/interface/` | Input handling, presentation, interaction flow |
| **integration** | `.forge/integration/` | API contracts, external systems, messaging |
| **operations** | `.forge/operations/` | Build, deployment, observability, security |

Domain subagents are **invoked by the Architect** when work falls in their scope. They perform the actual file updates and contract maintenance.

## Knowledge Map

`.forge/knowledge_map.json` defines the structure of domain contracts. Use it to:

- Map domains to their primary docs and children
- Determine which subagent to invoke for a given file or topic
- Understand the boundaries between domains

## When to Invoke Which Agent

| Prompt concerns | Invoke |
|------------------|--------|
| Product vision, strategy, market | Visionary |
| Cross-domain architecture, technical direction, routing | Architect |
| Architect prompt touching runtime/config/lifecycle | Architect → runtime |
| Architect prompt touching data/persistence/schema | Architect → data |
| Architect prompt touching domain rules, user stories | Architect → business_logic |
| Architect prompt touching UI, inputs, presentation | Architect → interface |
| Architect prompt touching APIs, external systems | Architect → integration |
| Architect prompt touching build, deploy, security | Architect → operations |
| Milestones, roadmap sequencing | Planner |
| Ticket decomposition | Refine |
| Implementation, tests | Build |
| Code review, security review | Review |
