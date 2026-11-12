import { sileo, type SileoOptions } from 'sileo';

/**
 * Helper unificado para notificaciones de física fluida con Sileo
 * Documentación oficial: https://sileo.aaryan.design/
 */
export const notify = {
    success: (
        description: string,
        title: string = 'Operación Exitosa',
        options?: Partial<SileoOptions>
    ) => {
        return sileo.success({
            title,
            description,
            duration: 4000,
            position: 'top-center',
            ...options,
        });
    },

    error: (
        description: string,
        title: string = 'Atención / Error',
        options?: Partial<SileoOptions>
    ) => {
        return sileo.error({
            title,
            description,
            duration: 5000,
            position: 'top-center',
            ...options,
        });
    },

    warning: (
        description: string,
        title: string = 'Advertencia',
        options?: Partial<SileoOptions>
    ) => {
        return sileo.warning({
            title,
            description,
            duration: 4500,
            position: 'top-center',
            ...options,
        });
    },

    info: (
        description: string,
        title: string = 'Información',
        options?: Partial<SileoOptions>
    ) => {
        return sileo.info({
            title,
            description,
            duration: 4000,
            position: 'top-center',
            ...options,
        });
    },

    action: (
        title: string,
        description: string,
        button: { title: string; onClick: () => void },
        options?: Partial<SileoOptions>
    ) => {
        return sileo.action({
            title,
            description,
            button,
            position: 'top-center',
            ...options,
        });
    },

    promise: sileo.promise,
    dismiss: sileo.dismiss,
    clear: sileo.clear,
    raw: sileo,
};

