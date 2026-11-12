<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ValuationController extends Controller
{
    /**
     * Panel de Valuaciones de Cierre y Liquidación de Obras (BANPE-DFO-04-a / ISO 9001).
     * Mide el progreso físico-financiero, valuación interna (residente), valuación externa (cliente) y acta de cierre.
     */
    public function index(Request $request): Response
    {
        $query = Project::with([
            'residentEngineer:id,name,email,phone',
            'manager:id,name,email',
            'phases',
            'materials.material.unit',
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
            $query->where('valuation_status', $request->status);
        }

        $allProjects = Project::with(['materials.material', 'phases'])->get();

        $projects = $query->latest()->get()->map(function ($project) {
            // Calcular monto ejecutado/valuado en USD en base a partidas despachadas
            $executedUsd = $project->materials->sum(function ($pm) {
                return (float) $pm->dispatched_quantity * (float) $pm->unit_price_usd;
            });

            // Resumen de fases
            $totalPhases = $project->phases->count();
            $completedPhases = $project->phases->where('status', 'completada')->count();

            return [
                'id' => $project->id,
                'code' => $project->code,
                'name' => $project->name,
                'client_name' => $project->client_name,
                'location' => $project->location,
                'budget_usd' => (float) $project->budget_usd,
                'executed_usd' => round($executedUsd, 2),
                'progress_percentage' => (float) $project->progress_percentage,
                'status' => $project->status,
                'valuation_status' => $project->valuation_status ?? 'pendiente',
                'internal_valuation_date' => $project->internal_valuation_date?->format('Y-m-d'),
                'internal_valuation_notes' => $project->internal_valuation_notes,
                'external_valuation_date' => $project->external_valuation_date?->format('Y-m-d'),
                'external_valuation_notes' => $project->external_valuation_notes,
                'inspector_name' => $project->inspector_name,
                'termination_act_number' => $project->termination_act_number,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'estimated_end_date' => $project->estimated_end_date?->format('Y-m-d'),
                'actual_end_date' => $project->actual_end_date?->format('Y-m-d'),
                'resident_engineer' => $project->residentEngineer,
                'manager' => $project->manager,
                'total_phases' => $totalPhases,
                'completed_phases' => $completedPhases,
                'phases' => $project->phases,
                'materials_count' => $project->materials->count(),
                'materials' => $project->materials->map(function ($pm) {
                    return [
                        'id' => $pm->id,
                        'material_name' => $pm->material?->name ?? 'Partida General',
                        'material_code' => $pm->material?->code ?? '',
                        'unit_symbol' => $pm->material?->unit?->symbol ?? 'und',
                        'estimated_quantity' => (float) $pm->estimated_quantity,
                        'dispatched_quantity' => (float) $pm->dispatched_quantity,
                        'unit_price_usd' => (float) $pm->unit_price_usd,
                        'total_price_usd' => (float) $pm->total_price_usd,
                        'executed_total_usd' => round((float) $pm->dispatched_quantity * (float) $pm->unit_price_usd, 2),
                    ];
                }),
            ];
        });

        $stats = [
            'total_obras' => $allProjects->count(),
            'pendientes_valuacion' => $allProjects->where('valuation_status', 'pendiente')->count(),
            'valuacion_interna' => $allProjects->where('valuation_status', 'valuacion_interna_aprobada')->count(),
            'valuacion_externa' => $allProjects->where('valuation_status', 'valuacion_externa_aprobada')->count(),
            'cerradas_concluidas' => $allProjects->where('status', 'culminada')->count(),
            'total_presupuestado_usd' => (float) $allProjects->sum('budget_usd'),
        ];

        return Inertia::render('valuations/index', [
            'projects' => $projects,
            'stats' => $stats,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'todas',
            ],
        ]);
    }

    /**
     * Aprobar Valuación Interna de Cierre de Obra (Residente y Coordinador).
     */
    public function approveInternal(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['required', 'string', 'max:1000'],
            'date' => ['required', 'date'],
        ], [
            'notes.required' => 'Debe registrar las observaciones técnicas de la valuación interna.',
            'date.required' => 'La fecha de la valuación es obligatoria.',
        ]);

        $project->update([
            'valuation_status' => 'valuacion_interna_aprobada',
            'internal_valuation_date' => $validated['date'],
            'internal_valuation_notes' => $validated['notes'],
        ]);

        return redirect()->back()->with('success', "Valuación Interna de la obra '{$project->name}' aprobada conforme al procedimiento BANPE-DFO-04-a.");
    }

    /**
     * Aprobar Valuación Externa de Cierre de Obra (Inspección del Cliente).
     */
    public function approveExternal(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'inspector_name' => ['required', 'string', 'max:150'],
            'notes' => ['required', 'string', 'max:1000'],
            'date' => ['required', 'date'],
        ], [
            'inspector_name.required' => 'El nombre del ingeniero inspector o representante del cliente es obligatorio.',
            'notes.required' => 'Debe indicar el dictamen o conformidad del cliente.',
            'date.required' => 'La fecha de aprobación externa es requerida.',
        ]);

        $project->update([
            'valuation_status' => 'valuacion_externa_aprobada',
            'external_valuation_date' => $validated['date'],
            'external_valuation_notes' => $validated['notes'],
            'inspector_name' => $validated['inspector_name'],
        ]);

        return redirect()->back()->with('success', "Valuación Externa de la obra '{$project->name}' aprobada por la inspección del cliente.");
    }

    /**
     * Emisión formal de Acta de Terminación y Cierre de Obra.
     * Libera remanentes de materiales asignados a Stock Libre Central.
     */
    public function closeWithActa(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'acta_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $project) {
            $actaNumber = ! empty($validated['acta_number'])
                ? $validated['acta_number']
                : 'ACT-TERM-'.date('Y').'-'.str_pad($project->id, 3, '0', STR_PAD_LEFT);

            $project->update([
                'status' => 'culminada',
                'valuation_status' => 'cerrada',
                'progress_percentage' => 100.00,
                'actual_end_date' => now()->toDateString(),
                'termination_act_number' => $actaNumber,
            ]);

            // Completar formalmente todas las fases
            $project->phases()->update([
                'status' => 'completada',
                'progress_percentage' => 100.00,
            ]);

            // Reasignar cualquier stock asignado restante a esta obra hacia Stock Libre en cada almacén
            $assignedInventories = WarehouseInventory::where('project_id', $project->id)->get();
            foreach ($assignedInventories as $inv) {
                if ((float) $inv->quantity > 0) {
                    $centralFree = WarehouseInventory::firstOrCreate(
                        ['warehouse_id' => $inv->warehouse_id, 'material_id' => $inv->material_id, 'project_id' => null],
                        ['quantity' => 0, 'minimum_alert' => 0]
                    );
                    $centralFree->quantity = (float) $centralFree->quantity + (float) $inv->quantity;
                    $centralFree->save();
                }
                $inv->delete();
            }
        });

        return redirect()->back()->with('success', "Obra '{$project->name}' finiquitada con éxito. Acta de Terminación emitido y materiales sobrantes liberados a Stock Libre.");
    }
}

