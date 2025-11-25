---
session_id: dashboard-customer-path
start_time: '2025-11-19T14:58:49.599Z'
end_time: '2025-11-19T18:30:00.000Z'
status: completed
problem_statement: >-
  Add Dashboard menu item to cluster tree view with customer-specific
  implementations
changed_files:
  - path: ai/features/navigation/dashboard/free-dashboard.feature.md
    change_type: added
    scenarios_added:
      - Dashboard menu item appears in tree view
      - User opens Free Dashboard
      - Free Dashboard displays cluster statistics
      - Dashboard refreshes data automatically
      - User manually refreshes dashboard
      - Dashboard displays loading state during initial load
      - Dashboard handles query errors gracefully
      - Multiple dashboards can be open simultaneously
      - Dashboard maintains state when cluster context changes
      - Dashboard closes cleanly
  - path: ai/features/navigation/dashboard/operated-dashboard.feature.md
    change_type: added
    scenarios_added:
      - Dashboard menu item appears in tree view
      - User opens Operated Dashboard
      - Operated Dashboard displays operator-provided statistics
      - Operated Dashboard displays operator information
      - Dashboard detects API key presence for conditional content
      - Dashboard displays AI recommendations panel when API key present
      - AI recommendations panel displays recommendations
      - Dashboard displays upsell CTA when no API key present
      - User clicks Configure API Key button
      - Dashboard refreshes data automatically
      - User manually refreshes dashboard
      - Dashboard switches conditional content when operator status changes
      - Multiple Operated Dashboards can be open simultaneously
      - Dashboard closes cleanly
start_commit: 9e549882a870613410b5398bea1b77d9635e9939
---
## Problem Statement

Add a 'Dashboard' menu item to the tree view that appears at the top of each cluster. The dashboard implementation differs based on customer configuration (Free Non-Operated vs Free Operated), but the tree view appearance remains consistent across both types.

## Goals

1. **Consistent Tree View**: Add Dashboard menu item that always appears at the top for each cluster, regardless of customer type
2. **Free Dashboard**: Display basic statistics derived from kubectl (namespace counts, workload counts, basic charts)
3. **Operated Dashboard**: Display statistics provided by backend operator with conditional elements:
   - **With API Key**: Show AI-powered recommendations
   - **Without API Key**: Show upsell call-to-action to encourage API key adoption
4. **Lightweight & Introductory**: Keep dashboards simple and buildable - foundation for future rich features

## Approach

### Tree View Structure
- Dashboard menu item positioned at top of cluster tree
- Identical visual appearance for both Free and Operated dashboards
- Dashboard type determined by operator presence (not visible in tree structure)

### Dashboard Implementation Strategy

**Free Dashboard (No Operator):**
- Simple, introductory dashboard showing basic cluster statistics
- Query cluster directly via kubectl for real-time data
- Display namespace count, workload counts, node health
- Basic charts for visualization
- Keep it lightweight and easy to build

**Operated Dashboard (With Operator):**
- Simple, introductory dashboard with operator-provided data
- Query operator ConfigMaps via kubectl for aggregated statistics
- Display same basic statistics as Free dashboard
- Conditional content section:
  - **API Key Present**: Display AI recommendations panel (introductory)
  - **No API Key**: Display upsell CTA panel encouraging API key configuration
- Keep it lightweight - foundation for future rich features

### Technical Considerations
- Dashboard type selection logic based on operator presence detection
- API key validation for conditional content in Operated dashboard
- Consistent data refresh patterns across both dashboard types
- These are introductory dashboards - fully designed dashboards will come later
- Focus on getting basic working dashboards that can be extended

## Key Decisions

1. **Tree View Uniformity**: Both customer types see identical Dashboard menu item positioning to maintain consistent UX
2. **Two Separate Features**: Split into free-dashboard and operated-dashboard features for clear separation of free vs paid experiences
3. **Lightweight & Introductory**: Removed heavy debugging/troubleshooting scenarios to keep workload manageable
4. **Operated Dashboard as Foundation**: Intentionally minimal now but architected to support rich features later
5. **API Key Upsell Strategy**: Use dashboard real estate to encourage API key adoption by showing value proposition where user is already engaged
6. **Kubectl as Data Source**: Even Operated dashboard uses kubectl to query operator-provided data, maintaining consistent cluster interaction patterns
7. **AI Recommendations Placement**: For customers with API keys, AI recommendations are prominently featured in dashboard (not hidden or secondary)

## Notes

- Dashboard detection/routing logic needs to determine customer type early in render cycle
- AI recommendations panel design should be compelling enough to drive API key adoption
- Upsell CTA should communicate clear value proposition without being intrusive
- Future features for Operated dashboard might include: cost analysis, security recommendations, optimization suggestions, compliance reporting
- Need to ensure dashboard performance is acceptable even with multiple kubectl queries (Free dashboard case)
- Consider caching strategy for both dashboard types to improve responsiveness
- These dashboards are intentionally introductory - we will fully design them later
