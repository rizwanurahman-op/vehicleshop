"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    className?: string;
}

export function TablePagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
    isLoading = false,
    className,
}: TablePaginationProps) {
    if (totalPages <= 0 || total === 0) return null;

    const from = (page - 1) * limit + 1;
    const to   = Math.min(page * limit, total);

    // Build visible page numbers with ellipsis
    const buildPageNums = (): (number | "...")[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "...")[] = [];
        const delta = 1; // pages around current
        const left  = Math.max(2, page - delta);
        const right = Math.min(totalPages - 1, page + delta);

        pages.push(1);
        if (left > 2) pages.push("...");
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    const pageNums = buildPageNums();

    return (
        <div className={cn(
            "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/5",
            className
        )}>
            {/* Row count info */}
            <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
                Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> entries
            </p>

            {/* Navigation */}
            <div className="flex items-center gap-1">
                {/* First page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hidden sm:flex"
                    onClick={() => onPageChange(1)}
                    disabled={page === 1 || isLoading}
                    title="First page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1 || isLoading}
                    title="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-0.5">
                    {pageNums.map((p, i) =>
                        p === "..." ? (
                            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-muted-foreground select-none">
                                …
                            </span>
                        ) : (
                            <Button
                                key={p}
                                variant={p === page ? "default" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-8 w-8 text-xs font-semibold transition-all",
                                    p === page
                                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => onPageChange(p as number)}
                                disabled={isLoading}
                            >
                                {p}
                            </Button>
                        )
                    )}
                </div>

                {/* Next page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages || isLoading}
                    title="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last page */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hidden sm:flex"
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages || isLoading}
                    title="Last page"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default TablePagination;
