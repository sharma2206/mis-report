<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImportLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'branch'         => $this->branch,
            'report_date'    => $this->report_date?->toDateString(),
            'uploaded_by'    => $this->uploaded_by,
            'files_uploaded' => $this->files_uploaded ?? [],
            'rows_imported'  => (int) $this->rows_imported,
            'rows_skipped'   => (int) $this->rows_skipped,
            'rows_errored'   => (int) $this->rows_errored,
            'status'         => $this->status,
            'notes'          => $this->notes,
            'rolled_back_at' => $this->rolled_back_at?->toISOString(),
            'rolled_back_by' => $this->rolled_back_by,
            'created_at'     => $this->created_at?->toISOString(),
        ];
    }
}
