import React, { useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { DollarSign, RefreshCw, SlidersHorizontal, Check, AlertCircle, Building2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface CurrencyToggleProps {
    showRateBadge?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function CurrencyToggle({
    showRateBadge = true,
    className = '',
    size = 'md',
}: CurrencyToggleProps) {
    const {
        currency,
        setCurrency,
        rate,
        source,
        isManual,
        updatedAt,
        isLoading,
        error,
        setManualRate,
        clearManualRate,
        refreshRate,
    } = useCurrency();

    const safeRate = typeof rate === 'number' && !isNaN(rate) && rate > 0 ? rate : 899.2705;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [manualInput, setManualInput] = useState(String(safeRate));
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleOpenDialog = () => {
        setManualInput(String(safeRate));
        setStatusMessage(null);
        setIsDialogOpen(true);
    };

    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(manualInput);
        if (num > 0) {
            await setManualRate(num);
            setStatusMessage('Tasa manual aplicada exitosamente.');
            setTimeout(() => {
                setIsDialogOpen(false);
                setStatusMessage(null);
            }, 1000);
        }
    };

    const handleRestoreAuto = async () => {
        await clearManualRate();
        setStatusMessage('Restablecida la tasa oficial automática del BCV.');
        setTimeout(() => {
            setIsDialogOpen(false);
            setStatusMessage(null);
        }, 1000);
    };

    const handleRefresh = async () => {
        await refreshRate();
        setStatusMessage('Cotización actualizada desde DolarApi.');
        setTimeout(() => setStatusMessage(null), 2500);
    };

    const formattedRate = safeRate.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });

    const isSmall = size === 'sm';

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {/* Botón Deslizable de Cambio de Moneda ($ USD vs Bs. VES) */}
            <div
                className="relative inline-flex items-center p-0.5 rounded-full bg-muted/80 border border-border/80 shadow-xs select-none"
                role="radiogroup"
                aria-label="Seleccionar moneda de visualización"
            >
                {/* Botón USD */}
                <button
                    type="button"
                    role="radio"
                    aria-checked={currency === 'USD'}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrency('USD');
                    }}
                    className={`relative z-10 flex items-center justify-center gap-1 font-bold rounded-full transition-all duration-200 cursor-pointer ${
                        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
                    } ${
                        currency === 'USD'
                            ? 'bg-amber-500 text-zinc-950 font-black shadow-xs ring-1 ring-amber-600/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                >
                    <DollarSign className={isSmall ? 'size-3' : 'size-3.5'} />
                    <span>USD ($)</span>
                </button>

                {/* Botón VES */}
                <button
                    type="button"
                    role="radio"
                    aria-checked={currency === 'VES'}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrency('VES');
                    }}
                    className={`relative z-10 flex items-center justify-center gap-1 font-bold rounded-full transition-all duration-200 cursor-pointer ${
                        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
                    } ${
                        currency === 'VES'
                            ? 'bg-amber-500 text-zinc-950 font-black shadow-xs ring-1 ring-amber-600/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                >
                    <span className="font-bold">Bs.</span>
                    <span>VES</span>
                </button>
            </div>

            {/* Badge de Tasa Oficial BCV con Botón de Configuración Manual */}
            {showRateBadge && (
                <button
                    type="button"
                    onClick={handleOpenDialog}
                    title="Clic para ver detalles de tasa o ajustar manualmente"
                    className={`group inline-flex items-center gap-1.5 rounded-full border transition-all text-xs font-semibold px-2.5 py-1 ${
                        isManual
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                            : 'bg-background border-border/80 text-foreground hover:bg-muted/80 hover:border-amber-500/50'
                    }`}
                >
                    <span
                        className={`size-2 rounded-full shrink-0 ${
                            isManual
                                ? 'bg-amber-500'
                                : 'bg-emerald-500 animate-pulse'
                        }`}
                    />
                    <span className="font-mono text-[11px] font-bold">
                        {isManual ? 'Tasa Manual:' : 'BCV:'} {formattedRate} Bs./$
                    </span>
                    <SlidersHorizontal className="size-3 text-muted-foreground group-hover:text-amber-500 transition-colors ml-0.5" />
                </button>
            )}

            {/* Modal de Configuración de Tasa Cambiaria (DolarApi + Ajuste Manual) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Building2 className="size-5 text-amber-500" />
                            Tasa de Cambio Oficial & Ajuste de Contingencia
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Control del tipo de cambio referencial para presupuestos Maprex y visualización dual (USD / Bs.).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Estado Actual de la Tasa */}
                        <div className="p-3.5 rounded-lg border border-border/70 bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-muted-foreground">Origen de la Cotización:</span>
                                <span className="font-bold flex items-center gap-1.5">
                                    <span
                                        className={`size-2 rounded-full ${
                                            isManual ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                    />
                                    {isManual
                                        ? 'Ajuste Manual Fijo'
                                        : 'Oficial BCV (vía DolarApi.com)'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-muted-foreground">Tasa en Sistema:</span>
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                                    {formattedRate} Bs. / USD
                                </span>
                            </div>

                            {updatedAt && (
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                    <span>Última actualización:</span>
                                    <span>
                                        {new Date(updatedAt).toLocaleDateString('es-VE', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertCircle className="size-3.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Botón Refrescar API */}
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] text-muted-foreground">
                                Conexión directa con <span className="font-mono text-foreground font-semibold">ve.dolarapi.com</span>
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="h-7 text-xs font-semibold"
                            >
                                {isLoading ? (
                                    <Spinner className="mr-1.5 size-3" />
                                ) : (
                                    <RefreshCw className="mr-1.5 size-3 text-muted-foreground" />
                                )}
                                Actualizar Tasa BCV
                            </Button>
                        </div>

                        {/* Formulario de Tasa Manual */}
                        <form onSubmit={handleSaveManual} className="space-y-3 pt-2 border-t border-border/60">
                            <div className="space-y-1.5">
                                <Label htmlFor="manual_rate_input" className="text-xs font-bold text-foreground">
                                    Fijar Tasa Manual de Contingencia:
                                </Label>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Si la API pública no está disponible o requieres presupuestar con una tasa proyectada diferente a la del BCV, introduce el valor aquí:
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="manual_rate_input"
                                            type="number"
                                            step="0.0001"
                                            min="0.0001"
                                            required
                                            value={manualInput}
                                            onChange={(e) => setManualInput(e.target.value)}
                                            placeholder="Ej: 899.27"
                                            className="h-8 text-xs font-bold font-mono pl-3"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={isLoading || !manualInput}
                                        className="h-8 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shrink-0"
                                    >
                                        Guardar Tasa
                                    </Button>
                                </div>
                            </div>

                            {isManual && (
                                <div className="pt-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRestoreAuto}
                                        disabled={isLoading}
                                        className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
                                    >
                                        Restablecer a Tasa Oficial Automática (DolarApi)
                                    </Button>
                                </div>
                            )}
                        </form>

                        {statusMessage && (
                            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 animate-in fade-in">
                                <Check className="size-3.5" />
                                <span>{statusMessage}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDialogOpen(false)}
                            className="text-xs"
                        >
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
