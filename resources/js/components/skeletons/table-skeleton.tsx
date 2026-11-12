import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface TableSkeletonProps {
    /** Number of rows to render (default: 6) */
    rows?: number;
    /** Number of columns or custom column definition */
    columns?: number;
    /** Show table header skeleton (default: true) */
    showHeader?: boolean;
    /** Show right-aligned action buttons skeleton (default: true) */
    showActions?: boolean;
    className?: string;
}

export function TableSkeleton({
    rows = 6,
    columns = 6,
    showHeader = true,
    showActions = true,
    className = '',
}: TableSkeletonProps) {
    const colCount = Math.max(2, columns);
    const rowList = Array.from({ length: rows });
    const colList = Array.from({ length: colCount });

    // Alternar anchos aleatorios pero deterministas para que luzca como datos reales
    const getCellWidth = (rowIdx: number, colIdx: number) => {
        if (colIdx === 0) return 'w-16 sm:w-20'; // Códigos (ej: OBR-001, INS-120)
        if (colIdx === 1) return 'w-44 sm:w-64'; // Nombres / Descripciones
        if (colIdx === colCount - 1 && showActions) return 'w-12 ml-auto'; // Acciones
        const patterns = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16'];
        return patterns[(rowIdx + colIdx) % patterns.length];
    };

    return (
        <div className={`w-full overflow-hidden rounded-xl border border-border/70 bg-card ${className}`}>
            <Table>
                {showHeader && (
                    <TableHeader className="bg-muted/50 border-b border-border/60">
                        <TableRow>
                            {colList.map((_, i) => (
                                <TableHead key={`th-${i}`} className="py-3 px-4">
                                    <Skeleton
                                        variant="rounded"
                                        className={`h-4 ${
                                            i === 0
                                                ? 'w-16'
                                                : i === 1
                                                ? 'w-36'
                                                : i === colCount - 1 && showActions
                                                ? 'w-14 ml-auto'
                                                : 'w-24'
                                        }`}
                                    />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                )}
                <TableBody>
                    <TableBodySkeleton rows={rows} columns={columns} showActions={showActions} />
                </TableBody>
            </Table>
        </div>
    );
}

export function TableBodySkeleton({
    rows = 6,
    columns = 6,
    showActions = true,
}: {
    rows?: number;
    columns?: number;
    showActions?: boolean;
}) {
    const colCount = Math.max(2, columns);
    const rowList = Array.from({ length: rows });
    const colList = Array.from({ length: colCount });

    const getCellWidth = (rowIdx: number, colIdx: number) => {
        if (colIdx === 0) return 'w-16 sm:w-20';
        if (colIdx === 1) return 'w-44 sm:w-64';
        if (colIdx === colCount - 1 && showActions) return 'w-12 ml-auto';
        const patterns = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16'];
        return patterns[(rowIdx + colIdx) % patterns.length];
    };

    return (
        <>
            {rowList.map((_, rIdx) => (
                <TableRow key={`tb-row-${rIdx}`} className="border-b border-border/40 hover:bg-transparent">
                    {colList.map((_, cIdx) => (
                        <TableCell key={`tb-cell-${rIdx}-${cIdx}`} className="py-3.5 px-4">
                            {cIdx === colCount - 1 && showActions ? (
                                <div className="flex items-center justify-end gap-1.5">
                                    <Skeleton variant="rounded" className="size-7" />
                                    <Skeleton variant="rounded" className="size-7" />
                                </div>
                            ) : cIdx === 0 ? (
                                <Skeleton variant="rounded" className="h-5 w-20" />
                            ) : cIdx === 1 ? (
                                <div className="space-y-1.5">
                                    <Skeleton variant="text" className="h-4 w-48 sm:w-60" />
                                    <Skeleton variant="text" className="h-3 w-28 text-muted-foreground/40" />
                                </div>
                            ) : (
                                <Skeleton
                                    variant="rounded"
                                    className={`h-4.5 ${getCellWidth(rIdx, cIdx)}`}
                                />
                            )}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

