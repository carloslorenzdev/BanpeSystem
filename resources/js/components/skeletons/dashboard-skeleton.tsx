import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatsRibbonSkeleton } from './stats-ribbon-skeleton';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Banner de Bienvenida */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                <Skeleton variant="rounded" className="h-7 w-64 md:w-80" />
                <Skeleton variant="text" className="h-4 w-96 max-w-full" />
            </div>

            {/* 4 Métricas Clave */}
            <StatsRibbonSkeleton count={4} />

            {/* Cuadrícula de Gráficos y Actividades Recientes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border border-border/70 bg-card">
                    <CardHeader className="space-y-1">
                        <Skeleton variant="rounded" className="h-5 w-48" />
                        <Skeleton variant="text" className="h-3 w-64" />
                    </CardHeader>
                    <CardContent className="h-72 flex items-end gap-3 pt-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton
                                key={`bar-${i}`}
                                variant="rounded"
                                className="flex-1"
                                style={{ height: `${30 + ((i * 19) % 65)}%` }}
                            />
                        ))}
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card">
                    <CardHeader className="space-y-1">
                        <Skeleton variant="rounded" className="h-5 w-40" />
                        <Skeleton variant="text" className="h-3 w-52" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={`act-${i}`} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                                <Skeleton variant="circular" className="size-8 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton variant="text" className="h-3.5 w-3/4" />
                                    <Skeleton variant="text" className="h-2.5 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

