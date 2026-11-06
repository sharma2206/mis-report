<?php

namespace App\Support;

/**
 * Request-scoped tenant id.
 *
 * HTTP middleware sets this from the authenticated user (the ONLY trusted source).
 * Console commands and queued jobs must set it explicitly before querying.
 * When it is null, tenant scopes do not filter — this is intentional for
 * pre-authentication steps such as login.
 *
 * Security note:
 * - Incoming request data (body/query params) MUST NEVER be passed to set().
 * - stamp() always overwrites incoming tenant_id with the trusted context value.
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

    /**
     * Add tenant_id to each row of a bulk insert, always using the trusted
     * context value (overwrites any incoming tenant_id from request data).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     * @throws \RuntimeException when tenant context is required but not set.
     */
    public static function stamp(array $rows, bool $requireContext = true): array
    {
        $tenantId = self::$id;

        if ($tenantId === null) {
            if ($requireContext) {
                throw new \RuntimeException(
                    'Bulk insert attempted without tenant context. ' .
                    'Set TenantContext before running bulk operations.'
                );
            }
            return $rows;
        }

        return array_map(function (array $row) use ($tenantId) {
            // Always overwrite — never allow incoming data to dictate tenant ownership.
            $row['tenant_id'] = $tenantId;
            return $row;
        }, $rows);
    }

    public static function defaultId(): ?int
    {
        try {
            $id = \Illuminate\Support\Facades\DB::table('tenants')->where('slug', 'default')->value('id');

            return $id !== null ? (int) $id : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Resolve tenant id for auto-stamping on model creation.
     *
     * Falls back to the authenticated user's tenant_id, then to the
     * seeded default tenant if available (e.g. for system events or testing).
     */
    public static function resolveId(): ?int
    {
        return self::$id
            ?? (auth()->user()?->tenant_id ? (int) auth()->user()->tenant_id : null)
            ?? self::defaultId();
    }
}
