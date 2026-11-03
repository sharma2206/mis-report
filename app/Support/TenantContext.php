<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Request-scoped tenant id.
 *
 * HTTP middleware sets this from the authenticated user.
 * Console commands and queued jobs set it explicitly.
 * When it is empty, tenant scopes do not filter, so unauthenticated
 * work such as login still runs.
 */
final class TenantContext
{
    private static ?int $id = null;

    public static function set(int $id): void
    {
        self::$id = $id;
    }

    public static function id(): ?int
    {
        return self::$id;
    }

    public static function forget(): void
    {
        self::$id = null;
    }

    public static function defaultId(): ?int
    {
        $id = DB::table('tenants')->where('slug', 'default')->value('id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * Tenant id to stamp on a new row: current context, then the
     * authenticated user, then the default tenant created by migration.
     */
    public static function resolveId(): ?int
    {
        return self::$id
            ?? (auth()->user()?->tenant_id ? (int) auth()->user()->tenant_id : null)
            ?? self::defaultId();
    }

    /**
     * Add tenant_id to each row of a bulk insert.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    public static function stamp(array $rows): array
    {
        $tenantId = self::resolveId();

        if ($tenantId === null) {
            return $rows;
        }

        return array_map(function (array $row) use ($tenantId) {
            $row['tenant_id'] ??= $tenantId;

            return $row;
        }, $rows);
    }
}
