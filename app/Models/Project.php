<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'client_name',
        'location',
        'resident_engineer_id',
        'manager_id',
        'start_date',
        'estimated_end_date',
        'actual_end_date',
        'budget_usd',
        'progress_percentage',
        'status',
        'valuation_status',
        'internal_valuation_date',
        'internal_valuation_notes',
        'external_valuation_date',
        'external_valuation_notes',
        'inspector_name',
        'termination_act_number',
        'pause_reason',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'estimated_end_date' => 'date:Y-m-d',
            'actual_end_date' => 'date:Y-m-d',
            'internal_valuation_date' => 'date:Y-m-d',
            'external_valuation_date' => 'date:Y-m-d',
            'budget_usd' => 'decimal:2',
            'progress_percentage' => 'decimal:2',
        ];
    }

    /**
     * Ingeniero residente asignado a la obra.
     */
    public function residentEngineer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resident_engineer_id');
    }

    /**
     * Gerente de Proyecto a cargo.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Fases de cronograma (reemplazo de MS Project).
     */
    public function phases(): HasMany
    {
        return $this->hasMany(ProjectPhase::class)->orderBy('start_date');
    }

    /**
     * Presupuesto de materiales e insumos calculados (Maprex).
     */
    public function projectMaterials(): HasMany
    {
        return $this->hasMany(ProjectMaterial::class);
    }

    /**
     * Alias de relación para computos y valuaciones.
     */
    public function materials(): HasMany
    {
        return $this->hasMany(ProjectMaterial::class);
    }

    /**
     * Total invertido en materiales despachados hasta la fecha.
     */
    public function getTotalDispatchedUsdAttribute(): float
    {
        return (float) $this->projectMaterials->sum(function ($pm) {
            return (float) $pm->dispatched_quantity * (float) $pm->unit_price_usd;
        });
    }

    /**
     * Total presupuestado en materiales.
     */
    public function getTotalMaterialsBudgetUsdAttribute(): float
    {
        return (float) $this->projectMaterials->sum('total_price_usd');
    }
}

