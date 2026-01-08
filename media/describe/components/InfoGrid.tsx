import React from 'react';

/**
 * Grid container component for displaying info items in a responsive grid layout.
 * Used to display label-value pairs in a structured format.
 */
export const InfoGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="info-grid">
            {children}
        </div>
    );
};

