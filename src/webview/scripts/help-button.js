// Get VS Code API instance - check for shared instance first to avoid multiple acquisitions
let vscode;
if (window.vscodeApi) {
  // Use shared instance from React bundle
  vscode = window.vscodeApi;
} else if (typeof acquireVsCodeApi !== 'undefined') {
  try {
    // Try to acquire if not already acquired
    vscode = acquireVsCodeApi();
    // Expose on window for consistency
    window.vscodeApi = vscode;
  } catch (error) {
    // API already acquired, try to get from window
    vscode = window.vscode || null;
    if (vscode) {
      window.vscodeApi = vscode;
    }
  }
}

function openHelp() {
  if (!vscode) {
    console.error('VS Code API not available');
    return;
  }
  const helpContext = document.body.dataset.helpContext || 'default';
  vscode.postMessage({
    type: 'openHelp',
    context: helpContext
  });
}

