/**
 * Utilidad centralizada para normalizar y gestionar de forma dinámica e intuitiva
 * las unidades de medida de la construcción venezolana (Maprex / Obras Civiles).
 * 
 * Regla de Oro Banpe:
 * - Materiales discretos (cemento, pego, bloques, tubos, barras de 12m, rollos, cuñetes):
 *   SOLO aceptan números enteros estrictos. Cemento no puede tener 1.01 o 1.5 sacos.
 * - Materiales continuos (arena, grava, piedra, concreto m³, acero en kgf, asfalto en tonf, área en m²):
 *   Aceptan decimales normalizados (ej: 12.50 m³, 150.75 kgf).
 */

export interface MaterialUnitInfo {
    /** Etiqueta descriptiva para el encabezado del campo (ej: "Sacos", "Metros Cúbicos", "Kilos (kgf)") */
    fieldLabel: string;
    /** Nombre humano legible completo (ej: "Sacos de 42.5 kg", "Metros Cúbicos (Volumen)") */
    humanName: string;
    /** Símbolo corto para sufijo del input (ej: "sacos", "m³", "kgf", "pzas") */
    shortSymbol: string;
    /** Placeholder con ejemplo contextual (ej: "Ej: 50 sacos", "Ej: 12.50 m³") */
    placeholder: string;
    /** Paso numérico ('1' para enteros, '0.01' para continuos) */
    step: string;
    /** Valor mínimo ('1' para enteros, '0.01' para continuos) */
    min: string;
    /** Indicador estricto: ¿Acepta solo números enteros sin decimales? */
    isIntegerOnly: boolean;
    /** Texto de ayuda explicativo para el usuario */
    helpText: string;
}

