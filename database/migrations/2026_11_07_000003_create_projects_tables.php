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
        // 1. Maestro de Obras / Proyectos
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Ej: OBR-2026-001
            $table->string('name');            // Ej: Residencias Los Samanes II
            $table->string('client_name')->nullable();
            $table->string('location');        // Ej: Caracas, El Recreo
            $table->foreignId('resident_engineer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('estimated_end_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->decimal('budget_usd', 14, 2)->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->string('status')->default('en_ejecucion'); // licitacion, en_ejecucion, paralizada, culminada
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. Fases de la Obra (Reemplazo de MS Project)
        Schema::create('project_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name'); // Ej: Fase 1: Movimiento de Tierra y Fundaciones
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status')->default('pendiente'); // pendiente, en_progreso, completada, retrasada
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 3. Materiales Presupuestados por Obra (Cómputos Maprex)
        Schema::create('project_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->foreignId('project_phase_id')->nullable()->constrained('project_phases')->nullOnDelete();
            $table->decimal('estimated_quantity', 12, 2)->default(0); // Cantidad presupuestada
            $table->decimal('dispatched_quantity', 12, 2)->default(0); // Cantidad despachada en obra
            $table->decimal('unit_price_usd', 12, 2)->default(0);
            $table->decimal('total_price_usd', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_materials');
        Schema::dropIfExists('project_phases');
        Schema::dropIfExists('projects');
    }
};

