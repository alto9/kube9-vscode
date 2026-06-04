import React from 'react';
import { createRoot } from 'react-dom/client';
import { EventViewerApp } from './EventViewerApp';

const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode) {
    (window as { vscodeApi?: ReturnType<typeof acquireVsCodeApi> }).vscodeApi = vscode;
}

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<EventViewerApp />);
} else {
    console.error('Root element not found');
}
