import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualizedGridProps<T> {
    items: T[];
    itemHeight: number;
    columns: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number; // Number of rows to render outside viewport
    className?: string;
}

/**
 * Lightweight virtualized grid component
 * Only renders visible items + overscan buffer for performance
 */
export function VirtualizedGrid<T>({
    items,
    itemHeight,
    columns,
    containerHeight,
    renderItem,
    overscan = 2,
    className = ''
}: VirtualizedGridProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const rowCount = Math.ceil(items.length / columns);
    const totalHeight = rowCount * itemHeight;

    // Calculate visible range
    const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endRow = Math.min(
        rowCount,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems: { item: T; index: number; row: number; col: number }[] = [];

    for (let row = startRow; row < endRow; row++) {
        for (let col = 0; col < columns; col++) {
            const index = row * columns + col;
            if (index < items.length) {
                visibleItems.push({ item: items[index], index, row, col });
            }
        }
    }

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // If there aren't many items, just render normally
    if (items.length <= columns * 5) {
        return (
            <div className={`grid gap-3 ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {items.map((item, index) => renderItem(item, index))}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`overflow-y-auto ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, row, col }) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            top: row * itemHeight,
                            left: `${(col / columns) * 100}%`,
                            width: `${100 / columns}%`,
                            height: itemHeight,
                            padding: '6px'
                        }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Simple virtualized list (single column)
 */
interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
}

export function VirtualizedList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 3,
    className = ''
}: VirtualizedListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = items.length * itemHeight;

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // If there aren't many items, just render normally
    if (items.length <= 20) {
        return (
            <div className={`space-y-3 ${className}`}>
                {items.map((item, index) => renderItem(item, index))}
            </div>
        );
    }

    return (
        <div
            className={`overflow-y-auto ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, i) => (
                        <div key={startIndex + i} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + i)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default VirtualizedGrid;