export function getMaterialUnitInfo(
    unit?: { id?: number; name?: string; symbol?: string } | null,
    materialName?: string
): MaterialUnitInfo {
    const sym = (unit?.symbol || '').trim().toLowerCase();
    const name = (unit?.name || '').trim().toLowerCase();
    const mat = (materialName || '').trim().toLowerCase();

    // 1. Cemento, Pegamentos y Mezclas secas (Sacos) -> DISCRETO (SOLO ENTEROS ESTRICTOS)
    // Tiene MÁXIMA PRIORIDAD para no ser capturado por palabras como 'concreto'
    if (sym.includes('saco') || name.includes('saco') || mat.includes('saco') || mat.includes('cemento') || mat.includes('pego') || mat.includes('cal')) {
        return {
            fieldLabel: 'N° de Sacos',
            humanName: 'Sacos de 42.5 kg',
            shortSymbol: 'sacos',
            placeholder: 'Ej: 50',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo sacos enteros (sin decimales)',
        };
    }

    // 2. Bloques, Ladrillos, Adoquines y Piezas -> DISCRETO (SOLO ENTEROS)
    if (sym.includes('pza') || sym.includes('und') || sym.includes('bloq') || name.includes('unidad') || name.includes('pieza') || mat.includes('bloque') || mat.includes('ladrillo') || mat.includes('tuberia') || mat.includes('tubo')) {
        return {
            fieldLabel: 'Cantidad (Piezas/Und)',
            humanName: 'Unidades / Piezas',
            shortSymbol: 'und',
            placeholder: 'Ej: 100',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo piezas enteras (sin decimales)',
        };
    }

    // 3. Rollos y Cuñetes de Pintura/Aditivos -> DISCRETO (SOLO ENTEROS)
    if (sym.includes('rollo') || sym.includes('cuñete') || sym.includes('cunete') || mat.includes('cuñete') || mat.includes('cunete') || mat.includes('rollo') || mat.includes('tambor')) {
        return {
            fieldLabel: 'N° de Cuñetes / Rollos',
            humanName: 'Envases / Rollos',
            shortSymbol: sym.includes('rollo') ? 'rollos' : 'cuñetes',
            placeholder: 'Ej: 5',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo unidades enteras (sin decimales)',
        };
    }

    // 4. Cabillas por Barras de 12 Metros -> DISCRETO (SOLO ENTEROS)
    if (sym.includes('barra') || name.includes('barra') || (mat.includes('cabilla') && (sym.includes('und') || sym.includes('pza')))) {
        return {
            fieldLabel: 'N° de Barras (12m)',
            humanName: 'Barras de 12 Metros',
            shortSymbol: 'barras',
            placeholder: 'Ej: 20',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo barras completas (sin decimales)',
        };
    }

    // 5. Áridos, Concretos y Tierras (m3 / m³) -> CONTINUO (Decimales permitidos)
    if (sym.includes('m3') || sym.includes('m³') || name.includes('cubico') || name.includes('cúbico') || mat.includes('arena') || mat.includes('piedra') || mat.includes('grava') || mat.includes('concreto premezclado') || mat.includes('vaciado')) {
        return {
            fieldLabel: 'Metros Cúbicos (m³)',
            humanName: 'Metros Cúbicos (Volumen)',
            shortSymbol: 'm³',
            placeholder: 'Ej: 12.50',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 12.50)',
        };
    }

    // 4. Acero de Refuerzo, Cabillas y Mallas por Peso (kgf / kg) -> CONTINUO (Decimales permitidos)
    if (
        sym.includes('kgf') ||
        sym.includes('kg') ||
        name.includes('kilo') ||
        mat.includes('cabilla') ||
        mat.includes('acero')
    ) {
        return {
            fieldLabel: 'Kilos / Peso (kgf)',
            humanName: 'Kilogramos Fuerza (kgf)',
            shortSymbol: 'kgf',
            placeholder: 'Ej: 150.00 kgf',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 150.75)',
        };
    }

    // 5. Asfaltos y Mezclas Asfálticas en Caliente / Graneles (tonf / ton) -> CONTINUO (Decimales permitidos)
    if (sym.includes('tonf') || sym.includes('ton') || name.includes('tonelada') || mat.includes('asfalt')) {
        return {
            fieldLabel: 'Toneladas (tonf)',
            humanName: 'Toneladas Métricas',
            shortSymbol: 'tonf',
            placeholder: 'Ej: 18.00 ton',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 18.25)',
        };
    }

    // 6. Pavimento, Defensas, Aceras, Pinturas por área (m2 / m²) -> CONTINUO (Decimales permitidos)
    if (sym.includes('m2') || sym.includes('m²') || name.includes('cuadrado')) {
        return {
            fieldLabel: 'Metros Cuadrados (m²)',
            humanName: 'Metros Cuadrados (Área)',
            shortSymbol: 'm²',
            placeholder: 'Ej: 45.00 m²',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 45.50)',
        };
    }

    // 7. Cables y Tuberías continuas (Rollos) -> DISCRETO (SOLO ENTEROS)
    if (sym.includes('rollo') || name.includes('rollo') || mat.includes('cable') || mat.includes('manguera') || mat.includes('alambre')) {
        return {
            fieldLabel: 'N° de Rollos',
            humanName: 'Rollos continuos (100m)',
            shortSymbol: 'rollos',
            placeholder: 'Ej: 5 rollos',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo rollos enteros (sin decimales)',
        };
    }

    // 8. Pinturas y Químicos líquidos (Cuñetes de 5 Galones / Galón / Tambor) -> DISCRETO (SOLO ENTEROS)
    if (
        sym.includes('cuñete') ||
        sym.includes('cunete') ||
        name.includes('cuñete') ||
        sym.includes('gal') ||
        name.includes('galon') ||
        name.includes('galón') ||
        mat.includes('pintura')
    ) {
        return {
            fieldLabel: 'N° de Cuñetes / Galones',
            humanName: 'Cuñetes de 5 Galones',
            shortSymbol: 'cuñetes',
            placeholder: 'Ej: 8 cuñetes',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo envases enteros (sin decimales)',
        };
    }

    // 9. Bloques de Arcilla, Tubos, Piezas individuales (Pieza / Unidad / Tubo) -> DISCRETO (SOLO ENTEROS)
    if (
        sym.includes('pza') ||
        sym.includes('pieza') ||
        sym.includes('und') ||
        sym.includes('tubo') ||
        name.includes('pieza') ||
        name.includes('unidad') ||
        name.includes('tubo') ||
        mat.includes('bloque') ||
        mat.includes('tubo')
    ) {
        return {
            fieldLabel: 'N° de Piezas / Unidades',
            humanName: 'Piezas / Unidades',
            shortSymbol: 'pzas',
            placeholder: 'Ej: 500 pzas',
            step: '1',
            min: '1',
            isIntegerOnly: true,
            helpText: 'Solo unidades enteras (sin decimales)',
        };
    }

    // 10. Metros lineales (m / ml) -> CONTINUO (Decimales permitidos)
    if (sym === 'm' || sym === 'ml' || name.includes('lineal')) {
        return {
            fieldLabel: 'Metros Lineales (m)',
            humanName: 'Metros Lineales (Longitud)',
            shortSymbol: 'm',
            placeholder: 'Ej: 15.50 m',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 15.50)',
        };
    }

    // 11. Hectáreas o transporte Tf*km -> CONTINUO (Decimales permitidos)
    if (sym.includes('tf') || sym.includes('ha') || name.includes('hect')) {
        return {
            fieldLabel: `Cantidad (${unit?.symbol || ''})`,
            humanName: unit?.name || unit?.symbol || 'Medida Continua',
            shortSymbol: unit?.symbol || 'cant',
            placeholder: 'Ej: 10.00',
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales (ej: 10.00)',
        };
    }

    // Si tiene un símbolo personalizado definido en la base de datos
    if (unit?.symbol) {
        return {
            fieldLabel: `Cantidad (${unit.symbol})`,
            humanName: unit.name || unit.symbol,
            shortSymbol: unit.symbol,
            placeholder: `0.00 ${unit.symbol}`,
            step: '0.01',
            min: '0.01',
            isIntegerOnly: false,
            helpText: 'Permite decimales',
        };
    }

    // Sin insumo seleccionado aún
    return {
        fieldLabel: 'Cantidad *',
        humanName: 'Unidades',
        shortSymbol: 'und',
        placeholder: '0',
        step: '1',
        min: '1',
        isIntegerOnly: false,
        helpText: 'Ingrese la cantidad',
    };
}

