<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// Print preview. Session cookie from the SPA login is sent on same-origin window.open.
// Authorization is enforced inside printPreview (auth + branch scope) so a missing
// named login route does not turn this into an open redirect.
Route::get('/print/{branch}/{date}', [MISController::class, 'printPreview'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');

// SPA catch-all — serve React app for every other GET request (React Router handles client-side routing)
Route::get('/{any}', fn() => view('app'))->where('any', '.*');
