import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmPackageManager } from './HelmPackageManager';
import { ErrorBoundary } from './components/ErrorBoundary';

// Render React app with error boundary
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <ErrorBoundary>
            <HelmPackageManager />
        </ErrorBoundary>
    );
} else {
    console.error('Root element not found');
}

