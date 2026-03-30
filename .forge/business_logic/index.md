# Business Logic Overview

**Domain:** Kube9 VS Code Extension

## Purpose

This directory defines core product behavior for Kube9 VS Code independent of UI rendering details and infrastructure mechanics.

## Domain Summary

Kube9 VS Code provides local-first Kubernetes operations in the editor: cluster/context navigation, namespace-scoped resource operations, YAML editing, logs/events access, port-forwarding, and ArgoCD workflows. Optional operator presence enhances visibility and status quality but is not required for core workflows.

## Primary Concepts

- **Context and namespace state** drives most command execution paths.
- **Resource operation safety** prioritizes explicit confirmation and clear error feedback.
- **Progressive enhancement** enables richer workflows (operator status, ArgoCD health details) without degrading baseline UX.

## Related Documents

- [domain_model.md](./domain_model.md)
- [user_stories.md](./user_stories.md)
- [error_state.md](./error_state.md)
- [error_handling.md](./error_handling.md)
