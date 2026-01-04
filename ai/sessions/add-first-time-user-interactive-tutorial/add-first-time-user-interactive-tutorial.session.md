---
session_id: add-first-time-user-interactive-tutorial
start_time: '2026-01-02T15:48:45.927Z'
status: completed
problem_statement: Add first-time user interactive tutorial
changed_files:
  - path: ai/features/setup/interactive-tutorial.feature.md
    change_type: added
    scenarios_added:
      - Tutorial appears automatically for first-time users
      - Step 1 - Explore the Cluster View
      - Step 2 - Navigate Resources
      - Step 3 - View Resource YAML
      - Step 4 - View Pod Logs
      - Step 5 - Manage Resources (Scale/Delete)
      - Step 6 - Discover More Features
      - Progress persists across VSCode sessions
      - User can replay tutorial via command palette
      - User can exit tutorial at any time
      - Tutorial only shows for users who haven't completed it
      - Visual assets support light and dark themes
      - Completion events trigger correctly for each step
      - Tutorial integrates with existing welcome screen
      - Tutorial provides links to additional resources
      - Tutorial accessibility for keyboard users
      - Tutorial handles missing clusters gracefully
      - Tutorial works with user's actual resources when available
      - Tutorial action buttons adapt to resource availability
      - Step 2 - Explore Cluster Manager
      - Step 3 - Navigate Resources
      - Step 4 - View Resources
      - Step 5 - View Pod Logs
      - Step 6 - Manage Resources
      - Step 7 - Documentation
    scenarios_modified:
      - Tutorial handles missing clusters gracefully
      - Tutorial appears automatically for first-time users
      - Step 1 - Explore the Cluster View
      - Step 3 - Navigate Resources
      - Progress persists across VSCode sessions
      - Completion events trigger correctly for each step
      - Tutorial provides links to additional resources
      - Tutorial works with user's actual resources when available
      - Tutorial action buttons adapt to resource availability
    scenarios_removed:
      - Step 2 - Navigate Resources
      - Step 3 - View Resource YAML
      - Step 4 - View Pod Logs
      - Step 5 - Manage Resources (Scale/Delete)
      - Step 6 - Discover More Features
start_commit: 8d2c2b1b4a482751ed3836cc729cbd2a4f812ebd
end_time: '2026-01-02T16:14:03.920Z'
---
## Problem Statement

Add first-time user interactive tutorial using VSCode's native Walkthroughs API to provide guided onboarding for first-time users.

## Goals

1. Create an interactive 7-step tutorial that teaches essential kube9 features
2. Use VSCode's native Walkthroughs API for seamless integration
3. Provide automatic triggering for first-time users
4. Include replay capability via command palette
5. Track progress and completion state
6. Integrate with existing welcome screen

## Approach

### Documentation Structure

Created comprehensive AI documentation organized as follows:

**Actor**: `first-time-user.actor.md`
- Defines the persona of someone who just installed kube9
- Describes learning goals, pain points, and characteristics
- Maps the journey from onboarding through transition to regular developer

**Feature**: `interactive-tutorial.feature.md`
- 18+ Gherkin scenarios covering all tutorial functionality
- Automatic appearance for first-time users
- 7 progressive tutorial steps with completion tracking
- Manual replay capability via command
- Welcome screen integration
- Accessibility and theme support scenarios

**Spec**: `vscode-walkthroughs.spec.md`
- Technical implementation using VSCode Walkthroughs API
- Complete package.json configuration with all 7 steps
- Command registration for replay functionality
- Custom completion event implementation (namespace expansion + pod click)
- Visual asset specifications (PNG format, 1600x1200, <200KB)
- State management and persistence patterns
- Comprehensive testing checklist

**Diagram**: `tutorial-flow.diagram.md`
- Visual flow from extension activation through completion
- Shows first-time user path through all 7 steps
- Illustrates returning user path (skips tutorial)
- Documents replay path via command palette
- Shows skip/explore path for users who bypass tutorial

### Tutorial Steps Design

1. **Explore Cluster View** - Find Kube9 icon, understand tree structure
2. **Explore Cluster Manager** - Run Cluster Manager command, view UI
3. **Navigate Resources** - Expand namespaces, view hierarchy
4. **View Resources** - Left click a pod for current status
5. **View Pod Logs** - Access logs for debugging
6. **Manage Resources** - Scale and delete operations
7. **Documentation** - Additional features and documentation

