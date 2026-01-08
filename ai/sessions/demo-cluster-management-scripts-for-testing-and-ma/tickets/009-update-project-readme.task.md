---
task_id: 009-update-project-readme
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
status: pending
---

# Update Project README with Demo Cluster Section

## Objective

Add a section to the main project README.md that introduces the demo cluster system and links to the detailed documentation.

## Context

Developers reading the main project README should be made aware of the demo cluster system. This section should be concise and direct them to the detailed README in scripts/demo-cluster/.

## Files to Modify

- `README.md` (main project README)

## Section to Add

Add a new section (suggest after "Development" or "Testing" section if exists):

### Section Title
```markdown
## Testing with Demo Cluster
```

### Section Content

```markdown
For safe testing without affecting real clusters, use the isolated demo cluster system:

```bash
# Start demo cluster
./scripts/demo-cluster/start.sh

# Populate with a scenario
./scripts/demo-cluster/populate.sh with-operator

# Launch Extension (Demo Cluster) in VSCode
# Press F5 → Select "Extension (Demo Cluster)"
```

The demo cluster is completely isolated from your real clusters and is safe for:
- Feature development and testing
- Marketing screenshots
- QA regression testing
- Demo presentations

See [scripts/demo-cluster/README.md](scripts/demo-cluster/README.md) for complete documentation.
```

### Placement

Place this section in an appropriate location, ideally:
- After "Installation" or "Getting Started" section
- Before or after "Development" section
- Near any existing testing documentation

### Link Verification

Ensure the link to `scripts/demo-cluster/README.md` is correct relative to the main README location.

## Acceptance Criteria

- [ ] Main README.md is updated
- [ ] "Testing with Demo Cluster" section added
- [ ] Section includes quick start commands
- [ ] Section lists key use cases
- [ ] Link to detailed README is correct
- [ ] Section is placed in logical location
- [ ] Markdown formatting is correct
- [ ] Link is clickable in GitHub and VSCode

## Testing

- [ ] View README.md in GitHub to verify formatting
- [ ] Click link to scripts/demo-cluster/README.md to verify it works
- [ ] Verify commands in examples are correct

## Time Estimate

10-15 minutes
