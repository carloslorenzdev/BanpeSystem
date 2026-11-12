import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { notify } from '@/lib/notify';

export function useFlashToast(): void {
    const lastFlashRef = useRef<string | null>(null);

    useEffect(() => {
        const handleProps = (props: any) => {
            const flash = props?.flash;
            if (!flash) return;

            if (flash.success && lastFlashRef.current !== `s:${flash.success}`) {
                lastFlashRef.current = `s:${flash.success}`;
                notify.success(flash.success);
            } else if (flash.error && lastFlashRef.current !== `e:${flash.error}`) {
                lastFlashRef.current = `e:${flash.error}`;
                notify.error(flash.error);
            } else if (flash.warning && lastFlashRef.current !== `w:${flash.warning}`) {
                lastFlashRef.current = `w:${flash.warning}`;
                notify.warning(flash.warning);
            } else if (flash.info && lastFlashRef.current !== `i:${flash.info}`) {
                lastFlashRef.current = `i:${flash.info}`;
                notify.info(flash.info);
            }
        };

        const removeNavigate = router.on('navigate', (event: any) => {
            handleProps(event?.detail?.page?.props);
        });

        const removeFlash = router.on('flash', (event: any) => {
            const data = event?.detail?.flash?.toast;
            if (data?.message) {
                if (data.type === 'error') {
                    notify.error(data.message);
                } else if (data.type === 'warning') {
                    notify.warning(data.message);
                } else if (data.type === 'info') {
                    notify.info(data.message);
                } else {
                    notify.success(data.message);
                }
            }
        });

        return () => {
            removeNavigate();
            removeFlash();
        };
    }, []);
}
