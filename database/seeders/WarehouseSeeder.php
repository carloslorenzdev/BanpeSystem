<?php

namespace Database\Seeders;

use App\Models\Dispatch;
use App\Models\DispatchItem;
use App\Models\Material;
use App\Models\MaterialRequest;
use App\Models\MaterialRequestItem;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $almacenista = User::where('email', 'almacen@banpe.com.ve')->first() ?? User::first();
        $residente = User::where('email', 'residente@banpe.com.ve')->first() ?? User::first();

        $projectSamanes = Project::where('code', 'OBR-2026-001')->first();
        $projectTinaquillo = Project::where('code', 'OBR-2026-002')->first();

        // 1. Almacenes Físicos
        $central = Warehouse::updateOrCreate(
            ['code' => 'ALM-CENTRAL'],
            [
                'name' => 'Almacén Central Valencia',
                'location' => 'Zona Industrial Carabobo, Valencia, Edo. Carabobo',
                'is_central' => true,
                'project_id' => null,
                'responsible_user_id' => $almacenista?->id,
                'is_active' => true,
            ]
        );

        $almSamanes = Warehouse::updateOrCreate(
            ['code' => 'ALM-SAMANES'],
            [
                'name' => 'Sub-Almacén Obra Samanes',
                'location' => 'Caracas, Municipio Baruta, Edo. Miranda',
                'is_central' => false,
                'project_id' => $projectSamanes?->id,
                'responsible_user_id' => $residente?->id,
                'is_active' => true,
            ]
        );

        $almTinaquillo = Warehouse::updateOrCreate(
            ['code' => 'ALM-TINAQUILLO'],
            [
                'name' => 'Sub-Almacén Galpón Tinaquillo',
                'location' => 'Tinaquillo, Estado Cojedes',
                'is_central' => false,
                'project_id' => $projectTinaquillo?->id,
                'responsible_user_id' => $residente?->id,
                'is_active' => true,
            ]
        );

        // 2. Cargar Inventario en Almacén Central (Stock Libre vs Stock Asignado a Obras)
        $cemento = Material::where('code', 'CEM-001')->first();
        $arena = Material::where('code', 'AGR-001')->first();
        $piedra = Material::where('code', 'AGR-002')->first();
        $cabilla12 = Material::where('code', 'CAB-001')->first();
        $bloque15 = Material::where('code', 'BLO-001')->first();

        if ($cemento) {
            // Stock Libre en Almacén Central
            WarehouseInventory::updateOrCreate(
                ['warehouse_id' => $central->id, 'material_id' => $cemento->id, 'project_id' => null],
                ['quantity' => 450, 'minimum_alert' => 100]
            );

            // Stock Asignado a Obra Samanes
            if ($projectSamanes) {
                WarehouseInventory::updateOrCreate(
                    ['warehouse_id' => $central->id, 'material_id' => $cemento->id, 'project_id' => $projectSamanes->id],
                    ['quantity' => 300, 'minimum_alert' => 50]
                );
            }

            // Stock Asignado a Obra Tinaquillo
            if ($projectTinaquillo) {
                WarehouseInventory::updateOrCreate(
                    ['warehouse_id' => $central->id, 'material_id' => $cemento->id, 'project_id' => $projectTinaquillo->id],
                    ['quantity' => 150, 'minimum_alert' => 30]
                );
            }
        }

        if ($arena) {
            // Stock Libre
            WarehouseInventory::updateOrCreate(
                ['warehouse_id' => $central->id, 'material_id' => $arena->id, 'project_id' => null],
                ['quantity' => 60, 'minimum_alert' => 15]
            );

            // Stock Asignado Samanes
            if ($projectSamanes) {
                WarehouseInventory::updateOrCreate(
                    ['warehouse_id' => $central->id, 'material_id' => $arena->id, 'project_id' => $projectSamanes->id],
                    ['quantity' => 40, 'minimum_alert' => 10]
                );
            }
        }

        if ($piedra) {
            WarehouseInventory::updateOrCreate(
                ['warehouse_id' => $central->id, 'material_id' => $piedra->id, 'project_id' => null],
                ['quantity' => 85, 'minimum_alert' => 20]
            );
        }

        if ($cabilla12) {
            WarehouseInventory::updateOrCreate(
                ['warehouse_id' => $central->id, 'material_id' => $cabilla12->id, 'project_id' => null],
                ['quantity' => 140, 'minimum_alert' => 50]
            );

            if ($projectSamanes) {
                WarehouseInventory::updateOrCreate(
                    ['warehouse_id' => $central->id, 'material_id' => $cabilla12->id, 'project_id' => $projectSamanes->id],
                    ['quantity' => 180, 'minimum_alert' => 40]
                );
            }
        }

        if ($bloque15) {
            WarehouseInventory::updateOrCreate(
                ['warehouse_id' => $central->id, 'material_id' => $bloque15->id, 'project_id' => null],
                ['quantity' => 4500, 'minimum_alert' => 1000]
            );
        }

        // 3. Requisiciones de Obra (BANPE-FO-05-0001)
        if ($projectSamanes) {
            $faseSamanes = $projectSamanes->phases()->first();

            $req1 = MaterialRequest::updateOrCreate(
                ['code' => 'REQ-2026-001'],
                [
                    'project_id' => $projectSamanes->id,
                    'project_phase_id' => $faseSamanes?->id,
                    'requester_user_id' => $residente?->id,
                    'request_date' => '2026-02-10',
                    'status' => 'despachada_total',
                    'priority' => 'urgente',
                    'notes' => 'Material requerido para vaciado de columnas y zapatas de fundación.',
                ]
            );

            if ($cemento) {
                MaterialRequestItem::updateOrCreate(
                    ['material_request_id' => $req1->id, 'material_id' => $cemento->id],
                    [
                        'requested_quantity' => 200,
                        'approved_quantity' => 200,
                        'dispatched_quantity' => 200,
                        'status' => 'despachado',
                        'notes' => 'Despachado en Guía DSP-2026-001',
                    ]
                );
            }

            if ($arena) {
                MaterialRequestItem::updateOrCreate(
                    ['material_request_id' => $req1->id, 'material_id' => $arena->id],
                    [
                        'requested_quantity' => 30,
                        'approved_quantity' => 30,
                        'dispatched_quantity' => 30,
                        'status' => 'despachado',
                        'notes' => 'Despachado en Guía DSP-2026-001',
                    ]
                );
            }

            // Requisición 3: Pendiente en almacén
            $req3 = MaterialRequest::updateOrCreate(
                ['code' => 'REQ-2026-003'],
                [
                    'project_id' => $projectSamanes->id,
                    'project_phase_id' => $faseSamanes?->id,
                    'requester_user_id' => $residente?->id,
                    'request_date' => '2026-03-01',
                    'status' => 'pendiente',
                    'priority' => 'normal',
                    'notes' => 'Acero para encofrado de vigas de carga nivel mezzanina.',
                ]
            );

            if ($cabilla12) {
                MaterialRequestItem::updateOrCreate(
                    ['material_request_id' => $req3->id, 'material_id' => $cabilla12->id],
                    [
                        'requested_quantity' => 80,
                        'approved_quantity' => 80,
                        'dispatched_quantity' => 0,
                        'status' => 'disponible_almacen',
                        'notes' => 'En inventario asignado a Los Samanes',
                    ]
                );
            }
        }

        if ($projectTinaquillo) {
            $req2 = MaterialRequest::updateOrCreate(
                ['code' => 'REQ-2026-002'],
                [
                    'project_id' => $projectTinaquillo->id,
                    'requester_user_id' => $residente?->id,
                    'request_date' => '2026-02-25',
                    'status' => 'enviada_a_compras',
                    'priority' => 'urgente',
                    'notes' => 'No hay suficiente cemento en stock para los pisos de alto impacto, solicitado cotizar a compras.',
                ]
            );

            if ($cemento) {
                MaterialRequestItem::updateOrCreate(
                    ['material_request_id' => $req2->id, 'material_id' => $cemento->id],
                    [
                        'requested_quantity' => 350,
                        'approved_quantity' => 350,
                        'dispatched_quantity' => 0,
                        'status' => 'por_comprar',
                        'notes' => 'Pasado a matriz comparativa de 3 presupuestos',
                    ]
                );
            }
        }

        // 4. Guías de Despacho de Camiones (BANPE-FO-12-0004)
        if ($projectSamanes && $cemento && $arena) {
            $disp1 = Dispatch::updateOrCreate(
                ['code' => 'DSP-2026-001'],
                [
                    'warehouse_id' => $central->id,
                    'project_id' => $projectSamanes->id,
                    'material_request_id' => $req1?->id,
                    'dispatcher_user_id' => $almacenista?->id,
                    'driver_name' => 'José Moreno',
                    'driver_id_document' => 'V-14.892.341',
                    'vehicle_plate' => 'A42BB9C',
                    'vehicle_model' => 'Camión Mack R600 / Volteo 12m³',
                    'departure_date' => '2026-02-12',
                    'status' => 'entregado',
                    'received_by_user_id' => $residente?->id,
                    'reception_date' => '2026-02-12 16:30:00',
                    'receiver_name' => 'Ing. Andrés Castillo',
                    'receiver_notes' => 'Recepción conforme en obra. Descargados los 200 sacos de cemento y 30 m³ de arena sin ninguna merma.',
                ]
            );

            DispatchItem::updateOrCreate(
                ['dispatch_id' => $disp1->id, 'material_id' => $cemento->id],
                [
                    'quantity_sent' => 200,
                    'quantity_received' => 200,
                    'unit_price_usd' => $cemento->estimated_price_usd,
                    'notes' => 'Lote de cemento Portland Tipo I',
                ]
            );

            DispatchItem::updateOrCreate(
                ['dispatch_id' => $disp1->id, 'material_id' => $arena->id],
                [
                    'quantity_sent' => 30,
                    'quantity_received' => 30,
                    'unit_price_usd' => $arena->estimated_price_usd,
                    'notes' => 'Viaje de arena lavada',
                ]
            );
        }

        if ($projectTinaquillo && $cemento && $cabilla12) {
            $disp2 = Dispatch::updateOrCreate(
                ['code' => 'DSP-2026-002'],
                [
                    'warehouse_id' => $central->id,
                    'project_id' => $projectTinaquillo->id,
                    'dispatcher_user_id' => $almacenista?->id,
                    'driver_name' => 'Manuel Colmenares',
                    'driver_id_document' => 'V-18.234.901',
                    'vehicle_plate' => '83A-XCK',
                    'vehicle_model' => 'Camión Ford F-750 Plataforma',
                    'departure_date' => '2026-03-03',
                    'status' => 'en_transito',
                    'received_by_user_id' => null,
                    'reception_date' => null,
                    'receiver_name' => null,
                    'receiver_notes' => null,
                ]
            );

            DispatchItem::updateOrCreate(
                ['dispatch_id' => $disp2->id, 'material_id' => $cemento->id],
                [
                    'quantity_sent' => 100,
                    'quantity_received' => null,
                    'unit_price_usd' => $cemento->estimated_price_usd,
                    'notes' => 'En despacho hacia Tinaquillo',
                ]
            );

            DispatchItem::updateOrCreate(
                ['dispatch_id' => $disp2->id, 'material_id' => $cabilla12->id],
                [
                    'quantity_sent' => 50,
                    'quantity_received' => null,
                    'unit_price_usd' => $cabilla12->estimated_price_usd,
                    'notes' => '50 barras para zapatas',
                ]
            );
        }
    }
}

