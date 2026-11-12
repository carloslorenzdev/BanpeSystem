<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;
use App\Http\Controllers\ProjectController;
use Illuminate\Http\Request;

$controller = app(ProjectController::class);
$project = Project::find(5);

$req = Request::create('/projects/5', 'GET');
$response = $controller->show($project);

$props = $response->toResponse($req)->getOriginalContent()->getData()['page']['props'];

echo "Nombre: " . $props['project']['name'] . "\n";
echo "Presupuesto Contrato USD: $" . number_format($props['project']['budget_usd'], 2) . "\n";
echo "Partidas en project_materials: " . count($props['project']['project_materials']) . "\n";
echo "Fases creadas: " . count($props['project']['phases']) . "\n";
echo "Partidas en financialSummary: " . $props['financialSummary']['materials_count'] . "\n";
echo "Presupuesto Total Materiales USD: $" . number_format($props['financialSummary']['total_materials_budget_usd'], 2) . "\n";

