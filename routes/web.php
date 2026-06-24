<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn() => view('upload'));
Route::get('/dashboard', fn() => view('dashboard'));

// Print preview (web, auth not required for now — token passed in URL)
Route::get('/print/{branch}/{date}', [MISController::class, 'printPreview'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');
