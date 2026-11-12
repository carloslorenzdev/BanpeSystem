import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const ROLE_CHANGE_EVENT = 'banpe:role-change';

export function useActiveRole() {
    const { auth } = usePage().props;
    const userRole = auth.user?.role?.slug || 'admin';

    const [role, setRole] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('banpe_demo_role') || userRole;
        }
        return userRole;
    });

    useEffect(() => {
        // Si el usuario cambia de sesión o llegan nuevos props de auth, sincronizar
        if (userRole && userRole !== role) {
            setRole(userRole);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('banpe_demo_role', userRole);
            }
        }

        const handleRoleChange = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            if (customEvent.detail && customEvent.detail !== role) {
                setRole(customEvent.detail);
            }
        };

        window.addEventListener(ROLE_CHANGE_EVENT, handleRoleChange);
        return () => {
            window.removeEventListener(ROLE_CHANGE_EVENT, handleRoleChange);
        };
    }, [userRole]);

    const changeRole = (newRole: string) => {
        if (!newRole || newRole === role) return;

        setRole(newRole);

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('banpe_demo_role', newRole);
            // Despachar de forma asíncrona para no bloquear el ciclo de render de React 19
            queueMicrotask(() => {
                window.dispatchEvent(
                    new CustomEvent(ROLE_CHANGE_EVENT, { detail: newRole })
                );
            });
        }

        // Cambiar el rol en la sesión del backend de Laravel vía Inertia
        router.post(
            '/demo/switch-role',
            { role: newRole },
            {
                preserveScroll: true,
                preserveState: false, // Permite que la página se actualice con los datos del nuevo rol
                onError: (errors) => {
                    console.error('Error al cambiar de rol en backend:', errors);
                },
            }
        );
    };

    return { role, changeRole };
}
