# Consistency

## Consistency Model

- Eventual consistency between UI and cluster state, bounded by refresh actions and cache TTLs.
- Command-side mutations trigger targeted refreshes/invalidation for affected scopes.
- YAML conflict detection prevents blind overwrites when external updates occur.

## Guarantees

1. Operations are context/namespace scoped and should not cross-contaminate state.
2. Cache keys include context identifiers to isolate multi-cluster data.
