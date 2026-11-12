<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'material_id',
        'project_phase_id',
        'estimated_quantity',
        'dispatched_quantity',
        'unit_price_usd',
        'total_price_usd',
    ];

    protected function casts(): array
    {
        return [
            'estimated_quantity' => 'decimal:2',
            'dispatched_quantity' => 'decimal:2',
            'unit_price_usd' => 'decimal:2',
            'total_price_usd' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (ProjectMaterial $projectMaterial) {
            $estimated = (float) $projectMaterial->estimated_quantity;
            $unitPrice = (float) $projectMaterial->unit_price_usd;
            $projectMaterial->total_price_usd = round($estimated * $unitPrice, 2);
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function phase(): BelongsTo
    {
        return $this->belongsTo(ProjectPhase::class, 'project_phase_id');
    }
}

