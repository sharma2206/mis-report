<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// ─── Auth (public) ───────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login',    [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout',   [AuthController::class, 'logout']);
        Route::get('me',        [AuthController::class, 'me']);
        Route::post('register', [AuthController::class, 'register']);
    });
});

// ─── MIS Reports + Analytics (protected) ─────────────────────────────────────
$branchConstraint = 'chromepet|oragadam';
$dateConstraint   = '\d{4}-\d{2}-\d{2}';

Route::middleware('auth:sanctum')->group(function () use ($branchConstraint, $dateConstraint) {
    Route::post('/mis/{branch}/upload', [MISController::class, 'upload'])
        ->where('branch', $branchConstraint);

    Route::get('/mis/{branch}/{date}', [MISController::class, 'show'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::get('/mis/{branch}/{date}/export', [MISController::class, 'export'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::get('/mis/{branch}/{date}/export-pdf', [MISController::class, 'exportPdf'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::get('/mis/{branch}/{date}/export-csv', [MISController::class, 'exportCsv'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::post('/mis/{branch}/{date}/email', [MISController::class, 'emailReport'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::get('/mis/dashboard/{date}', [MISController::class, 'dashboard'])
        ->where('date', $dateConstraint);

    Route::get('/analytics/kpi/{branch}/{date}', [AnalyticsController::class, 'kpi'])
        ->where('branch', $branchConstraint)->where('date', $dateConstraint);

    Route::get('/analytics/charts/daily-trend',       [AnalyticsController::class, 'dailyTrend']);
    Route::get('/analytics/charts/monthly-trend',     [AnalyticsController::class, 'monthlyTrend']);
    Route::get('/analytics/charts/dept-revenue',      [AnalyticsController::class, 'deptRevenue']);
    Route::get('/analytics/charts/payer-mix',         [AnalyticsController::class, 'payerMix']);
    Route::get('/analytics/charts/patient-mix',       [AnalyticsController::class, 'patientMix']);
    Route::get('/analytics/charts/branch-comparison', [AnalyticsController::class, 'branchComparison']);
    Route::get('/analytics/charts/doctor-revenue',    [AnalyticsController::class, 'doctorRevenue']);
    Route::get('/analytics/admissions',               [AnalyticsController::class, 'admissions']);
    Route::get('/analytics/surgeries',                [AnalyticsController::class, 'surgeries']);
    Route::get('/analytics/ip-demographics',          [AnalyticsController::class, 'ipDemographics']);
    Route::get('/analytics/surgery-detail',           [AnalyticsController::class, 'surgeryDetail']);
    Route::get('/analytics/op-metrics',               [AnalyticsController::class, 'opMetrics']);
});
