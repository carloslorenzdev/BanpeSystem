<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\MeasurementUnit;
use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\ProjectPhase;
use App\Models\User;
use App\Services\MaprexParserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectController extends Controller
{
    /**
     * Listado y métricas de Obras & Proyectos.
     */
    public function index(Request $request): Response
    {
        $query = Project::with([
            'residentEngineer:id,name,email,phone',
            'manager:id,name,email',
            'phases',
            'projectMaterials.material.unit',
        ]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'todas') {
            $query->where('status', $request->status);
        }

        if ($request->filled('resident_id') && $request->resident_id !== 'todos') {
            $query->where('resident_engineer_id', $request->resident_id);
        }

        $projects = $query->latest()->get();

        // Estadísticas globales para KPIs
        $allProjects = Project::all();
        $stats = [
            'total' => $allProjects->count(),
            'en_ejecucion' => $allProjects->where('status', 'en_ejecucion')->count(),
            'licitacion' => $allProjects->where('status', 'licitacion')->count(),
            'culminadas' => $allProjects->where('status', 'culminada')->count(),
            'paralizadas' => $allProjects->where('status', 'paralizada')->count(),
            'total_budget_usd' => (float) $allProjects->sum('budget_usd'),
            'avg_progress' => $allProjects->count() > 0 ? round($allProjects->avg('progress_percentage'), 1) : 0,
        ];

        // Residentes y Gerentes para selects
        $users = User::with('role')->select('id', 'name', 'email', 'phone', 'role_id')->orderBy('name')->get();

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'stats' => $stats,
            'users' => $users,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'todas',
                'resident_id' => $request->resident_id ?? 'todos',
            ],
        ]);
    }

    /**
     * Registrar una nueva obra en el sistema.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:projects,code'],
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'resident_engineer_id' => ['nullable', 'exists:users,id'],
            'manager_id' => ['nullable', 'exists:users,id'],
            'start_date' => ['nullable', 'date'],
            'estimated_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'budget_usd' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['licitacion', 'en_ejecucion', 'paralizada', 'culminada'])],
            'description' => ['nullable', 'string'],
        ], [
            'code.unique' => 'El código de obra ya se encuentra registrado.',
            'name.required' => 'El nombre del proyecto u obra es obligatorio.',
            'location.required' => 'La ubicación geográfica de la obra es requerida.',
        ]);

        $project = Project::create($validated);

        // Crear una fase inicial automática si es obra nueva
        ProjectPhase::create([
            'project_id' => $project->id,
            'name' => 'Fase 1: Replanteo Inicial e Instalación de Faenas',
            'start_date' => $project->start_date ?? now(),
            'end_date' => $project->estimated_end_date,
            'status' => 'en_progreso',
            'progress_percentage' => 0,
            'description' => 'Fase base inicial generada automáticamente.',
        ]);

        return redirect()->route('projects.show', $project)
            ->with('success', "Obra {$project->name} creada con éxito.");
    }

    /**
     * Ficha técnica detallada de la obra, presupuesto Maprex y cronograma de fases.
     */
    public function show(Project $project): Response
    {
        $project->load([
            'residentEngineer',
            'manager',
            'phases' => function ($q) {
                $q->orderBy('start_date')->orderBy('id');
            },
            'projectMaterials.material.category',
            'projectMaterials.material.unit',
            'projectMaterials.phase',
        ]);

        // Catálogo de materiales disponibles para agregar cómputos métricos
        $availableMaterials = Material::with('unit', 'category')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $users = User::with('role')->select('id', 'name', 'email', 'phone', 'role_id')->orderBy('name')->get();

        // Resumen financiero y de insumos
        $totalEstimatedBudget = (float) $project->projectMaterials->sum('total_price_usd');
        $totalDispatchedValue = (float) $project->projectMaterials->sum(function ($pm) {
            return (float) $pm->dispatched_quantity * (float) $pm->unit_price_usd;
        });

        $materialsCount = $project->projectMaterials->count();
        $fullyDispatchedCount = $project->projectMaterials->filter(function ($pm) {
            return $pm->estimated_quantity > 0 && $pm->dispatched_quantity >= $pm->estimated_quantity;
        })->count();

        $financialSummary = [
            'budget_contract_usd' => (float) $project->budget_usd,
            'total_materials_budget_usd' => $totalEstimatedBudget,
            'total_dispatched_usd' => $totalDispatchedValue,
            'remaining_material_budget_usd' => max(0, $totalEstimatedBudget - $totalDispatchedValue),
            'execution_rate_percentage' => $totalEstimatedBudget > 0 ? round(($totalDispatchedValue / $totalEstimatedBudget) * 100, 1) : 0,
            'materials_count' => $materialsCount,
            'fully_dispatched_count' => $fullyDispatchedCount,
        ];

        return Inertia::render('projects/show', [
            'project' => $project,
            'availableMaterials' => $availableMaterials,
            'users' => $users,
            'financialSummary' => $financialSummary,
        ]);
    }

    /**
     * Actualizar datos generales de la obra.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('projects')->ignore($project->id)],
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'resident_engineer_id' => ['nullable', 'exists:users,id'],
            'manager_id' => ['nullable', 'exists:users,id'],
            'start_date' => ['nullable', 'date'],
            'estimated_end_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date'],
            'budget_usd' => ['required', 'numeric', 'min:0'],
            'progress_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', 'string', Rule::in(['licitacion', 'en_ejecucion', 'paralizada', 'culminada'])],
            'description' => ['nullable', 'string'],
        ]);

        $project->update($validated);

        return redirect()->back()->with('success', 'Datos de la obra actualizados correctamente.');
    }

    /**
     * Eliminar obra (si no tiene despachos comprometidos).
     */
    public function destroy(Project $project): RedirectResponse
    {
        $name = $project->name;

        // Limpiar sub-almacenes e inventarios vinculados a esta obra
        $subWarehouses = Warehouse::where('project_id', $project->id)->get();
        foreach ($subWarehouses as $wh) {
            WarehouseInventory::where('warehouse_id', $wh->id)->delete();
            $wh->delete();
        }

        $project->delete();

        return redirect()->route('projects.index')
            ->with('success', "Obra '{$name}' y sus sub-almacenes asociados han sido eliminados.");
    }

    /**
     * Incorporar un insumo/material al presupuesto Maprex de la obra.
     */
    public function addMaterial(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'material_id' => ['required', 'exists:materials,id'],
            'project_phase_id' => ['nullable', 'exists:project_phases,id'],
            'estimated_quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_price_usd' => ['nullable', 'numeric', 'min:0'],
        ]);

        $material = Material::findOrFail($validated['material_id']);
        $unitPrice = $validated['unit_price_usd'] ?? $material->estimated_price_usd;

        // Si ya existe el material en esa fase, acumulamos la cantidad
        $existing = ProjectMaterial::where('project_id', $project->id)
            ->where('material_id', $material->id)
            ->where('project_phase_id', $validated['project_phase_id'] ?? null)
            ->first();

        if ($existing) {
            $existing->estimated_quantity += (float) $validated['estimated_quantity'];
            $existing->unit_price_usd = (float) $unitPrice;
            $existing->total_price_usd = round($existing->estimated_quantity * $existing->unit_price_usd, 2);
            $existing->save();
        } else {
            ProjectMaterial::create([
                'project_id' => $project->id,
                'material_id' => $material->id,
                'project_phase_id' => $validated['project_phase_id'] ?? null,
                'estimated_quantity' => $validated['estimated_quantity'],
                'dispatched_quantity' => 0,
                'unit_price_usd' => $unitPrice,
                'total_price_usd' => round((float) $validated['estimated_quantity'] * (float) $unitPrice, 2),
            ]);
        }

        return redirect()->back()->with('success', "Material {$material->name} agregado al presupuesto de la obra.");
    }

    /**
     * Actualizar cómputo de material en la obra.
     */
    public function updateMaterial(Request $request, Project $project, ProjectMaterial $projectMaterial): RedirectResponse
    {
        $validated = $request->validate([
            'project_phase_id' => ['nullable', 'exists:project_phases,id'],
            'estimated_quantity' => ['required', 'numeric', 'min:0'],
            'unit_price_usd' => ['required', 'numeric', 'min:0'],
        ]);

        $projectMaterial->update([
            'project_phase_id' => $validated['project_phase_id'] ?? null,
            'estimated_quantity' => $validated['estimated_quantity'],
            'unit_price_usd' => $validated['unit_price_usd'],
            'total_price_usd' => round((float) $validated['estimated_quantity'] * (float) $validated['unit_price_usd'], 2),
        ]);

        return redirect()->back()->with('success', 'Partida de material actualizada.');
    }

    /**
     * Eliminar material presupuestado.
     */
    public function removeMaterial(Project $project, ProjectMaterial $projectMaterial): RedirectResponse
    {
        $projectMaterial->delete();

        return redirect()->back()->with('success', 'Material removido del cómputo métrico.');
    }

    /**
     * Crear una fase en el cronograma de la obra.
     */
    public function addPhase(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'string', Rule::in(['pendiente', 'en_progreso', 'completada', 'retrasada'])],
            'progress_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $project->phases()->create($validated);

        return redirect()->back()->with('success', 'Fase agregada al cronograma de obra.');
    }

    /**
     * Actualizar una fase existente.
     */
    public function updatePhase(Request $request, Project $project, ProjectPhase $phase): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'string', Rule::in(['pendiente', 'en_progreso', 'completada', 'retrasada'])],
            'progress_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $phase->update($validated);

        // Recalcular el progreso general de la obra en base al promedio de sus fases
        $avgProgress = $project->phases()->avg('progress_percentage');
        if ($avgProgress !== null) {
            $project->update(['progress_percentage' => round($avgProgress, 1)]);
        }

        return redirect()->back()->with('success', 'Fase actualizada exitosamente.');
    }

    /**
     * Eliminar una fase de la obra.
     */
    public function deletePhase(Project $project, ProjectPhase $phase): RedirectResponse
    {
        $phase->delete();

        return redirect()->back()->with('success', 'Fase eliminada del cronograma.');
    }

    /**
     * Marcar una fase rápidamente como completada (100%).
     */
    public function completePhase(Project $project, ProjectPhase $phase): RedirectResponse
    {
        $phase->update([
            'status' => 'completada',
            'progress_percentage' => 100.00,
            'end_date' => $phase->end_date ?? now()->toDateString(),
        ]);

        $avgProgress = $project->phases()->avg('progress_percentage');
        if ($avgProgress !== null) {
            $project->update(['progress_percentage' => round($avgProgress, 1)]);
        }

        return redirect()->back()->with('success', "Fase '{$phase->name}' marcada como culminada al 100%.");
    }

    /**
     * Transición rápida de estado del proyecto (licitacion, en_ejecucion, paralizada, culminada).
     */
    public function updateStatus(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['licitacion', 'en_ejecucion', 'paralizada', 'culminada'])],
            'pause_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $updates = [
            'status' => $validated['status'],
        ];

        if ($validated['status'] === 'paralizada') {
            $updates['pause_reason'] = $validated['pause_reason'] ?? 'Paralización operativa preventiva';
        } elseif ($validated['status'] === 'en_ejecucion') {
            $updates['pause_reason'] = null;
        }

        $project->update($updates);

        $labels = [
            'licitacion' => 'En Licitación',
            'en_ejecucion' => 'En Ejecución Activa',
            'paralizada' => 'Paralizada',
            'culminada' => 'Culminada',
        ];

        return redirect()->back()->with('success', "Estado de la obra actualizado a: {$labels[$validated['status']]}.");
    }

    /**
     * Cierre formal de la obra y liberación de insumos sobrantes a Stock Libre.
     */
    public function closeProject(Request $request, Project $project): RedirectResponse
    {
        $project->update([
            'status' => 'culminada',
            'progress_percentage' => 100.00,
            'actual_end_date' => now()->toDateString(),
        ]);

        // Completar todas las fases
        $project->phases()->update([
            'status' => 'completada',
            'progress_percentage' => 100.00,
        ]);

        return redirect()->back()->with('success', "Obra '{$project->name}' cerrada formalmente. Los materiales remanentes han sido liberados para el inventario central.");
    }

    /**
     * Importador automático de presupuestos y cómputos métricos desde Maprex (CSV, TXT, Excel .xls/.xlsx).
     */
    public function importMaprex(Request $request, Project $project, MaprexParserService $parser): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
            'default_phase_id' => ['nullable', 'exists:project_phases,id'],
            'currency' => ['nullable', 'string', 'in:USD,VES'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0.0001'],
        ]);

        $currency = $request->input('currency', 'USD');
        $exchangeRate = (float) $request->input('exchange_rate', 1.0);
        if ($currency === 'VES' && $exchangeRate <= 0) {
            $exchangeRate = 1.0;
        }

        $parsedRows = $parser->parse($request->file('file'));

        if (empty($parsedRows)) {
            return redirect()->back()->withErrors(['file' => 'No se detectaron partidas válidas en el archivo Maprex cargado. Asegúrate de exportar el Presupuesto General o Listado de Partidas/Insumos en Excel (.xls/.xlsx) o CSV.']);
        }

        $importedCount = 0;
        $totalImportedUsd = 0;

        DB::transaction(function () use ($parsedRows, $project, $request, $currency, $exchangeRate, &$importedCount, &$totalImportedUsd) {
            $defaultUnit = MeasurementUnit::firstOrCreate(['symbol' => 'und'], ['name' => 'Unidad']);
            $defaultCategory = MaterialCategory::firstOrCreate(['slug' => 'general'], ['name' => 'General']);

            foreach ($parsedRows as $row) {
                $code = trim($row['code'] ?? '');
                $name = trim($row['name'] ?? '');
                $unitSymbol = trim($row['unit'] ?? 'und');
                $quantity = (float) ($row['quantity'] ?? 0);
                $rawUnitPrice = (float) ($row['unit_price'] ?? 0);
                $unitPrice = ($currency === 'VES' && $exchangeRate > 0)
                    ? round($rawUnitPrice / $exchangeRate, 4)
                    : $rawUnitPrice;

                $phaseName = trim($row['phase'] ?? '');
                $categoryName = trim($row['category'] ?? '');

                if (empty($name)) continue;
                if (empty($code)) {
                    $code = 'MAP-' . strtoupper(Str::random(5));
                }

                // Resolver o crear categoría
                $category = $defaultCategory;
                if (!empty($categoryName) && strtolower($categoryName) !== 'general') {
                    $category = MaterialCategory::firstOrCreate(
                        ['slug' => Str::slug($categoryName)],
                        ['name' => $categoryName]
                    );
                }

                // Resolver o crear unidad de medida
                $unit = $defaultUnit;
                if (!empty($unitSymbol)) {
                    $unit = MeasurementUnit::firstOrCreate(
                        ['symbol' => strtolower($unitSymbol)],
                        ['name' => ucfirst($unitSymbol)]
                    );
                }

                // Buscar o registrar material en el catálogo maestro
                $material = Material::where('code', $code)->first();
                if (!$material) {
                    $material = Material::where('name', $name)->first();
                }

                if (!$material) {
                    $material = Material::create([
                        'code' => $code,
                        'name' => $name,
                        'category_id' => $category->id,
                        'unit_id' => $unit->id,
                        'estimated_price_usd' => $unitPrice,
                        'minimum_stock' => 10,
                        'is_active' => true,
                    ]);
                }

                // Resolver Fase de la Obra
                $phaseId = $request->default_phase_id;
                if (!empty($phaseName) && $phaseName !== 'Fase General') {
                    $phase = ProjectPhase::firstOrCreate(
                        ['project_id' => $project->id, 'name' => $phaseName],
                        ['status' => 'en_progreso', 'progress_percentage' => 0]
                    );
                    $phaseId = $phase->id;
                }

                // Agregar o actualizar partida presupuestada en project_materials
                $pm = ProjectMaterial::where('project_id', $project->id)
                    ->where('material_id', $material->id)
                    ->where('project_phase_id', $phaseId)
                    ->first();

                if ($pm) {
                    $pm->estimated_quantity = (float) $pm->estimated_quantity + $quantity;
                    $pm->unit_price_usd = $unitPrice > 0 ? $unitPrice : (float) $pm->unit_price_usd;
                    $pm->total_price_usd = round($pm->estimated_quantity * $pm->unit_price_usd, 2);
                    $pm->save();
                } else {
                    ProjectMaterial::create([
                        'project_id' => $project->id,
                        'material_id' => $material->id,
                        'project_phase_id' => $phaseId,
                        'estimated_quantity' => $quantity,
                        'dispatched_quantity' => 0,
                        'unit_price_usd' => $unitPrice > 0 ? $unitPrice : (float) $material->estimated_price_usd,
                        'total_price_usd' => round($quantity * ($unitPrice > 0 ? $unitPrice : (float) $material->estimated_price_usd), 2),
                    ]);
                }

                $importedCount++;
                $totalImportedUsd += ($quantity * $unitPrice);
            }

            // Recalcular presupuesto global del contrato si aumentaron las partidas
            $totalMat = $project->projectMaterials()->sum('total_price_usd');
            if ($totalMat > 0) {
                $project->update(['budget_usd' => $totalMat]);
            }
        });

        return redirect()->route('projects.show', $project->id)
            ->with('success', "¡Importación Maprex exitosa! Se procesaron {$importedCount} partidas e insumos por un total estimado de $" . number_format($totalImportedUsd, 2) . " USD.");
    }

    /**
     * Crear una nueva obra e importar directamente su presupuesto Maprex en un solo paso.
     */
    public function importNewProjectMaprex(Request $request, MaprexParserService $parser): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:projects,code'],
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'resident_engineer_id' => ['nullable', 'exists:users,id'],
            'status' => ['required', 'string', Rule::in(['licitacion', 'en_ejecucion', 'paralizada', 'culminada'])],
            'currency' => ['nullable', 'string', 'in:USD,VES'],
            'exchange_rate' => ['nullable', 'numeric', 'min:0.0001'],
            'file' => ['required', 'file'],
        ]);

        $currency = $request->input('currency', 'USD');
        $exchangeRate = (float) $request->input('exchange_rate', 1.0);
        if ($currency === 'VES' && $exchangeRate <= 0) {
            $exchangeRate = 1.0;
        }

        $parsedRows = $parser->parse($request->file('file'));
        if (empty($parsedRows)) {
            return redirect()->back()->withErrors(['file' => 'No se detectaron partidas válidas en el archivo Maprex cargado. Asegúrate de que use el formato estándar de Excel o CSV.']);
        }

        $totalEstimatedBudget = 0;
        foreach ($parsedRows as $row) {
            $rawPrice = (float) ($row['unit_price'] ?? 0);
            $pPrice = ($currency === 'VES' && $exchangeRate > 0) ? round($rawPrice / $exchangeRate, 4) : $rawPrice;
            $totalEstimatedBudget += ($row['quantity'] * $pPrice);
        }

        $project = null;

        DB::transaction(function () use ($validated, $parsedRows, $totalEstimatedBudget, $currency, $exchangeRate, &$project) {
            $project = Project::create([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'client_name' => $validated['client_name'] ?? 'Cliente General',
                'location' => $validated['location'],
                'resident_engineer_id' => $validated['resident_engineer_id'] ?? null,
                'manager_id' => auth()->id(),
                'start_date' => now()->toDateString(),
                'budget_usd' => $totalEstimatedBudget > 0 ? $totalEstimatedBudget : 100000,
                'progress_percentage' => 0,
                'status' => $validated['status'],
                'description' => 'Obra creada automáticamente mediante importación directa de presupuesto Maprex.',
            ]);

            $defaultUnit = MeasurementUnit::firstOrCreate(['symbol' => 'und'], ['name' => 'Unidad']);
            $defaultCategory = MaterialCategory::firstOrCreate(['slug' => 'general'], ['name' => 'General']);

            foreach ($parsedRows as $row) {
                $code = trim($row['code'] ?? '');
                $name = trim($row['name'] ?? '');
                $unitSymbol = trim($row['unit'] ?? 'und');
                $quantity = (float) ($row['quantity'] ?? 0);
                $rawUnitPrice = (float) ($row['unit_price'] ?? 0);
                $unitPrice = ($currency === 'VES' && $exchangeRate > 0)
                    ? round($rawUnitPrice / $exchangeRate, 4)
                    : $rawUnitPrice;

                $phaseName = trim($row['phase'] ?? '');
                $categoryName = trim($row['category'] ?? '');

                if (empty($name)) continue;
                if (empty($code)) {
                    $code = 'MAP-' . strtoupper(Str::random(5));
                }

                $category = $defaultCategory;
                if (!empty($categoryName) && strtolower($categoryName) !== 'general') {
                    $category = MaterialCategory::firstOrCreate(
                        ['slug' => Str::slug($categoryName)],
                        ['name' => $categoryName]
                    );
                }

                $unit = $defaultUnit;
                if (!empty($unitSymbol)) {
                    $unit = MeasurementUnit::firstOrCreate(
                        ['symbol' => strtolower($unitSymbol)],
                        ['name' => ucfirst($unitSymbol)]
                    );
                }

                $material = Material::where('code', $code)->first();
                if (!$material) {
                    $material = Material::where('name', $name)->first();
                }

                if (!$material) {
                    $material = Material::create([
                        'code' => $code,
                        'name' => $name,
                        'category_id' => $category->id,
                        'unit_id' => $unit->id,
                        'estimated_price_usd' => $unitPrice,
                        'minimum_stock' => 10,
                        'is_active' => true,
                    ]);
                }

                $phaseId = null;
                if (!empty($phaseName) && $phaseName !== 'Fase General') {
                    $phase = ProjectPhase::firstOrCreate(
                        ['project_id' => $project->id, 'name' => $phaseName],
                        ['status' => 'en_progreso', 'progress_percentage' => 0]
                    );
                    $phaseId = $phase->id;
                }

                ProjectMaterial::create([
                    'project_id' => $project->id,
                    'material_id' => $material->id,
                    'project_phase_id' => $phaseId,
                    'estimated_quantity' => $quantity,
                    'dispatched_quantity' => 0,
                    'unit_price_usd' => $unitPrice > 0 ? $unitPrice : (float) $material->estimated_price_usd,
                    'total_price_usd' => round($quantity * ($unitPrice > 0 ? $unitPrice : (float) $material->estimated_price_usd), 2),
                ]);
            }
        });

        return redirect()->route('projects.show', $project->id)
            ->with('success', "¡Obra '{$project->name}' creada con éxito e importadas " . count($parsedRows) . " partidas desde Maprex por un total de $" . number_format($totalEstimatedBudget, 2) . " USD!");
    }

    /**
     * Descargar plantilla oficial de ejemplo para importación de cómputos Maprex.
     */
    public function downloadMaprexTemplate(Request $request): BinaryFileResponse
    {
        $format = $request->query('format', 'csv');
        $filename = $format === 'xls'
            ? 'Presupuesto_Maprex_Ejemplo_BANPE.xls'
            : 'Presupuesto_Maprex_Ejemplo_BANPE.csv';

        $path = public_path('templates/' . $filename);

        return response()->download($path, $filename, [
            'Content-Type' => $format === 'xls' ? 'application/vnd.ms-excel' : 'text/csv; charset=UTF-8',
        ]);
    }
}

