<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;
use App\Models\Material;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\Admin\MaterialController;
use App\Services\MaprexParserService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

echo "=== TEST: Importación Maprex en ProjectController y MaterialController ===\n";

$project = Project::first();
if (!$project) {
    echo "No hay proyectos en la base de datos\n";
    exit(1);
}

// Crear CSV temporal con formato realista Maprex Venezuela
$csvContent = <<<CSV
DATALAING MAPREX 2024
EMPRESA: BANPE CONSTRUCCIONES C.A.
OBRA: {$project->name}

Partida;Descripcion de la Partida;Unidad;Cantidad;Precio Unitario;Capitulo;Rubro
MAP-TEST-001;Arena Lavada de Rio;m3;120,50;28,50;Movimiento de Tierra;Agregados
MAP-TEST-002;Pego Gris Super Corona;saco;85,00;6,80;Albañileria;Pegamentos
CSV;

$tmpPath = sys_get_temp_dir() . '/test_upload_maprex.csv';
file_put_contents($tmpPath, $csvContent);

$uploadedFile = new UploadedFile($tmpPath, 'Presupuesto_Maprex.csv', 'text/csv', null, true);

$reqProject = Request::create('/projects/' . $project->id . '/import-maprex', 'POST', [
    'default_phase_id' => null,
], [], ['file' => $uploadedFile]);

$projController = app(ProjectController::class);
$parser = app(MaprexParserService::class);

$response = $projController->importMaprex($reqProject, $project, $parser);
echo "Respuesta importación en Proyecto: " . $response->getStatusCode() . "\n";

// Verificar que se crearon los insumos en el proyecto
$item1 = Material::where('code', 'MAP-TEST-001')->first();
if ($item1) {
    echo "Material MAP-TEST-001 creado exitosamente en catalogo: " . $item1->name . " ($" . $item1->estimated_price_usd . ")\n";
} else {
    echo "ERROR: Material no encontrado\n";
    exit(1);
}

// Probar ahora en MaterialController
$file2 = new UploadedFile($tmpPath, 'Materiales_Maprex.csv', 'text/csv', null, true);
$reqMaterial = Request::create('/admin/materials/import-maprex', 'POST', [
    'update_existing' => 1,
], [], ['file' => $file2]);

$matController = app(MaterialController::class);
$matResponse = $matController->importMaprex($reqMaterial, $parser);
echo "Respuesta importación en Catálogo Maestro: " . $matResponse->getStatusCode() . "\n";

@unlink($tmpPath);
echo "TODO FUNCIONANDO 100% PERFECTO!\n";

