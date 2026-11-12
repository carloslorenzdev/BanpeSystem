<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\MaprexParserService;

$service = new MaprexParserService();

echo "=== TEST 1: Limpieza de Números Venezolanos ===\n";
$testNumbers = [
    '1.250,50' => 1250.50,
    '1,250.50' => 1250.50,
    '345,75' => 345.75,
    '$ 15.000,00' => 15000.00,
    'Bs. 2.450,80' => 2450.80,
    '0,45' => 0.45,
    '120' => 120.0,
];

foreach ($testNumbers as $raw => $expected) {
    $result = $service->cleanNumber($raw);
    $ok = abs($result - $expected) < 0.001;
    echo sprintf("  Raw: '%-15s' => Output: %-10.2f (Esperado: %.2f) [%s]\n", $raw, $result, $expected, $ok ? "OK" : "ERROR");
    if (!$ok) {
        exit(1);
    }
}

echo "\n=== TEST 2: Parseo de CSV Venezolano con Punto y Coma ===\n";
$csvContent = <<<CSV
Maprex v2024 - Sistema de Presupuestos
Empresa: BANPE C.A.
Obra: Residencias Los Samanes

Partida;Descripcion de la Partida;Unidad;Cantidad;P.U.;Capitulo
E121.100.000;Deforestacion y limpieza;m2;1.500,00;1,85;Obras Preliminares
E131.100.000;Excavacion en tierra para zapatas;m3;250,50;14,20;Movimiento de Tierra
E324.100.110;Concreto premezclado 250 kg/cm2;m3;80,00;135,00;Estructuras
CSV;

$tmpCsv = sys_get_temp_dir() . '/test_maprex.csv';
file_put_contents($tmpCsv, $csvContent);
$parsedCsv = $service->parse($tmpCsv);
unlink($tmpCsv);

echo "Filas parseadas: " . count($parsedCsv) . "\n";
print_r($parsedCsv);

if (count($parsedCsv) !== 3) {
    echo "ERROR en cantidad de filas CSV\n";
    exit(1);
}

echo "\n=== TEST 3: Parseo de Export HTML de Maprex (.xls) ===\n";
$htmlContent = <<<HTML
<html>
<body>
<table>
  <tr><td colspan="5">DATALAING MAPREX - PRESUPUESTO DE OBRA</td></tr>
  <tr>
    <th>Partida</th>
    <th>Descripcion</th>
    <th>Und</th>
    <th>Computo</th>
    <th>Precio Unitario</th>
  </tr>
  <tr>
    <td>E-311</td>
    <td>Acero de refuerzo cabillas 1/2 pulgada</td>
    <td>kg</td>
    <td>3.450,00</td>
    <td>1,65</td>
  </tr>
  <tr>
    <td>CEM-01</td>
    <td>Cemento Portland Tipo I</td>
    <td>saco</td>
    <td>500,00</td>
    <td>8,50</td>
  </tr>
</table>
</body>
</html>
HTML;

$tmpHtml = sys_get_temp_dir() . '/test_maprex_html.xls';
file_put_contents($tmpHtml, $htmlContent);
$parsedHtml = $service->parse($tmpHtml);
unlink($tmpHtml);

echo "Filas HTML parseadas: " . count($parsedHtml) . "\n";
print_r($parsedHtml);

if (count($parsedHtml) !== 2) {
    echo "ERROR en cantidad de filas HTML\n";
    exit(1);
}

echo "\nTODOS LOS TESTS DE MAPREX PARSER PASARON CON ÉXITO!\n";

