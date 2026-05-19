<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MIS Report - {{ $data['branch'] ?? '' }} - {{ $data['date'] ?? '' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #000; padding: 20px; }
        table { border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 5px 8px; text-align: center; }
        td:first-child { text-align: left; font-weight: bold; }
        th { font-weight: bold; }
        .center-bold { text-align: center !important; font-weight: bold; }
        .table-1 { width: 100%; }
        .table-2 { width: 45%; }
    </style>
</head>
<body>

    @php
        $sales = $data['sales'] ?? [];
        $col   = $data['collection'] ?? [];
        $disc  = $data['discount'] ?? [];
        $ref   = $data['refund'] ?? [];
        $vol   = $data['volume'] ?? [];
        $mri   = $data['mri'] ?? [];

        $lk = fn($v) => number_format(($v ?? 0) / 100000, 2);
        
        $pct = fn($v) => number_format($v ?? 0, 0) . '%';
        
        $num = fn($v) => number_format($v ?? 0, 0, '', '');

        $abs = fn($v) => '₹ ' . number_format($v ?? 0, 0, '', '');

        $formattedDate = isset($data['date']) ? date('d/m/Y', strtotime($data['date'])) : '';
    @endphp

    <table class="table-1">
        <thead>
            <tr>
                <th colspan="11" class="center-bold" style="padding: 8px;">MIS - DATE {{ $formattedDate }}</th>
            </tr>
            <tr>
                <th rowspan="2" style="width: 14%; vertical-align: middle;">REVENUE</th>
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
                <td>{{ $lk(($sales['ftd']['op'] ?? 0)+($sales['ftd']['ip'] ?? 0)+($sales['ftd']['er'] ?? 0)+($sales['ftd']['ph'] ?? 0)) }}</td>
                <td>{{ $lk($sales['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($sales['mtd']['ph'] ?? 0) }}</td>
                <td>{{ $lk(($sales['mtd']['op'] ?? 0)+($sales['mtd']['ip'] ?? 0)+($sales['mtd']['er'] ?? 0)+($sales['mtd']['ph'] ?? 0)) }}</td>
            </tr>
            <tr>
                <td>Collection</td>
                <td>{{ $lk($col['ftd']['op'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['er'] ?? 0) }}</td>
                <td>{{ $lk($col['ftd']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($col['ftd'] ?? [])) }}</td>
                <td>{{ $lk($col['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($col['mtd']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($col['mtd'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Discount 99%</td>
                <td>{{ $lk($disc['ftd']['partial']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['partial']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($disc['ftd']['partial'] ?? [])) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['partial']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($disc['mtd']['partial'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Discount 100%</td>
                <td>{{ $lk($disc['ftd']['full']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['ftd']['full']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($disc['ftd']['full'] ?? [])) }}</td>
                <td>{{ $lk($disc['mtd']['full']['op'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['ip'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['er'] ?? 0) }}</td>
                <td>{{ $lk($disc['mtd']['full']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($disc['mtd']['full'] ?? [])) }}</td>
            </tr>
            <tr>
                <td>Refund</td>
                <td>{{ $lk($ref['ftd']['op'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['er'] ?? 0) }}</td>
                <td>{{ $lk($ref['ftd']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($ref['ftd'] ?? [])) }}</td>
                <td>{{ $lk($ref['mtd']['op'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['ip'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['er'] ?? 0) }}</td>
                <td>{{ $lk($ref['mtd']['ph'] ?? 0) }}</td>
                <td>{{ $lk(array_sum($ref['mtd'] ?? [])) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="table-2">
        <thead>
            <tr>
                <th style="width: 50%;"></th>
                <th>FTD</th>
                <th>MTD</th>
            </tr>
            <tr>
                <th colspan="3" class="center-bold">Volume indicators</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Occupancy</td>
                <td>{{ $num($vol['ftd']['occupancy'] ?? 0) }}</td>
                <td>{{ $num($vol['mtd']['occupancy'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Occupancy %</td>
                <td>{{ $pct($vol['ftd']['occupancy_pct'] ?? 0) }}</td>
                <td>{{ $pct($vol['mtd']['occupancy_pct'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Admission</td>
                <td>{{ $num($vol['ftd']['admission'] ?? 0) }}</td>
                <td>{{ $num($vol['mtd']['admission'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Discharge</td>
                <td>{{ $num($vol['ftd']['discharge'] ?? 0) }}</td>
                <td>{{ $num($vol['mtd']['discharge'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>Total OP</td>
                <td>{{ $num($vol['ftd']['total_op'] ?? 0) }}</td>
                <td>{{ $num($vol['mtd']['total_op'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>MRI OP</td>
                <td>{{ $num($mri['ftd']['op']['count'] ?? 0) }}</td>
                <td>{{ $num($mri['mtd']['op']['count'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>MRI IP</td>
                <td>{{ $num($mri['ftd']['ip']['count'] ?? 0) }}</td>
                <td>{{ $num($mri['mtd']['ip']['count'] ?? 0) }}</td>
            </tr>
            <tr>
                <th colspan="3" class="center-bold">Revenue</th>
            </tr>
            <tr>
                <td>MRI OP</td>
                <td>{{ $abs($mri['ftd']['op']['revenue'] ?? 0) }}</td>
                <td>{{ $abs($mri['mtd']['op']['revenue'] ?? 0) }}</td>
            </tr>
            <tr>
                <td>MRI IP</td>
                <td>{{ $abs($mri['ftd']['ip']['revenue'] ?? 0) }}</td>
                <td>{{ $abs($mri['mtd']['ip']['revenue'] ?? 0) }}</td>
            </tr>
        </tbody>
    </table>

</body>
</html>
