<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\MaterialRequest;
use App\Models\MaterialRequestItem;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MaterialRequestController extends Controller
{
    /**
     * Listado de Requisiciones de Materiales de Obra (BANPE-FO-05-0001).
     */
    public function index(Request $request): Response
    {
        $query = MaterialRequest::with([
            'project:id,code,name,location',
            'phase:id,name',
            'requester:id,name,phone,email',
            'items.material.unit',
            'dispatches:id,code,status',
        ]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
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

        $requests = $query->latest()->get();

        $all = MaterialRequest::all();
        $stats = [
            'total' => $all->count(),
            'pendientes' => $all->where('status', 'pendiente')->count(),
            'enviadas_a_compras' => $all->where('status', 'enviada_a_compras')->count(),
            'despachadas' => $all->where('status', 'despachada_total')->count(),
        ];

        $projects = Project::with('phases:id,project_id,name')
            ->whereIn('status', ['en_ejecucion', 'licitacion'])
            ->select('id', 'code', 'name')
            ->get();

        $materials = Material::with('unit')->where('is_active', true)->select('id', 'code', 'name', 'unit_id', 'estimated_price_usd')->get();

        return Inertia::render('requisitions/index', [
            'requests' => $requests,
            'stats' => $stats,
            'projects' => $projects,
            'materials' => $materials,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'todos',
                'project_id' => $request->project_id ?? 'todos',
            ],
        ]);
    }

    /**
     * Crear requisición desde obra o coordinación.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'project_phase_id' => ['nullable', 'exists:project_phases,id'],
            'priority' => ['required', 'string', 'in:baja,normal,urgente'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.material_id' => ['required', 'exists:materials,id'],
            'items.*.requested_quantity' => ['required', 'numeric', 'min:0.01'],
        ], [
            'project_id.required' => 'Debe seleccionar la obra solicitante.',
            'priority.required' => 'Indique la prioridad de la requisición.',
            'items.required' => 'Debe agregar al menos un insumo.',
            'items.min' => 'Debe agregar al menos un insumo.',
            'items.*.material_id.required' => 'Seleccione el material en cada renglón.',
            'items.*.requested_quantity.min' => 'La cantidad solicitada debe ser mayor a 0.',
        ]);

        DB::transaction(function () use ($validated) {
            $count = MaterialRequest::count() + 1;
            $code = 'REQ-'.date('Y').'-'.str_pad($count, 3, '0', STR_PAD_LEFT);

            $req = MaterialRequest::create([
                'code' => $code,
                'project_id' => $validated['project_id'],
                'project_phase_id' => $validated['project_phase_id'] ?? null,
                'requester_user_id' => auth()->id() ?? 1,
                'request_date' => now()->toDateString(),
                'status' => 'pendiente',
                'priority' => $validated['priority'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                MaterialRequestItem::create([
                    'material_request_id' => $req->id,
                    'material_id' => $item['material_id'],
                    'requested_quantity' => $item['requested_quantity'],
                    'approved_quantity' => $item['requested_quantity'],
                    'dispatched_quantity' => 0,
                    'status' => 'pendiente',
                ]);
            }
        });

        return redirect()->back()->with('success', 'Requisición de materiales enviada con éxito.');
    }

    /**
     * Pasar requisición a Procura / Compras (cuando no hay stock en almacén).
     */
    public function sendToPurchasing(MaterialRequest $materialRequest): RedirectResponse
    {
        $materialRequest->update(['status' => 'enviada_a_compras']);
        $materialRequest->items()->update(['status' => 'por_comprar']);

        // Crear automáticamente la Solicitud de Compra (PurchaseRequest) en Procura con sus renglones
        $count = \App\Models\PurchaseRequest::count() + 1;
        $prCode = 'SC-'.date('Y').'-'.str_pad($count, 3, '0', STR_PAD_LEFT);

        $purchaseRequest = \App\Models\PurchaseRequest::create([
            'code' => $prCode,
            'project_id' => $materialRequest->project_id,
            'requester_user_id' => $materialRequest->requester_user_id ?? auth()->id() ?? 1,
            'status' => 'pendiente_cotizaciones',
            'required_date' => now()->addDays(7)->toDateString(),
            'justification' => "Requisición {$materialRequest->code} canalizada desde Obra. " . ($materialRequest->notes ?? ''),
        ]);

        foreach ($materialRequest->items as $item) {
            \App\Models\PurchaseRequestItem::create([
                'purchase_request_id' => $purchaseRequest->id,
                'material_id' => $item->material_id,
                'quantity' => $item->requested_quantity,
                'target_price_usd' => $item->material?->estimated_price_usd ?? 0,
            ]);
        }

        return redirect()->back()->with('success', "Requisición {$materialRequest->code} canalizada a Procura. Se generó la Solicitud de Compra {$prCode} para cotización con 3 presupuestos.");
    }
}

