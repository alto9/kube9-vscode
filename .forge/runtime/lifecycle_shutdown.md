# Lifecycle And Shutdown

## Deactivation Rules

- Dispose command subscriptions and view registrations through extension context subscriptions.
- Stop active port-forward processes through manager disposal.
- Stop background monitors/watchers used by YAML conflict detection and namespace/cache services.
- Clear transient caches as needed to avoid stale state in tests/dev reload loops.

## Reliability Goal

Extension deactivation should leave no orphaned child processes or timers.
