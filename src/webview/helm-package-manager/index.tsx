import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmPackageManager } from './HelmPackageManager';

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<HelmPackageManager />);
} else {
    console.error('Root element not found');
}

