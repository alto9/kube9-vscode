import React from 'react';
import { createRoot } from 'react-dom/client';
import { CRDDescribeApp } from './CRDDescribeApp';
import '../../../media/describe/podDescribe.css';

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(
        <React.StrictMode>
            <CRDDescribeApp />
        </React.StrictMode>
    );
}
