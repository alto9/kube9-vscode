const vscode = acquireVsCodeApi();

function openHelp() {
  const helpContext = document.body.dataset.helpContext || 'default';
  vscode.postMessage({
    type: 'openHelp',
    context: helpContext
  });
}

