import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Info, HelpCircle, CheckCircle2 } from 'lucide-react';

export type ConfirmVariant = 'destructive' | 'warning' | 'info' | 'default';

export interface ConfirmOptions {
    title?: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: React.ReactNode;
}

export interface AlertOptions {
    title?: string;
    description: React.ReactNode;
    confirmText?: string;
    variant?: ConfirmVariant;
    icon?: React.ReactNode;
}

interface DialogState {
    open: boolean;
    isAlert: boolean;
    title: string;
    description: React.ReactNode;
    confirmText: string;
    cancelText: string;
    variant: ConfirmVariant;
    customIcon?: React.ReactNode;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    alert: (options: AlertOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DialogState>({
        open: false,
        isAlert: false,
        title: '',
        description: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        variant: 'default',
    });

    const resolveRef = useRef<((value: any) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            const isStr = typeof options === 'string';
            const title = isStr ? '¿Confirmar acción?' : options.title || '¿Confirmar acción?';
            const description = isStr ? options : options.description;
            const variant = isStr ? 'default' : options.variant || 'default';
            const confirmText =
                !isStr && options.confirmText
                    ? options.confirmText
                    : variant === 'destructive'
                    ? 'Eliminar'
                    : 'Confirmar';
            const cancelText = !isStr && options.cancelText ? options.cancelText : 'Cancelar';

            setState({
                open: true,
                isAlert: false,
                title,
                description,
                confirmText,
                cancelText,
                variant,
                customIcon: !isStr ? options.icon : undefined,
            });
        });
    }, []);

    const alert = useCallback((options: AlertOptions | string): Promise<void> => {
        return new Promise<void>((resolve) => {
            resolveRef.current = resolve;
            const isStr = typeof options === 'string';
            const title = isStr ? 'Atención' : options.title || 'Atención';
            const description = isStr ? options : options.description;
            const variant = isStr ? 'info' : options.variant || 'info';
            const confirmText = !isStr && options.confirmText ? options.confirmText : 'Entendido';

            setState({
                open: true,
                isAlert: true,
                title,
                description,
                confirmText,
                cancelText: '',
                variant,
                customIcon: !isStr ? options.icon : undefined,
            });
        });
    }, []);

    const handleConfirm = () => {
        setState((prev) => ({ ...prev, open: false }));
        if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
        }
    };

    const handleCancel = () => {
        setState((prev) => ({ ...prev, open: false }));
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            handleCancel();
        }
    };

    const renderIcon = () => {
        if (state.customIcon) return state.customIcon;

        switch (state.variant) {
            case 'destructive':
                return (
                    <div className="size-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 shadow-xs">
                        <Trash2 className="size-5" />
                    </div>
                );
            case 'warning':
                return (
                    <div className="size-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                        <AlertTriangle className="size-5" />
                    </div>
                );
            case 'info':
                return (
                    <div className="size-11 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-xs">
                        <Info className="size-5" />
                    </div>
                );
            default:
                return (
                    <div className="size-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                        <HelpCircle className="size-5" />
                    </div>
                );
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            <Dialog open={state.open} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[94vw] max-w-md p-5 sm:p-6 rounded-2xl gap-4">
                    <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 text-left">
                        {renderIcon()}
                        <div className="space-y-1">
                            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                {state.title}
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {state.description}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-2">
                        {!state.isAlert && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                className="w-full sm:w-auto h-9 text-xs font-semibold"
                            >
                                {state.cancelText}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant={state.variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={handleConfirm}
                            className={`w-full sm:w-auto h-9 text-xs font-bold ${
                                state.variant !== 'destructive'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold'
                                    : ''
                            }`}
                        >
                            {state.confirmText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm debe ser usado dentro de un ConfirmProvider');
    }
    return context;
}

