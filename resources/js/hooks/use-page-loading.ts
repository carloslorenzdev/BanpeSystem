import { useEffect, useState, useRef } from 'react';
import { router } from '@inertiajs/react';

interface UsePageLoadingOptions {
    /** Minimum duration to show skeleton to avoid jarring sub-frame flashes (default: 250ms) */
    minDisplayTime?: number;
}

export function usePageLoading(options: UsePageLoadingOptions = {}) {
    const { minDisplayTime = 250 } = options;
    const [isLoading, setIsLoading] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const removeStart = router.on('start', (event) => {
            const visit = event.detail.visit as any;

            // IGNORAR PREFETCH: Los enlaces precargados al pasar el mouse (hover) en Inertia no deben activar el skeleton de la pantalla actual
            if (visit?.prefetch) {
                return;
            }

            // IGNORAR VISITAS SILENCIOSAS EN SEGUNDO PLANO: polling, deferred props o sin barra de progreso
            if (visit?.poll || visit?.deferredProps || visit?.showProgress === false) {
                return;
            }

            startTimeRef.current = Date.now();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            try {
                const currentPath = window.location.pathname;
                const targetUrl = new URL(visit.url, window.location.origin);
                const isSamePath = targetUrl.pathname === currentPath;

                setIsFiltering(isSamePath);
                setIsNavigating(!isSamePath);
            } catch {
                setIsFiltering(true);
                setIsNavigating(false);
            }

            setIsLoading(true);
        });

        const handleComplete = () => {
            if (startTimeRef.current === 0) {
                return;
            }

            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, minDisplayTime - elapsed);

            if (remaining > 0) {
                timerRef.current = setTimeout(() => {
                    setIsLoading(false);
                    setIsFiltering(false);
                    setIsNavigating(false);
                    startTimeRef.current = 0;
                }, remaining);
            } else {
                setIsLoading(false);
                setIsFiltering(false);
                setIsNavigating(false);
                startTimeRef.current = 0;
            }
        };

        const removeFinish = router.on('finish', handleComplete);
        const removeError = router.on('error', handleComplete);

        return () => {
            removeStart();
            removeFinish();
            removeError();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [minDisplayTime]);

    return {
        isLoading,
        isFiltering,
        isNavigating,
    };
}

