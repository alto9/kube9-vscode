---
task_id: 014-test-tutorial-functionality
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 5-7 hours
---

# Test Tutorial Functionality

## Objective

Comprehensively test the interactive tutorial across all scenarios, themes, resource availability states, and user workflows to ensure a high-quality onboarding experience.

## Context

The tutorial is the first impression for new users. Thorough testing ensures it works reliably in all situations and provides value whether users have clusters configured or not.

## Test Categories

### 1. Functional Testing (2-3 hours)

#### Walkthrough Basics
- [ ] Walkthrough appears in VSCode Getting Started
- [ ] All 7 steps visible and in correct order
- [ ] Step navigation works (forward/backward)
- [ ] Progress indicator shows "X of 7 steps completed"
- [ ] All PNG images load correctly for each step
- [ ] All text renders correctly (no encoding issues)

#### Commands
- [ ] "Kube9: Show Getting Started Tutorial" appears in Command Palette
- [ ] Command opens walkthrough correctly
- [ ] Command works multiple times
- [ ] Welcome screen "Start Tutorial" button works
- [ ] Welcome screen message handling works

#### Completion Events
- [ ] Step 1: Opening kube9 view marks step complete
- [ ] Step 2: Opening Cluster Manager marks step complete
- [ ] Step 3: Expanding namespace marks step complete (with clusters)
- [ ] Step 3: Manual completion button works (without clusters)
- [ ] Step 4: Clicking pod marks step complete (with pods)
- [ ] Step 4: Manual completion button works (without pods)
- [ ] Step 5: Opening pod logs marks step complete
- [ ] Step 6: Scaling workload marks step complete
- [ ] Step 7: Viewing step marks tutorial complete

#### State Management
- [ ] Tutorial completion tracked in globalState
- [ ] Context key `kube9.tutorialCompleted` set correctly
- [ ] State persists across VSCode restarts
- [ ] Fresh install shows walkthrough automatically
- [ ] Completed tutorial doesn't auto-show
- [ ] Replay command works after completion

### 2. Theme Testing (1 hour)

- [ ] All images visible in Light theme
- [ ] All images visible in Dark theme
- [ ] All images visible in High Contrast Light theme
- [ ] All images visible in High Contrast Dark theme
- [ ] Text readable in all themes
- [ ] Annotations visible in all themes
- [ ] No color contrast issues
- [ ] Welcome button visible in all themes

### 3. Resource Availability Testing (2 hours)

#### No Clusters Configured
- [ ] Tutorial opens successfully
- [ ] All 7 steps accessible
- [ ] Step 3 manual completion button works
- [ ] Step 4 manual completion button works
- [ ] Helpful messages appear when clicking fallback buttons
- [ ] User can complete entire tutorial without clusters
- [ ] Tutorial provides instructional value

#### With Clusters, No Namespaces
- [ ] Tutorial opens successfully
- [ ] Step 3 natural completion may not work (expected)
- [ ] Step 3 fallback works
- [ ] Other steps work as expected

#### With Clusters and Resources
- [ ] Tutorial opens successfully
- [ ] All natural completion paths work
- [ ] Step 3 completes when expanding namespace
- [ ] Step 4 completes when clicking pod
- [ ] No need for fallback buttons

#### Mixed Scenarios
- [ ] Tutorial starts without clusters, user adds clusters mid-tutorial
- [ ] Natural completions work after clusters added
- [ ] Tutorial continues smoothly

### 4. Edge Cases & Error Handling (1-2 hours)

- [ ] Tutorial survives extension updates
- [ ] Multiple VSCode windows don't conflict
- [ ] Walkthrough doesn't break with invalid cluster data
- [ ] Commands fail gracefully if walkthrough not found
- [ ] Welcome screen works if tutorial not configured
- [ ] Tutorial works in remote development scenarios
- [ ] Tutorial works in VSCode web (if applicable)
- [ ] Rapid clicking doesn't cause issues
- [ ] Network errors don't break tutorial
- [ ] Permission errors handled gracefully

### 5. Accessibility Testing (1 hour)

- [ ] Keyboard navigation through steps
- [ ] Tab navigation reaches all buttons
- [ ] Enter key activates buttons
- [ ] Screen reader announces step content
- [ ] Alt text provided for all images
- [ ] High contrast mode fully functional
- [ ] Focus indicators visible
- [ ] No keyboard traps

### 6. Integration Testing (1 hour)

- [ ] Welcome screen appears on first install
- [ ] "Start Tutorial" button launches tutorial
- [ ] Tutorial integrates with Getting Started
- [ ] Extension works normally during tutorial
- [ ] Tutorial doesn't interfere with cluster operations
- [ ] Completing tutorial doesn't break extension
- [ ] Tutorial and extension state are independent

### 7. User Experience Testing (1 hour)

- [ ] Tutorial completes in < 15 minutes
- [ ] Steps are clear and easy to follow
- [ ] Visual aids are helpful
- [ ] Instructions make sense
- [ ] Progression feels natural
- [ ] Tutorial teaches essential features
- [ ] Users feel confident after completion
- [ ] No confusing or misleading content

## Testing Environments

Test in all combinations:
- **OS**: Windows, macOS, Linux
- **VSCode Version**: Latest stable, latest insiders
- **Themes**: Light, Dark, High Contrast (Light & Dark)
- **Cluster State**: None, Empty, Partial, Full

## Bug Reporting

Document any issues found:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if helpful
- Environment details
- Severity (blocker, major, minor, trivial)

## Acceptance Criteria

- [ ] All functional tests pass
- [ ] All theme tests pass
- [ ] All resource availability scenarios work
- [ ] All edge cases handled gracefully
- [ ] Accessibility requirements met
- [ ] Integration tests pass
- [ ] No critical or major bugs
- [ ] User experience is smooth and intuitive

## Dependencies

- All stories 001-012 completed
- Task 013 completed (visual assets created)
- Extension built and runnable

## Notes

- This is manual testing work, not code implementation
- Can be parallelized with multiple testers
- Document test results in a test report
- Consider creating automated tests for key flows later
- User feedback during testing is valuable
- May discover bugs requiring additional stories to fix
- Testing should be done on real/realistic clusters when possible
- Consider beta testing with actual first-time users for final validation

