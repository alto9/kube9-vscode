import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

// Make vscode API globally available
if (vscode) {
    (window as any).vscode = vscode;
}

/**
 * Main entry point for the Pod Logs Viewer React webview.
 */
// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root element not found');
}

