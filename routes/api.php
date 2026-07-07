<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// ─── Health check (no auth, no version prefix) ───────────────────────────────
Route::get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'timestamp' => now()->toISOString(),
        'db'        => (function () {
            try {
                \Illuminate\Support\Facades\DB::connection()->getPdo();
                return 'ok';
            } catch (\Exception $e) {
                return 'error';
            }
        })(),
    ]);
})->middleware('throttle:60,1');

// ─── Shared constraints ───────────────────────────────────────────────────────
$branch = 'chromepet|oragadam';
$date   = '\d{4}-\d{2}-\d{2}';

Route::prefix('v1')->group(function () use ($branch, $date) {

    // ─── Auth (public) ───────────────────────────────────────────────────────
    Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
        Route::post('login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout',   [AuthController::class, 'logout']);
            Route::get('me',        [AuthController::class, 'me']);
            Route::post('register', [AuthController::class, 'register']);
        });
    });

    // ─── Protected: no branch scope (import logs, dashboard, analytics) ──────
    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () use ($date) {

        // Branch list filtered by user access
        Route::get('/branches', function (\Illuminate\Http\Request $request) {
            $all = [
                ['key' => 'chromepet', 'name' => 'Chromepet', 'beds' => 150],
                ['key' => 'oragadam',  'name' => 'Oragadam',  'beds' => 100],
            ];
            $userBranch = $request->user()->branch;
            $data = $userBranch
                ? array_values(array_filter($all, fn ($b) => $b['key'] === $userBranch))
                : $all;
            return response()->json(['success' => true, 'data' => $data]);
        });

        Route::get('/mis/import-logs',         [MISController::class, 'importLogs']);
        Route::delete('/mis/import-logs/{id}', [MISController::class, 'rollbackImport']);

        Route::get('/mis/dashboard/{date}', [MISController::class, 'dashboard'])
            ->where('date', $date);

        Route::get('/analytics/kpi/{branch}/{date}', [AnalyticsController::class, 'kpi'])
            ->where('branch', 'chromepet|oragadam')->where('date', $date);

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
        Route::get('/analytics/collection',               [AnalyticsController::class, 'collectionReport']);
        Route::get('/analytics/service-revenue',          [AnalyticsController::class, 'serviceRevenue']);
        Route::get('/analytics/doctor-performance',       [AnalyticsController::class, 'doctorPerformance']);
    });

    // ─── Protected: branch-scoped (branch.access middleware enforced) ────────
    Route::middleware(['auth:sanctum', 'throttle:120,1', 'branch.access'])
        ->where(['branch' => $branch, 'date' => $date])
        ->group(function () {
            Route::post('/mis/{branch}/upload',           [MISController::class, 'upload']);
            Route::get('/mis/{branch}/{date}',            [MISController::class, 'show']);
            Route::get('/mis/{branch}/{date}/export',     [MISController::class, 'export'])->middleware('throttle:10,1');
            Route::get('/mis/{branch}/{date}/export-pdf', [MISController::class, 'exportPdf'])->middleware('throttle:10,1');
            Route::get('/mis/{branch}/{date}/export-csv', [MISController::class, 'exportCsv'])->middleware('throttle:10,1');
            Route::get('/mis/{branch}/export-brm',        [MISController::class, 'exportBrm'])->middleware('throttle:10,1');
            Route::post('/mis/{branch}/{date}/email',     [MISController::class, 'emailReport'])->middleware('throttle:5,1');
        });

});
