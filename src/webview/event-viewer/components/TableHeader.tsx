import React from 'react';

/**
 * Sort column type.
 */
export type SortColumn = 'level' | 'time' | 'source' | 'eventId' | 'category';

/**
 * Sort direction type.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Props for TableHeader component.
 */
interface TableHeaderProps {
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    onSort: (column: SortColumn) => void;
}

/**
 * TableHeader component.
 * Displays sortable column headers with sort indicators.
 */
export const TableHeader: React.FC<TableHeaderProps> = ({
    sortColumn,
    sortDirection,
    onSort
}) => {
    const headerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '120px 150px 1fr 200px 100px',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-editor-background)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        userSelect: 'none'
    };

    const columnStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        padding: '4px 0',
        transition: 'opacity 0.15s ease'
    };

    const columnHoverStyle: React.CSSProperties = {
        opacity: 0.8
    };

    const sortIndicatorStyle: React.CSSProperties = {
        fontSize: '10px',
        color: 'var(--vscode-foreground)',
        opacity: 0.7
    };

    const renderColumn = (
        column: SortColumn,
        label: string,
        flex: number = 1
    ) => {
        const isActive = sortColumn === column;
        const indicator = isActive
            ? sortDirection === 'asc'
                ? '↑'
                : '↓'
            : null;

        return (
            <div
                key={column}
                style={{
                    ...columnStyle,
                    flex: flex || 1
                }}
                onClick={() => onSort(column)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                }}
                title={`Sort by ${label}`}
            >
                <span>{label}</span>
                {indicator && (
                    <span style={sortIndicatorStyle}>{indicator}</span>
                )}
            </div>
        );
    };

    return (
        <div className="table-header" style={headerStyle}>
            {renderColumn('level', 'Level')}
            {renderColumn('time', 'Date/Time')}
            {renderColumn('source', 'Source')}
            {renderColumn('eventId', 'Event ID')}
            {renderColumn('category', 'Category')}
        </div>
    );
};

