import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { StatsRibbonSkeleton } from './stats-ribbon-skeleton';
import { TableSkeleton } from './table-skeleton';

export function DetailViewSkeleton() {
    return (
        <div className="space-y-6">
            {/* Botón Volver */}
            <Skeleton variant="rounded" className="h-6 w-44" />

            {/* Cabecera Principal de Obra */}
            <Card className="border border-border/70 shadow-xs bg-card">
                <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton variant="rounded" className="h-5 w-24" />
                                <Skeleton variant="rounded" className="h-5 w-24" />
                                <Skeleton variant="rounded" className="h-5 w-20" />
                            </div>
                            <Skeleton variant="rounded" className="h-8 w-80 md:w-96" />
                            <div className="flex items-center gap-3">
                                <Skeleton variant="text" className="h-3 w-36" />
                                <Skeleton variant="text" className="h-3 w-40" />
                            </div>
                        </div>

                        {/* Caja del Ingeniero Residente */}
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                            <Skeleton variant="circular" className="size-10" />
                            <div className="space-y-1">
                                <Skeleton variant="text" className="h-3.5 w-32" />
                                <Skeleton variant="text" className="h-3 w-24" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cinta de 5 Métricas Financieras */}
            <StatsRibbonSkeleton count={5} />

            {/* Barra de Pestañas (Cómputos Maprex, Cronograma, Memoria) */}
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
                <Skeleton variant="rounded" className="h-9 w-44" />
                <Skeleton variant="rounded" className="h-9 w-40" />
                <Skeleton variant="rounded" className="h-9 w-36" />
            </div>

            {/* Barra de Filtros de la Tabla */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <Skeleton variant="rounded" className="h-9 w-72" />
                <div className="flex items-center gap-2">
                    <Skeleton variant="rounded" className="h-8 w-28" />
                    <Skeleton variant="rounded" className="h-8 w-32" />
                </div>
            </div>

            {/* Tabla de Partidas */}
            <TableSkeleton columns={8} rows={8} />
        </div>
    );
}

