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
        Schema::create('material_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('measurement_units', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('symbol', 15);
            $table->timestamps();
        });

        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // Código Maprex / Interno (ej: CEM-001)
            $table->string('name');
            $table->foreignId('category_id')->nullable()->constrained('material_categories')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('measurement_units')->nullOnDelete();
            $table->decimal('minimum_stock', 12, 2)->default(0);
            $table->decimal('estimated_price_usd', 12, 2)->default(0);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('materials');
        Schema::dropIfExists('measurement_units');
        Schema::dropIfExists('material_categories');
    }
};

