import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

export type CurrencyType = 'USD' | 'VES';

export interface BcvRateData {
    rate: number;
    source: string;
    is_manual: boolean;
    updated_at: string;
    error: string | null;
}

export interface CurrencyContextType {
    currency: CurrencyType;
    rate: number;
    source: string;
    isManual: boolean;
    updatedAt: string | null;
    isLoading: boolean;
    error: string | null;
    setCurrency: (c: CurrencyType) => void;
    toggleCurrency: () => void;
    formatMoney: (amountInUsd: number | string | null | undefined, options?: { showCode?: boolean; decimals?: number }) => string;
    convert: (amountInUsd: number | string | null | undefined) => number;
    currencySymbol: string;
    currencyCode: string;
    setManualRate: (rate: number) => Promise<boolean>;
    clearManualRate: () => Promise<boolean>;
    refreshRate: () => Promise<boolean>;
}

const defaultContextValue: CurrencyContextType = {
    currency: 'USD',
    rate: 899.2705,
    source: 'bcv_api',
    isManual: false,
    updatedAt: null,
    isLoading: false,
    error: null,
    setCurrency: () => {},
    toggleCurrency: () => {},
    formatMoney: (val: number | string | null | undefined, options) => {
        const decimals = options?.decimals ?? 2;
        const showCode = options?.showCode ?? true;
        const formatted = Number(val || 0).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        return showCode ? `$${formatted} USD` : `$${formatted}`;
    },
    convert: (val: number | string | null | undefined) => Number(val || 0),
    currencySymbol: '$',
    currencyCode: 'USD',
    setManualRate: async () => false,
    clearManualRate: async () => false,
    refreshRate: async () => false,
};

const CurrencyContext = createContext<CurrencyContextType>(defaultContextValue);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    let bcvProp: BcvRateData | null = null;
    try {
        const page = usePage<{ bcvRate?: BcvRateData }>();
        if (page?.props?.bcvRate) {
            bcvProp = page.props.bcvRate;
        }
    } catch {
        // usePage no disponible si se monta fuera del contexto de Inertia
    }

    const [currency, setCurrencyState] = useState<CurrencyType>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('banpe_currency');
                if (saved === 'USD' || saved === 'VES') {
                    return saved;
                }
            } catch {
                // Ignore localStorage errors
            }
        }
        return 'USD';
    });

    const [rateData, setRateData] = useState<BcvRateData>(() => ({
        rate: Number(bcvProp?.rate || 899.2705),
        source: bcvProp?.source || 'bcv_api',
        is_manual: Boolean(bcvProp?.is_manual),
        updated_at: bcvProp?.updated_at || new Date().toISOString(),
        error: bcvProp?.error || null,
    }));

    const [isLoading, setIsLoading] = useState(false);

    // Sincronizar tasa si cambia la prop numérica de Inertia
    useEffect(() => {
        if (bcvProp && typeof bcvProp.rate === 'number' && bcvProp.rate > 0) {
            setRateData({
                rate: Number(bcvProp.rate),
                source: bcvProp.source || 'bcv_api',
                is_manual: Boolean(bcvProp.is_manual),
                updated_at: bcvProp.updated_at || new Date().toISOString(),
                error: bcvProp.error || null,
            });
        }
    }, [bcvProp?.rate, bcvProp?.is_manual]);

    // Cambio de moneda 100% síncrono e instantáneo
    const setCurrency = (c: CurrencyType) => {
        setCurrencyState(c);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('banpe_currency', c);
            } catch {
                // Ignore localStorage errors
            }
        }
    };

    const toggleCurrency = () => {
        setCurrency(currency === 'USD' ? 'VES' : 'USD');
    };

    const setManualRate = async (newRate: number): Promise<boolean> => {
        if (!newRate || newRate <= 0) return false;
        setIsLoading(true);
        try {
            const response = await fetch('/exchange-rate/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ rate: newRate }),
            });
            if (response.ok) {
                const data: BcvRateData = await response.json();
                setRateData(data);
                setIsLoading(false);
                return true;
            }
        } catch {
            setRateData({
                rate: newRate,
                source: 'manual',
                is_manual: true,
                updated_at: new Date().toISOString(),
                error: null,
            });
        }
        setIsLoading(false);
        return false;
    };

    const clearManualRate = async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await fetch('/exchange-rate/manual', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'Accept': 'application/json',
                },
            });
            if (response.ok) {
                const data: BcvRateData = await response.json();
                setRateData(data);
                setIsLoading(false);
                return true;
            }
        } catch {
            // Ignore
        }
        setIsLoading(false);
        return false;
    };

    const refreshRate = async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await fetch('/exchange-rate/refresh', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'Accept': 'application/json',
                },
            });
            if (response.ok) {
                const data: BcvRateData = await response.json();
                setRateData(data);
                setIsLoading(false);
                return true;
            }
        } catch {
            try {
                const directRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
                if (directRes.ok) {
                    const directData = await directRes.json();
                    const directRate = Number(directData.promedio || directData.venta || 0);
                    if (directRate > 0) {
                        setRateData({
                            rate: directRate,
                            source: 'bcv_api',
                            is_manual: false,
                            updated_at: directData.fechaActualizacion || new Date().toISOString(),
                            error: null,
                        });
                        setIsLoading(false);
                        return true;
                    }
                }
            } catch {
                // Silently keep current rate
            }
        }
        setIsLoading(false);
        return false;
    };

    const safeRate = typeof rateData.rate === 'number' && !isNaN(rateData.rate) && rateData.rate > 0
        ? rateData.rate
        : 899.2705;

    const convert = (amountInUsd: number | string | null | undefined): number => {
        const val = Number(amountInUsd || 0);
        return currency === 'VES' ? val * safeRate : val;
    };

    const formatMoney = (
        amountInUsd: number | string | null | undefined,
        options?: { showCode?: boolean; decimals?: number }
    ): string => {
        const val = Number(amountInUsd || 0);
        const decimals = options?.decimals ?? 2;
        const showCode = options?.showCode ?? true;

        if (currency === 'VES') {
            const converted = val * safeRate;
            const formatted = converted.toLocaleString('es-VE', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
            return showCode ? `Bs. ${formatted} VES` : `Bs. ${formatted}`;
        } else {
            const formatted = val.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
            return showCode ? `$${formatted} USD` : `$${formatted}`;
        }
    };

    return (
        <CurrencyContext.Provider
            value={{
                currency,
                rate: safeRate,
                source: rateData.source,
                isManual: rateData.is_manual,
                updatedAt: rateData.updated_at,
                isLoading,
                error: rateData.error,
                setCurrency,
                toggleCurrency,
                formatMoney,
                convert,
                currencySymbol: currency === 'USD' ? '$' : 'Bs.',
                currencyCode: currency,
                setManualRate,
                clearManualRate,
                refreshRate,
            }}
        >
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency(): CurrencyContextType {
    const context = useContext(CurrencyContext);
    return context || defaultContextValue;
}
