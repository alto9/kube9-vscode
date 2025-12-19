---
feature_id: dynamic-namespace-discovery
name: Dynamic Namespace Discovery
description: Automatically discover the kube9-operator namespace instead of hardcoding 'kube9-system', supporting custom namespace installations
spec_id:
  - namespace-discovery-spec
  - events-provider-updates-spec
---

# Dynamic Namespace Discovery

```gherkin
Feature: Dynamic Namespace Discovery

Scenario: Discover operator namespace from status ConfigMap
  Given a cluster has kube9-operator installed in namespace "kube9-production"
  And the operator status ConfigMap includes the namespace field
  When the extension queries operator status
  Then it should read the namespace from the ConfigMap
  And store it for that cluster context: "kube9-production"
  And use "kube9-production" for all operator interactions
  And no hardcoded "kube9-system" references should be used

Scenario: Fallback to user configuration when ConfigMap lacks namespace
  Given a cluster has kube9-operator installed
  And the operator status ConfigMap does NOT include namespace field
  When the extension attempts namespace discovery
  Then it should check VS Code settings for "kube9.operatorNamespace"
  And if configured with "my-custom-namespace"
  Then use "my-custom-namespace" for operator interactions
  And log the fallback to settings

Scenario: Fallback to default 'kube9-system' as last resort
  Given a cluster has kube9-operator installed
  And the operator status ConfigMap does NOT include namespace field
  And no custom namespace is configured in VS Code settings
  When the extension attempts namespace discovery
  Then it should fall back to "kube9-system" as default
  And log a warning that default namespace is being used
  And suggest configuring the actual namespace if different

Scenario: Three-tier namespace resolution chain
  Given the extension needs to interact with kube9-operator
  When namespace discovery runs
  Then it should attempt resolution in order:
    1. Read from operator status ConfigMap (primary)
    2. Read from VS Code settings: kube9.operatorNamespace (fallback)
    3. Use default: "kube9-system" (last resort)
  And the first successful resolution should be used
  And the result should be cached per cluster context

Scenario: Cache namespace per cluster context
  Given namespace discovery has resolved "kube9-prod" for cluster "production"
  When subsequent operations need the operator namespace for "production"
  Then the cached value "kube9-prod" should be used
  And no re-discovery should occur unless cache is invalidated
  When interacting with a different cluster "staging"
  Then namespace discovery should run independently for "staging"
  And each cluster maintains its own namespace cache

Scenario: Invalidate namespace cache on operator status change
  Given namespace is cached as "kube9-system" for a cluster
  When operator status changes (upgrade, reinstall, etc.)
  And the new status ConfigMap indicates namespace "kube9-v2"
  Then the cached namespace should be invalidated
  And namespace discovery should re-run
  And the new namespace "kube9-v2" should be cached and used

Scenario: EventsProvider uses discovered namespace
  Given namespace discovery resolves "my-operator-ns" for a cluster
  When EventsProvider needs to execute operator CLI commands
  Then it should use "my-operator-ns" for the exec namespace
  And the pod lookup should search in "my-operator-ns"
  And no hardcoded "kube9-system" should be used in EventsProvider

Scenario: OperatorStatusClient uses discovered namespace
  Given namespace discovery resolves "kube9-custom" for a cluster
  When OperatorStatusClient queries the status ConfigMap
  Then it should search for the ConfigMap in "kube9-custom"
  And no hardcoded "kube9-system" should be used
  And discovery should be recursive: ConfigMap lookup needs namespace first

Scenario: Bootstrap problem: finding ConfigMap needs namespace
  Given discovering namespace requires reading the ConfigMap
  And finding the ConfigMap requires knowing the namespace
  When the extension encounters this bootstrap problem
  Then it should use a search approach:
    1. Try user-configured namespace from settings first
    2. Try default "kube9-system"
    3. Optionally search all namespaces for operator ConfigMap
  And once ConfigMap is found, validate namespace from its contents
  And cache the validated namespace

Scenario: Search all namespaces for operator ConfigMap
  Given no namespace is configured in settings
  And the default "kube9-system" namespace doesn't contain the operator
  When the extension cannot find the operator status ConfigMap
  Then it may optionally search all namespaces for "kube9-operator-status" ConfigMap
  And if found in namespace "custom-operators"
  Then use "custom-operators" as the operator namespace
  And cache it for future operations
  And this search should be opt-in via settings for performance

Scenario: Handle operator in custom namespace from first install
  Given a user installs kube9-operator in namespace "alto9-system"
  And connects to the cluster for the first time
  When the extension attempts to detect operator status
  Then namespace discovery should find "alto9-system"
  And all subsequent interactions should use "alto9-system"
  And the user should not need to manually configure the namespace
  And everything should work automatically

Scenario: User configures custom namespace in VS Code settings
  Given a user knows their operator is in namespace "my-kube9"
  When they open VS Code settings
  And set "kube9.operatorNamespace" to "my-kube9" for that cluster
  Then the extension should use "my-kube9" for operator interactions
  And this should override the default "kube9-system"
  And the ConfigMap should be found in "my-kube9"

Scenario: Per-cluster namespace configuration in settings
  Given a user has multiple clusters with operators in different namespaces
  When they configure settings
  Then they should be able to specify namespace per cluster:
    ```json
    "kube9.operatorNamespace": {
      "production": "kube9-prod",
      "staging": "kube9-staging",
      "dev": "kube9-system"
    }
    ```
  And each cluster should use its configured namespace

Scenario: DashboardDataProvider uses discovered namespace
  Given namespace discovery resolves "operator-ns" for a cluster
  When DashboardDataProvider queries the operator status ConfigMap
  Then it should use "operator-ns" for the ConfigMap lookup
  And no hardcoded "kube9-system" should be used (currently line 313)

Scenario: AIRecommendationsQuery uses discovered namespace
  Given namespace discovery resolves "kube9-ai" for a cluster
  When AIRecommendationsQuery fetches recommendations ConfigMap
  Then it should use "kube9-ai" for the ConfigMap lookup
  And no hardcoded "kube9-system" should be used (currently line 46)

Scenario: Migration of existing hardcoded references
  Given the codebase has multiple files with hardcoded "kube9-system"
  When dynamic namespace discovery is implemented
  Then all hardcoded references should be replaced:
    - EventsProvider.ts (lines 190, 234)
    - OperatorStatusClient.ts (line 90)
    - DashboardDataProvider.ts (line 313)
    - AIRecommendationsQuery.ts (line 46)
  And all should use the OperatorNamespaceResolver service
  And namespace should be passed as parameter or retrieved from resolver

Scenario: Error handling when operator not found in any namespace
  Given a cluster does not have kube9-operator installed
  When namespace discovery attempts all resolution tiers
  And all attempts fail
  Then the extension should gracefully handle the absence
  And operator-dependent features should be disabled (basic mode)
  And no errors should crash the extension
  And a clear message should inform the user

Scenario: Namespace discovery logging for debugging
  Given namespace discovery runs for a cluster
  When resolution attempts occur
  Then each step should be logged:
    - "Attempting namespace discovery for cluster 'production'"
    - "ConfigMap found in namespace 'kube9-custom'"
    - "Using namespace: kube9-custom"
  Or if fallback occurs:
    - "ConfigMap namespace field not found, checking settings"
    - "No custom namespace configured, using default: kube9-system"
  And logs should help troubleshoot namespace issues

Scenario: Namespace mismatch detection
  Given operator is installed in namespace "kube9-v2"
  And user has configured "kube9-system" in settings
  When the extension finds ConfigMap in "kube9-v2"
  Then it should detect the mismatch
  And warn the user: "Operator found in 'kube9-v2' but settings specify 'kube9-system'"
  And suggest updating settings or removing the override
  And prefer the actual discovered namespace over settings

Scenario: Validation that discovered namespace contains operator
  Given namespace discovery resolves "test-namespace"
  When the extension uses that namespace
  Then it should validate that the operator pod exists there
  And if the pod is not found, log an error
  And potentially re-run discovery or use fallback

Scenario: Handle namespace deletion and operator reinstall
  Given operator was in namespace "kube9-old" (cached)
  And the namespace "kube9-old" is deleted
  And operator is reinstalled in "kube9-new"
  When the extension attempts to use cached "kube9-old"
  Then operations should fail (namespace not found)
  And the extension should invalidate cache
  And re-run namespace discovery
  And find "kube9-new"
  And update cache to "kube9-new"

Scenario: Operator namespace in cluster info display
  Given namespace discovery has resolved the operator namespace
  When a user views cluster information or status
  Then the operator namespace should be displayed
  And shown as: "Operator Namespace: kube9-custom"
  And this helps users understand their configuration

Scenario: Performance consideration for namespace discovery
  Given namespace discovery may involve API calls
  When discovery runs
  Then it should be efficient:
    - Cache results per cluster
    - Avoid repeated API calls
    - Run discovery once per cluster connection
    - Re-discover only on cache invalidation
  And discovery should not block extension activation

Scenario: Namespace discovery in multi-cluster environments
  Given a user has 5 clusters connected
  And each cluster has operator in different namespace
  When the extension starts
  Then namespace should be discovered independently for each cluster
  And discoveries should happen in parallel where possible
  And each cluster's namespace should be cached separately
  And switching between clusters should use cached values
```

