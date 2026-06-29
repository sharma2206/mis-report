<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\MisRepositoryInterface;
use App\Repositories\CachedMisRepository;
use App\Repositories\MisRepository;
use App\Services\MISService;
use App\Services\CsvProcessingService;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind the interface to the caching decorator wrapping the concrete repository.
        // MISService type-hints the interface, so the container must resolve it here.
        $this->app->singleton(MisRepositoryInterface::class, function () {
            return new CachedMisRepository(new MisRepository());
        });

        $this->app->singleton(MISService::class);
        $this->app->singleton(CsvProcessingService::class);
    }

    public function boot(): void {}
}
