import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
                    <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                        <AlertTriangle className="size-7" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-lg font-bold text-foreground">
                            Ocurrió un detalle al cargar la vista
                        </h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            El sistema detectó una transición de interfaz. Puedes restablecer la pantalla con un clic.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={this.handleReload}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs gap-2"
                    >
                        <RefreshCw className="size-3.5" />
                        Restablecer Pantalla
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