## Integration Points

- **OperatorStatusClient**: Primary location to implement namespace resolver
- **EventsProvider**: Consumer of discovered namespace
- **DashboardDataProvider**: Consumer of discovered namespace
- **AIRecommendationsQuery**: Consumer of discovered namespace
- **VS Code Settings API**: Fallback namespace configuration
- **Kubernetes API**: ConfigMap lookup and pod discovery

## Namespace Resolution Service

A new `OperatorNamespaceResolver` service should be created:

```typescript
class OperatorNamespaceResolver {
  // Cache of discovered namespaces per cluster
  private namespaceCache: Map<string, string> = new Map();

  /**
   * Resolve operator namespace for a cluster context
   * Returns: namespace string or throws if not found
   */
  async resolveNamespace(clusterContext: string): Promise<string> {
    // 1. Check cache
    // 2. Try ConfigMap (with bootstrap logic)
    // 3. Try VS Code settings
    // 4. Fall back to default
    // 5. Cache and return
  }

  /**
   * Invalidate cached namespace for a cluster
   */
  invalidateCache(clusterContext: string): void {
    // Clear cache to force re-discovery
  }

  /**
   * Get cached namespace without discovery
   * Returns: cached namespace or undefined
   */
  getCachedNamespace(clusterContext: string): string | undefined {
    // Return cached value if exists
  }
}
```

## Migration Strategy

1. **Create OperatorNamespaceResolver service** with three-tier resolution
2. **Update OperatorStatusClient** to use resolver
3. **Update EventsProvider** to accept namespace parameter
4. **Update DashboardDataProvider** to use resolver
5. **Update AIRecommendationsQuery** to use resolver
6. **Remove all hardcoded "kube9-system" references**
7. **Add VS Code settings** for custom namespace configuration
8. **Test with operator in custom namespace** to validate

## Settings Schema

```json
{
  "kube9.operatorNamespace": {
    "type": ["string", "object"],
    "default": null,
    "description": "Custom namespace for kube9-operator (overrides auto-detection)",
    "examples": [
      "my-kube9",
      {
        "production": "kube9-prod",
        "staging": "kube9-test"
      }
    ]
  }
}
```

