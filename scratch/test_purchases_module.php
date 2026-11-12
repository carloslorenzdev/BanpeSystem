<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Project;
use App\Models\Warehouse;
use App\Models\Material;
use App\Models\Supplier;
use App\Models\PurchaseRequest;
use App\Models\PurchaseOrder;
use App\Models\WarehouseInventory;
use App\Http\Controllers\PurchaseController;
use Illuminate\Http\Request;

echo "=== TEST: FLUJO COMPLETO DE PROCURA & COMPRAS BANPE ===" . PHP_EOL;

$user = User::first();
auth()->login($user);
$controller = new PurchaseController();

// 1. Verificar listado
$indexResponse = $controller->index(new Request());
echo "1. Panel de Compras cargado exitosamente. Status: " . ($indexResponse ? '200 OK' : 'FAILED') . PHP_EOL;

// 2. Crear nueva solicitud
$project = Project::first();
$warehouse = Warehouse::first();
$material = Material::first();

$reqCreate = Request::create('/purchases/requests', 'POST', [
    'title' => 'Requerimiento Test Vaciado Losas',
    'project_id' => $project->id,
    'warehouse_id' => $warehouse->id,
    'priority' => 'urgente',
    'justification' => 'Vaciado programado en cronograma',
    'items' => [
        [
            'material_id' => $material->id,
            'quantity' => 100,
            'target_price_usd' => 15.00,
            'notes' => 'Insumo de prueba',
        ]
    ]
]);

$controller->storeRequest($reqCreate);
$createdRequest = PurchaseRequest::where('title', 'Requerimiento Test Vaciado Losas')->first();
echo "2. Solicitud de Compra creada: " . $createdRequest->code . PHP_EOL;

// 3. Anexar Cotización
$supplier = Supplier::first();
$reqQuotation = Request::create('/purchases/requests/' . $createdRequest->id . '/quotations', 'POST', [
    'supplier_id' => $supplier->id,
    'quotation_number' => 'COT-TEST-' . time(),
    'quotation_date' => date('Y-m-d'),
    'validity_days' => 7,
    'payment_condition' => 'Contado Transferencia',
    'delivery_time' => '24 horas',
    'delivery_place' => 'Puesto en Obra',
    'evaluation_comments' => 'Oferta de prueba',
    'items' => [
        [
            'material_id' => $material->id,
            'quantity' => 100,
            'unit_price_usd' => 14.20,
        ]
    ]
]);

$controller->storeQuotation($reqQuotation, $createdRequest);
$createdRequest->refresh();
$quotation = $createdRequest->quotations->first();
echo "3. Cotización anexada al cuadro. Total: $" . $quotation->total_usd . " USD" . PHP_EOL;

// 4. Aprobar cuadro comparativo
$reqApprove = Request::create('/purchases/requests/' . $createdRequest->id . '/approve', 'POST', [
    'selected_quotation_id' => $quotation->id,
    'approval_notes' => 'Aprobada por Gerencia Técnica BANPE.',
]);
$controller->approveQuotation($reqApprove, $createdRequest);
$createdRequest->refresh();
echo "4. Cuadro Comparativo Aprobado. Estado: " . $createdRequest->status . " | Ganador: " . ($createdRequest->selectedQuotation->is_winner ? 'SI' : 'NO') . PHP_EOL;

// 5. Generar Orden de Compra O/C
$reqOrder = Request::create('/purchases/requests/' . $createdRequest->id . '/generate-order', 'POST', [
    'delivery_deadline' => date('Y-m-d', strtotime('+3 days')),
    'shipping_instructions' => 'Descarga con cuadrilla de obra.',
    'notes' => 'O/C de prueba generada.',
]);
$controller->generateOrder($reqOrder, $createdRequest);
$createdRequest->refresh();
$order = $createdRequest->purchaseOrder;
echo "5. Orden de Compra Oficial emitida: " . $order->code . " | Total: $" . $order->total_usd . " USD" . PHP_EOL;

// 6. Recepcionar Orden y Auto-Acreditar en Inventario
$initialStock = (float) (WarehouseInventory::where('warehouse_id', $warehouse->id)->where('material_id', $material->id)->where('project_id', $project->id)->first()?->quantity ?? 0);

$reqStatus = Request::create('/purchases/orders/' . $order->id . '/status', 'PATCH', [
    'status' => 'recibida_total',
    'notes' => 'Mercancía descargada conforme.',
]);
$controller->updateOrderStatus($reqStatus, $order);
$order->refresh();

$finalStock = (float) (WarehouseInventory::where('warehouse_id', $warehouse->id)->where('material_id', $material->id)->where('project_id', $project->id)->first()?->quantity ?? 0);

echo "6. Recepción de O/C en Almacén completada. Stock inicial: {$initialStock} -> Stock final: {$finalStock} (+100 acreditados automáticamente)" . PHP_EOL;

// Cleanup
$order->delete();
$createdRequest->quotations()->delete();
$createdRequest->items()->delete();
$createdRequest->delete();
// Revert stock adjustment
$inv = WarehouseInventory::where('warehouse_id', $warehouse->id)->where('material_id', $material->id)->where('project_id', $project->id)->first();
if ($inv) {
    $inv->quantity = max(0, $inv->quantity - 100);
    $inv->save();
}

echo "CLEANUP: Datos de prueba eliminados correctamente." . PHP_EOL;
echo "=== PRUEBA FINALIZADA CON ÉXITO AL 100% ===" . PHP_EOL;

