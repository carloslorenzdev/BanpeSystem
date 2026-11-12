<?php

namespace App\Services;

use DOMDocument;
use Illuminate\Http\UploadedFile;
use ZipArchive;

class MaprexParserService
{
    /**
     * Parsea un archivo de Maprex (Excel .xlsx, .xls, HTML .xls, XML SpreadsheetML, CSV o TXT)
     * y retorna un arreglo estructurado y normalizado de filas.
     *
     * @param UploadedFile|string $file
     * @return array
     */
    public function parse($file): array
    {
        $filePath = is_string($file) ? $file : $file->getRealPath();
        $extension = strtolower(pathinfo(is_string($file) ? $file : $file->getClientOriginalName(), PATHINFO_EXTENSION));

        $rawRows = [];

        if ($extension === 'xlsx') {
            $rawRows = $this->parseXlsx($filePath);
        } else {
            $content = file_get_contents($filePath);
            if ($content === false) {
                return [];
            }

            // Normalizar codificación a UTF-8 (Maprex exporta muchas veces en Windows-1252/ANSI)
            $content = $this->ensureUtf8($content);

            // Eliminar BOM de UTF-8 si existe
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

            if (stripos($content, 'urn:schemas-microsoft-com:office:spreadsheet') !== false || stripos($content, '<Workbook') !== false) {
                $rawRows = $this->parseSpreadsheetXml($content);
            } elseif (stripos($content, '<html') !== false || stripos($content, '<table') !== false) {
                $rawRows = $this->parseHtmlTable($content);
            } else {
                $rawRows = $this->parseDelimitedText($content);
            }
        }

        return $this->normalizeRows($rawRows);
    }

    /**
     * Normaliza codificación a UTF-8.
     */
    protected function ensureUtf8(string $content): string
    {
        if (mb_check_encoding($content, 'UTF-8')) {
            return $content;
        }

        // Si es Windows-1252 o ISO-8859-1
        $detected = mb_detect_encoding($content, ['Windows-1252', 'ISO-8859-1', 'ASCII', 'UTF-8'], true);
        if ($detected) {
            return mb_convert_encoding($content, 'UTF-8', $detected);
        }

        return mb_convert_encoding($content, 'UTF-8', 'Windows-1252');
    }

    /**
     * Parsea texto delimitado (CSV, TSV, punto y coma).
     */
    protected function parseDelimitedText(string $content): array
    {
        $lines = preg_split("/\r\n|\n|\r/", $content);
        $rows = [];

        // Detectar delimitador inspeccionando las primeras 5 líneas no vacías
        $delimiters = [';' => 0, "\t" => 0, ',' => 0];
        $sampleCount = 0;
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            foreach ($delimiters as $d => $count) {
                $delimiters[$d] += substr_count($line, $d);
            }
            $sampleCount++;
            if ($sampleCount >= 5) break;
        }

        arsort($delimiters);
        $delimiter = key($delimiters) ?: ';';

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            $data = str_getcsv($line, $delimiter);
            $cleanRow = array_map(fn($v) => trim(trim($v), "\"'"), $data);

