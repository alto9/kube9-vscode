---
task_id: update-documentation
session_id: argocd-integration-phase-1-basic-drift-detection
type: documentation
status: pending
priority: low
---

# Update Documentation for ArgoCD Integration

## Description

Update the README and create user documentation for the new ArgoCD integration feature, including setup instructions, usage guide, and troubleshooting.

## Reason

Users need documentation to understand how to use the ArgoCD integration feature, what prerequisites are required, and how to troubleshoot common issues.

## Steps

1. Update main `README.md` with ArgoCD features section
2. Add "Features" bullet point for ArgoCD integration
3. Create `docs/argocd-integration.md` user guide
4. Document prerequisites (ArgoCD installed, kubectl configured)
5. Document supported ArgoCD versions (2.5+)
6. Add screenshots of tree view with ArgoCD Applications
7. Add screenshots of application webview
8. Document available actions (sync, refresh, hard refresh)
9. Add troubleshooting section for common issues
10. Document RBAC requirements for ArgoCD CRD access
11. Add section about operated vs basic mode differences
12. Link to ArgoCD official documentation

## Resources

- Existing README.md structure to follow
- Screenshots captured from working feature
- ArgoCD documentation: https://argo-cd.readthedocs.io/

## Completion Criteria

- [ ] README updated with ArgoCD feature description
- [ ] User guide created with setup instructions
- [ ] Screenshots added showing key features
- [ ] Troubleshooting section covers common issues
- [ ] Documentation reviewed for clarity
- [ ] Links to external resources included

