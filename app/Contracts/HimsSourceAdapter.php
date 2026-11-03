<?php

namespace App\Contracts;

use DateTimeInterface;

interface HimsSourceAdapter
{
    public function key(): string;

    public function capabilities(): array;

    public function health(): array;

    public function fetch(string $branch, DateTimeInterface $from, DateTimeInterface $to): iterable;
}
