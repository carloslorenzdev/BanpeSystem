import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Boxes, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMaterialUnitInfo } from '@/lib/material-units';

export interface MaterialOption {
    id: number;
    code: string;
    name: string;
    category?: { id: number; name: string } | null;
    unit?: { id: number; name: string; symbol: string } | null;
    estimated_price_usd?: number | string;
}

interface SearchableMaterialSelectProps {
    materials: MaterialOption[];
    value: string;
    onChange: (materialId: string) => void;
    getAvailableStock?: (materialId: string | number) => number;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
}

export function SearchableMaterialSelect({
    materials,
    value,
    onChange,
    getAvailableStock,
    placeholder = 'Buscar insumo por código o nombre...',
    className = '',
    disabled = false,
}: SearchableMaterialSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Encontrar el material actualmente seleccionado
    const selectedMaterial = useMemo(() => {
        if (!value) return null;
        return materials.find((m) => String(m.id) === String(value)) || null;
    }, [materials, value]);

    // Filtrar materiales según el texto ingresado
    const filteredMaterials = useMemo(() => {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) {
            return materials.slice(0, 15);
        }
        return materials
            .filter((m) => {
                const codeMatch = m.code?.toLowerCase().includes(cleanQuery);
                const nameMatch = m.name?.toLowerCase().includes(cleanQuery);
                const catMatch = m.category?.name?.toLowerCase().includes(cleanQuery);
                return codeMatch || nameMatch || catMatch;
            })
            .slice(0, 30);
    }, [materials, query]);

    // Cerrar al hacer clic fuera del componente
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (matId: number) => {
        onChange(String(matId));
        setIsOpen(false);
        setQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setTimeout(() => {
            inputRef.current?.focus();
            setIsOpen(true);
        }, 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredMaterials.length > 0) {
                handleSelect(filteredMaterials[0].id);
            }
        }
    };

    const selectedStock =
        selectedMaterial && getAvailableStock
            ? getAvailableStock(selectedMaterial.id)
            : null;

    const isUnitAlreadyInName = (name: string, symbol?: string, unitName?: string) => {
        if (!name) return false;
        const cleanName = name.toLowerCase();
        if (symbol && symbol.trim() && cleanName.includes(symbol.trim().toLowerCase())) return true;
        if (unitName && unitName.trim() && cleanName.includes(unitName.trim().toLowerCase())) return true;
        return false;
    };

    return (
        <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
            {selectedMaterial ? (
                // Vista del Insumo Seleccionado (Control de desborde y truncado inteligente)
                <div
                    className="flex items-center justify-between gap-1.5 p-1.5 pl-2.5 rounded-lg border border-amber-500/50 bg-amber-500/5 transition-all text-xs w-full min-w-0 max-w-full overflow-hidden"
                    title={`[${selectedMaterial.code}] ${selectedMaterial.name}`}
                >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                        <Boxes className="size-3.5 text-amber-500 shrink-0" />
                        <div className="min-w-0 flex-1 truncate font-medium text-foreground">
                            <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                [{selectedMaterial.code}]
                            </span>{' '}
                            <span className="truncate">
                                {selectedMaterial.name}
                            </span>
                            {!isUnitAlreadyInName(selectedMaterial.name, selectedMaterial.unit?.symbol, selectedMaterial.unit?.name) && selectedMaterial.unit?.symbol && (
                                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap font-semibold ml-1">
                                    ({selectedMaterial.unit.symbol})
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {selectedStock !== null && (
                            <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 font-semibold shrink-0 whitespace-nowrap ${selectedStock > 0
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-destructive/10 text-destructive border-destructive/30'
                                    }`}
                            >
                                {selectedStock > 0
                                    ? `Disp: ${selectedStock} ${selectedMaterial.unit?.symbol || 'und'}`
                                    : 'Sin stock'}
                            </Badge>
                        )}
                        {!disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleClear}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                                title="Cambiar insumo"
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                // Input con Buscador en Vivo
                <div className="relative w-full min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        className="pl-8 pr-3 h-8 text-xs bg-background border-input focus-visible:ring-amber-500 w-full min-w-0"
                    />

                    {/* Menú Desplegable Flotante Inline con alta prioridad visual */}
                    {isOpen && (
                        <div
                            className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl py-1 text-xs"
                            style={{ minWidth: '100%' }}
                        >
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 bg-muted/40 flex items-center justify-between">
                                <span>Catálogo de Insumos</span>
                                <span>{filteredMaterials.length} sugeridos</span>
                            </div>

                            {filteredMaterials.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                                    <AlertCircle className="size-4 text-amber-500" />
                                    <span>No se encontraron insumos con "{query}"</span>
                                    <span className="text-[10px]">Intenta buscar por otro código o palabra clave.</span>
                                </div>
                            ) : (
                                filteredMaterials.map((mat) => {
                                    const stock = getAvailableStock ? getAvailableStock(mat.id) : null;

                                    return (
                                        <button
                                            key={mat.id}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelect(mat.id);
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelect(mat.id);
                                            }}
                                            className="w-full text-left px-2.5 py-2 hover:bg-amber-500/15 flex items-center justify-between gap-2 border-b border-border/30 last:border-0 transition-colors cursor-pointer group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                                        [{mat.code}]
                                                    </span>{' '}
                                                    <span>{mat.name}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                                                    <span>{mat.category?.name || 'General'}</span>
                                                    <span>•</span>
                                                    {(() => {
                                                        const uInfo = getMaterialUnitInfo(mat.unit, mat.name);
                                                        return (
                                                            <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                                                {uInfo.humanName} • {uInfo.isIntegerOnly ? 'Solo enteros' : 'Admite decimales'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {stock !== null && (
                                                <div className="shrink-0 text-right ml-2">
                                                    <span
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${stock > 0
                                                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                                                : 'text-destructive bg-destructive/10 border border-destructive/20'
                                                            }`}
                                                    >
                                                        {stock > 0 ? `Disp: ${stock} ${mat.unit?.symbol || ''}` : '0 Disp'}
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
