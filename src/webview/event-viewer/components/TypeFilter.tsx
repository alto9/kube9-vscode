import React from 'react';

/**
 * Props for TypeFilter component.
 */
interface TypeFilterProps {
    selected?: string; // 'all' | 'Normal' | 'Warning' | 'Error'
    onChange: (type: string) => void;
    counts: {
        Normal: number;
        Warning: number;
        Error: number;
    };
}

/**
 * TypeFilter component.
 * Radio button group for filtering events by type (Normal, Warning, Error) with counts.
 */
export const TypeFilter: React.FC<TypeFilterProps> = ({ selected = 'all', onChange, counts }) => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    };

    const radioGroupStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const radioOptionStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)'
    };

    const radioInputStyle: React.CSSProperties = {
        cursor: 'pointer',
        accentColor: 'var(--vscode-button-background)'
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        flex: 1
    };

    const countBadgeStyle: React.CSSProperties = {
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        marginLeft: 'auto'
    };

    const handleChange = (value: string) => {
        onChange(value);
    };

    const getTypeIcon = (type: string): string => {
        switch (type) {
            case 'Normal':
                return 'codicon-check';
            case 'Warning':
                return 'codicon-warning';
            case 'Error':
                return 'codicon-error';
            default:
                return 'codicon-circle-filled';
        }
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'Normal':
                return 'var(--vscode-testing-iconPassed)';
            case 'Warning':
                return 'var(--vscode-testing-iconQueued)';
            case 'Error':
                return 'var(--vscode-testing-iconFailed)';
            default:
                return 'var(--vscode-foreground)';
        }
    };

    return (
        <div style={containerStyle}>
            <div style={radioGroupStyle} role="radiogroup" aria-label="Filter by event type">
                <label style={radioOptionStyle}>
                    <input
                        type="radio"
                        name="event-type"
                        value="all"
                        checked={selected === 'all'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={radioInputStyle}
                    />
                    <span style={labelStyle}>
                        <span className="codicon codicon-circle-filled" style={{ fontSize: '12px' }}></span>
                        All
                    </span>
                    <span style={countBadgeStyle}>
                        {counts.Normal + counts.Warning + counts.Error}
                    </span>
                </label>
                <label style={radioOptionStyle}>
                    <input
                        type="radio"
                        name="event-type"
                        value="Normal"
                        checked={selected === 'Normal'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={radioInputStyle}
                    />
                    <span style={labelStyle}>
                        <span
                            className="codicon codicon-check"
                            style={{ fontSize: '12px', color: getTypeColor('Normal') }}
                        ></span>
                        Normal
                    </span>
                    <span style={countBadgeStyle}>{counts.Normal}</span>
                </label>
                <label style={radioOptionStyle}>
                    <input
                        type="radio"
                        name="event-type"
                        value="Warning"
                        checked={selected === 'Warning'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={radioInputStyle}
                    />
                    <span style={labelStyle}>
                        <span
                            className="codicon codicon-warning"
                            style={{ fontSize: '12px', color: getTypeColor('Warning') }}
                        ></span>
                        Warning
                    </span>
                    <span style={countBadgeStyle}>{counts.Warning}</span>
                </label>
                <label style={radioOptionStyle}>
                    <input
                        type="radio"
                        name="event-type"
                        value="Error"
                        checked={selected === 'Error'}
                        onChange={(e) => handleChange(e.target.value)}
                        style={radioInputStyle}
                    />
                    <span style={labelStyle}>
                        <span
                            className="codicon codicon-error"
                            style={{ fontSize: '12px', color: getTypeColor('Error') }}
                        ></span>
                        Error
                    </span>
                    <span style={countBadgeStyle}>{counts.Error}</span>
                </label>
            </div>
        </div>
    );
};

