<?php

namespace App\Enums;

use App\Models\HospitalBranch;
use App\Support\TenantContext;

enum Branch: string
{
    case CHROMEPET = 'chromepet';
    case ORAGADAM = 'oragadam';

    /**
     * Create an instance from a string value.
     *
     * @param string $value
     * @return self
     */
    public static function fromString(string $value): self
    {
        return self::from($value);
    }

    /**
     * Get the human-readable label for the branch.
     *
     * @return string
     */
    public function label(): string
    {
        return match ($this) {
            self::CHROMEPET => 'Chromepet',
            self::ORAGADAM => 'Oragadam',
        };
    }

    /**
     * Total operational bed count for the branch.
     * Used for bed-occupancy percentage calculations throughout the app.
     * Keep in sync with the /branches API response in routes/api.php.
     *
     * @return int
     */
    public function bedCount(): int
    {
        $query = HospitalBranch::withoutGlobalScope('tenant')
            ->where('key', $this->value)
            ->where('is_active', true);

        $tenantId = TenantContext::id();
        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        $fromDb = $query->value('bed_count');
        if ($fromDb !== null) {
            return (int) $fromDb;
        }

        return match ($this) {
            self::CHROMEPET => 75,
            self::ORAGADAM  => 14,
        };
    }
}
