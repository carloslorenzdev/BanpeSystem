import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export interface StatsRibbonSkeletonProps {
    /** Number of metric cards to display (default: 4) */
    count?: number;
    className?: string;
}

export function StatsRibbonSkeleton({
    count = 4,
    className = '',
}: StatsRibbonSkeletonProps) {
    const cards = Array.from({ length: count });

    const gridColsClass =
        count === 5
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            : count === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

    return (
        <div className={`grid gap-3.5 ${gridColsClass} ${className}`}>
            {cards.map((_, i) => (
                <Card key={`stat-skel-${i}`} className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3.5 px-4">
                        <Skeleton variant="text" className="h-3.5 w-28" />
                        <Skeleton variant="circular" className="size-6" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5 space-y-1.5">
                        <Skeleton variant="rounded" className="h-7 w-32" />
                        <Skeleton variant="text" className="h-3 w-40" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

