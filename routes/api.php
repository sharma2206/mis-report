<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AnalyticsDrilldownController;
use App\Http\Controllers\Api\KpiController;
use App\Http\Controllers\Api\IntelligenceFoundationController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MISController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OperationalController;
use App\Http\Controllers\Api\RbacController;
use App\Http\Controllers\Api\SchedulerController;
use App\Http\Controllers\Api\SurgeryAnalyticsController;
use App\Http\Controllers\Api\UserController;
use App\Models\HospitalBranch;
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

        Route::middleware(['auth:sanctum', 'user.active', 'tenant'])->group(function () {
            Route::post('logout',   [AuthController::class, 'logout']);
            Route::get('me',        [AuthController::class, 'me']);
            Route::post('register', [AuthController::class, 'register']);
        });
    });

    // ─── Protected: no branch scope (import logs, dashboard, analytics) ──────
    Route::middleware(['auth:sanctum', 'user.active', 'tenant', 'throttle:120,1'])->group(function () use ($date) {

        // Branch list for the current tenant, filtered by the user's branch access.
        // Bed counts come from the branches table (seeded from the original enum).
        Route::get('/branches', function (\Illuminate\Http\Request $request) {
            $all = HospitalBranch::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['key', 'name', 'bed_count'])
                ->map(fn($b) => [
                    'key'  => $b->key,
                    'name' => $b->name,
                    'beds' => (int) $b->bed_count,
                ])
                ->all();

            $userBranch = $request->user()->branch;
            $data = $userBranch
                ? array_values(array_filter($all, fn($b) => $b['key'] === $userBranch))
                : $all;
            return response()->json(['success' => true, 'data' => $data]);
        });

        Route::get('/kpis', [KpiController::class, 'index'])
            ->middleware('permission:dashboard.view');
        Route::get('/kpis/{code}', [KpiController::class, 'show'])
            ->where('code', '[A-Za-z0-9_]+')
            ->middleware(['branch.access', 'permission:dashboard.view']);
        Route::get('/source-capabilities', [IntelligenceFoundationController::class, 'sourceCapabilities'])
            ->middleware('permission:dashboard.view|settings.view');

        // Branch-scoped via query/route param — CheckBranchAccess also reads ?branch=
        Route::middleware('branch.access')->group(function () use ($date) {
            Route::get('/analytics/filter-options', [AnalyticsController::class, 'filterOptions'])
                ->middleware('permission:dashboard.view|financial.view|operational.view|mis_report.view');
            Route::get('/analytics/drilldown/{type}', [AnalyticsDrilldownController::class, 'index'])
                ->where('type', 'bills|admissions|discharges|collections|surgeries')
                ->middleware('permission:dashboard.drill_down');
            Route::get('/data-quality/summary', [IntelligenceFoundationController::class, 'qualitySummary'])
                ->middleware('permission:dashboard.view|import_center.view|audit_logs.view');
            Route::get('/data-quality/issues/{code}', [IntelligenceFoundationController::class, 'qualityIssues'])
                ->where('code', '[a-z0-9_]+')
                ->middleware('permission:dashboard.view|import_center.view|audit_logs.view');
            Route::post('/data-quality/snapshots', [IntelligenceFoundationController::class, 'qualitySnapshot'])
                ->middleware('permission:import_center.view|audit_logs.view');

            Route::get('/mis/import-logs', [MISController::class, 'importLogs'])
                ->middleware('permission:import_center.view');
            Route::delete('/mis/import-logs/{id}', [MISController::class, 'rollbackImport'])
                ->middleware('permission:import_center.delete');

            Route::get('/mis/dashboard/{date}', [MISController::class, 'dashboard'])
                ->where('date', $date)
                ->middleware('permission:dashboard.view');

            Route::get('/analytics/kpi/{branch}/{date}', [AnalyticsController::class, 'kpi'])
                ->where('date', $date)
                ->middleware('permission:dashboard.view|financial.view|mis_report.view');

            Route::get('/analytics/charts/daily-trend', [AnalyticsController::class, 'dailyTrend'])
                ->middleware('permission:dashboard.view|financial.view|mis_report.view');
            Route::get('/analytics/charts/monthly-trend', [AnalyticsController::class, 'monthlyTrend'])
                ->middleware('permission:dashboard.view');
            Route::get('/analytics/charts/dept-revenue', [AnalyticsController::class, 'deptRevenue'])
                ->middleware('permission:dashboard.view|departments.view|brm_report.view');
            Route::get('/analytics/charts/payer-mix', [AnalyticsController::class, 'payerMix'])
                ->middleware('permission:dashboard.view|financial.view');
            Route::get('/analytics/charts/patient-mix', [AnalyticsController::class, 'patientMix'])
                ->middleware('permission:dashboard.view');
            Route::get('/analytics/charts/branch-comparison', [AnalyticsController::class, 'branchComparison'])
                ->middleware('permission:dashboard.drill_down|financial.view');
            Route::get('/analytics/charts/doctor-revenue', [AnalyticsController::class, 'doctorRevenue'])
                ->middleware('permission:dashboard.view|doctors.view|brm_report.view');
            Route::get('/analytics/admissions', [AnalyticsController::class, 'admissions'])
                ->middleware('permission:dashboard.view|operational.view|departments.view');
            Route::get('/analytics/surgeries', [AnalyticsController::class, 'surgeries'])
                ->middleware('permission:dashboard.view|surgery.view');
            Route::get('/analytics/ip-demographics', [AnalyticsController::class, 'ipDemographics'])
                ->middleware('permission:dashboard.view|operational.view');
            Route::get('/analytics/surgery-detail', [AnalyticsController::class, 'surgeryDetail'])
                ->middleware('permission:dashboard.view|surgery.view');
            Route::get('/analytics/op-metrics', [AnalyticsController::class, 'opMetrics'])
                ->middleware('permission:dashboard.view|operational.view');
            Route::get('/analytics/collection', [AnalyticsController::class, 'collectionReport'])
                ->middleware('permission:dashboard.view|financial.view');
            Route::get('/analytics/service-revenue', [AnalyticsController::class, 'serviceRevenue'])
                ->middleware('permission:dashboard.view|financial.view|pharmacy.view');
            Route::get('/analytics/doctor-performance', [AnalyticsController::class, 'doctorPerformance'])
                ->middleware('permission:dashboard.view|doctors.view|brm_report.view');

            // ── Surgery Analytics (dedicated service) ──────────────────────
            Route::prefix('analytics/surgery')->middleware('permission:surgery.view')->group(function () {
                Route::get('/kpis',             [SurgeryAnalyticsController::class, 'kpis']);
                Route::get('/trend',            [SurgeryAnalyticsController::class, 'trend']);
                Route::get('/distribution',     [SurgeryAnalyticsController::class, 'distribution']);
                Route::get('/surgeon-performance', [SurgeryAnalyticsController::class, 'surgeonPerformance']);
                Route::get('/ot-dashboard',     [SurgeryAnalyticsController::class, 'otDashboard']);
                Route::get('/anaesthesia',      [SurgeryAnalyticsController::class, 'anaesthesia']);
                Route::get('/patient-profile',  [SurgeryAnalyticsController::class, 'patientProfile']);
                Route::get('/quality',          [SurgeryAnalyticsController::class, 'qualityMetrics']);
                Route::get('/payer',            [SurgeryAnalyticsController::class, 'payerAnalytics']);
                Route::get('/insights',         [SurgeryAnalyticsController::class, 'insights']);
            });
        });

        // ─── Users ───────────────────────────────────────────────────────────
        Route::prefix('users')->middleware('permission:users.view')->group(function () {
            Route::get('/',              [UserController::class, 'index']);
            Route::get('/stats',         [UserController::class, 'stats']);
            Route::get('/select',        [UserController::class, 'select']);
            Route::get('/export',        [UserController::class, 'export']);
            Route::post('/',             [UserController::class, 'store'])->middleware('permission:users.create');
            Route::post('/bulk',         [UserController::class, 'bulk'])->middleware('permission:users.edit');
            Route::get('/{id}',          [UserController::class, 'show']);
            Route::put('/{id}',          [UserController::class, 'update'])->middleware('permission:users.edit');
            Route::delete('/{id}',       [UserController::class, 'destroy'])->middleware('permission:users.delete');
            Route::post('/{id}/activate',       [UserController::class, 'activate'])->middleware('permission:users.edit');
            Route::post('/{id}/deactivate',     [UserController::class, 'deactivate'])->middleware('permission:users.edit');
            Route::post('/{id}/lock',           [UserController::class, 'lock'])->middleware('permission:users.edit');
            Route::post('/{id}/unlock',         [UserController::class, 'unlock'])->middleware('permission:users.edit');
            Route::post('/{id}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:users.edit');
            Route::post('/{id}/clone',          [UserController::class, 'clone'])->middleware('permission:users.create');
            Route::put('/{id}/roles',           [UserController::class, 'syncRoles'])->middleware('permission:users.edit');
            Route::put('/{id}/branches',        [UserController::class, 'syncBranches'])->middleware('permission:users.edit');
            Route::put('/{id}/departments',     [UserController::class, 'syncDepartments'])->middleware('permission:users.edit');
            Route::get('/{id}/login-logs',      [UserController::class, 'loginLogs']);
        });

        // ─── RBAC ────────────────────────────────────────────────────────────
        Route::prefix('rbac')->middleware('permission:roles.view')->group(function () {
            Route::get('/roles',                    [RbacController::class, 'indexRoles']);
            Route::post('/roles',                   [RbacController::class, 'storeRole'])->middleware('permission:roles.create');
            Route::get('/roles/{id}',               [RbacController::class, 'showRole']);
            Route::put('/roles/{id}',               [RbacController::class, 'updateRole'])->middleware('permission:roles.edit');
            Route::delete('/roles/{id}',            [RbacController::class, 'destroyRole'])->middleware('permission:roles.delete');
            Route::post('/roles/{id}/clone',        [RbacController::class, 'cloneRole'])->middleware('permission:roles.create');
            Route::patch('/roles/{id}/toggle',      [RbacController::class, 'toggleRole'])->middleware('permission:roles.edit');
            Route::put('/roles/{id}/permissions',   [RbacController::class, 'updateRolePermissions'])->middleware('permission:roles.edit');
            Route::put('/roles/{id}/branches',      [RbacController::class, 'updateRoleBranches'])->middleware('permission:roles.edit');
            Route::get('/roles/{id}/users',         [RbacController::class, 'getRoleUsers']);
            Route::get('/permissions',              [RbacController::class, 'indexPermissions']);
            Route::post('/assign',                  [RbacController::class, 'assignRoles'])->middleware('permission:users.edit');
            Route::delete('/roles/{roleId}/users/{userId}', [RbacController::class, 'removeRoleFromUser'])->middleware('permission:users.edit');
            Route::get('/stats',                    [RbacController::class, 'stats']);
            Route::get('/audit',                    [RbacController::class, 'audit']);
        });

        // ─── Audit Logs ──────────────────────────────────────────────────────
        Route::prefix('audit-logs')->middleware('permission:audit_logs.view')->group(function () {
            Route::get('/',       [AuditLogController::class, 'index']);
            Route::get('/events', [AuditLogController::class, 'events']);
        });

        // ─── Notifications ────────────────────────────────────────────────────
        // Feed is branch-scoped in NotificationController for restricted users.
        Route::prefix('notifications')->middleware('permission:notifications.view')->group(function () {
            Route::get('/',       [NotificationController::class, 'index']);
            Route::get('/unread', [NotificationController::class, 'unread']);
        });

        // ─── Scheduler ────────────────────────────────────────────────────────
        Route::get('/scheduler/status', [SchedulerController::class, 'status'])
            ->middleware('permission:scheduler.view');

        // ─── Operational Centre ───────────────────────────────────────────────
        Route::prefix('operational')->middleware(['branch.access', 'permission:operational.view'])->group(function () {
            Route::get('/kpis',         [OperationalController::class, 'kpis']);
            Route::get('/bed-occupancy', [OperationalController::class, 'bedOccupancy']);
            Route::get('/admissions',   [OperationalController::class, 'admissions']);
            Route::get('/census',       [OperationalController::class, 'census']);
            Route::get('/surgery',      [OperationalController::class, 'surgery']);
            Route::get('/departments',  [OperationalController::class, 'departments']);
            Route::get('/doctors',      [OperationalController::class, 'doctors']);
            Route::get('/alerts',       [OperationalController::class, 'alerts']);
            Route::get('/analytics',    [OperationalController::class, 'analytics']);
        });
    });

    // ─── Protected: branch-scoped (branch.access middleware enforced) ────────
    Route::middleware(['auth:sanctum', 'user.active', 'tenant', 'throttle:120,1', 'branch.access'])
        ->where(['branch' => $branch, 'date' => $date])
        ->group(function () {
            Route::get('/mis/{branch}/{date}', [MISController::class, 'show'])
                ->middleware('permission:mis_report.view');
            Route::get('/mis/{branch}/{date}/export', [MISController::class, 'export'])
                ->middleware(['throttle:10,1', 'permission:mis_report.export']);
            Route::get('/mis/{branch}/{date}/export-pdf', [MISController::class, 'exportPdf'])
                ->middleware(['throttle:10,1', 'permission:mis_report.export|mis_report.print']);
            Route::get('/mis/{branch}/{date}/export-csv', [MISController::class, 'exportCsv'])
                ->middleware(['throttle:10,1', 'permission:mis_report.export']);
            Route::get('/mis/{branch}/export-brm', [MISController::class, 'exportBrm'])
                ->middleware(['throttle:10,1', 'permission:brm_report.export']);

            Route::get('/mis/{branch}/import-status', [MISController::class, 'importStatus'])
                ->middleware('permission:import_center.view');

            Route::middleware('permission:import_center.import|mis_report.import')->group(function () {
                Route::post('/mis/{branch}/upload',        [MISController::class, 'upload']);
                Route::post('/mis/{branch}/upload-single', [MISController::class, 'uploadSingle']);
            });
            Route::post('/mis/{branch}/{date}/email', [MISController::class, 'emailReport'])
                ->middleware(['throttle:5,1', 'permission:mis_report.email']);
        });
});
