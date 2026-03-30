"use client";

import { useState, useCallback } from "react";

interface PaginationProps {
    totalPages: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
}

export function Pagination({
    totalPages,
    currentPage: controlledPage,
    onPageChange,
}: PaginationProps) {
    const [internalPage, setInternalPage] = useState(1);
    const currentPage = controlledPage ?? internalPage;

    const handleClick = useCallback(
        (page: number) => {
            if (page < 1 || page > totalPages) return;
            if (onPageChange) {
                onPageChange(page);
            } else {
                setInternalPage(page);
            }
        },
        [totalPages, onPageChange]
    );

    const pages = buildPageNumbers(currentPage, totalPages);

    return (
        <div className="flex items-center justify-center gap-0.5 py-8">
            {pages.map((page, i) =>
                page === "..." ? (
                    <span
                        key={`ellipsis-${i}`}
                        className="text-muted-foreground flex h-8 w-8 items-center justify-center font-mono text-[10px] tracking-wider"
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={page}
                        onClick={() => handleClick(page as number)}
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center border font-mono text-[10px] tracking-wider transition-all ${
                            currentPage === page
                                ? "bg-foreground text-background border-foreground"
                                : "text-muted-foreground hover:border-muted hover:text-foreground border-transparent"
                        }`}
                    >
                        {page}
                    </button>
                )
            )}
        </div>
    );
}

function buildPageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (current > 3) {
        pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (current < total - 2) {
        pages.push("...");
    }

    pages.push(total);

    return pages;
}
