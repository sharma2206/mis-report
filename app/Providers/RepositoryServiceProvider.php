<?php

namespace App\Providers;

use App\Repositories\CachedMisRepository;
use App\Repositories\Contracts\MisRepositoryInterface;
use App\Repositories\MisRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(MisRepository::class);

        $this->app->bind(MisRepositoryInterface::class, function ($app) {
            return new CachedMisRepository($app->make(MisRepository::class));
        });
    }

    public function boot(): void {}
}
