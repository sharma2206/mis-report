<?php

use App\Http\Controllers\Api\AnalyticsController;
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

// Export MIS report (PDF download)
Route::get('/mis/{branch}/{date}/export-pdf', [MISController::class, 'exportPdf'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');

// Dashboard summary for all branches
Route::get('/mis/dashboard/{date}', [MISController::class, 'dashboard'])
    ->where('date', '\d{4}-\d{2}-\d{2}');

// ─── Analytics API ───────────────────────────────────────────────────────────
$branchConstraint = 'chromepet|oragadam';
$dateConstraint   = '\d{4}-\d{2}-\d{2}';

// KPI summary cards
Route::get('/analytics/kpi/{branch}/{date}', [AnalyticsController::class, 'kpi'])
    ->where('branch', $branchConstraint)
    ->where('date', $dateConstraint);

// Chart data endpoints
Route::get('/analytics/charts/daily-trend',       [AnalyticsController::class, 'dailyTrend']);
Route::get('/analytics/charts/monthly-trend',     [AnalyticsController::class, 'monthlyTrend']);
Route::get('/analytics/charts/dept-revenue',      [AnalyticsController::class, 'deptRevenue']);
Route::get('/analytics/charts/payer-mix',         [AnalyticsController::class, 'payerMix']);
Route::get('/analytics/charts/patient-mix',       [AnalyticsController::class, 'patientMix']);
Route::get('/analytics/charts/branch-comparison', [AnalyticsController::class, 'branchComparison']);
Route::get('/analytics/charts/doctor-revenue',    [AnalyticsController::class, 'doctorRevenue']);

// Admission & Surgery analytics
Route::get('/analytics/admissions', [AnalyticsController::class, 'admissions']);
Route::get('/analytics/surgeries',  [AnalyticsController::class, 'surgeries']);
