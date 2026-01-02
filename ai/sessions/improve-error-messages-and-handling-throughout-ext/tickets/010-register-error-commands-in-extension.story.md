---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - error-handler-utility
story_id: 010-register-error-commands-in-extension
status: completed
---

# Register Error Commands in Extension Activation

## Objective

Import and register the error commands in the extension's activate() function so they are available when the extension loads.

## Files to Modify

- `src/extension.ts`

## Dependencies

- Story 008 (ErrorCommands class)
- Story 009 (commands defined in package.json)

## Implementation

In `src/extension.ts`:

1. **Import ErrorCommands** at top of file:
```typescript
import { ErrorCommands } from './commands/errorCommands';
```

2. **In activate() function**, create and register:
```typescript
const errorCommands = new ErrorCommands();
errorCommands.register(context);
```

3. **Initialize Output Panel** on extension activation:
```typescript
import { OutputPanelLogger } from './errors/OutputPanelLogger';

// In activate()
const logger = OutputPanelLogger.getInstance();
// Logger is now ready for use
```

## Acceptance Criteria

- [ ] ErrorCommands imported in extension.ts
- [ ] ErrorCommands instance created in activate()
- [ ] errorCommands.register(context) called
- [ ] OutputPanelLogger imported
- [ ] OutputPanelLogger.getInstance() called in activate()
- [ ] Extension activates without errors
- [ ] Error commands available in command palette
- [ ] Context menus appear on error tree items

## Estimated Time

10 minutes

