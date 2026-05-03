<?php

use App\Http\Controllers\MisReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('mis')->group(function () {
    Route::post('upload', [MisReportController::class, 'upload']);
    Route::get('{date}', [MisReportController::class, 'show']);
    Route::post('{date}/generate', [MisReportController::class, 'generate']);
    Route::get('{date}/export', [MisReportController::class, 'export']);
});