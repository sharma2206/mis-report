<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MISUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date'              => ['required', 'date_format:Y-m-d'],
            'bill_file'         => ['required', 'file', 'mimes:csv,txt', 'max:20480'],
            'collection_file'   => ['required', 'file', 'mimes:csv,txt', 'max:20480'],
            'package_file'      => ['required', 'file', 'mimes:csv,txt', 'max:20480'],
            'occupancy'         => ['nullable', 'integer', 'min:0'],
            'occupancy_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'admission'         => ['nullable', 'integer', 'min:0'],
            'discharge'         => ['nullable', 'integer', 'min:0'],
        ];
    }
}
