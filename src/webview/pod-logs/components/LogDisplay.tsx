import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * Props for LogDisplay component.
 */
interface LogDisplayProps {
    /** Array of log lines to display */
    logs: string[];
    /** Whether to show timestamps */
    showTimestamps: boolean;
    /** Whether follow mode is enabled (auto-scroll to bottom) */
    followMode: boolean;
    /** Search query for highlighting matches */
    searchQuery: string;
    /** Array of log line indices that match the search query */
    searchMatches: number[];
    /** Current match index (0-based) */
    currentMatchIndex: number;
    /** Callback when user scrolls up (to disable follow mode) */
    onScrollUp: () => void;
}

/**
 * Parsed log line structure.
 */
interface ParsedLogLine {
    /** Timestamp if present in log line */
    timestamp?: string;
    /** Log content without timestamp */
    content: string;
}

/**
 * Parses a log line to extract timestamp and content.
 * Supports format: 2024-12-29T10:30:45.123Z <content>
 * 
 * @param line - Raw log line
 * @returns Parsed log line with timestamp and content
 */
function parseLogLine(line: string): ParsedLogLine {
    // Parse timestamp if present in format: 2024-12-29T10:30:45.123Z
    const timestampRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/;
    const match = line.match(timestampRegex);
    
    if (match) {
        return { timestamp: match[1], content: match[2] };
    }
    
    return { content: line };
}

/**
 * Highlights search matches in text by wrapping matches in a span.
 * 
 * @param text - Text to highlight
 * @param query - Search query
 * @returns React node with highlighted matches
 */
function highlightSearch(text: string, query: string): React.ReactNode {
    if (!query || query.trim() === '') {
        return text;
    }
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) {
        return text;
    }
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return (
        <>
            {before}
            <span className="search-match">{match}</span>
            {after}
        </>
    );
}

/**
 * LogDisplay component.
 * Renders log lines efficiently using virtual scrolling with react-window.
 * Only visible lines are rendered in the DOM for performance.
 */
export const LogDisplay: React.FC<LogDisplayProps> = ({
    logs,
    showTimestamps,
    followMode,
    searchQuery,
    searchMatches,
    currentMatchIndex,
    onScrollUp
}) => {
    const listRef = useRef<List>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(600);
    const wasFollowingRef = useRef(false);

    // Calculate list height from container
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                setListHeight(Math.max(0, containerHeight));
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Auto-scroll to bottom when followMode is on and logs change
    useEffect(() => {
        if (followMode && listRef.current && logs.length > 0) {
            listRef.current.scrollToItem(logs.length - 1, 'end');
            wasFollowingRef.current = true;
        }
    }, [logs, followMode]);

    // Scroll to current match when navigating search results
    useEffect(() => {
        if (searchMatches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length && listRef.current) {
            const matchLineIndex = searchMatches[currentMatchIndex];
            listRef.current.scrollToItem(matchLineIndex, 'center');
        }
    }, [searchMatches, currentMatchIndex]);

    // Detect scroll up to disable follow mode
    const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
        // Only handle user-initiated scrolls, not programmatic ones
        if (scrollUpdateWasRequested) {
            return;
        }

        if (followMode && logs.length > 0) {
            // Calculate total scrollable height: itemCount * itemSize
            const itemSize = 20;
            const totalHeight = logs.length * itemSize;
            
            // Calculate if we're at the bottom (within 50px threshold)
            const isAtBottom = scrollOffset + listHeight >= totalHeight - 50;
            
            // If user scrolled up (not at bottom), disable follow mode
            if (!isAtBottom && wasFollowingRef.current) {
                onScrollUp();
                wasFollowingRef.current = false;
            } else if (isAtBottom) {
                wasFollowingRef.current = true;
            }
        }
    }, [followMode, logs.length, listHeight, onScrollUp]);

    // Row component for rendering individual log lines
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const line = logs[index];
        const parsed = parseLogLine(line);
        const isMatch = searchQuery && parsed.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        return (
            <div
                style={style}
                className={`log-line ${isMatch ? 'highlight' : ''}`}
                role="row"
            >
                {showTimestamps && parsed.timestamp && (
                    <span className="timestamp">{parsed.timestamp}</span>
                )}
                <span className="log-content">
                    {highlightSearch(parsed.content, searchQuery)}
                </span>
            </div>
        );
    }, [logs, showTimestamps, searchQuery]);

    // Empty state
    if (logs.length === 0) {
        return (
            <div ref={containerRef} className="log-display">
                <div className="empty-state">
                    <p>No logs available</p>
                </div>
            </div>
        );
    }

    // Render virtualized list
    return (
        <div ref={containerRef} className="log-display">
            <List
                ref={listRef}
                height={listHeight}
                itemCount={logs.length}
                itemSize={20}
                width="100%"
                onScroll={handleScroll}
            >
                {Row}
            </List>
        </div>
    );
};
