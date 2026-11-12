<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'dispatch_id',
        'material_id',
        'quantity_sent',
        'quantity_received',
        'unit_price_usd',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_sent' => 'decimal:2',
            'quantity_received' => 'decimal:2',
            'unit_price_usd' => 'decimal:2',
        ];
    }

    public function dispatch(): BelongsTo
    {
        return $this->belongsTo(Dispatch::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}