            // Descartar filas completamente vacías
            if (!empty(array_filter($cleanRow))) {
                $rows[] = $cleanRow;
            }
        }

        return $rows;
    }

    /**
     * Parsea tablas HTML (formato común en exports de Maprex con extensión .xls).
     */
    protected function parseHtmlTable(string $content): array
    {
        $rows = [];
        $dom = new DOMDocument();

        // Suprimir errores de HTML mal formado
        libxml_use_internal_errors(true);
        $dom->loadHTML(mb_convert_encoding($content, 'HTML-ENTITIES', 'UTF-8'));
        libxml_clear_errors();

        $tables = $dom->getElementsByTagName('table');
        if ($tables->length === 0) {
            return [];
        }

        // Procesar la tabla principal
        $trElements = $tables->item(0)->getElementsByTagName('tr');
        foreach ($trElements as $tr) {
            $cells = [];
            foreach ($tr->childNodes as $node) {
                if (in_array(strtolower($node->nodeName), ['td', 'th'])) {
                    $cells[] = trim($node->textContent);
                }
            }

            if (!empty(array_filter($cells))) {
                $rows[] = $cells;
            }
        }

        return $rows;
    }

    /**
     * Parsea XML Spreadsheet 2003 (SpreadsheetML).
     */
    protected function parseSpreadsheetXml(string $content): array
    {
        $rows = [];
        try {
            $xml = simplexml_load_string($content);
            if (!$xml) return [];

            $ns = $xml->getNamespaces(true);
            $prefix = 'ss';
            $uri = $ns['ss'] ?? 'urn:schemas-microsoft-com:office:spreadsheet';
            $xml->registerXPathNamespace($prefix, $uri);

            $xmlRows = $xml->xpath('//' . $prefix . ':Row');
            if (empty($xmlRows)) {
                $xmlRows = $xml->xpath('//Row');
            }

            foreach ($xmlRows as $xmlRow) {
                $cells = [];
                foreach ($xmlRow->xpath('.//*[local-name()="Data"]') as $data) {
                    $cells[] = trim((string) $data);
                }
                if (!empty(array_filter($cells))) {
                    $rows[] = $cells;
                }
            }
        } catch (\Exception $e) {
            return [];
        }

        return $rows;
    }

    /**
     * Parsea archivos nativos de Microsoft Excel (.xlsx) sin dependencias externas usando ZipArchive.
     */
    protected function parseXlsx(string $filePath): array
    {
        $rows = [];
        $zip = new ZipArchive();

        if ($zip->open($filePath) !== true) {
            return [];
        }

        // Leer cadenas compartidas (sharedStrings.xml)
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    $t = (string) $si->t;
                    if ($t === '' && isset($si->r)) {
                        foreach ($si->r as $r) {
                            $t .= (string) $r->t;
                        }
                    }
                    $sharedStrings[] = $t;
                }
            }
        }

        // Leer primera hoja de cálculo (sheet1.xml)
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        if (!$sheetXml) {
            return [];
        }

        $xml = simplexml_load_string($sheetXml);
        if (!$xml || !isset($xml->sheetData->row)) {
            return [];
        }

        foreach ($xml->sheetData->row as $rowNode) {
            $row = [];
            foreach ($rowNode->c as $cell) {
                $type = (string) $cell['t'];
                $val = (string) $cell->v;

                if ($type === 's' && isset($sharedStrings[(int) $val])) {
                    $val = $sharedStrings[(int) $val];
                }

                $row[] = trim($val);
            }

            if (!empty(array_filter($row))) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * Identifica la fila cabecera y normaliza los registros a claves estándar.
     */
    protected function normalizeRows(array $rawRows): array
    {
        if (empty($rawRows)) {
            return [];
        }

        $headerIndex = null;
        $headerMap = [];

        // Buscar la fila de cabecera (Maprex suele tener encabezados de 2 a 5 líneas antes de la tabla)
        foreach ($rawRows as $idx => $row) {
            $normalizedRow = array_map(function ($col) {
                $col = mb_strtolower(trim($col));
                $col = str_replace(['á', 'é', 'í', 'ó', 'ú', 'ñ'], ['a', 'e', 'i', 'o', 'u', 'n'], $col);
                return preg_replace('/[^a-z0-9]/', '_', $col);
            }, $row);

            $matchedKeys = 0;
            $tempMap = [];

            foreach ($normalizedRow as $colIdx => $colName) {
                $field = $this->matchColumnField($colName);
                if ($field) {
                    $tempMap[$field] = $colIdx;
                    $matchedKeys++;
                }
            }

            // Si encontramos al menos 2 campos clave (ej. código y descripción, o descripción y cantidad)
            if ($matchedKeys >= 2 && (isset($tempMap['description']) || isset($tempMap['code']))) {
                $headerIndex = $idx;
                $headerMap = $tempMap;
                break;
            }
        }

        // Si no se detectó cabecera nombrada, asumir orden estándar COVENIN
        // Col 0: Código, Col 1: Descripción, Col 2: Unidad, Col 3: Cantidad, Col 4: Precio
        if ($headerIndex === null) {
            $firstRow = $rawRows[0] ?? [];
            if (count($firstRow) >= 3) {
                $headerIndex = -1; // empezar desde la fila 0
                $headerMap = [
                    'code' => 0,
                    'description' => 1,
                    'unit' => 2,
                    'quantity' => 3,
                    'price' => 4,
                    'phase' => 5,
                    'category' => 6,
                ];
            } else {
                return [];
            }
        }

        $currentPhase = 'Fase General';
        $normalizedRecords = [];

        for ($i = $headerIndex + 1; $i < count($rawRows); $i++) {
            $row = $rawRows[$i];
            if (empty(array_filter($row))) continue;

            $code = isset($headerMap['code']) && isset($row[$headerMap['code']]) ? trim($row[$headerMap['code']]) : '';
            $desc = isset($headerMap['description']) && isset($row[$headerMap['description']]) ? trim($row[$headerMap['description']]) : '';
            $unit = isset($headerMap['unit']) && isset($row[$headerMap['unit']]) ? trim($row[$headerMap['unit']]) : 'und';
            $qtyRaw = isset($headerMap['quantity']) && isset($row[$headerMap['quantity']]) ? $row[$headerMap['quantity']] : '0';
            $priceRaw = isset($headerMap['price']) && isset($row[$headerMap['price']]) ? $row[$headerMap['price']] : '0';
            $phaseRaw = isset($headerMap['phase']) && isset($row[$headerMap['phase']]) ? trim($row[$headerMap['phase']]) : '';
            $categoryRaw = isset($headerMap['category']) && isset($row[$headerMap['category']]) ? trim($row[$headerMap['category']]) : '';
            $minStockRaw = isset($headerMap['min_stock']) && isset($row[$headerMap['min_stock']]) ? $row[$headerMap['min_stock']] : '10';

            // Detectar si la fila es un subtítulo/capítulo de Maprex (ej: "CAPITULO 01: OBRAS PRELIMINARES")
            if (empty($code) && !empty($desc) && empty($unit) && $this->cleanNumber($qtyRaw) == 0) {
                $currentPhase = $desc;
                continue;
            }

            if (!empty($phaseRaw)) {
                $currentPhase = $phaseRaw;
            }

            // Ignorar filas de totales finales (ej. "TOTAL PRESUPUESTO", "SUB-TOTAL")
            $lowerDesc = mb_strtolower($desc);
            $lowerCode = mb_strtolower($code);
            if (str_starts_with($lowerDesc, 'total') || str_starts_with($lowerDesc, 'sub-total') || str_starts_with($lowerDesc, 'sub total') ||
                str_starts_with($lowerCode, 'total') || str_starts_with($lowerCode, 'sub-total') || str_starts_with($lowerCode, 'sub total')) {
                continue;
            }

            if (empty($desc) && empty($code)) {
                continue;
            }

            $normalizedRecords[] = [
                'code' => $code,
                'name' => $desc,
                'unit' => $unit ?: 'und',
                'quantity' => $this->cleanNumber($qtyRaw),
                'unit_price' => $this->cleanNumber($priceRaw),
                'phase' => $currentPhase,
                'category' => $categoryRaw ?: 'General',
                'min_stock' => max(1, (int) $this->cleanNumber($minStockRaw)),
            ];
        }

        return $normalizedRecords;
    }

    /**
     * Mapea nombres de columna a campos estándar del sistema BANPE.
     */
    protected function matchColumnField(string $col): ?string
    {
        $col = trim($col);

        // 1. Reglas prioritarias explícitas para evitar falsos positivos
        if (str_contains($col, 'descripcion') || str_contains($col, 'detalle') || str_contains($col, 'concepto') || str_contains($col, 'material') || str_contains($col, 'insumo')) {
            return 'description';
        }

        if (str_contains($col, 'precio') || str_contains($col, 'costo') || str_contains($col, 'p_u') || $col === 'pu' || str_contains($col, 'unitario') || str_contains($col, 'importe')) {
            return 'price';
        }

        if (str_contains($col, 'cantidad') || str_contains($col, 'computo') || str_contains($col, 'metrado') || str_contains($col, 'cant') || str_contains($col, 'rendimiento')) {
            return 'quantity';
        }

        if (str_contains($col, 'capitulo') || str_contains($col, 'fase') || str_contains($col, 'titulo') || str_contains($col, 'etapa') || str_contains($col, 'subcapitulo')) {
            return 'phase';
        }

        if (str_contains($col, 'categoria') || str_contains($col, 'rubro') || str_contains($col, 'familia') || str_contains($col, 'grupo')) {
            return 'category';
        }

        if (str_contains($col, 'stock_min') || str_contains($col, 'minimo') || str_contains($col, 'seguridad')) {
            return 'min_stock';
        }

        if (str_contains($col, 'und') || str_contains($col, 'unidad') || str_contains($col, 'u_m') || str_contains($col, 'unid') || $col === 'u' || $col === 'medida') {
            return 'unit';
        }

        if (str_contains($col, 'partida') || str_contains($col, 'codigo') || str_contains($col, 'covenin') || str_contains($col, 'item') || str_contains($col, 'clave') || $col === 'cod') {
            return 'code';
        }

        return null;
    }

    /**
     * Limpia y convierte cualquier formato de número (venezolano '1.250,50' o internacional '1,250.50').
     */
    public function cleanNumber($value): float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (empty($value)) {
            return 0.0;
        }

        $clean = trim((string) $value);

        // Remover símbolos de moneda (Bs, $, USD), espacios y caracteres especiales
        $clean = preg_replace('/[^\d.,-]/', '', $clean);
        if ($clean === '' || $clean === '-') {
            return 0.0;
        }

        // Si tiene punto Y coma (ej. 1.250,50 o 1,250.50)
        if (strpos($clean, '.') !== false && strpos($clean, ',') !== false) {
            // Si la coma está después del punto -> formato venezolano (1.250,50)
            if (strrpos($clean, ',') > strrpos($clean, '.')) {
                $clean = str_replace('.', '', $clean);
                $clean = str_replace(',', '.', $clean);
            } else {
                // Formato anglosajón (1,250.50)
                $clean = str_replace(',', '', $clean);
            }
        } elseif (strpos($clean, ',') !== false) {
            // Solo coma decimal (1250,50)
            $clean = str_replace(',', '.', $clean);
        }

        return (float) $clean;
    }
}
