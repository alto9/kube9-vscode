import React from 'react';
import { createRoot } from 'react-dom/client';
import { ServiceDescribeApp } from './ServiceDescribeApp';
import '../../../media/describe/podDescribe.css';

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ServiceDescribeApp />);
} else {
    console.error('Root element not found');
}
