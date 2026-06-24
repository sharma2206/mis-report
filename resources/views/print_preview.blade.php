<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIS Report — {{ ucfirst($branch) }} — {{ $date }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 20px; }
        h1 { font-size: 15px; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #555; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ccc; padding: 4px 7px; text-align: right; }
        th { background: #dce8f7; font-weight: 700; text-align: center; }
        td:first-child, th:first-child { text-align: left; }
        .super-header th { background: #bcd4ef; }
        .section-title { font-weight: 700; font-size: 12px; margin: 12px 0 4px; }
        .total-row td { font-weight: 700; background: #f0f4fa; }
        .footer { text-align: center; font-size: 9px; color: #888; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print {
            body { padding: 8px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>

<div class="no-print" style="text-align:center; margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 20px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
        🖨 Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding:8px 16px; margin-left:8px; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-size:13px;">
        Close
    </button>
</div>

<h1>MIS Report — {{ ucfirst($data['branch'] ?? $branch) }} — {{ $date }}</h1>
<p class="subtitle">Generated: {{ $data['generated_at'] ?? now() }}</p>

@php
    $s    = $data['sales']      ?? [];
    $c    = $data['collection'] ?? [];
    $dc   = $data['discount']   ?? [];
    $r    = $data['refund']     ?? [];
    $v    = $data['volume']     ?? [];
    $m    = $data['mri']        ?? [];
    $t    = $data['totals']     ?? [];
    $pkg  = $data['pkg_adjustment'] ?? ['ftd' => 0, 'mtd' => 0];
    $cols = ['op', 'ip', 'er', 'ph'];
    function lkv($val) { return number_format(($val ?? 0) / 100000, 2); }
@endphp

{{-- Revenue Breakdown --}}
<p class="section-title">Revenue Breakdown (₹ in Lakhs)</p>
<table>
    <thead>
        <tr class="super-header">
            <th></th>
            <th colspan="5">FTD ({{ $date }})</th>
            <th colspan="5">MTD</th>
        </tr>
        <tr>
            <th>Category</th>
            @foreach($cols as $k) <th>{{ strtoupper($k) }}</th> @endforeach
            <th>Total</th>
            @foreach($cols as $k) <th>{{ strtoupper($k) }}</th> @endforeach
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach([['Sales',$s],['Collection',$c]] as [$label, $d])
        <tr>
            <td>{{ $label }}</td>
            @foreach($cols as $k) <td>{{ lkv($d['ftd'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($d['ftd'] ?? [])) }}</strong></td>
            @foreach($cols as $k) <td>{{ lkv($d['mtd'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($d['mtd'] ?? [])) }}</strong></td>
        </tr>
        @endforeach
        <tr>
            <td>Discount 99%</td>
            @foreach($cols as $k) <td>{{ lkv($dc['ftd']['partial'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($dc['ftd']['partial'] ?? [])) }}</strong></td>
            @foreach($cols as $k) <td>{{ lkv($dc['mtd']['partial'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($dc['mtd']['partial'] ?? [])) }}</strong></td>
        </tr>
        <tr>
            <td>Discount 100%</td>
            @foreach($cols as $k) <td>{{ lkv($dc['ftd']['full'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($dc['ftd']['full'] ?? [])) }}</strong></td>
            @foreach($cols as $k) <td>{{ lkv($dc['mtd']['full'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($dc['mtd']['full'] ?? [])) }}</strong></td>
        </tr>
        <tr>
            <td>Refund</td>
            @foreach($cols as $k) <td>{{ lkv($r['ftd'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($r['ftd'] ?? [])) }}</strong></td>
            @foreach($cols as $k) <td>{{ lkv($r['mtd'][$k] ?? 0) }}</td> @endforeach
            <td><strong>{{ lkv(array_sum($r['mtd'] ?? [])) }}</strong></td>
        </tr>
        <tr class="total-row">
            <td>Grand Total (Sales)</td>
            <td colspan="{{ count($cols) }}"></td>
            <td>{{ lkv($t['sales_ftd'] ?? 0) }}</td>
            <td colspan="{{ count($cols) }}"></td>
            <td>{{ lkv($t['sales_mtd'] ?? 0) }}</td>
        </tr>
    </tbody>
</table>

{{-- Volume --}}
<p class="section-title">Volume Indicators</p>
<table>
    <thead>
        <tr><th>Metric</th><th>FTD</th><th>MTD</th></tr>
    </thead>
    <tbody>
        @foreach([
            ['Occupancy', $v['ftd']['occupancy'] ?? 0, $v['mtd']['occupancy'] ?? 0],
            ['Occupancy %', ($v['ftd']['occupancy_pct'] ?? 0).'%', ($v['mtd']['occupancy_pct'] ?? 0).'%'],
            ['Admissions', $v['ftd']['admission'] ?? 0, $v['mtd']['admission'] ?? 0],
            ['Discharges', $v['ftd']['discharge'] ?? 0, $v['mtd']['discharge'] ?? 0],
            ['Total OP', $v['ftd']['total_op'] ?? 0, $v['mtd']['total_op'] ?? 0],
        ] as [$label, $ftd, $mtd])
        <tr><td>{{ $label }}</td><td>{{ $ftd }}</td><td>{{ $mtd }}</td></tr>
        @endforeach
        @if(($data['branch_key'] ?? '') === 'oragadam')
        <tr><td>Total ER</td><td>{{ $v['ftd']['er_count'] ?? 0 }}</td><td>{{ $v['mtd']['er_count'] ?? 0 }}</td></tr>
        @endif
        @if(($data['branch_key'] ?? '') === 'chromepet')
        <tr><td>MRI OP (count)</td><td>{{ $m['ftd']['op']['count'] ?? 0 }}</td><td>{{ $m['mtd']['op']['count'] ?? 0 }}</td></tr>
        <tr><td>MRI IP (count)</td><td>{{ $m['ftd']['ip']['count'] ?? 0 }}</td><td>{{ $m['mtd']['ip']['count'] ?? 0 }}</td></tr>
        <tr><td>MRI OP Revenue</td><td>₹{{ number_format($m['ftd']['op']['revenue'] ?? 0) }}</td><td>₹{{ number_format($m['mtd']['op']['revenue'] ?? 0) }}</td></tr>
        <tr><td>MRI IP Revenue</td><td>₹{{ number_format($m['ftd']['ip']['revenue'] ?? 0) }}</td><td>₹{{ number_format($m['mtd']['ip']['revenue'] ?? 0) }}</td></tr>
        @if(($pkg['ftd'] ?? 0) > 0)
        <tr><td>Package Adjustment (PH+, IP−)</td><td>₹{{ number_format($pkg['ftd']) }}</td><td>₹{{ number_format($pkg['mtd']) }}</td></tr>
        @endif
        @endif
    </tbody>
</table>

<div class="footer">Confidential — for internal use only &nbsp;|&nbsp; {{ ucfirst($data['branch'] ?? $branch) }} &nbsp;|&nbsp; {{ $date }}</div>

</body>
</html>
