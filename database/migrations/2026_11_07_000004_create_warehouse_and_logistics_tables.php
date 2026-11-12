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
        // 1. Almacenes (Almacén Central y Sub-almacenes de Obra)
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: ALM-CENTRAL, ALM-SAMANES
            $table->string('name');            // Ej: Almacén Central Valencia, Almacén de Obra Samanes
            $table->string('location');        // Ej: Zona Industrial Carabobo, Fila de Mariches
            $table->boolean('is_central')->default(false);
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Inventario Multi-Sitio (Diferenciación estricta entre Stock Libre y Stock Asignado a Obra)
        Schema::create('warehouse_inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            // project_id: NULL = Stock Libre (disponible para cualquier obra); NOT NULL = Stock Asignado a esa obra
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('minimum_alert', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['warehouse_id', 'material_id', 'project_id'], 'wh_mat_proj_idx');
        });

        // 3. Requisiciones de Materiales desde Obra (BANPE-FO-05-0001)
        Schema::create('material_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: REQ-2026-001
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('project_phase_id')->nullable()->constrained('project_phases')->nullOnDelete();
            $table->foreignId('requester_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('request_date');
            $table->string('status')->default('pendiente'); // pendiente, aprobada, despachada_parcial, despachada_total, enviada_a_compras, rechazada
            $table->string('priority')->default('normal'); // baja, normal, urgente
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 4. Detalle de Ítems Requisitados
        Schema::create('material_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_request_id')->constrained('material_requests')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('requested_quantity', 12, 2);
            $table->decimal('approved_quantity', 12, 2)->default(0);
            $table->decimal('dispatched_quantity', 12, 2)->default(0);
            $table->string('status')->default('pendiente'); // pendiente, disponible_almacen, por_comprar, despachado
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        // 5. Guías de Despacho de Camiones a Obra (BANPE-FO-12-0004)
        Schema::create('dispatches', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: DSP-2026-001
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('material_request_id')->nullable()->constrained('material_requests')->nullOnDelete();
            $table->foreignId('dispatcher_user_id')->constrained('users');
            $table->string('driver_name'); // Ej: José Moreno
            $table->string('driver_id_document')->nullable(); // Ej: V-14.892.341
            $table->string('vehicle_plate'); // Ej: A42BB9C
            $table->string('vehicle_model')->nullable(); // Ej: Camión Mack 350 / Chuto
            $table->date('departure_date');
            $table->string('status')->default('en_transito'); // preparando, en_transito, entregado, con_discrepancia
            $table->foreignId('received_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reception_date')->nullable();
            $table->string('receiver_name')->nullable();
            $table->text('receiver_notes')->nullable(); // Discrepancias / recepción en obra
            $table->timestamps();
        });

        // 6. Ítems del Despacho
        Schema::create('dispatch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispatch_id')->constrained('dispatches')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('quantity_sent', 12, 2);
            $table->decimal('quantity_received', 12, 2)->nullable();
            $table->decimal('unit_price_usd', 12, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        // 7. Traspasos entre Obras y Reasignación de Stock Asignado a Stock Libre
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: TRF-2026-001
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->foreignId('from_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('to_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->foreignId('authorized_by_user_id')->constrained('users');
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('dispatch_items');
        Schema::dropIfExists('dispatches');
        Schema::dropIfExists('material_request_items');
        Schema::dropIfExists('material_requests');
        Schema::dropIfExists('warehouse_inventories');
        Schema::dropIfExists('warehouses');
    }
};

