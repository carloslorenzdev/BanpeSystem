<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use App\Models\SupplierQuotationItem;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    /**
     * Panel Principal de Procura, Cuadros Comparativos de 3 Presupuestos y Órdenes de Compra.
     */
    public function index(Request $request): Response
    {
        $activeTab = $request->query('tab', 'comparativos'); // comparativos, ordenes, proveedores

        // 1. Solicitudes y Cuadros Comparativos
        $requestsQuery = PurchaseRequest::with([
            'project:id,code,name',
            'warehouse:id,code,name,is_central',
            'requestedBy:id,name,email',
            'approvedBy:id,name,email',
            'items.material.unit',
            'quotations.supplier',
            'quotations.items.material.unit',
            'selectedQuotation.supplier',
            'purchaseOrder:id,code,status,purchase_request_id,total_usd',
        ])->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $requestsQuery->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhereHas('project', fn ($pq) => $pq->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status') && $request->status !== 'todos') {
            $requestsQuery->where('status', $request->status);
        }

        $purchaseRequests = $requestsQuery->get();

        // 2. Órdenes de Compra (O/C)
        $ordersQuery = PurchaseOrder::with([
            'supplier:id,rif,business_name,phone',
            'project:id,code,name',
            'warehouse:id,code,name',
            'issuedBy:id,name',
            'approvedBy:id,name',
            'purchaseRequest.items.material.unit',
            'quotation.items.material.unit',
        ])->latest();

        $purchaseOrders = $ordersQuery->get();

        // 3. Directorio de Proveedores
        $suppliers = Supplier::withCount('quotations', 'purchaseOrders')
            ->orderBy('business_name')
            ->get();

        // Catálogos para formularios
        $materials = Material::with('unit')->where('is_active', true)->orderBy('name')->get();
        $projects = Project::select('id', 'code', 'name')->whereIn('status', ['en_ejecucion', 'licitacion'])->get();
        $warehouses = Warehouse::select('id', 'code', 'name', 'is_central')->where('is_active', true)->get();

        // Métricas KPIs Procura
        $totalPurchasesUsd = (float) PurchaseOrder::whereIn('status', ['emitida', 'en_transito', 'recibida_total'])->sum('total_usd');
        $pendingComparativesCount = PurchaseRequest::where('status', 'evaluacion_comparativa')->count();
        $ordersInTransitCount = PurchaseOrder::where('status', 'en_transito')->count();
        $activeSuppliersCount = $suppliers->where('is_active', true)->count();

        $stats = [
            'total_purchases_usd' => round($totalPurchasesUsd, 2),
            'pending_comparatives_count' => $pendingComparativesCount,
            'orders_in_transit_count' => $ordersInTransitCount,
            'active_suppliers_count' => $activeSuppliersCount,
        ];

        return Inertia::render('purchases/index', [
            'activeTab' => $activeTab,
            'purchaseRequests' => $purchaseRequests,
            'purchaseOrders' => $purchaseOrders,
            'suppliers' => $suppliers,
            'materials' => $materials,
            'projects' => $projects,
            'warehouses' => $warehouses,
            'stats' => $stats,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'todos',
            ],
        ]);
    }

    /**
     * Crear una nueva Solicitud de Compra para iniciar cotizaciones.
     */
    public function storeRequest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'priority' => ['required', 'string', Rule::in(['baja', 'normal', 'urgente'])],
            'justification' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.material_id' => ['required', 'exists:materials,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.target_price_usd' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ], [
            'title.required' => 'El título o descripción del requerimiento es obligatorio.',
            'items.min' => 'Debes incluir al menos un insumo en la solicitud de compra.',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $year = date('Y');
            $count = PurchaseRequest::whereYear('created_at', $year)->count() + 1;
            $code = 'CMP-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $purchaseRequest = PurchaseRequest::create([
                'code' => $code,
                'title' => $validated['title'],
                'project_id' => $validated['project_id'] ?: null,
                'warehouse_id' => $validated['warehouse_id'] ?: null,
                'requested_by_user_id' => auth()->id() ?? 1,
                'priority' => $validated['priority'],
                'status' => 'evaluacion_comparativa',
                'justification' => $validated['justification'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseRequestItem::create([
                    'purchase_request_id' => $purchaseRequest->id,
                    'material_id' => $item['material_id'],
                    'quantity' => $item['quantity'],
                    'target_price_usd' => $item['target_price_usd'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }
        });

        return redirect()->route('purchases.index', ['tab' => 'comparativos'])
            ->with('success', 'Solicitud de compra registrada. Ya puedes ingresar las 3 cotizaciones para el cuadro comparativo.');
    }

    /**
     * Registrar una cotización de proveedor en el cuadro comparativo.
     */
    public function storeQuotation(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'quotation_number' => ['required', 'string', 'max:100'],
            'quotation_date' => ['required', 'date'],
            'validity_days' => ['required', 'integer', 'min:1'],
            'payment_condition' => ['required', 'string', 'max:255'],
            'delivery_time' => ['required', 'string', 'max:255'],
            'delivery_place' => ['required', 'string', 'max:255'],
            'evaluation_comments' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.material_id' => ['required', 'exists:materials,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price_usd' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $purchaseRequest) {
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += ((float) $item['quantity'] * (float) $item['unit_price_usd']);
            }

            $quotation = SupplierQuotation::create([
                'purchase_request_id' => $purchaseRequest->id,
                'supplier_id' => $validated['supplier_id'],
                'quotation_number' => $validated['quotation_number'],
                'quotation_date' => $validated['quotation_date'],
                'validity_days' => $validated['validity_days'],
                'payment_condition' => $validated['payment_condition'],
                'delivery_time' => $validated['delivery_time'],
                'delivery_place' => $validated['delivery_place'],
                'subtotal_usd' => $subtotal,
                'tax_usd' => 0,
                'total_usd' => $subtotal,
                'evaluation_comments' => $validated['evaluation_comments'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                SupplierQuotationItem::create([
                    'supplier_quotation_id' => $quotation->id,
                    'material_id' => $item['material_id'],
                    'quantity' => $item['quantity'],
                    'unit_price_usd' => $item['unit_price_usd'],
                    'total_price_usd' => (float) $item['quantity'] * (float) $item['unit_price_usd'],
                ]);
            }
        });

        return redirect()->back()->with('success', 'Cotización anexada exitosamente al cuadro comparativo.');
    }

    /**
     * Evaluación y Aprobación Gerencial de la Cotización Ganadora.
     */
    public function approveQuotation(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        $validated = $request->validate([
            'selected_quotation_id' => ['required', 'exists:supplier_quotations,id'],
            'approval_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $purchaseRequest) {
            // Desmarcar otras cotizaciones
            $purchaseRequest->quotations()->update(['is_winner' => false]);

            // Marcar cotización ganadora
            $winningQuotation = SupplierQuotation::where('id', $validated['selected_quotation_id'])
                ->where('purchase_request_id', $purchaseRequest->id)
                ->firstOrFail();

            $winningQuotation->update(['is_winner' => true]);

            $purchaseRequest->update([
                'status' => 'aprobada',
                'selected_quotation_id' => $winningQuotation->id,
                'approved_by_user_id' => auth()->id() ?? 1,
                'approval_notes' => $validated['approval_notes'] ?? 'Aprobado según cuadro comparativo por Gerencia.',
                'approved_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', 'Cuadro comparativo aprobado por Gerencia. Procede a generar la Orden de Compra oficial.');
    }

    /**
     * Emitir la Orden de Compra Oficial (O/C BANPE-OC-YYYY-XXXX).
     */
    public function generateOrder(Request $request, PurchaseRequest $purchaseRequest): RedirectResponse
    {
        if ($purchaseRequest->status !== 'aprobada' || ! $purchaseRequest->selected_quotation_id) {
            return redirect()->back()->withErrors(['error' => 'La solicitud debe estar formalmente aprobada con una cotización seleccionada.']);
        }

        $validated = $request->validate([
            'delivery_deadline' => ['nullable', 'date'],
            'shipping_instructions' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $quotation = $purchaseRequest->selectedQuotation;

        DB::transaction(function () use ($validated, $purchaseRequest, $quotation) {
            $year = date('Y');
            $count = PurchaseOrder::whereYear('created_at', $year)->count() + 1;
            $code = 'BANPE-OC-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            PurchaseOrder::create([
                'code' => $code,
                'purchase_request_id' => $purchaseRequest->id,
                'supplier_id' => $quotation->supplier_id,
                'supplier_quotation_id' => $quotation->id,
                'project_id' => $purchaseRequest->project_id,
                'warehouse_id' => $purchaseRequest->warehouse_id,
                'issued_by_user_id' => auth()->id() ?? 1,
                'approved_by_user_id' => $purchaseRequest->approved_by_user_id ?? auth()->id() ?? 1,
                'issue_date' => now(),
                'delivery_deadline' => $validated['delivery_deadline'] ?? now()->addDays(5),
                'subtotal_usd' => $quotation->subtotal_usd,
                'tax_usd' => $quotation->tax_usd,
                'total_usd' => $quotation->total_usd,
                'payment_terms' => $quotation->payment_condition,
                'status' => 'emitida',
                'shipping_instructions' => $validated['shipping_instructions'] ?? "Lugar de entrega: {$quotation->delivery_place}",
                'notes' => $validated['notes'] ?? "Generada en base a cotización {$quotation->quotation_number}.",
            ]);

            $purchaseRequest->update(['status' => 'orden_generada']);
        });

        return redirect()->route('purchases.index', ['tab' => 'ordenes'])
            ->with('success', 'Orden de Compra emitida oficialmente. Ya se encuentra registrada para seguimiento logístico.');
    }

    /**
     * Actualizar estado logístico de la Orden de Compra y recepcionar en almacén si culmina.
     */
    public function updateOrderStatus(Request $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['emitida', 'en_transito', 'recibida_total', 'anulada'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated, $purchaseOrder) {
            $previousStatus = $purchaseOrder->status;
            $purchaseOrder->update([
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? $purchaseOrder->notes,
            ]);

            // Si se marca como recibida y no estaba recibida antes: ingresar stock en almacén
            if ($validated['status'] === 'recibida_total' && $previousStatus !== 'recibida_total' && $purchaseOrder->warehouse_id) {
                $quotationItems = $purchaseOrder->quotation->items;

                foreach ($quotationItems as $qItem) {
                    $inv = WarehouseInventory::where('warehouse_id', $purchaseOrder->warehouse_id)
                        ->where('material_id', $qItem->material_id)
                        ->where('project_id', $purchaseOrder->project_id) // Si es para obra, queda reservado; si es general, queda stock libre
                        ->first();

                    if ($inv) {
                        $inv->quantity = (float) $inv->quantity + (float) $qItem->quantity;
                        $inv->save();
                    } else {
                        WarehouseInventory::create([
                            'warehouse_id' => $purchaseOrder->warehouse_id,
                            'material_id' => $qItem->material_id,
                            'project_id' => $purchaseOrder->project_id,
                            'quantity' => $qItem->quantity,
                            'minimum_alert' => 10,
                        ]);
                    }
                }
            }
        });

        return redirect()->back()->with('success', 'Estado de la Orden de Compra actualizado exitosamente.');
    }

    /**
     * Registrar un nuevo Proveedor.
     */
    public function storeSupplier(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'rif' => ['required', 'string', 'max:50', 'unique:suppliers,rif'],
            'business_name' => ['required', 'string', 'max:255'],
            'commercial_name' => ['nullable', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'payment_terms' => ['required', 'string', 'max:100'],
            'bank_details' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        Supplier::create([
            'rif' => strtoupper(trim($validated['rif'])),
            'business_name' => trim($validated['business_name']),
            'commercial_name' => $validated['commercial_name'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'phone' => trim($validated['phone']),
            'email' => $validated['email'] ?? null,
            'city' => trim($validated['city']),
            'address' => $validated['address'] ?? null,
            'specialty' => $validated['specialty'] ?? null,
            'payment_terms' => $validated['payment_terms'],
            'bank_details' => $validated['bank_details'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('purchases.index', ['tab' => 'proveedores'])
            ->with('success', 'Proveedor registrado satisfactoriamente en el directorio de compras.');
    }

    /**
     * Actualizar datos de un Proveedor existente.
     */
    public function updateSupplier(Request $request, Supplier $supplier): RedirectResponse
    {
        $validated = $request->validate([
            'rif' => ['required', 'string', 'max:50', Rule::unique('suppliers')->ignore($supplier->id)],
            'business_name' => ['required', 'string', 'max:255'],
            'commercial_name' => ['nullable', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'payment_terms' => ['required', 'string', 'max:100'],
            'bank_details' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $supplier->update([
            'rif' => strtoupper(trim($validated['rif'])),
            'business_name' => trim($validated['business_name']),
            'commercial_name' => $validated['commercial_name'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'phone' => trim($validated['phone']),
            'email' => $validated['email'] ?? null,
            'city' => trim($validated['city']),
            'address' => $validated['address'] ?? null,
            'specialty' => $validated['specialty'] ?? null,
            'payment_terms' => $validated['payment_terms'],
            'bank_details' => $validated['bank_details'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Ficha del proveedor actualizada correctamente.');
    }
}

