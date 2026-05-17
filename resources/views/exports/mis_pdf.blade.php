<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MIS Report - {{ $data['branch'] ?? '' }} - {{ $data['date'] ?? '' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #1a1a1a; padding: 20px; }
        .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; }
        .header h1 { font-size: 16px; color: #1e293b; margin-bottom: 3px; }
        .header p { font-size: 10px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; }
        th { background: #1e293b; color: #fff; font-weight: 600; text-align: center; font-size: 8px; }
        td:first-child { text-align: left; font-weight: 600; background: #f8fafc; }
        .section-header { background: #e2e8f0 !important; font-weight: 700; text-align: center !important; font-size: 9px; color: #334155; }
        .group-header { background: #dbeafe !important; font-weight: 600; text-align: center !important; }
        .total-col { font-weight: 700; background: #f0f9ff; }
        .footer { text-align: center; font-size: 7px; color: #94a3b8; margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .lakhs { font-size: 7px; color: #64748b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MIS Report — {{ $data['branch'] ?? 'N/A' }}</h1>
        <p>Date: {{ $data['date'] ?? '' }} | Generated: {{ $data['generated_at'] ?? now()->toDateTimeString() }}</p>
    </div>

    @php
        $sales = $data['sales'] ?? [];
        $col   = $data['collection'] ?? [];
        $disc  = $data['discount'] ?? [];
        $ref   = $data['refund'] ?? [];
        $vol   = $data['volume'] ?? [];
        $mri   = $data['mri'] ?? [];
        $pkg   = $data['pkg_adjustment'] ?? ['ftd' => 0, 'mtd' => 0];

        $lk = fn($v) => number_format(($v ?? 0) / 100000, 2);
        $nm = fn($v) => number_format($v ?? 0, 2);
    @endphp

    {{-- Revenue Table --}}
    <table>
        <thead>
            <tr>
                <th rowspan="2" style="width:14%">REVENUE</th>
                <th colspan="5">FTD</th>
                <th colspan="5">MTD</th>
            </tr>
            <tr>
                <th>OP</th><th>IP</th><th>ER</th><th>PH</th><th>Total</th>
                <th>OP</th><th>IP</th><th>ER</th><th>PH</th><th>Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Sales</td>
                <td>{{ $lk($sales['ftd']['op'] ?? 0) }}</td>
                <td>{{ $lk($sales['ftd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($sales['ftd']['er'] ?? 0) }}</td>
                <td>{{ $lk($sales['ftd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(($sales['ftd']['op'] ?? 0)+($sales['ftd']['ip'] ?? 0)+($sales['ftd']['er'] ?? 0)+($sales['ftd']['ph'] ?? 0)) }}</td>
                <td>{{ $lk($sales['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(($sales['mtd']['op'] ?? 0)+($sales['mtd']['ip'] ?? 0)+($sales['mtd']['er'] ?? 0)+($sales['mtd']['ph'] ?? 0)) }}</td>
            </tr>
            <tr>
                <td>Collection</td>
                <td>{{ $lk($col['ftd']['op'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['er'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($col['ftd'] ?? [])) }}</td>
                <td>{{ $lk($col['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($col['mtd'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Discount 99%</td>
                <td>{{ $lk($disc['ftd']['partial']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($disc['ftd']['partial'] ?? [])) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($disc['mtd']['partial'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Discount 100%</td>
                <td>{{ $lk($disc['ftd']['full']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($disc['ftd']['full'] ?? [])) }}</td>
                <td>{{ $lk($disc['mtd']['full']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($disc['mtd']['full'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Refund</td>
                <td>{{ $lk($ref['ftd']['op'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['er'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($ref['ftd'] ?? [])) }}</td>
                <td>{{ $lk($ref['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['ph'] ?? 0) }}</td>
                <td class="total-col">{{ $lk(array_sum($ref['mtd'] ?? [])) }}</td>
            </tr>
        </tbody>
    </table>
    <p class="lakhs" style="margin-bottom:15px">* All revenue values are in Lakhs (₹)</p>

    {{-- Volume & MRI --}}
    <table>
        <thead>
            <tr>
                <th colspan="3" class="section-header">VOLUME INDICATORS & MRI</th>
            </tr>
            <tr>
                <th style="width:40%">Indicator</th>
                <th>FTD</th>
                <th>MTD</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Occupancy</td><td>{{ $vol['ftd']['occupancy'] ?? 0 }}</td><td>{{ $vol['mtd']['occupancy'] ?? 0 }}</td></tr>
            <tr><td>Occupancy %</td><td>{{ $nm($vol['ftd']['occupancy_pct'] ?? 0) }}%</td><td>{{ $nm($vol['mtd']['occupancy_pct'] ?? 0) }}%</td></tr>
            <tr><td>Admission</td><td>{{ $vol['ftd']['admission'] ?? 0 }}</td><td>{{ $vol['mtd']['admission'] ?? 0 }}</td></tr>
            <tr><td>Discharge</td><td>{{ $vol['ftd']['discharge'] ?? 0 }}</td><td>{{ $vol['mtd']['discharge'] ?? 0 }}</td></tr>
            <tr><td>Total OP</td><td>{{ $vol['ftd']['total_op'] ?? 0 }}</td><td>{{ $vol['mtd']['total_op'] ?? 0 }}</td></tr>
            <tr><td colspan="3" class="group-header">MRI</td></tr>
            <tr><td>MRI OP (Count)</td><td>{{ $mri['ftd']['op']['count'] ?? 0 }}</td><td>{{ $mri['mtd']['op']['count'] ?? 0 }}</td></tr>
            <tr><td>MRI IP (Count)</td><td>{{ $mri['ftd']['ip']['count'] ?? 0 }}</td><td>{{ $mri['mtd']['ip']['count'] ?? 0 }}</td></tr>
            <tr><td>MRI OP Revenue (₹ Lakhs)</td><td>{{ $lk($mri['ftd']['op']['revenue'] ?? 0) }}</td><td>{{ $lk($mri['mtd']['op']['revenue'] ?? 0) }}</td></tr>
            <tr><td>MRI IP Revenue (₹ Lakhs)</td><td>{{ $lk($mri['ftd']['ip']['revenue'] ?? 0) }}</td><td>{{ $lk($mri['mtd']['ip']['revenue'] ?? 0) }}</td></tr>
        </tbody>
    </table>

    @if(($pkg['ftd'] ?? 0) > 0 || ($pkg['mtd'] ?? 0) > 0)
    <table>
        <thead>
            <tr><th colspan="3" class="section-header">PACKAGE ADJUSTMENT (Chromepet)</th></tr>
            <tr><th style="width:40%">Item</th><th>FTD</th><th>MTD</th></tr>
        </thead>
        <tbody>
            <tr><td>Pkg Consumption → PH</td><td>{{ $lk($pkg['ftd']) }}</td><td>{{ $lk($pkg['mtd']) }}</td></tr>
        </tbody>
    </table>
    @endif

    <div class="footer">
        Hospital MIS Reporting System · Generated {{ now()->format('d-M-Y H:i') }}
    </div>
</body>
</html>
