<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MisReport extends Model
{
    use HasFactory;

    public const STATUS_PENDING    = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_FAILED     = 'failed';

    protected $fillable = [
        'report_date',
        'status',
        'sales_op',
        'sales_ip',
        'sales_er',
        'sales_pharmacy',
        'sales_total',
        'collection_op',
        'collection_ip',
        'collection_er',
        'collection_total',
        'discount_99',
        'discount_100',
        'refund',
        'mri_op_count',
        'mri_ip_count',
        'mri_op_revenue',
        'mri_ip_revenue',
        'total_op',
        'occupancy',
        'occupancy_percent',
        'admission',
        'discharge',
        'payload',
        'error_message',
        'processed_at',
    ];

    protected $casts = [
        'report_date'      => 'date',
        'payload'          => 'array',
        'processed_at'     => 'datetime',
        'sales_op'         => 'decimal:2',
        'sales_ip'         => 'decimal:2',
        'sales_er'         => 'decimal:2',
        'sales_pharmacy'   => 'decimal:2',
        'sales_total'      => 'decimal:2',
        'collection_op'    => 'decimal:2',
        'collection_ip'    => 'decimal:2',
        'collection_er'    => 'decimal:2',
        'collection_total' => 'decimal:2',
        'discount_99'      => 'decimal:2',
        'discount_100'     => 'decimal:2',
        'refund'           => 'decimal:2',
        'mri_op_revenue'   => 'decimal:2',
        'mri_ip_revenue'   => 'decimal:2',
        'occupancy_percent' => 'decimal:2',
    ];
}
