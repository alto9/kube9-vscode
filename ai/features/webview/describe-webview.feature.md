---
feature_id: describe-webview
spec_id: [webview-spec]
context_id: [kubernetes-cluster-management]
---

# Describe Webview (Stub) Feature

```gherkin
Feature: Describe webview shows a stub until detailed layouts are ready

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster

Scenario: Left-click Describe opens stub webview
  Given a user left-clicks a describable resource in the kube9 tree (e.g., a Deployment named "api-server")
  Then a shared Describe webview should open or reveal
  And the webview title should show the resource kind and name (e.g., "Deployment / api-server")
  And the webview body should display a "Coming soon" message
  And no interactive controls beyond close and refresh are shown

Scenario: Right-click Describe opens stub webview
  Given a user right-clicks a describable resource in the kube9 tree (e.g., a Deployment named "api-server")
  When they select "Describe"
  Then a shared Describe webview should open or reveal
  And the webview title should show the resource kind and name (e.g., "Deployment / api-server")
  And the webview body should display a "Coming soon" message
  And no interactive controls beyond close and refresh are shown

Scenario: Right-click Describe (Raw) opens full describe in read-only editor
  Given a user right-clicks a describable resource in the kube9 tree
  When they select "Describe (Raw)"
  Then a new read-only text editor tab should open
  And the tab title should include the resource name and ".describe"
  And the editor should display the full raw kubectl describe output for that resource
  And the editor should be read-only

Scenario: Reusing the shared Describe webview across resources
  Given the Describe webview is already open for a resource
  When the user triggers "Describe" on a different resource
  Then the existing webview should update its title to the new resource kind and name
  And the "Coming soon" stub content should remain visible
  And no additional Describe panels should be created
```

