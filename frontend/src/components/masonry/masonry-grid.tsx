"use client";

import { createContext, useEffect, useState, Fragment } from "react";

/** True when the grid is in single-column mode — cards should use a uniform aspect ratio. */
export const UniformCardsContext = createContext(false);

const SM_BREAKPOINT = 640;
const LG_BREAKPOINT = 1024;

function useColumnCount() {
    const [width, setWidth] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth : LG_BREAKPOINT
    );

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    if (width < SM_BREAKPOINT) return 1;
    if (width < LG_BREAKPOINT) return 2;
    return 3;
}

function splitIntoColumns<T>(items: T[], cols: number): T[][] {
    const rows = Math.ceil(items.length / cols);
    return Array.from({ length: cols }, (_, col) =>
        Array.from({ length: rows }, (_, row) => items[row * cols + col]).filter(Boolean)
    ) as T[][];
}

interface MasonryGridProps<T extends { id: string }> {
    items: T[];
    /** Called per item. `index` is the global position across all columns — use it for aspect-ratio variation. */
    renderItem: (item: T, index: number) => React.ReactNode;
}

export function MasonryGrid<T extends { id: string }>({ items, renderItem }: MasonryGridProps<T>) {
    const columnCount = useColumnCount();
    const columns = columnCount === 1 ? [items] : splitIntoColumns(items, columnCount);

    return (
        <UniformCardsContext.Provider value={columnCount === 1}>
            <div className="flex items-start gap-4">
                {columns.map((col, ci) => (
                    <div key={ci} className="flex flex-1 flex-col gap-4">
                        {col.map((item, ri) => (
                            <Fragment key={item.id}>
                                {renderItem(item, ri * columnCount + ci)}
                            </Fragment>
                        ))}
                    </div>
                ))}
            </div>
        </UniformCardsContext.Provider>
    );
}
