<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KpiResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // $this->resource is the KPI array from AnalyticsController::kpi()
        return array_map(
            fn($v) => is_float($v) ? round($v, 2) : $v,
            (array) $this->resource
        );
    }
}
