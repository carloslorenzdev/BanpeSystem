<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\MaprexParserService;

$service = new MaprexParserService();
$csvFile = public_path('templates/Presupuesto_Maprex_Carretera_Troncal.csv');
$xlsFile = public_path('templates/Presupuesto_Maprex_Carretera_Troncal.xls');

$parsedCsv = $service->parse($csvFile);
echo "Filas CSV parseadas: " . count($parsedCsv) . "\n";
echo "Primera fila: " . $parsedCsv[0]['code'] . " - " . $parsedCsv[0]['name'] . " (" . $parsedCsv[0]['quantity'] . " " . $parsedCsv[0]['unit'] . " @ $" . $parsedCsv[0]['unit_price'] . ")\n";

$parsedXls = $service->parse($xlsFile);
echo "Filas XLS parseadas: " . count($parsedXls) . "\n";
echo "Primera fila: " . $parsedXls[0]['code'] . " - " . $parsedXls[0]['name'] . " (" . $parsedXls[0]['quantity'] . " " . $parsedXls[0]['unit'] . " @ $" . $parsedXls[0]['unit_price'] . ")\n";

if (count($parsedCsv) === 16 && count($parsedXls) === 16) {
    echo "TODO PERFECTO: 16 PARTIDAS DE MAPREX LEIDAS IMPECABLEMENTE!\n";
} else {
    echo "ERROR EN PARSEO\n";
    exit(1);
}

