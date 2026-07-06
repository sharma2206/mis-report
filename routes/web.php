<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// Print preview (web, auth not required for now — token passed in URL)
Route::get('/print/{branch}/{date}', [MISController::class, 'printPreview'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');

// SPA catch-all — serve React app for every other GET request (React Router handles client-side routing)
Route::get('/{any}', fn() => view('app'))->where('any', '.*');
