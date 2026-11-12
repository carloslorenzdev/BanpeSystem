<?php

use App\Http\Controllers\Admin\MaterialController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\DemoRoleController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\ExchangeRateController;
use App\Http\Controllers\MaterialRequestController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ValuationController;
use App\Http\Controllers\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::post('demo/switch-role', [DemoRoleController::class, 'switchRole'])->name('demo.switch-role');

    // Gestión Integral de Obras y Proyectos (Maprex, Cronograma de Fases y Cierre)
    Route::post('projects/import-new-maprex', [ProjectController::class, 'importNewProjectMaprex'])->name('projects.import-new-maprex');
    Route::resource('projects', ProjectController::class);
    Route::post('projects/{project}/materials', [ProjectController::class, 'addMaterial'])->name('projects.materials.store');
    Route::put('projects/{project}/materials/{projectMaterial}', [ProjectController::class, 'updateMaterial'])->name('projects.materials.update');
    Route::delete('projects/{project}/materials/{projectMaterial}', [ProjectController::class, 'removeMaterial'])->name('projects.materials.destroy');

    Route::post('projects/{project}/phases', [ProjectController::class, 'addPhase'])->name('projects.phases.store');
    Route::put('projects/{project}/phases/{phase}', [ProjectController::class, 'updatePhase'])->name('projects.phases.update');
    Route::post('projects/{project}/phases/{phase}/complete', [ProjectController::class, 'completePhase'])->name('projects.phases.complete');
    Route::delete('projects/{project}/phases/{phase}', [ProjectController::class, 'deletePhase'])->name('projects.phases.destroy');

    Route::patch('projects/{project}/status', [ProjectController::class, 'updateStatus'])->name('projects.status');
    Route::post('projects/{project}/close', [ProjectController::class, 'closeProject'])->name('projects.close');
    Route::post('projects/{project}/import-maprex', [ProjectController::class, 'importMaprex'])->name('projects.import-maprex');
    Route::get('templates/maprex-example', [ProjectController::class, 'downloadMaprexTemplate'])->name('templates.maprex-example');

    // Valuación de Cierre y Liquidación de Obras (BANPE-DFO-04-a)
    Route::get('valuations', [ValuationController::class, 'index'])->name('valuations.index');
    Route::post('valuations/{project}/internal', [ValuationController::class, 'approveInternal'])->name('valuations.internal');
    Route::post('valuations/{project}/external', [ValuationController::class, 'approveExternal'])->name('valuations.external');
    Route::post('valuations/{project}/close', [ValuationController::class, 'closeWithActa'])->name('valuations.close');

    // Almacén e Inventarios Multi-Sitio (Stock Libre vs Stock Asignado y Traspasos)
    Route::get('warehouse', [WarehouseController::class, 'index'])->name('warehouse.index');
    Route::post('warehouse/transfer', [WarehouseController::class, 'transferStock'])->name('warehouse.transfer');
    Route::post('warehouse/stock', [WarehouseController::class, 'updateStock'])->name('warehouse.stock');
    Route::post('warehouse/warehouses', [WarehouseController::class, 'storeWarehouse'])->name('warehouse.warehouses.store');
    Route::put('warehouse/warehouses/{warehouse}', [WarehouseController::class, 'updateWarehouse'])->name('warehouse.warehouses.update');
    Route::delete('warehouse/warehouses/{warehouse}', [WarehouseController::class, 'destroyWarehouse'])->name('warehouse.warehouses.destroy');

    // Despachos de Camiones a Obra & Recepción en Sitio (BANPE-FO-12-0004)
    Route::get('dispatches', [DispatchController::class, 'index'])->name('dispatches.index');
    Route::post('dispatches', [DispatchController::class, 'store'])->name('dispatches.store');
    Route::post('dispatches/{dispatch}/reception', [DispatchController::class, 'confirmReception'])->name('dispatches.reception');

    // Requisiciones de Materiales de Obra (BANPE-FO-05-0001)
    Route::get('requisitions', [MaterialRequestController::class, 'index'])->name('requisitions.index');
    Route::post('requisitions', [MaterialRequestController::class, 'store'])->name('requisitions.store');
    Route::post('requisitions/{materialRequest}/send-to-purchasing', [MaterialRequestController::class, 'sendToPurchasing'])->name('requisitions.sendToPurchasing');

    // Procura, Cuadro Comparativo de 3 Presupuestos y Órdenes de Compra
    Route::get('purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::post('purchases/requests', [PurchaseController::class, 'storeRequest'])->name('purchases.requests.store');
    Route::post('purchases/requests/{purchaseRequest}/quotations', [PurchaseController::class, 'storeQuotation'])->name('purchases.quotations.store');
    Route::post('purchases/requests/{purchaseRequest}/approve', [PurchaseController::class, 'approveQuotation'])->name('purchases.approve');
    Route::post('purchases/requests/{purchaseRequest}/generate-order', [PurchaseController::class, 'generateOrder'])->name('purchases.orders.generate');
    Route::patch('purchases/orders/{purchaseOrder}/status', [PurchaseController::class, 'updateOrderStatus'])->name('purchases.orders.status');
    Route::post('purchases/suppliers', [PurchaseController::class, 'storeSupplier'])->name('purchases.suppliers.store');
    Route::put('purchases/suppliers/{supplier}', [PurchaseController::class, 'updateSupplier'])->name('purchases.suppliers.update');

    // Tasa de Cambio en Tiempo Real BCV (DolarApi y Ajuste Manual)
    Route::get('exchange-rate', [ExchangeRateController::class, 'show'])->name('exchange-rate.show');
    Route::post('exchange-rate/refresh', [ExchangeRateController::class, 'refresh'])->name('exchange-rate.refresh');
    Route::post('exchange-rate/manual', [ExchangeRateController::class, 'setManual'])->name('exchange-rate.manual');
    Route::delete('exchange-rate/manual', [ExchangeRateController::class, 'clearManual'])->name('exchange-rate.clear-manual');

    // Módulos del Administrador
    Route::prefix('admin')->name('admin.')->group(function () {
        // Usuarios y Roles (RBAC)
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('users/{user}/toggle', [UserController::class, 'toggleStatus'])->name('users.toggle');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        // Catálogo de Insumos y Materiales
        Route::get('materials', [MaterialController::class, 'index'])->name('materials.index');
        Route::post('materials', [MaterialController::class, 'store'])->name('materials.store');
        Route::post('materials/import-maprex', [MaterialController::class, 'importMaprex'])->name('materials.import-maprex');
        Route::get('materials/template-maprex', [MaterialController::class, 'downloadTemplate'])->name('materials.template-maprex');
        Route::put('materials/{material}', [MaterialController::class, 'update'])->name('materials.update');
        Route::delete('materials/{material}', [MaterialController::class, 'destroy'])->name('materials.destroy');
    });
});

require __DIR__.'/settings.php';
