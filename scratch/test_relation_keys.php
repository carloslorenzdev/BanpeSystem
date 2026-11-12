<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Project;

$p = Project::with(['projectMaterials', 'phases'])->find(5);
$arr = $p->toArray();
echo "Keys in toArray:\n";
print_r(array_keys($arr));

echo "project_materials set? " . (isset($arr['project_materials']) ? 'YES (' . count($arr['project_materials']) . ')' : 'NO') . "\n";
echo "projectMaterials set? " . (isset($arr['projectMaterials']) ? 'YES (' . count($arr['projectMaterials']) . ')' : 'NO') . "\n";

