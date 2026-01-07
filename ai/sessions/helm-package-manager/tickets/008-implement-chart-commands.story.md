---
story_id: 008-implement-chart-commands
session_id: helm-package-manager
feature_id:
  - helm-chart-discovery
spec_id:
  - helm-chart-operations
  - helm-cli-integration
status: pending
---

# Story: Implement Chart Discovery Commands

## Objective

Implement extension commands for chart search and detail retrieval, integrating with the Helm Service.

## Context

Chart commands enable searching across repositories and fetching detailed chart information. See [helm-chart-operations](../../specs/helm/helm-chart-operations.spec.md) for command specifications.

## Acceptance Criteria

- [ ] Implement `searchCharts(query)` method in HelmService
- [ ] Implement `getChartDetails(chart)` method in HelmService
- [ ] Implement `getChartReadme(chart)` method in HelmService
- [ ] Implement `getChartValues(chart)` method in HelmService
- [ ] Create command handlers in message listener
- [ ] Send search results to webview
- [ ] Handle empty search results gracefully
- [ ] Implement error handling for chart not found

## Implementation Notes

```typescript
// HelmService methods
async searchCharts(query: string, repository?: string): Promise<ChartSearchResult[]> {
  const args = ['search', 'repo', query, '--output', 'json'];
  
  if (repository) {
    args.push('--regexp', `^${repository}/`);
  }
  
  const output = await this.executeCommand(args);
  const results = JSON.parse(output);
  
  return results.map(r => ({
    name: r.name,
    version: r.version,
    appVersion: r.app_version,
    description: r.description,
    repository: r.name.split('/')[0],
    chart: r.name.split('/')[1]
  }));
}

async getChartDetails(chart: string): Promise<ChartDetails> {
  const [readme, values, chartYaml] = await Promise.all([
    this.executeCommand(['show', 'readme', chart]),
    this.executeCommand(['show', 'values', chart]),
    this.executeCommand(['show', 'chart', chart, '--output', 'json'])
  ]);
  
  const chartInfo = JSON.parse(chartYaml);
  
  return {
    name: chart,
    description: chartInfo.description,
    readme,
    values,
    versions: [], // Would need separate call or caching
    maintainers: chartInfo.maintainers || [],
    keywords: chartInfo.keywords || [],
    home: chartInfo.home
  };
}

// Message handler
case 'searchCharts':
  const results = await helmService.searchCharts(message.query);
  this.panel.webview.postMessage({ type: 'searchResults', data: results });
  break;
```

## Files Involved

- `src/services/HelmService.ts` (add methods)
- `src/webview/HelmPackageManagerPanel.ts` (add message handlers)

## Dependencies

- Depends on story 001 (HelmService)
- Depends on story 003 (webview panel)
- Works with story 005 (Discovery Section UI)

## Estimated Time

30 minutes

