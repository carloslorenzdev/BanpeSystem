<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\Project;
use App\Models\StockTransfer;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WarehouseController extends Controller
{
    /**
     * Panel de Almacenes, Kardex de Inventarios (Stock Libre vs Stock Asignado).
     */
    public function index(Request $request): Response
    {
        $warehouseQuery = Warehouse::with(['responsibleUser:id,name,email', 'project:id,code,name,status'])
            ->where(function ($q) {
                $q->where('is_central', true)
                  ->orWhere(function ($sub) {
                      $sub->where('is_central', false)
                          ->whereNotNull('project_id')
                          ->whereHas('project', function ($pq) {
                              $pq->where('status', '!=', 'culminada');
                          });
                  });
            })
            ->where('is_active', true);
        $warehouses = $warehouseQuery->get();

        $selectedWarehouseId = $request->warehouse_id ?? $warehouses->firstWhere('is_central', true)?->id ?? $warehouses->first()?->id;

        $inventoryQuery = WarehouseInventory::with([
            'warehouse:id,name,code',
            'material.unit',
            'material.category',
            'project:id,code,name',
        ])
            ->where('warehouse_id', $selectedWarehouseId);

        if ($request->filled('search')) {
            $search = $request->search;
            $inventoryQuery->whereHas('material', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('stock_type')) {
            if ($request->stock_type === 'libre') {
                $inventoryQuery->whereNull('project_id');
            } elseif ($request->stock_type === 'asignado') {
                $inventoryQuery->whereNotNull('project_id');
            }
        }

        if ($request->filled('project_id') && $request->project_id !== 'todos') {
            $inventoryQuery->where('project_id', $request->project_id);
        }

        $inventories = $inventoryQuery->get();

        // Cálculo de KPIs
        $allInventories = WarehouseInventory::with('material')->where('warehouse_id', $selectedWarehouseId)->get();

        $freeStockValue = $allInventories->whereNull('project_id')->sum(function ($item) {
            return (float) $item->quantity * (float) ($item->material?->estimated_price_usd ?? 0);
        });

        $assignedStockValue = $allInventories->whereNotNull('project_id')->sum(function ($item) {
            return (float) $item->quantity * (float) ($item->material?->estimated_price_usd ?? 0);
        });

        $lowStockCount = $allInventories->filter(function ($item) {
            return (float) $item->quantity <= (float) $item->minimum_alert && (float) $item->minimum_alert > 0;
        })->count();

        $stats = [
            'total_items_count' => $allInventories->count(),
            'free_stock_value_usd' => round($freeStockValue, 2),
            'assigned_stock_value_usd' => round($assignedStockValue, 2),
            'total_stock_value_usd' => round($freeStockValue + $assignedStockValue, 2),
            'low_stock_alerts' => $lowStockCount,
        ];

        // Proyectos activos para filtros y reasignaciones
        $projects = Project::select('id', 'code', 'name')->whereIn('status', ['en_ejecucion', 'licitacion'])->get();

        // Materiales para carga
        $materials = Material::with('unit')->where('is_active', true)->orderBy('name')->get();

        // Historial de Traspasos
        $recentTransfers = StockTransfer::with([
            'material.unit',
            'fromProject:id,code,name',
            'toProject:id,code,name',
            'authorizedBy:id,name',
        ])
            ->where('warehouse_id', $selectedWarehouseId)
            ->latest()
            ->take(10)
            ->get();

        // Usuarios para asignación de responsables
        $users = User::with('role')->select('id', 'name', 'email', 'role_id')->where('is_active', true)->orderBy('name')->get();

        return Inertia::render('warehouse/index', [
            'warehouses' => $warehouses,
            'selectedWarehouseId' => (int) $selectedWarehouseId,
            'inventories' => $inventories,
            'stats' => $stats,
            'projects' => $projects,
            'materials' => $materials,
            'users' => $users,
            'recentTransfers' => $recentTransfers,
            'filters' => [
                'search' => $request->search ?? '',
                'stock_type' => $request->stock_type ?? 'todos',
                'project_id' => $request->project_id ?? 'todos',
            ],
        ]);
    }

    /**
     * Traspaso / Reasignación de Stock entre Obras o Stock Libre.
     * Soporta transferencias individuales y multi-insumo en una sola operación transaccional.
     */
    public function transferStock(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'from_project_id' => ['nullable', 'exists:projects,id'],
            'to_project_id' => ['nullable', 'exists:projects,id'],
            'reason' => ['nullable', 'string', 'max:500'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.material_id' => ['required_with:items', 'exists:materials,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'material_id' => ['nullable', 'exists:materials,id'],
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $fromProjectId = !empty($validated['from_project_id']) ? (int) $validated['from_project_id'] : null;
        $toProjectId = !empty($validated['to_project_id']) ? (int) $validated['to_project_id'] : null;

        if ($fromProjectId === $toProjectId) {
            return redirect()->back()->withErrors(['to_project_id' => 'El destino debe ser diferente al origen del insumo.']);
        }

        // Armar lista de insumos a traspasar (soporta tanto multi-item como single-item legacy)
        $itemsToTransfer = [];
        if (!empty($validated['items']) && is_array($validated['items'])) {
            $itemsToTransfer = $validated['items'];
        } elseif (!empty($validated['material_id']) && !empty($validated['quantity'])) {
            $itemsToTransfer[] = [
                'material_id' => $validated['material_id'],
                'quantity' => $validated['quantity'],
            ];
        }

        if (empty($itemsToTransfer)) {
            return redirect()->back()->withErrors(['items' => 'Debe agregar al menos un insumo con cantidad válida a traspasar.']);
        }

        try {
            DB::transaction(function () use ($validated, $fromProjectId, $toProjectId, $itemsToTransfer) {
                $baseCount = StockTransfer::count() + 1;
                $batchCode = 'TRF-'.date('Y').'-'.str_pad($baseCount, 3, '0', STR_PAD_LEFT);
                $userId = auth()->id() ?? 1;
                $reason = !empty($validated['reason']) ? trim($validated['reason']) : 'Reasignación operativa de insumos.';

                foreach ($itemsToTransfer as $index => $item) {
                    $materialId = (int) $item['material_id'];
                    $qty = (float) $item['quantity'];

                    if ($qty <= 0) {
                        continue;
                    }

                    // 1. Verificar stock origen suficiente con bloqueo pesimista
                    $sourceQuery = WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                        ->where('material_id', $materialId);

                    if ($fromProjectId === null) {
                        $sourceQuery->whereNull('project_id');
                    } else {
                        $sourceQuery->where('project_id', $fromProjectId);
                    }

                    $sourceInventory = $sourceQuery->lockForUpdate()->first();
                    $material = Material::find($materialId);
                    $matName = $material ? "[{$material->code}] {$material->name}" : "Insumo #{$materialId}";

                    if (! $sourceInventory || (float) $sourceInventory->quantity < $qty) {
                        $disponible = $sourceInventory ? (float) $sourceInventory->quantity : 0;
                        throw new \Exception("Stock insuficiente para {$matName}. Disponible en origen: {$disponible}, Solicitado: {$qty}");
                    }

                    // Descontar del origen
                    $sourceInventory->quantity = (float) $sourceInventory->quantity - $qty;
                    $sourceInventory->save();

                    // 2. Incrementar en destino
                    $targetQuery = WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
                        ->where('material_id', $materialId);

                    if ($toProjectId === null) {
                        $targetQuery->whereNull('project_id');
                    } else {
                        $targetQuery->where('project_id', $toProjectId);
                    }

                    $targetInventory = $targetQuery->lockForUpdate()->first();

                    if ($targetInventory) {
                        $targetInventory->quantity = (float) $targetInventory->quantity + $qty;
                        $targetInventory->save();
                    } else {
                        WarehouseInventory::create([
                            'warehouse_id' => $validated['warehouse_id'],
                            'material_id' => $materialId,
                            'project_id' => $toProjectId,
                            'quantity' => $qty,
                            'minimum_alert' => 0,
                        ]);
                    }

                    // 3. Registrar auditoría del traspaso
                    $itemCode = count($itemsToTransfer) > 1 ? "{$batchCode}-" . str_pad($index + 1, 2, '0', STR_PAD_LEFT) : $batchCode;
                    StockTransfer::create([
                        'code' => $itemCode,
                        'warehouse_id' => $validated['warehouse_id'],
                        'material_id' => $materialId,
                        'from_project_id' => $fromProjectId,
                        'to_project_id' => $toProjectId,
                        'quantity' => $qty,
                        'authorized_by_user_id' => $userId,
                        'reason' => $reason,
                    ]);
                }
            });
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => $e->getMessage()]);
        }

        $count = count($itemsToTransfer);
        return redirect()->back()->with('success', "Traspaso de {$count} insumo(s) procesado exitosamente.");
    }

    /**
     * Ajuste / Entrada directa de inventario.
     */
    public function updateStock(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'material_id' => ['required', 'exists:materials,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'minimum_alert' => ['nullable', 'numeric', 'min:0'],
        ]);

        $projectId = $validated['project_id'] ? (int) $validated['project_id'] : null;

        $inventory = WarehouseInventory::where('warehouse_id', $validated['warehouse_id'])
            ->where('material_id', $validated['material_id'])
            ->when($projectId === null, fn ($q) => $q->whereNull('project_id'))
            ->when($projectId !== null, fn ($q) => $q->where('project_id', $projectId))
            ->first();

        if ($inventory) {
            $inventory->update([
                'quantity' => $validated['quantity'],
                'minimum_alert' => $validated['minimum_alert'] ?? $inventory->minimum_alert,
            ]);
        } else {
            WarehouseInventory::create([
                'warehouse_id' => $validated['warehouse_id'],
                'material_id' => $validated['material_id'],
                'project_id' => $projectId,
                'quantity' => $validated['quantity'],
                'minimum_alert' => $validated['minimum_alert'] ?? 0,
            ]);
        }

        return redirect()->back()->with('success', 'Existencia de inventario actualizada.');
    }

    /**
     * Registrar un nuevo Almacén (Sede Central o Sub-Almacén de Obra).
     */
    public function storeWarehouse(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'is_central' => ['required', 'boolean'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'responsible_user_id' => ['nullable', 'exists:users,id'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'code.unique' => 'El código de almacén ya está en uso.',
            'name.required' => 'El nombre del almacén es obligatorio.',
            'location.required' => 'La ubicación del almacén es obligatoria.',
        ]);

        $isCentral = (bool) $validated['is_central'];

        $warehouse = Warehouse::create([
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'location' => trim($validated['location']),
            'is_central' => $isCentral,
            'project_id' => $isCentral ? null : ($validated['project_id'] ?? null),
            'responsible_user_id' => $validated['responsible_user_id'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('warehouse.index', ['warehouse_id' => $warehouse->id])
            ->with('success', "Almacén '{$warehouse->name}' registrado con éxito.");
    }

    /**
     * Actualizar parámetros de un Almacén existente.
     */
    public function updateWarehouse(Request $request, Warehouse $warehouse): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('warehouses')->ignore($warehouse->id)],
            'name' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'is_central' => ['required', 'boolean'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'responsible_user_id' => ['nullable', 'exists:users,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $isCentral = (bool) $validated['is_central'];

        $warehouse->update([
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'location' => trim($validated['location']),
            'is_central' => $isCentral,
            'project_id' => $isCentral ? null : ($validated['project_id'] ?? null),
            'responsible_user_id' => $validated['responsible_user_id'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', "Almacén '{$warehouse->name}' actualizado correctamente.");
    }

    /**
     * Eliminar un almacén (principal o sub-almacén).
     */
    public function destroyWarehouse(Warehouse $warehouse): RedirectResponse
    {
        // Verificar que no sea el único almacén en todo el sistema
        if (Warehouse::count() <= 1) {
            return redirect()->back()->withErrors([
                'general' => 'No es posible eliminar el único almacén registrado en el sistema. Debe existir al menos un almacén activo en BANPE.',
            ]);
        }

        $warehouseName = $warehouse->name;
        $wasCentral = (bool) $warehouse->is_central;

        DB::transaction(function () use ($warehouse, $wasCentral) {
            // 1. Eliminar inventarios asociados
            WarehouseInventory::where('warehouse_id', $warehouse->id)->delete();

            // 2. Eliminar traspasos de stock donde participe este almacén
            StockTransfer::where('warehouse_id', $warehouse->id)->delete();

            // 3. Eliminar despachos vinculados a este almacén
            $dispatches = \App\Models\Dispatch::where('warehouse_id', $warehouse->id)->get();
            foreach ($dispatches as $dispatch) {
                $dispatch->items()->delete();
                $dispatch->delete();
            }

            // 4. Desvincular órdenes de compra o solicitudes que apunten a este almacén
            \App\Models\PurchaseRequest::where('warehouse_id', $warehouse->id)->update(['warehouse_id' => null]);
            \App\Models\PurchaseOrder::where('warehouse_id', $warehouse->id)->update(['warehouse_id' => null]);

            // 5. Eliminar el almacén
            $warehouse->delete();

            // 6. Si el almacén eliminado era sede central y no queda ningún otro central, promover el primero restante como central
            if ($wasCentral && !Warehouse::where('is_central', true)->exists()) {
                Warehouse::first()?->update(['is_central' => true]);
            }
        });

        // Redireccionar al primer almacén disponible
        $nextWarehouse = Warehouse::first();

        return redirect()->route('warehouse.index', ['warehouse_id' => $nextWarehouse?->id])
            ->with('success', "Almacén '{$warehouseName}' eliminado exitosamente.");
    }
}

