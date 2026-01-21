import React, { useRef, useEffect, useCallback, useState } from 'react';
import { VariableSizeList as List } from 'react-window';

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
    
    // Row height cache and refs for dynamic sizing
    const rowHeights = useRef<Map<number, number>>(new Map());
    const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Get height for a specific row index
    const getItemSize = useCallback((index: number) => {
        const cachedHeight = rowHeights.current.get(index);
        if (cachedHeight) {
            return cachedHeight;
        }
        
        // Estimate height based on content length if not yet measured
        // This provides better initial scroll calculations
        if (index >= 0 && index < logs.length) {
            const line = logs[index];
            const parsed = parseLogLine(line);
            const contentLength = parsed.content.length;
            
            // Rough estimate: ~100 characters per line at current font size
            // With word wrapping, longer lines will take more vertical space
            const estimatedLines = Math.ceil(contentLength / 100);
            const lineHeight = 20; // matches CSS line-height
            const padding = 4; // 2px top + 2px bottom padding
            const estimatedHeight = Math.max(20, (estimatedLines * lineHeight) + padding);
            
            return estimatedHeight;
        }
        
        return 20; // fallback minimum
    }, [logs]);

    // Measure row height after render
    const setRowRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
        if (element) {
            rowRefs.current.set(index, element);
            const height = element.offsetHeight;
            const currentHeight = rowHeights.current.get(index);
            
            if (currentHeight !== height) {
                rowHeights.current.set(index, height);
                // Force list to recalculate layout
                listRef.current?.resetAfterIndex(index);
            }
        }
    }, []);

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
        return () => {
            window.removeEventListener('resize', updateHeight);
            // Clear any pending scroll timeout on unmount
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Clear height cache when logs change significantly
    useEffect(() => {
        rowHeights.current.clear();
        rowRefs.current.clear();
        if (listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [logs.length]);

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

    // Track last scroll offset to detect significant scroll movements
    const lastScrollOffset = useRef(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Detect scroll up to disable follow mode
    const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
        // Only handle user-initiated scrolls, not programmatic ones
        if (scrollUpdateWasRequested) {
            lastScrollOffset.current = scrollOffset;
            return;
        }

        if (!followMode || logs.length === 0 || !wasFollowingRef.current) {
            lastScrollOffset.current = scrollOffset;
            return;
        }

        // Clear any pending scroll timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Detect scroll direction and magnitude
        const scrollDelta = scrollOffset - lastScrollOffset.current;
        const scrollingUp = scrollDelta < 0;
        
        // Only disable follow mode if user scrolled up by at least 200px
        // This conservative threshold prevents false positives during height adjustments
        if (scrollingUp && Math.abs(scrollDelta) > 200) {
            // Debounce to ensure this isn't just a transient scroll during layout
            scrollTimeoutRef.current = setTimeout(() => {
                onScrollUp();
                wasFollowingRef.current = false;
            }, 100);
        }
        
        lastScrollOffset.current = scrollOffset;
    }, [followMode, logs.length, onScrollUp]);

    // Row component for rendering individual log lines
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const line = logs[index];
        const parsed = parseLogLine(line);
        const isMatch = searchQuery && parsed.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        return (
            <div
                ref={setRowRef(index)}
                style={{
                    ...style,
                    height: 'auto',  // Allow natural height
                    minHeight: 20    // Minimum 20px
                }}
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
    }, [logs, showTimestamps, searchQuery, setRowRef]);

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
                itemSize={getItemSize}
                width="100%"
                onScroll={handleScroll}
            >
                {Row}
            </List>
        </div>
    );
};
