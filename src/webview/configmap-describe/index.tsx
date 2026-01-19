import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigMapDescribeApp } from './ConfigMapDescribeApp';
import '../../../media/describe/podDescribe.css';

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ConfigMapDescribeApp />);
} else {
    console.error('Root element not found');
}
