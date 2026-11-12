<?php

namespace Database\Seeders;

use App\Models\Material;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use App\Models\SupplierQuotationItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class ProcurementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Proveedores Homologados
        $sidetur = Supplier::firstOrCreate(['rif' => 'J-00045214-8'], [
            'business_name' => 'Corporación de Acero Sidetur C.A.',
            'commercial_name' => 'Sidetur Planta Barquisimeto / Valencia',
            'contact_person' => 'Lic. Carlos Mendoza (Ventas Industriales)',
            'phone' => '+58 241-8714022',
            'email' => 'ventas.industriales@sidetur.com.ve',
            'address' => 'Zona Industrial Carabobo, 2da Transversal',
            'city' => 'Valencia',
            'specialty' => 'Aceros, Cabillas, Mallas Electrosoldadas',
            'payment_terms' => 'Contado / Transferencia USD',
            'bank_details' => 'Banesco Panamá / Banesco USD Nacional',
            'is_active' => true,
        ]);

        $hierroCarabobo = Supplier::firstOrCreate(['rif' => 'J-31298450-4'], [
            'business_name' => 'Distribuidora Hierro & Metales Carabobo C.A.',
            'commercial_name' => 'Hierro Carabobo',
            'contact_person' => 'Ing. Rafael Castillo',
            'phone' => '+58 241-8321900',
            'email' => 'rcastillo@hierrocarabobo.com',
            'address' => 'Av. Michelena c/c Este-Oeste 3, Valencia',
            'city' => 'Valencia',
            'specialty' => 'Perfiles Estructurales, Tubulares, Cabillas',
            'payment_terms' => 'Crédito 15 días',
            'bank_details' => 'Banco Mercantil Cta Cte',
            'is_active' => true,
        ]);

        $ferreGuacara = Supplier::firstOrCreate(['rif' => 'J-40552198-7'], [
            'business_name' => 'Ferre-Industrial del Centro Guacara C.A.',
            'commercial_name' => 'Ferre-Centro',
            'contact_person' => 'Sra. Elena Duarte',
            'phone' => '+58 245-5642100',
            'email' => 'cotizaciones@ferrecentro.com.ve',
            'address' => 'Carretera Nacional Guacara-San Joaquín, Km 3',
            'city' => 'Guacara',
            'specialty' => 'Materiales de Construcción Pesada y Ferretería',
            'payment_terms' => '50% Anticipo, 50% contra entrega',
            'bank_details' => 'BBVA Provincial',
            'is_active' => true,
        ]);

        $cementos = Supplier::firstOrCreate(['rif' => 'J-30012458-2'], [
            'business_name' => 'Corporación Socialista del Cemento C.A.',
            'commercial_name' => 'Cementos Vencemos / Pertigalete',
            'contact_person' => 'Abg. Marcos Vielma',
            'phone' => '+58 212-9051111',
            'email' => 'despachos.cemento@vencemos.com.ve',
            'address' => 'Edif. Vencemos, Av. Francisco de Miranda, Caracas',
            'city' => 'Caracas',
            'specialty' => 'Cemento Portland Tipo I, Granel y Ensacado',
            'payment_terms' => 'Contado Anticipado',
            'bank_details' => 'Banco de Venezuela',
            'is_active' => true,
        ]);

        $pavco = Supplier::firstOrCreate(['rif' => 'J-00019842-1'], [
            'business_name' => 'Pavco Wavin de Venezuela C.A.',
            'commercial_name' => 'Pavco Tuberías',
            'contact_person' => 'Ing. Vanessa Romero',
            'phone' => '+58 241-8748000',
            'email' => 'atencion.obras@pavco.com.ve',
            'address' => 'Av. Anton Philips, Urb. La Florida, Valencia',
            'city' => 'Valencia',
            'specialty' => 'Tuberías PVC Presión, Sanitaria, Válvulas y Ductos',
            'payment_terms' => 'Crédito 30 días',
            'bank_details' => 'Banesco Banco Universal',
            'is_active' => true,
        ]);

        $project = Project::first();
        $warehouse = Warehouse::first();
        $adminUser = User::first();
        $engineerUser = User::where('id', '!=', $adminUser->id)->first() ?? $adminUser;

        $cabilla12 = Material::where('code', 'CAB-001')->first() ?? Material::first();
        $cabilla38 = Material::where('code', 'CAB-002')->first() ?? Material::first();
        $cemento = Material::where('code', 'CEM-001')->first() ?? Material::first();

        // 2. Solicitud 1: En Evaluación Comparativa (Cuadro de 3 presupuestos para aprobación de Gerencia)
        $req1 = PurchaseRequest::firstOrCreate(['code' => 'CMP-2026-0001'], [
            'title' => 'Adquisición de Acero Estriado para Fundaciones de Zapatas',
            'project_id' => $project?->id,
            'warehouse_id' => $warehouse?->id,
            'requested_by_user_id' => $engineerUser->id,
            'priority' => 'urgente',
            'status' => 'evaluacion_comparativa',
            'justification' => 'Material indispensable según cronograma de obra para armadura de zapatas y pedestales.',
        ]);

        // Ítems de la solicitud 1
        PurchaseRequestItem::firstOrCreate([
            'purchase_request_id' => $req1->id,
            'material_id' => $cabilla12->id,
        ], [
            'quantity' => 300,
            'target_price_usd' => 14.50,
            'notes' => 'Cabilla 1/2 pulgada x 12 metros estriada NTC 2289',
        ]);

        PurchaseRequestItem::firstOrCreate([
            'purchase_request_id' => $req1->id,
            'material_id' => $cabilla38->id,
        ], [
            'quantity' => 200,
            'target_price_usd' => 8.80,
            'notes' => 'Cabilla 3/8 pulgada x 12 metros estriada',
        ]);

        // COTIZACIÓN 1: Sidetur C.A.
        $cot1 = SupplierQuotation::firstOrCreate([
            'purchase_request_id' => $req1->id,
            'supplier_id' => $sidetur->id,
        ], [
            'quotation_number' => 'COT-SID-2026-9041',
            'quotation_date' => now()->subDays(2),
            'validity_days' => 5,
            'payment_condition' => 'Contado Transferencia USD',
            'delivery_time' => '48 horas hábiles',
            'delivery_place' => 'Puesto en Obra (Flete incluido)',
            'subtotal_usd' => 5820.00,
            'tax_usd' => 0.00,
            'total_usd' => 5820.00,
            'is_winner' => false,
            'evaluation_comments' => 'Mejor precio por tonelada con flete directo a pie de obra.',
        ]);

        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot1->id, 'material_id' => $cabilla12->id], [
            'quantity' => 300,
            'unit_price_usd' => 13.80,
            'total_price_usd' => 4140.00,
        ]);
        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot1->id, 'material_id' => $cabilla38->id], [
            'quantity' => 200,
            'unit_price_usd' => 8.40,
            'total_price_usd' => 1680.00,
        ]);

        // COTIZACIÓN 2: Hierro Carabobo
        $cot2 = SupplierQuotation::firstOrCreate([
            'purchase_request_id' => $req1->id,
            'supplier_id' => $hierroCarabobo->id,
        ], [
            'quotation_number' => 'COT-HC-8812',
            'quotation_date' => now()->subDays(3),
            'validity_days' => 7,
            'payment_condition' => 'Crédito a 15 días continuos',
            'delivery_time' => '24 horas',
            'delivery_place' => 'Puesto en Obra',
            'subtotal_usd' => 6180.00,
            'tax_usd' => 0.00,
            'total_usd' => 6180.00,
            'is_winner' => false,
            'evaluation_comments' => 'Ofrece financiamiento a 15 días, pero precio ligeramente mayor en la barra de 1/2.',
        ]);

        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot2->id, 'material_id' => $cabilla12->id], [
            'quantity' => 300,
            'unit_price_usd' => 14.60,
            'total_price_usd' => 4380.00,
        ]);
        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot2->id, 'material_id' => $cabilla38->id], [
            'quantity' => 200,
            'unit_price_usd' => 9.00,
            'total_price_usd' => 1800.00,
        ]);

        // COTIZACIÓN 3: Ferre-Industrial Guacara
        $cot3 = SupplierQuotation::firstOrCreate([
            'purchase_request_id' => $req1->id,
            'supplier_id' => $ferreGuacara->id,
        ], [
            'quotation_number' => 'COT-FG-3091',
            'quotation_date' => now()->subDays(1),
            'validity_days' => 3,
            'payment_condition' => '50% Anticipo, 50% al entregar',
            'delivery_time' => '72 horas',
            'delivery_place' => 'Retiro en patio del proveedor (Guacara)',
            'subtotal_usd' => 6050.00,
            'tax_usd' => 0.00,
            'total_usd' => 6050.00,
            'is_winner' => false,
            'evaluation_comments' => 'Exige retiro propio con transporte de BANPE.',
        ]);

        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot3->id, 'material_id' => $cabilla12->id], [
            'quantity' => 300,
            'unit_price_usd' => 14.30,
            'total_price_usd' => 4290.00,
        ]);
        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cot3->id, 'material_id' => $cabilla38->id], [
            'quantity' => 200,
            'unit_price_usd' => 8.80,
            'total_price_usd' => 1760.00,
        ]);

        // 3. Solicitud 2: Aprobada con Orden de Compra Generada (BANPE-OC-2026-0001)
        $req2 = PurchaseRequest::firstOrCreate(['code' => 'CMP-2026-0002'], [
            'title' => 'Suministro Masivo de Cemento Gris Portland Tipo I (500 sacos)',
            'project_id' => $project?->id,
            'warehouse_id' => $warehouse?->id,
            'requested_by_user_id' => $engineerUser->id,
            'approved_by_user_id' => $adminUser->id,
            'priority' => 'normal',
            'status' => 'orden_generada',
            'justification' => 'Acopio para vaciado de fundaciones y vigas de riostra.',
            'approval_notes' => 'Aprobada cotización de Vencemos por precio oficial y disponibilidad inmediata de gandola completa.',
            'approved_at' => now()->subDays(4),
        ]);

        PurchaseRequestItem::firstOrCreate([
            'purchase_request_id' => $req2->id,
            'material_id' => $cemento->id,
        ], [
            'quantity' => 500,
            'target_price_usd' => 9.20,
            'notes' => 'Sacos de 42.5 kg en paletas retractiladas',
        ]);

        $cotCemento = SupplierQuotation::firstOrCreate([
            'purchase_request_id' => $req2->id,
            'supplier_id' => $cementos->id,
        ], [
            'quotation_number' => 'VENC-2026-5510',
            'quotation_date' => now()->subDays(6),
            'validity_days' => 10,
            'payment_condition' => 'Contado Anticipado',
            'delivery_time' => 'Inmediata (Gandola en tránsito)',
            'delivery_place' => 'Puesto en Almacén Central BANPE',
            'subtotal_usd' => 4400.00,
            'tax_usd' => 0.00,
            'total_usd' => 4400.00,
            'is_winner' => true,
            'evaluation_comments' => 'Proveedor directo fabricante con certificado de calidad COVENIN 28.',
        ]);

        SupplierQuotationItem::firstOrCreate(['supplier_quotation_id' => $cotCemento->id, 'material_id' => $cemento->id], [
            'quantity' => 500,
            'unit_price_usd' => 8.80,
            'total_price_usd' => 4400.00,
        ]);

        $req2->selected_quotation_id = $cotCemento->id;
        $req2->save();

        // Orden de Compra Oficial O/C
        PurchaseOrder::firstOrCreate(['code' => 'BANPE-OC-2026-0001'], [
            'purchase_request_id' => $req2->id,
            'supplier_id' => $cementos->id,
            'supplier_quotation_id' => $cotCemento->id,
            'project_id' => $project?->id,
            'warehouse_id' => $warehouse?->id,
            'issued_by_user_id' => $adminUser->id,
            'approved_by_user_id' => $adminUser->id,
            'issue_date' => now()->subDays(3),
            'delivery_deadline' => now()->addDays(2),
            'subtotal_usd' => 4400.00,
            'tax_usd' => 0.00,
            'total_usd' => 4400.00,
            'payment_terms' => 'Contado Anticipado',
            'status' => 'en_transito',
            'shipping_instructions' => 'Descargar en Almacén Central Valencia con montacargas. Verificar paletas con plástico protector.',
            'notes' => 'Orden emitida conforme al Cuadro Comparativo No. CMP-2026-0002 debidamente visado.',
        ]);
    }
}

