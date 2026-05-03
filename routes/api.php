<?php

use App\Http\Controllers\MisReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('mis')->group(function () {
    Route::post('upload', [MisReportController::class, 'upload']);
    Route::get('chromepet', [MisReportController::class, 'chromepet']);
    Route::get('oragadam', [MisReportController::class, 'oragadam']);
    Route::get('{date}', [MisReportController::class, 'show']);
    Route::get('{date}/export', [MisReportController::class, 'export']);
});
