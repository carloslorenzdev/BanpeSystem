<?php

namespace App\Http\Controllers;

use App\Models\Dispatch;
use App\Models\DispatchItem;
use App\Models\Material;
use App\Models\MaterialRequest;
use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DispatchController extends Controller
{
    /**
     * Listado y rastreo de Guías de Despacho de Camiones a Obra (BANPE-FO-12-0004).
     */
    public function index(Request $request): Response
    {
        $query = Dispatch::with([
            'warehouse:id,code,name',
            'project:id,code,name,location',
            'dispatcher:id,name',
            'receiver:id,name,phone',
            'items.material.unit',
        ]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('driver_name', 'like', "%{$search}%")
                    ->orWhere('vehicle_plate', 'like', "%{$search}%")
                    ->orWhereHas('project', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->status !== 'todos') {
            $query->where('status', $request->status);
        }

        if ($request->filled('project_id') && $request->project_id !== 'todos') {
            $query->where('project_id', $request->project_id);
        }

        $dispatches = $query->latest()->get();

        $allDispatches = Dispatch::all();
        $stats = [
            'total' => $allDispatches->count(),
            'en_transito' => $allDispatches->where('status', 'en_transito')->count(),
            'entregados' => $allDispatches->where('status', 'entregado')->count(),
            'con_discrepancia' => $allDispatches->where('status', 'con_discrepancia')->count(),
        ];

        $warehouses = Warehouse::where('is_active', true)->select('id', 'code', 'name')->get();
        $projects = Project::whereIn('status', ['en_ejecucion', 'licitacion'])->select('id', 'code', 'name', 'location')->get();
        $materials = Material::with('unit')->where('is_active', true)->select('id', 'code', 'name', 'unit_id', 'estimated_price_usd')->get();
        $pendingRequests = MaterialRequest::whereIn('status', ['pendiente', 'aprobada', 'despachada_parcial'])
            ->with(['project:id,name,code', 'items.material.unit'])
            ->get();
        $inventories = WarehouseInventory::select('id', 'warehouse_id', 'material_id', 'project_id', 'quantity')->get();

        return Inertia::render('dispatches/index', [
            'dispatches' => $dispatches,
            'stats' => $stats,
            'warehouses' => $warehouses,
            'projects' => $projects,
            'materials' => $materials,
            'inventories' => $inventories,
            'pendingRequests' => $pendingRequests,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'todos',
                'project_id' => $request->project_id ?? 'todos',
            ],
        ]);
    }

    /**
     * Emitir nueva Guía de Despacho en Camión.
     * Descuenta existencias en Almacén (prioriza stock asignado al proyecto, luego libre).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'project_id' => ['required', 'exists:projects,id'],
            'material_request_id' => ['nullable', 'exists:material_requests,id'],
            'driver_name' => ['required', 'string', 'max:150'],
            'driver_id_document' => ['nullable', 'string', 'max:50'],
            'vehicle_plate' => ['required', 'string', 'max:20'],
            'vehicle_model' => ['nullable', 'string', 'max:100'],
            'departure_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.material_id' => ['required', 'exists:materials,id'],
            'items.*.quantity_sent' => ['required', 'numeric', 'min:0.01'],
        ], [
            'warehouse_id.required' => 'Debe seleccionar el almacén de origen del despacho.',
            'project_id.required' => 'Debe seleccionar la obra de destino.',
            'driver_name.required' => 'El nombre del chofer responsable es obligatorio.',
            'vehicle_plate.required' => 'La placa del vehículo de transporte es obligatoria.',
            'departure_date.required' => 'La fecha de salida del camión es obligatoria.',
            'items.required' => 'Debe agregar al menos un insumo a la guía de despacho.',
            'items.min' => 'Debe despachar al menos un insumo.',
            'items.*.material_id.required' => 'Seleccione el material en cada fila.',
            'items.*.quantity_sent.min' => 'La cantidad a despachar debe ser mayor a 0.',
        ]);

        DB::transaction(function () use ($validated) {
            // Verificar primero que haya stock suficiente para cada ítem en el almacén
            foreach ($validated['items'] as $itemData) {
                $material = Material::findOrFail($itemData['material_id']);
                $qtySent = (float) $itemData['quantity_sent'];

                $assignedQty = (float) (WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                    ->where('material_id', $material->id)
                    ->where('project_id', $validated['project_id'])
                    ->value('quantity') ?? 0);

                $freeQty = (float) (WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                    ->where('material_id', $material->id)
                    ->whereNull('project_id')
                    ->value('quantity') ?? 0);

                $totalAvailable = $assignedQty + $freeQty;
                if ($qtySent > $totalAvailable) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["La cantidad de '{$material->name}' ({$qtySent}) supera la existencia disponible ({$totalAvailable}) en el almacén de origen."],
                    ]);
                }
            }

            $count = Dispatch::count() + 1;
            $code = 'DSP-'.date('Y').'-'.str_pad($count, 3, '0', STR_PAD_LEFT);

            $dispatch = Dispatch::create([
                'code' => $code,
                'warehouse_id' => $validated['warehouse_id'],
                'project_id' => $validated['project_id'],
                'material_request_id' => $validated['material_request_id'] ?? null,
                'dispatcher_user_id' => auth()->id() ?? 1,
                'driver_name' => $validated['driver_name'],
                'driver_id_document' => $validated['driver_id_document'] ?? null,
                'vehicle_plate' => strtoupper($validated['vehicle_plate']),
                'vehicle_model' => $validated['vehicle_model'] ?? null,
                'departure_date' => $validated['departure_date'],
                'status' => 'en_transito',
            ]);

            foreach ($validated['items'] as $itemData) {
                $material = Material::findOrFail($itemData['material_id']);
                $qtySent = (float) $itemData['quantity_sent'];

                // Registrar ítem de despacho
                DispatchItem::create([
                    'dispatch_id' => $dispatch->id,
                    'material_id' => $material->id,
                    'quantity_sent' => $qtySent,
                    'unit_price_usd' => $material->estimated_price_usd,
                ]);

                // Descontar inventario del almacén:
                // 1. Primero intentar descontar del Stock Asignado a la obra
                $assignedInv = WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                    ->where('material_id', $material->id)
                    ->where('project_id', $validated['project_id'])
                    ->first();

                $remainder = $qtySent;
                if ($assignedInv && (float) $assignedInv->quantity > 0) {
                    $deduct = min((float) $assignedInv->quantity, $remainder);
                    $assignedInv->quantity = (float) $assignedInv->quantity - $deduct;
                    $assignedInv->save();
                    $remainder -= $deduct;
                }

                // 2. Si falta, descontar de Stock Libre
                if ($remainder > 0) {
                    $freeInv = WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                        ->where('material_id', $material->id)
                        ->whereNull('project_id')
                        ->first();

                    if ($freeInv) {
                        $freeInv->quantity = max(0, (float) $freeInv->quantity - $remainder);
                        $freeInv->save();
                    }
                }
            }

            // Actualizar requisición si vino vinculada
            if (! empty($validated['material_request_id'])) {
                $req = MaterialRequest::find($validated['material_request_id']);
                if ($req) {
                    $req->update(['status' => 'despachada_total']);
                }
            }
        });

        return redirect()->back()->with('success', 'Guía de despacho generada y camión registrado en tránsito hacia la obra.');
    }

    /**
     * Recepción en sitio de obra por parte del Ingeniero Residente o Receptor.
     * Valida cantidades recibidas vs enviadas y actualiza el avance de materiales en la obra.
     */
    public function confirmReception(Request $request, Dispatch $dispatch): RedirectResponse
    {
        $validated = $request->validate([
            'receiver_name' => ['nullable', 'string', 'max:150'],
            'receiver_notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'exists:dispatch_items,id'],
            'items.*.quantity_received' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $dispatch) {
            $hasDiscrepancy = false;

            foreach ($validated['items'] as $itemData) {
                $item = DispatchItem::where('dispatch_id', $dispatch->id)->findOrFail($itemData['id']);
                $received = (float) $itemData['quantity_received'];
                $item->update(['quantity_received' => $received]);

                if ($received < (float) $item->quantity_sent) {
                    $hasDiscrepancy = true;
                }

                // Incrementar cantidad despachada/recibida en el cómputo métrico de la obra
                $projectMaterial = ProjectMaterial::where('project_id', $dispatch->project_id)
                    ->where('material_id', $item->material_id)
                    ->first();

                if ($projectMaterial) {
                    $projectMaterial->dispatched_quantity = (float) $projectMaterial->dispatched_quantity + $received;
                    $projectMaterial->save();
                }
            }

            $dispatch->update([
                'status' => $hasDiscrepancy ? 'con_discrepancia' : 'entregado',
                'received_by_user_id' => auth()->id() ?? 1,
                'reception_date' => now(),
                'receiver_name' => $validated['receiver_name'] ?? auth()->user()?->name ?? 'Ingeniero Residente',
                'receiver_notes' => $validated['receiver_notes'] ?? ($hasDiscrepancy ? 'Recibido con novedades/faltantes en campo.' : 'Recibido a total conformidad en obra.'),
            ]);
        });

        return redirect()->back()->with('success', 'Recepción en obra confirmada exitosamente.');
    }
}

