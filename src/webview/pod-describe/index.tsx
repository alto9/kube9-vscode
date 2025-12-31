import React from 'react';
import { createRoot } from 'react-dom/client';
import { PodDescribeApp } from './PodDescribeApp';

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<PodDescribeApp />);
} else {
    console.error('Root element not found');
}

