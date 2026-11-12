import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { usePageLoading } from '@/hooks/use-page-loading';
import { notify } from '@/lib/notify';
import type { AppLayoutProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { isLoading } = usePageLoading();
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const lastFlashRef = useRef<string | null>(null);

    // Despachar notificaciones Sileo con animación fluida cuando llegan mensajes flash de Laravel
    useEffect(() => {
        if (!flash) return;

        if (flash.success && lastFlashRef.current !== `s:${flash.success}`) {
            lastFlashRef.current = `s:${flash.success}`;
            notify.success(flash.success);
        } else if (flash.error && lastFlashRef.current !== `e:${flash.error}`) {
            lastFlashRef.current = `e:${flash.error}`;
            notify.error(flash.error);
        }
    }, [flash]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {isLoading && (
                    <div className="h-0.5 w-full bg-amber-500/20 overflow-hidden relative" role="progressbar" aria-label="Cargando información">
                        <div className="h-full bg-amber-500 absolute inset-0 animate-pulse skeleton-wave" />
                    </div>
                )}
                {children}
            </AppContent>
        </AppShell>
    );
}
