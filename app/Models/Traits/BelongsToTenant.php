<?php

namespace App\Models\Traits;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Limits queries to the current tenant and stamps tenant_id on create.
 * Apply only to tenant-owned operational tables, not to User.
 * Login looks users up by email before a tenant is known.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = TenantContext::id();

            if ($tenantId !== null) {
                $builder->where($builder->getModel()->getTable() . '.tenant_id', $tenantId);
            }
        });

        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $model->tenant_id = TenantContext::resolveId();
            }
        });
    }
}
