<?php

use App\Http\Controllers\Api\MISController;
use Illuminate\Support\Facades\Route;

Route::get('/mis/{branch}/{date}', [MISController::class, 'show'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');

Route::get('/mis/{branch}/{date}/export', [MISController::class, 'export'])
    ->where('branch', 'chromepet|oragadam')
    ->where('date', '\d{4}-\d{2}-\d{2}');