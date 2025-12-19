---
actor_id: cluster-operator
name: Cluster Operator
type: user
description: A user responsible for operating, monitoring, and troubleshooting Kubernetes clusters
---

# Cluster Operator

## Overview

A cluster operator is a user who manages the day-to-day operations of Kubernetes clusters. They are responsible for monitoring cluster health, investigating issues, troubleshooting problems, and ensuring applications run smoothly.

## Responsibilities

### Cluster Monitoring
- Monitor cluster health and resource usage
- Track application deployments and their status
- Watch for errors, warnings, and anomalies
- Identify performance issues and bottlenecks

### Troubleshooting
- Investigate application failures and crashes
- Diagnose networking and connectivity issues
- Analyze resource constraints (CPU, memory, storage)
- Review cluster events to understand what's happening
- Track down root causes of incidents

### Event Analysis
- Review Kubernetes events for troubleshooting clues
- Filter events by type (Normal, Warning, Error)
- Search events by time range to narrow down issues
- Filter by namespace to focus on specific applications
- Correlate events with application behavior

### Incident Response
- Respond to alerts and notifications
- Triage issues by severity
- Coordinate fixes and mitigations
- Document incident resolution steps

### Maintenance
- Apply updates and patches
- Manage cluster configurations
- Ensure backup and disaster recovery readiness
- Maintain cluster documentation

## Characteristics

### Technical Skills
- Deep understanding of Kubernetes architecture
- Experience with kubectl and Kubernetes APIs
- Familiarity with container orchestration
- Knowledge of networking, storage, and security concepts
- Proficiency with monitoring and logging tools

### Work Context
- Often works under pressure during incidents
- Needs quick access to diagnostic information
- Values efficiency and streamlined workflows
- Requires comprehensive yet focused views of cluster state
- Switches frequently between clusters and namespaces

### Tool Preferences
- Prefers integrated tools over multiple separate utilities
- Values keyboard shortcuts and efficient navigation
- Expects familiar UX patterns (e.g., Windows EventViewer)
- Needs powerful filtering and search capabilities
- Appreciates auto-refresh for live monitoring

### Pain Points
- Overwhelming volume of events in busy clusters
- Difficulty filtering events to find relevant information
- Slow or cumbersome tools during time-sensitive incidents
- Context switching between terminal and IDE
- Lack of visual aids for event analysis

## Examples

### Scenario 1: Investigating Pod Crashes

A cluster operator notices an application is failing:
1. Opens Events Viewer for the production cluster
2. Filters to show only Error events from the last 1 hour
3. Filters to the application's namespace
4. Searches for "CrashLoopBackOff" or "OOMKilled"
5. Reviews event details to identify the root cause
6. Navigates to the affected pod for further investigation
7. Takes corrective action based on findings

### Scenario 2: Monitoring During Deployment

A cluster operator monitors a critical deployment:
1. Opens Events Viewer with auto-refresh enabled
2. Filters to the deployment's namespace
3. Watches events in real-time as deployment progresses
4. Looks for Warning or Error events
5. Sees "ImagePullBackOff" event
6. Immediately views the pod YAML to check image configuration
7. Corrects the issue before deployment fails completely

### Scenario 3: Post-Incident Analysis

A cluster operator reviews what happened during an outage:
1. Opens Events Viewer
2. Sets time range to cover the incident period
3. Sorts events by timestamp
4. Exports events to CSV for detailed analysis
5. Shares event log with team for post-mortem
6. Documents timeline and root cause

### Scenario 4: Cluster Health Check

A cluster operator performs routine health monitoring:
1. Opens Events Viewer for each managed cluster
2. Checks for any Error events in the last 24 hours
3. Reviews Warning events for potential issues
4. Filters by resource type to check specific components
5. Validates no critical events occurred overnight

## Integration with Events Viewer

### Primary Use Case

The cluster operator is the **primary user** of the Events Viewer feature. The Events Viewer is designed specifically to address their needs:

- **Windows EventViewer-inspired UI**: Familiar interface for IT professionals
- **Three-pane layout**: Efficient workflow with filters, table, and details
- **Powerful filtering**: Type, time, namespace, resource type, search
- **Virtual scrolling**: Handle hundreds of events smoothly
- **Auto-refresh**: Monitor events live during incidents
- **Export capability**: Save events for analysis and reporting
- **Quick actions**: Navigate to resources, view YAML, copy details

### Workflow Integration

The Events Viewer fits into the cluster operator's daily workflow:

1. **Incident Response**: Quick access to events when alerts fire
2. **Routine Monitoring**: Check events as part of daily health checks
3. **Deployment Validation**: Monitor events during rollouts
4. **Root Cause Analysis**: Deep dive into event history for investigations
5. **Documentation**: Export events for incident reports

## Relation to Other Actors

### Works With
- **Developer** (developer.actor.md): Collaborates on debugging application issues
- **GitOps Developer** (gitops-developer.actor.md): Coordinates deployment troubleshooting
- **Platform Engineers**: Escalates infrastructure-level issues
- **SREs**: Partners on reliability and observability improvements

### Differs From
- **Developer**: Focuses on cluster-level issues vs. application code
- **GitOps Developer**: Hands-on cluster operations vs. automated GitOps workflows
- **End Users**: Infrastructure-focused vs. application-focused perspective

## Success Metrics

### Efficiency
- Time to identify root cause of incidents (reduced)
- Number of context switches during troubleshooting (minimized)
- Speed of filtering to relevant events (improved)

### Effectiveness
- Accuracy of incident diagnosis (increased)
- Completeness of incident documentation (improved)
- Proactive issue detection (more frequent)

### User Satisfaction
- Ease of event analysis (high)
- Tool responsiveness during incidents (fast)
- Confidence in troubleshooting workflow (strong)