/**
 * Sanitiza el valor numérico en tiempo real según si el insumo admite decimales o solo enteros.
 * 
 * - Si es entero (cemento, bloques, rollos, cuñetes):
 *   Si el usuario escribe o pega "1,01" o "1.5", se trunca la parte decimal quedando "1".
 *   Elimina comas, puntos y cualquier símbolo no numérico.
 * 
 * - Si permite decimales (arena m³, acero kgf, asfalto tonf, m²):
 *   Convierte coma en punto, permite un único punto decimal y limita a máximo 2 decimales.
 */
export function sanitizeQuantity(raw: string, isIntegerOnly: boolean): string {
    if (!raw && raw !== '0') return '';

    const str = String(raw).trim();
    if (!str) return '';

    if (isIntegerOnly) {
        // Truncar la parte decimal si el usuario pegó un valor con coma o punto (ej: "1,01" -> "1")
        const intPart = str.split(/[.,]/)[0];
        return intPart.replace(/[^0-9]/g, '');
    }

    // Para medidas continuas: normalizar coma a punto
    let clean = str.replace(/,/g, '.').replace(/[^0-9.]/g, '');

    // Mantener solo el primer punto decimal si hay múltiples
    const parts = clean.split('.');
    if (parts.length > 2) {
        clean = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limitar a máximo 2 decimales mientras se escribe
    if (parts.length === 2 && parts[1].length > 2) {
        clean = parts[0] + '.' + parts[1].substring(0, 2);
    }

    return clean;
}

/**
 * Bloquea en tiempo real las teclas prohibidas según el tipo de unidad.
 * Para enteros, bloquea punto '.', coma ',', signo 'e', 'E', '+' y '-'.
 */
export function handleQuantityKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    isIntegerOnly: boolean
) {
    if (isIntegerOnly) {
        if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    } else {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    }
}
