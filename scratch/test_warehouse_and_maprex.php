<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Warehouse;
use App\Models\Material;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\Admin\MaterialController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

echo "=== TEST 1: CREAR ALMACÉN PRINCIPAL / CENTRAL ===" . PHP_EOL;
$user = User::first();
$whController = new WarehouseController();

$codeCentral = 'ALM-CENTRAL-TEST-' . time();
$reqWh = Request::create('/warehouse/warehouses', 'POST', [
    'code' => $codeCentral,
    'name' => 'Patio Central de Maquinarias y Materiales BANPE',
    'location' => 'Zona Industrial Carabobo, Av. Henry Ford, Valencia',
    'is_central' => true,
    'responsible_user_id' => $user->id,
    'is_active' => true,
]);

$responseWh = $whController->storeWarehouse($reqWh);
$createdWh = Warehouse::where('code', $codeCentral)->first();
if ($createdWh && $createdWh->is_central) {
    echo "SUCCESS: Almacén Principal creado ID: {$createdWh->id}, Nombre: {$createdWh->name}, Is Central: " . ($createdWh->is_central ? 'SI' : 'NO') . PHP_EOL;
} else {
    echo "FAILED: No se creó el almacén principal." . PHP_EOL;
}

echo PHP_EOL . "=== TEST 2: IMPORTAR CATÁLOGO MAPREX CSV ===" . PHP_EOL;
$matController = new MaterialController();
$csvPath = public_path('templates/Catalogo_Maprex_Ejemplo_BANPE.csv');
$uploadedFile = new UploadedFile($csvPath, 'Catalogo_Maprex_Ejemplo_BANPE.csv', 'text/csv', null, true);

$reqImport = Request::create('/admin/materials/import-maprex', 'POST', [
    'update_existing' => true,
], [], ['file' => $uploadedFile]);

$responseImport = $matController->importMaprex($reqImport);
$materialsCount = Material::count();
echo "SUCCESS: Materiales en catálogo maestro tras importación Maprex: {$materialsCount}" . PHP_EOL;

// Check a specific Maprex item
$item = Material::where('code', 'E121.100.000')->first();
if ($item) {
    echo "Partida verificada: [{$item->code}] {$item->name} | Precio: \${$item->estimated_price_usd} | Unidad: {$item->unit?->symbol}" . PHP_EOL;
}

// Cleanup test warehouse
if ($createdWh) {
    $createdWh->delete();
    echo "CLEANUP: Almacén de prueba eliminado." . PHP_EOL;
}

