<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\MaprexParserService;

$service = new MaprexParserService();

$files = [
    'Presupuesto_Maprex_Ejemplo_BANPE.xls',
    'Presupuesto_Maprex_Ejemplo_BANPE.csv',
    'Presupuesto_Maprex_Carretera_Troncal.xls',
    'Presupuesto_Maprex_Carretera_Troncal.csv',
    'Catalogo_Maprex_Ejemplo_BANPE.xls',
    'Catalogo_Maprex_Ejemplo_BANPE.csv',
];

echo "=== TEST DE TODOS LOS TEMPLATES DE MAPREX ===\n";
foreach ($files as $file) {
    $path = public_path('templates/' . $file);
    if (!file_exists($path)) {
        echo "[$file] ARCHIVO NO EXISTE\n";
        continue;
    }
    $rows = $service->parse($path);
    echo sprintf("[%-40s] => %2d partidas parseadas [%s]\n", $file, count($rows), count($rows) > 0 ? "OK" : "ERROR");
    if (count($rows) === 0) {
        exit(1);
    }
}

echo "TODOS LOS ARCHIVOS MAPREX PASARON CON ÉXITO!\n";

