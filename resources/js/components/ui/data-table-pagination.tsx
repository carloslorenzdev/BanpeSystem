import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DataTablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    fromIndex: number;
    toIndex: number;
    perPage: 10 | 15;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: 10 | 15) => void;
    itemLabel?: string;
    className?: string;
}

export function DataTablePagination({
    currentPage,
    totalPages,
    totalItems,
    fromIndex,
    toIndex,
    perPage,
    onPageChange,
    onPerPageChange,
    itemLabel = 'registros',
    className = '',
}: DataTablePaginationProps) {
    if (totalItems === 0) return null;

    // Helper to compute visible page numbers with ellipsis
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show page 1
            pages.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = 4;
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            if (start > 2) {
                pages.push('ellipsis');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push('ellipsis');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 px-1 text-xs text-muted-foreground ${className}`}
        >
            {/* Info y Selector de filas por página */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="font-medium text-foreground/80">
                    Mostrando{' '}
                    <span className="font-bold text-foreground">
                        {fromIndex}
                    </span>{' '}
                    a{' '}
                    <span className="font-bold text-foreground">
                        {toIndex}
                    </span>{' '}
                    de{' '}
                    <span className="font-bold text-foreground">
                        {totalItems}
                    </span>{' '}
                    {itemLabel}
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        Mostrar:
                    </span>
                    <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/40">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onPerPageChange(10);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                                perPage === 10
                                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            10
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onPerPageChange(15);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                                perPage === 15
                                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            15
                        </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                        / pág.
                    </span>
                </div>
            </div>

            {/* Controles de Navegación */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {/* Primera Página */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 p-0"
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(1);
                        }}
                        disabled={currentPage === 1}
                        title="Primera página"
                    >
                        <ChevronsLeft className="size-4" />
                    </Button>

                    {/* Anterior */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 p-0"
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(currentPage - 1);
                        }}
                        disabled={currentPage === 1}
                        title="Página anterior"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>

                    {/* Botones numéricos */}
                    <div className="flex items-center gap-1 mx-1">
                        {pages.map((p, idx) => {
                            if (p === 'ellipsis') {
                                return (
                                    <span
                                        key={`ellipsis-${idx}`}
                                        className="px-1.5 text-muted-foreground select-none"
                                    >
                                        ...
                                    </span>
                                );
                            }

                            const isActive = p === currentPage;
                            return (
                                <Button
                                    key={`page-${p}`}
                                    type="button"
                                    variant={isActive ? 'default' : 'outline'}
                                    size="icon"
                                    className={`size-8 p-0 text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-500 shadow-xs'
                                            : 'hover:bg-muted text-foreground'
                                    }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onPageChange(p);
                                    }}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Siguiente */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 p-0"
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(currentPage + 1);
                        }}
                        disabled={currentPage === totalPages}
                        title="Página siguiente"
                    >
                        <ChevronRight className="size-4" />
                    </Button>

                    {/* Última Página */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 p-0"
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(totalPages);
                        }}
                        disabled={currentPage === totalPages}
                        title="Última página"
                    >
                        <ChevronsRight className="size-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default DataTablePagination;

