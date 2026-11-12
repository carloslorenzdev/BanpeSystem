<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\MaprexParserService;

$service = new MaprexParserService();
$file = public_path('templates/Presupuesto_Maprex_Ejemplo_BANPE.xls');

$parsed = $service->parse($file);
echo "Filas retornadas: " . count($parsed) . "\n";
print_r($parsed);

