<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

// SPA shell — all React-handled routes serve app.blade.php
Route::get('/',          fn() => view('app'));
Route::get('/login',     fn() => view('app'));
Route::get('/upload',    fn() => view('app'));
Route::get('/dashboard', fn() => view('app'));

// Print preview (web, auth not required for now — token passed in URL)
Route::get('/print/{branch}/{date}', [MISController::class, 'printPreview'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');
