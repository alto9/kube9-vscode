import React from 'react';
import { PodInfo } from '../../../webview/PodLogsViewerPanel';
import { PanelPreferences } from '../../../utils/PreferencesManager';

/**
 * Props for Toolbar component.
 */
interface ToolbarProps {
    /** Current pod information */
    pod: PodInfo | null;
    /** List of available containers in the pod */
    containers: string[];
    /** Current user preferences */
    preferences: PanelPreferences;
    /** Handler for container selection change */
    onContainerChange: (container: string) => void;
    /** Handler for line limit change */
    onLineLimitChange: (limit: number | 'all' | 'custom') => void;
    /** Handler for timestamps toggle */
    onToggleTimestamps: () => void;
    /** Handler for follow mode toggle */
    onToggleFollow: () => void;
    /** Handler for previous logs toggle */
    onTogglePrevious: () => void;
    /** Handler for refresh action */
    onRefresh: () => void;
    /** Handler for clear action */
    onClear: () => void;
    /** Handler for copy action */
    onCopy: () => void;
    /** Handler for export action */
    onExport: () => void;
    /** Handler for search action */
    onSearch: () => void;
}

/**
 * Toolbar component for Pod Logs Viewer.
 * Provides pod information, container selector, controls, and action buttons.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
    pod,
    containers,
    preferences,
    onContainerChange,
    onLineLimitChange,
    onToggleTimestamps,
    onToggleFollow,
    onTogglePrevious,
    onRefresh,
    onClear,
    onCopy,
    onExport,
    onSearch
}) => {
    // Convert lineLimit to string for select value
    const lineLimitValue = preferences.lineLimit === 'all' ? 'all' : String(preferences.lineLimit);

    return (
        <div className="toolbar">
            {/* Pod Info Section */}
            <div className="toolbar-section pod-info">
                {pod && (
                    <>
                        <span className="pod-name">Pod: {pod.name}</span>
                        <span className="namespace">Namespace: {pod.namespace}</span>
                        
                        {containers.length > 1 ? (
                            <select
                                className="container-selector"
                                value={pod.container || ''}
                                onChange={(e) => onContainerChange(e.target.value)}
                                title="Select container"
                                aria-label="Select container"
                            >
                                {containers.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="all">All Containers</option>
                            </select>
                        ) : (
                            <span className="container-name">Container: {pod.container || containers[0] || 'N/A'}</span>
                        )}
                    </>
                )}
            </div>

            {/* Controls Section */}
            <div className="toolbar-section controls">
                <select
                    className="line-limit-selector"
                    value={lineLimitValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                            onLineLimitChange('custom' as 'custom');
                        } else {
                            onLineLimitChange(value === 'all' ? 'all' : parseInt(value, 10));
                        }
                    }}
                    title="Select line limit"
                    aria-label="Select line limit"
                >
                    <option value="50">50 lines</option>
                    <option value="100">100 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                    <option value="5000">5000 lines</option>
                    <option value="all">All lines</option>
                    <option value="custom">Custom...</option>
                </select>

                <button
                    className={`btn-toggle ${preferences.showTimestamps ? 'active' : ''}`}
                    onClick={onToggleTimestamps}
                    title="Toggle timestamps"
                    aria-label={`Timestamps: ${preferences.showTimestamps ? 'On' : 'Off'}`}
                    aria-pressed={preferences.showTimestamps}
                >
                    <span className="codicon codicon-clock"></span>
                    Timestamps: {preferences.showTimestamps ? 'On' : 'Off'}
                </button>

                <button
                    className={`btn-toggle ${preferences.followMode ? 'active' : ''}`}
                    onClick={onToggleFollow}
                    title="Toggle follow mode"
                    aria-label={`Follow: ${preferences.followMode ? 'On' : 'Off'}`}
                    aria-pressed={preferences.followMode}
                >
                    <span className={`codicon ${preferences.followMode ? 'codicon-debug-pause' : 'codicon-play'}`}></span>
                    Follow: {preferences.followMode ? 'On' : 'Off'}
                </button>

                {pod?.hasCrashed && (
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={preferences.showPrevious}
                            onChange={onTogglePrevious}
                            title="Show previous container logs"
                            aria-label="Show previous container logs"
                        />
                        Show previous container logs
                    </label>
                )}
            </div>

            {/* Actions Section */}
            <div className="toolbar-section actions">
                <button
                    className="btn-icon"
                    onClick={onRefresh}
                    title="Refresh logs"
                    aria-label="Refresh logs"
                >
                    <span className="codicon codicon-refresh"></span>
                </button>
                <button
                    className="btn-icon"
                    onClick={onClear}
                    title="Clear display"
                    aria-label="Clear display"
                >
                    <span className="codicon codicon-clear-all"></span>
                </button>
                <button
                    className="btn-icon"
                    onClick={onCopy}
                    title="Copy logs"
                    aria-label="Copy logs"
                >
                    <span className="codicon codicon-copy"></span>
                </button>
                <button
                    className="btn-icon"
                    onClick={onExport}
                    title="Export logs"
                    aria-label="Export logs"
                >
                    <span className="codicon codicon-save"></span>
                </button>
                <button
                    className="btn-icon"
                    onClick={onSearch}
                    title="Search logs"
                    aria-label="Search logs"
                >
                    <span className="codicon codicon-search"></span>
                </button>
            </div>
        </div>
    );
};

