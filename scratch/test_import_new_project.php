<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\ProjectController;
use App\Services\MaprexParserService;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

echo "=== TEST: Creación de Nueva Obra con Presupuesto_Maprex_Ejemplo_BANPE.xls ===\n";

$admin = User::first();
if ($admin) {
    auth()->login($admin);
}

$controller = app(ProjectController::class);
$parser = app(MaprexParserService::class);

$xlsPath = public_path('templates/Presupuesto_Maprex_Ejemplo_BANPE.xls');
$uploadedFile = new UploadedFile($xlsPath, 'Presupuesto_Maprex_Ejemplo_BANPE.xls', 'application/vnd.ms-excel', null, true);

$req = Request::create('/projects/import-new-maprex', 'POST', [
    'code' => 'OBR-2026-001',
    'name' => 'Construcción Centro Logístico BANPE',
    'client_name' => 'Inversiones BANPE C.A.',
    'location' => 'Zona Industrial Carabobo',
    'resident_engineer_id' => $admin?->id,
    'status' => 'en_ejecucion',
], [], ['file' => $uploadedFile]);

try {
    $response = $controller->importNewProjectMaprex($req, $parser);
    echo "Status Code: " . $response->getStatusCode() . "\n";
    echo "Target URL: " . $response->getTargetUrl() . "\n";
    
    $p = Project::where('code', 'OBR-2026-001')->first();
    if ($p) {
        echo "Obra Creada: {$p->name} | Total Presupuesto: \${$p->budget_usd}\n";
        echo "Partidas: " . $p->projectMaterials()->count() . "\n";
        echo "Fases: " . $p->phases()->count() . "\n";
    } else {
        echo "ERROR: Proyecto no encontrado en BD\n";
    }
} catch (\Exception $e) {
    echo "EXCEPCIÓN: " . $e->getMessage() . "\n";
}

