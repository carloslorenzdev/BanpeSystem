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
        Schema::table('projects', function (Blueprint $table) {
            $table->string('valuation_status')->default('pendiente')->after('status'); // pendiente, valuacion_interna_aprobada, valuacion_externa_aprobada, cerrada
            $table->date('internal_valuation_date')->nullable()->after('valuation_status');
            $table->text('internal_valuation_notes')->nullable()->after('internal_valuation_date');
            $table->date('external_valuation_date')->nullable()->after('internal_valuation_notes');
            $table->text('external_valuation_notes')->nullable()->after('external_valuation_date');
            $table->string('inspector_name')->nullable()->after('external_valuation_notes');
            $table->string('termination_act_number')->nullable()->after('inspector_name');
            $table->text('pause_reason')->nullable()->after('termination_act_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'valuation_status',
                'internal_valuation_date',
                'internal_valuation_notes',
                'external_valuation_date',
                'external_valuation_notes',
                'inspector_name',
                'termination_act_number',
                'pause_reason',
            ]);
        });
    }
};
