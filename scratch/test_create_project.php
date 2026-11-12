<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Http\Controllers\ProjectController;

$user = User::first();
$controller = new ProjectController();

$testCode = 'OBR-TEST-' . time();
$request = Request::create('/projects', 'POST', [
    'code' => $testCode,
    'name' => 'Proyecto Prueba Test Autovalidación',
    'client_name' => 'Cliente Corporativo Test',
    'location' => 'Zona Industrial San Vicente, Maracay',
    'resident_engineer_id' => $user->id,
    'manager_id' => $user->id,
    'start_date' => '2026-11-01',
    'estimated_end_date' => '2026-12-31',
    'budget_usd' => 25000.00,
    'status' => 'en_ejecucion',
    'description' => 'Prueba de creación directa para verificar import de Rule::',
]);

try {
    $response = $controller->store($request);
    echo "SUCCESS: Proyecto creado con código " . $testCode . PHP_EOL;
    $created = Project::where('code', $testCode)->first();
    echo "ID: " . $created->id . " | Fases creadas: " . $created->phases()->count() . PHP_EOL;
    // Clean up test project
    $created->phases()->delete();
    $created->delete();
    echo "CLEANUP: Proyecto de prueba eliminado correctamente." . PHP_EOL;
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . PHP_EOL;
    echo $e->getTraceAsString() . PHP_EOL;
}

