<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// Upload CSV files and generate MIS report
Route::post('/mis/{branch}/upload', [MISController::class, 'upload'])
    ->where('branch', 'chromepet|oragadam');

// Retrieve MIS report (JSON)
Route::get('/mis/{branch}/{date}', [MISController::class, 'show'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');

// Export MIS report (Excel download)
Route::get('/mis/{branch}/{date}/export', [MISController::class, 'export'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');