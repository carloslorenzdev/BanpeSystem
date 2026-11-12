<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\ProjectPhase;
use App\Services\MaprexParserService;
use Illuminate\Support\Str;

echo "=== LIMPIEZA Y REORGANIZACIÓN DE PROYECTOS ===\n";

// 1. Restaurar Proyecto 5 (Hospital)
$hospital = Project::find(5);
if ($hospital) {
    echo "Limpiando Proyecto 5 (Hospital)...\n";
    // Eliminar partidas de carretera que se habían inyectado por error
    $carreteraCodes = [
        'C.026200102', 'C.030100100', 'C.030500101', 'C.030500400',
        'C.050206102', 'C.058302503', 'C.058721000', 'C.138750000',
        'C.100100201', 'C.100200200', 'C.100300103', 'C.100400200',
        'C.123000102', 'C.123030002', 'C.120100100', 'C.120200102'
    ];
    
    $pms = ProjectMaterial::where('project_id', $hospital->id)
        ->whereHas('material', function($q) use ($carreteraCodes) {
            $q->whereIn('code', $carreteraCodes);
        })->get();
        
    foreach ($pms as $pm) {
        $pm->delete();
    }
    
    // Eliminar fases de carretera creadas en hospital
    ProjectPhase::where('project_id', $hospital->id)
        ->whereIn('name', ['Drenajes y Alcantarillas', 'Estructuras de Concreto', 'Pavimentacion y Asfalto', 'Seguridad Vial y Senalizacion', 'Fase General'])
        ->delete();
        
    $hospital->update([
        'budget_usd' => 50000.00,
        'description' => 'Remodelación de áreas críticas del centro de salud.',
    ]);
    echo "Proyecto 5 restaurado a Hospital limpio ($50,000 USD).\n";
}

// 2. Crear Proyecto 5 independiente oficial: Reparaciones en Carretera Troncal (Maprex)
$existingRoad = Project::where('code', 'OBR-2026-005')->first();
if ($existingRoad) {
    $existingRoad->delete();
}

$parser = new MaprexParserService();
$csvPath = public_path('templates/Presupuesto_Maprex_Carretera_Troncal.csv');
$rows = $parser->parse($csvPath);

echo "Filas de Maprex a importar en nuevo proyecto: " . count($rows) . "\n";

$roadProject = Project::create([
    'code' => 'OBR-2026-005',
    'name' => 'Reparaciones en Carretera Troncal',
    'client_name' => 'Ministerio de Transporte / Gobernación',
    'location' => 'Carretera Troncal 01, Valencia - Carabobo',
    'resident_engineer_id' => $hospital ? $hospital->resident_engineer_id : 1,
    'manager_id' => $hospital ? $hospital->manager_id : 1,
    'start_date' => now()->toDateString(),
    'budget_usd' => 1301452.19,
    'progress_percentage' => 0.00,
    'status' => 'en_ejecucion',
    'description' => 'Presupuesto oficial y cómputos métricos importados directamente desde DataLaing Maprex.',
]);

echo "Nuevo Proyecto Carretera Troncal creado con ID: {$roadProject->id} y Codigo: {$roadProject->code}\n";

// Crear fases e insertar partidas en roadProject
foreach ($rows as $row) {
    $mat = \App\Models\Material::where('code', $row['code'])->first();
    if (!$mat) {
        $mat = \App\Models\Material::create([
            'code' => $row['code'],
            'name' => $row['name'],
            'category_id' => 1,
            'unit_id' => 1,
            'estimated_price_usd' => $row['unit_price'],
            'minimum_stock' => 10,
            'is_active' => true,
        ]);
    }
    
    $phase = ProjectPhase::firstOrCreate(
        ['project_id' => $roadProject->id, 'name' => $row['phase']],
        ['status' => 'en_progreso', 'progress_percentage' => 0]
    );
    
    ProjectMaterial::create([
        'project_id' => $roadProject->id,
        'material_id' => $mat->id,
        'project_phase_id' => $phase->id,
        'estimated_quantity' => $row['quantity'],
        'dispatched_quantity' => 0,
        'unit_price_usd' => $row['unit_price'],
        'total_price_usd' => round($row['quantity'] * $row['unit_price'], 2),
    ]);
}

echo "Partidas asignadas a Carretera Troncal: " . $roadProject->projectMaterials()->count() . "\n";
echo "Fases creadas: " . $roadProject->phases()->count() . "\n";

echo "\n=== ESTADO FINAL DE OBRAS ===\n";
foreach (Project::orderBy('code')->get() as $p) {
    echo "ID: {$p->id} | {$p->code} | {$p->name} | \${$p->budget_usd} | Partidas: " . $p->projectMaterials()->count() . "\n";
}

