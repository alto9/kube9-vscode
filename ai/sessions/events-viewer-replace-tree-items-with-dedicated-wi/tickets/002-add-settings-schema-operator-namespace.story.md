---
story_id: 002-add-settings-schema-operator-namespace
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Add VS Code Settings Schema for Operator Namespace

## Objective

Add configuration schema to `package.json` for `kube9.operatorNamespace` setting to allow users to configure custom operator namespaces.

## Context

Users may install kube9-operator in custom namespaces. This setting provides fallback configuration when auto-detection fails or as override.

## Acceptance Criteria

- [ ] Add `kube9.operatorNamespace` to `contributes.configuration` in `package.json`
- [ ] Support both string (all clusters) and object (per-cluster) types
- [ ] Set default to `null` (auto-detection preferred)
- [ ] Include markdown description with examples
- [ ] Provide string example: `"my-kube9"`
- [ ] Provide object example: `{ "production": "kube9-prod", "staging": "kube9-staging" }`
- [ ] Document that auto-detection is primary method

## Files Affected

- **Modify**: `package.json` (contributes.configuration section)

## Implementation Notes

**JSON Schema**:
```json
{
  "kube9.operatorNamespace": {
    "type": ["string", "object"],
    "default": null,
    "markdownDescription": "Custom namespace for kube9-operator. Leave empty for auto-detection.\n\n**String example** (applies to all clusters):\n```json\n\"kube9.operatorNamespace\": \"my-kube9\"\n```\n\n**Object example** (per-cluster):\n```json\n\"kube9.operatorNamespace\": {\n  \"production\": \"kube9-prod\",\n  \"staging\": \"kube9-staging\"\n}\n```"
  }
}
```

**Resolution Priority**: ConfigMap (auto) → Settings → Default

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Estimated Time

10 minutes

