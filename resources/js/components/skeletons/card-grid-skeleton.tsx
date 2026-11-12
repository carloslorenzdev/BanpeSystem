import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export interface CardGridSkeletonProps {
    count?: number;
    className?: string;
}

export function CardGridSkeleton({
    count = 6,
    className = '',
}: CardGridSkeletonProps) {
    const cards = Array.from({ length: count });

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
            {cards.map((_, i) => (
                <Card
                    key={`card-skel-${i}`}
                    className="border border-border/70 shadow-xs bg-card flex flex-col justify-between overflow-hidden relative"
                >
                    {/* Línea de acento superior */}
                    <div className="h-1.5 w-full bg-muted/60" />

                    <CardHeader className="p-4 pb-2 space-y-2">
                        {/* Código y Estado */}
                        <div className="flex items-center justify-between gap-2">
                            <Skeleton variant="rounded" className="h-5 w-24" />
                            <Skeleton variant="rounded" className="h-5 w-24" />
                        </div>

                        {/* Título de la obra */}
                        <div className="space-y-1.5 pt-1">
                            <Skeleton variant="rounded" className="h-5 w-full" />
                            <Skeleton variant="rounded" className="h-5 w-3/4" />
                        </div>

                        {/* Cliente y Ubicación */}
                        <div className="space-y-1 pt-1">
                            <div className="flex items-center gap-1.5">
                                <Skeleton variant="circular" className="size-3.5" />
                                <Skeleton variant="text" className="h-3 w-32" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Skeleton variant="circular" className="size-3.5" />
                                <Skeleton variant="text" className="h-3 w-44" />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 pb-3 space-y-3">
                        {/* Barra de progreso físico */}
                        <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                            <div className="flex justify-between items-center">
                                <Skeleton variant="text" className="h-3 w-24" />
                                <Skeleton variant="rounded" className="h-4 w-12" />
                            </div>
                            <Skeleton variant="rounded" className="h-2 w-full" />
                        </div>

                        {/* Presupuesto y Partidas */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/40 p-2 rounded-md space-y-1">
                                <Skeleton variant="text" className="h-2.5 w-16" />
                                <Skeleton variant="rounded" className="h-4 w-20" />
                            </div>
                            <div className="bg-muted/40 p-2 rounded-md space-y-1">
                                <Skeleton variant="text" className="h-2.5 w-16" />
                                <Skeleton variant="rounded" className="h-4 w-16" />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        {/* Residente Asignado */}
                        <div className="flex items-center gap-2">
                            <Skeleton variant="circular" className="size-7" />
                            <div className="space-y-1">
                                <Skeleton variant="text" className="h-3 w-24" />
                                <Skeleton variant="text" className="h-2.5 w-16" />
                            </div>
                        </div>
                        {/* Botón de acceso */}
                        <Skeleton variant="rounded" className="h-8 w-20" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

