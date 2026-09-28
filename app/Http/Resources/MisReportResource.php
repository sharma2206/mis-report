<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MisReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'branch'       => $this->branch,
            'report_date'  => $this->report_date?->toDateString(),
            'occupancy'    => $this->occupancy,
            'occupancy_pct'=> $this->occupancy_pct,
            'admission'    => $this->admission,
            'discharge'    => $this->discharge,
            'total_op'     => $this->total_op,
            'er_count'     => $this->er_count,
            'sources'      => $this->sources ?? [],
            'report_data'  => $this->report_data,
            'created_at'   => $this->created_at?->toISOString(),
            'updated_at'   => $this->updated_at?->toISOString(),
        ];
    }
}