## Key Decisions

### Use VSCode Native Walkthroughs API
**Decision**: Use VSCode's built-in Walkthroughs API instead of custom webview tutorial
**Rationale**: 
- Native VSCode UX pattern users already recognize
- Seamless integration with Getting Started experience
- Built-in progress tracking and step validation
- Much simpler to implement and maintain than custom solution
- Automatic theme support and accessibility
- Consistent across VSCode versions

### PNG Images Instead of SVG
**Decision**: Use PNG format for all tutorial images (not SVG)
**Rationale**:
- SVG files can contain embedded scripts (security risk)
- VSCode Marketplace has had issues with malicious extensions
- PNG is safer with no script execution capability
- Major VSCode extensions use PNG for walkthroughs
- Resolution: 1600x1200 (2x for retina), <200KB file size

### Integration with Welcome Screen
**Decision**: Keep existing welcome screen and add "Start Tutorial" button
**Rationale**:
- Welcome screen provides high-level ecosystem overview
- Tutorial focuses on hands-on learning
- Separation of concerns: overview vs. interactive learning
- Gives users choice: read overview or start practicing

### Custom Completion Events
**Decision**: Implement custom completion event for namespace expansion (Step 2)
**Rationale**:
- Built-in events cover most steps (onView:, onCommand:)
- Namespace expansion needs custom tracking
- Demonstrates interaction patterns not tied to commands
- Simple to implement via tree view expansion events

### Tutorial Works Without Resources (Critical)
**Decision**: Tutorial must be fully functional and valuable even if user has no clusters/resources
**Rationale**:
- Users may install extension before configuring clusters
- First-time users may not have clusters readily available
- Tutorial should teach "what's possible" regardless of current setup
- VSCode best practice: never block learning on external dependencies
**Implementation**:
- Every step provides instructional value through images and text
- Dual completion paths: natural (with resources) + manual fallback (without)
- Commands detect resource availability and show helpful guidance
- Manual "Mark Complete" buttons for all interactive steps
- Users can always progress through all 6 steps

## Notes

### Implementation Considerations

**Visual Asset Creation**:
- Need to create 7 high-quality PNG screenshots
- Should be actual UI or mockups during development
- Add annotations: arrows, labels, highlights
- Test visibility in all themes (light, dark, high-contrast)
- Compress to stay under 200KB each
- Files: 01-cluster-view, 02-cluster-manager, 03-navigation, 04-view-resource, 05-logs, 06-management, 07-documentation

**Completion Tracking**:
- VSCode handles most progress tracking automatically
- GlobalState stores tutorial completion status
- Context key `kube9.tutorialCompleted` controls `when` clause
- Step 7 is informational (no action required for completion)
- Custom events: namespace expansion (step 3) and pod click (step 4)

**Welcome Screen Updates**:
- Add prominent "Start Tutorial" button
- Button should trigger `kube9.showTutorial` command
- Consider UX: keep welcome open or close after starting tutorial
- Ensure button is keyboard accessible

**Testing Focus Areas**:
- First-time user experience (clean install)
- Progress persistence across VSCode restarts
- Replay functionality after completion
- Theme compatibility (light/dark/high-contrast)
- Accessibility (keyboard navigation, screen readers)
- Edge cases: no clusters configured, empty workspace

**Future Enhancements**:
- Conditional steps based on cluster availability
- Video/GIF media for animated guides
- Localization for international users
- Analytics for completion tracking (if telemetry enabled)
- Advanced tutorial for power users

### Related Features

The tutorial demonstrates and links to these existing features:
- Initial configuration and welcome screen
- Cluster view navigation
- Resource YAML viewing
- Pod log viewing
- Resource management (scale/delete)
- Cluster Organizer (mentioned in Step 6)

### Estimated Implementation Effort

From spec: 21-29 hours total
- Package.json configuration: 1-2 hours (7 steps)
- Command registration: 1 hour  
- Custom completion events: 3-4 hours (namespace expansion + pod click)
- State management: 2 hours
- Welcome screen integration: 2-3 hours
- Visual asset creation: 7-10 hours (7 PNG images)
- Testing & polish: 5-7 hours

### References

GitHub Issue: https://github.com/alto9/kube9-vscode/issues/20

The issue provides detailed implementation approach, requirements checklist, and examples from other VSCode extensions (GitHub, Docker, Python) that use walkthroughs successfully.
