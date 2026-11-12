<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Directorio Maestro de Proveedores Homologados
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('rif')->unique(); // Ej: J-30987456-1
            $table->string('business_name'); // Razón Social oficial
            $table->string('commercial_name')->nullable(); // Nombre comercial o fantasía
            $table->string('contact_person')->nullable(); // Nombre contacto de ventas
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->default('Valencia');
            $table->string('specialty')->nullable(); // Ej: Aceros y Cabillas, Concreto, Plomería, Ferretería
            $table->string('payment_terms')->default('Contado'); // Contado, Crédito 7 días, Crédito 15 días, 50% anticipo
            $table->text('bank_details')->nullable(); // Banesco, Provincial, Zelle, etc.
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Solicitudes de Compra / Cuadros Comparativos
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: CMP-2026-0001
            $table->string('title'); // Ej: Adquisición de Cabillas 1/2 y 3/8 para Fase de Fundaciones
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('material_request_id')->nullable()->constrained('material_requests')->nullOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('priority')->default('normal'); // baja, normal, urgente
            $table->string('status')->default('evaluacion_comparativa'); // en_cotizacion, evaluacion_comparativa, aprobada, rechazada, orden_generada
            $table->unsignedBigInteger('selected_quotation_id')->nullable();
            $table->text('justification')->nullable();
            $table->text('approval_notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        // 3. Ítems requeridos en la Solicitud de Compra
        Schema::create('purchase_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->decimal('target_price_usd', 12, 2)->nullable(); // Precio estimado de referencia
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        // 4. Cotizaciones de Proveedores (Mínimo 3 para Cuadro Comparativo oficial BANPE)
        Schema::create('supplier_quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('quotation_number'); // Ej: COT-2026-9481
            $table->date('quotation_date');
            $table->integer('validity_days')->default(7);
            $table->string('payment_condition'); // Ej: Contado, Crédito 15 días, 30% anticipo
            $table->string('delivery_time'); // Ej: Inmediata, 48 horas, 5 días hábiles
            $table->string('delivery_place')->default('Puesto en Obra'); // Puesto en Obra, Retiro en Proveedor
            $table->decimal('subtotal_usd', 12, 2)->default(0);
            $table->decimal('tax_usd', 12, 2)->default(0);
            $table->decimal('total_usd', 12, 2)->default(0);
            $table->boolean('is_winner')->default(false);
            $table->text('evaluation_comments')->nullable();
            $table->timestamps();
        });

        // 5. Precios unitarios de cada ítem en la cotización del proveedor
        Schema::create('supplier_quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_quotation_id')->constrained('supplier_quotations')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price_usd', 12, 2);
            $table->decimal('total_price_usd', 12, 2);
            $table->timestamps();
        });

        // 6. Órdenes de Compra Oficiales (BANPE-OC-YYYY-XXXX)
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: BANPE-OC-2026-0001
            $table->foreignId('purchase_request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('supplier_quotation_id')->constrained('supplier_quotations')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('issued_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('issue_date');
            $table->date('delivery_deadline')->nullable();
            $table->decimal('subtotal_usd', 12, 2);
            $table->decimal('tax_usd', 12, 2)->default(0);
            $table->decimal('total_usd', 12, 2);
            $table->string('payment_terms');
            $table->string('status')->default('emitida'); // emitida, en_transito, recibida_parcial, recibida_total, anulada
            $table->text('shipping_instructions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('supplier_quotation_items');
        Schema::dropIfExists('supplier_quotations');
        Schema::dropIfExists('purchase_request_items');
        Schema::dropIfExists('purchase_requests');
        Schema::dropIfExists('suppliers');
    }
};

