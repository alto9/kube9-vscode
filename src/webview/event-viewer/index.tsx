import React from 'react';
import { createRoot } from 'react-dom/client';
import { EventViewerApp } from './EventViewerApp';

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<EventViewerApp />);
} else {
    console.error('Root element not found');
}
