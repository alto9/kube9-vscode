import React from 'react';

export type TabType = 'overview' | 'driftDetails';

interface TabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

/**
 * Tab bar component for switching between Overview and Drift Details tabs.
 */
export function TabBar({ activeTab, onTabChange }: TabBarProps): React.JSX.Element {
    const tabStyle: React.CSSProperties = {
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        color: 'var(--vscode-foreground)',
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)'
    };

    const activeTabStyle: React.CSSProperties = {
        ...tabStyle,
        borderBottomColor: 'var(--vscode-focusBorder)',
        fontWeight: '600'
    };

    return (
        <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--vscode-panel-border)',
            marginBottom: '20px'
        }}>
            <button
                style={activeTab === 'overview' ? activeTabStyle : tabStyle}
                onClick={() => onTabChange('overview')}
            >
                Overview
            </button>
            <button
                style={activeTab === 'driftDetails' ? activeTabStyle : tabStyle}
                onClick={() => onTabChange('driftDetails')}
            >
                Drift Details
            </button>
        </div>
    );
}

