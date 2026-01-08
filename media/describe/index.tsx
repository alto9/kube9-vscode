import React from 'react';
import { createRoot } from 'react-dom/client';
import { NamespaceDescribeApp } from './NamespaceDescribeApp';
import { VSCodeAPI } from './types';
import './styles.css';

/**
 * Acquire VS Code API (available in webview context)
 */
declare function acquireVsCodeApi(): VSCodeAPI;

// Acquire VS Code API
const vscode = acquireVsCodeApi();

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<NamespaceDescribeApp vscode={vscode} />);
} else {
    console.error('Root element not found');
}

