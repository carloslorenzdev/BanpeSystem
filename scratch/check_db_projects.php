<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\Material;

echo "=== PROYECTOS EN BASE DE DATOS ===\n";
$projects = Project::with(['projectMaterials', 'phases'])->get();
foreach ($projects as $p) {
    echo "ID: {$p->id} | Codigo: {$p->code} | Nombre: {$p->name} | Presupuesto USD: \${$p->budget_usd} | Materiales/Partidas: " . $p->projectMaterials->count() . " | Fases: " . $p->phases->count() . "\n";
    foreach ($p->projectMaterials as $pm) {
        $mat = $pm->material;
        echo "   -> Partida: [{$mat?->code}] {$mat?->name} | Cant: {$pm->estimated_quantity} | PU: \${$pm->unit_price_usd}\n";
    }
}

echo "\nTOTAL MATERIALES EN CATALOGO: " . Material::count() . "\n";

