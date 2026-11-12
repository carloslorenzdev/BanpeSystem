<?php

namespace App\Models;

use App\Enums\RoleEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
    ];

    /**
     * Get the role enum instance if matching.
     */
    public function getRoleEnumAttribute(): ?RoleEnum
    {
        return RoleEnum::tryFrom($this->slug);
    }

    /**
     * Users associated with this role.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}

