import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

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

