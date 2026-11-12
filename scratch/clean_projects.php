<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\ProjectPhase;

ProjectMaterial::truncate();
ProjectPhase::truncate();
Project::truncate();

echo "TABLAS DE PROYECTOS LIMPIAS. Total obras: " . Project::count() . "\n";

