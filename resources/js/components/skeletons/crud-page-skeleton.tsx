import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsRibbonSkeleton } from './stats-ribbon-skeleton';
import { TableSkeleton } from './table-skeleton';
import { CardGridSkeleton } from './card-grid-skeleton';

export interface CrudPageSkeletonProps {
    type?: 'table' | 'cards';
    statsCount?: number;
    tableColumns?: number;
    tableRows?: number;
    cardCount?: number;
    className?: string;
}

export function CrudPageSkeleton({
    type = 'table',
    statsCount = 4,
    tableColumns = 7,
    tableRows = 6,
    cardCount = 6,
    className = '',
}: CrudPageSkeletonProps) {
    return (
        <div className={`space-y-6 ${className}`}>
            {/* Cabecera del Módulo (Título, descripción y botón de acción) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton variant="rounded" className="h-8 w-64 md:w-80" />
                    <Skeleton variant="text" className="h-4 w-72 md:w-96 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton variant="rounded" className="h-9 w-28" />
                    <Skeleton variant="rounded" className="h-9 w-36" />
                </div>
            </div>

            {/* Cinta de Estadísticas / KPIs */}
            {statsCount > 0 && <StatsRibbonSkeleton count={statsCount} />}

            {/* Barra de Filtros, Búsqueda y Herramientas */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card">
                <div className="flex-1 flex items-center gap-2">
                    <Skeleton variant="rounded" className="h-9 w-full max-w-sm" />
                    <Skeleton variant="rounded" className="h-9 w-28" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton variant="rounded" className="h-9 w-32" />
                    <Skeleton variant="rounded" className="h-9 w-24" />
                </div>
            </div>

            {/* Contenido Principal: Tabla o Cuadrícula de Tarjetas */}
            {type === 'cards' ? (
                <CardGridSkeleton count={cardCount} />
            ) : (
                <TableSkeleton columns={tableColumns} rows={tableRows} />
            )}
        </div>
    );
}

