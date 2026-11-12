<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;

$project5 = Project::find(5);
if ($project5) {
    $totalMat = $project5->projectMaterials()->sum('total_price_usd');
    echo "Total partidas en Proyecto 5: $" . number_format($totalMat, 2) . "\n";
    $project5->update([
        'budget_usd' => $totalMat,
    ]);
    echo "Presupuesto de Proyecto 5 actualizado a: $" . number_format($project5->budget_usd, 2) . "\n";
}

