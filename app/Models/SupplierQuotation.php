<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierQuotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_request_id',
        'supplier_id',
        'quotation_number',
        'quotation_date',
        'validity_days',
        'payment_condition',
        'delivery_time',
        'delivery_place',
        'subtotal_usd',
        'tax_usd',
        'total_usd',
        'is_winner',
        'evaluation_comments',
    ];

    protected function casts(): array
    {
        return [
            'quotation_date' => 'date',
            'is_winner' => 'boolean',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SupplierQuotationItem::class);
    }
}

