import EChart, { tooltipRupee, tooltipCount, axisLabel, gridDefault } from './EChart';
import { ChartSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toLakhs } from '../../utils/formatters';
import { CHART_PALETTE } from '../../constants';
import { Activity } from 'lucide-react';

const AXIS = { axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } };

// ─── Admissions vs Discharges ──────────────────────────────────────────────────
export const AdmissionsChart = ({ data, isLoading, height = 220 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState icon={Activity} title="No admissions data" description="IP admission data will appear here once imported." />;

    const dates = data.map(d => d.date?.slice(5) || d.date);
    const adm   = data.map(d => d.admissions || d.admission_count || 0);
    const dis   = data.map(d => d.discharges  || d.discharge_count  || 0);

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 36 }),
            tooltip: tooltipCount(),
            legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11, color: '#64748b' } },
            xAxis: { type: 'category', data: dates, axisLabel: axisLabel(), ...AXIS },
            yAxis: { type: 'value', axisLabel: axisLabel(), ...AXIS },
            series: [
                { name: 'Admissions', type: 'bar', data: adm, barMaxWidth: 20,
                  itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#1d4ed8' }, { offset: 1, color: '#3b82f6' }] } } },
                { name: 'Discharges', type: 'bar', data: dis, barMaxWidth: 20,
                  itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#059669' }, { offset: 1, color: '#10b981' }] } } },
            ],
        }} />
    );
};

// ─── Department Revenue ────────────────────────────────────────────────────────
export const DeptRevenueChart = ({ data, isLoading, height = 220 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    const depts = data?.by_department || data?.by_dept || [];
    if (!depts.length) return <EmptyState title="No department revenue data" description="Bill items data will populate this chart." />;

    const rows   = depts.slice(0, 8);
    const names  = rows.map(d => (d.department || d.dept_name || '').substring(0, 18));
    const values = rows.map(d => toLakhs(d.total_revenue || d.revenue));

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 110, right: 50, top: 8, bottom: 8 }),
            tooltip: { ...tooltipRupee(), trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L` },
            xAxis: { type: 'value', axisLabel: { ...axisLabel(), formatter: v => `₹${v}L` }, ...AXIS },
            yAxis: { type: 'category', data: names, axisLabel: axisLabel({ fontSize: 9 }), ...AXIS },
            series: [{
                type: 'bar', data: values, barMaxWidth: 16,
                itemStyle: { borderRadius: [0, 4, 4, 0] },
                colorBy: 'data',
                color: CHART_PALETTE,
                label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' },
            }],
        }} />
    );
};

// ─── Pharmacy Revenue Trend ────────────────────────────────────────────────────
export const PharmacyTrendChart = ({ data, isLoading, height = 180 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState title="No pharmacy trend data" />;

    const dates  = data.map(d => (d.day || d.date)?.slice(5) || d.day || d.date);
    const values = data.map(d => toLakhs(d.ph_revenue || d.pharmacy_revenue || d.pharmacy || 0));
    const max    = Math.max(...values);

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 48, top: 8 }),
            tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)' },
            xAxis: { type: 'category', data: dates, axisLabel: axisLabel(), ...AXIS },
            yAxis: { type: 'value', axisLabel: { ...axisLabel(), formatter: v => `₹${v}L` }, ...AXIS },
            markLine: max > 0 ? { data: [{ yAxis: max * 0.8, lineStyle: { color: '#d97706', type: 'dashed', opacity: 0.35 } }], silent: true } : undefined,
            series: [{
                type: 'line', data: values, smooth: 0.3,
                symbol: 'none', lineStyle: { color: '#d97706', width: 2 },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(217,119,6,0.22)' }, { offset: 1, color: 'rgba(217,119,6,0)' }] } },
            }],
        }} />
    );
};

// ─── Bed Occupancy Chart ───────────────────────────────────────────────────────
export const BedOccupancyChart = ({ data, occupancyPct, isLoading, height = 180 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length && !occupancyPct) return <EmptyState title="No occupancy data" description="IP admission report required." />;

    const chartData = data?.length
        ? data.map(d => ({ date: (d.day || d.date)?.slice(5) || d.day || d.date, occ: +Number(d.occupancy_pct || 0).toFixed(1) }))
        : [{ date: 'FTD', occ: +Number(occupancyPct || 0).toFixed(1) }];

    const pct       = Number(occupancyPct || 0);
    const lineColor = pct >= 80 ? '#dc2626' : pct >= 60 ? '#d97706' : '#0891b2';

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 40, top: 8 }),
            tooltip: { trigger: 'axis', valueFormatter: v => `${v}%`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)' },
            xAxis: { type: 'category', data: chartData.map(d => d.date), axisLabel: axisLabel(), ...AXIS },
            yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisLabel(), formatter: v => `${v}%` }, ...AXIS },
            markLine: {
                data: [{ yAxis: 80, lineStyle: { color: '#dc2626', type: 'dashed', opacity: 0.4 }, label: { formatter: '80%', fontSize: 9, color: '#dc2626' } }],
                silent: true, symbol: 'none',
            },
            series: [{
                type: 'line', data: chartData.map(d => d.occ), smooth: 0.2,
                symbol: 'circle', symbolSize: 6,
                lineStyle: { color: lineColor, width: 2.5 },
                itemStyle: { color: lineColor, borderColor: '#fff', borderWidth: 2 },
            }],
        }} />
    );
};

// ─── Revenue Trend ─────────────────────────────────────────────────────────────
export const RevenueTrendChart = ({ data, isLoading, height = 240 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState title="No trend data" description="Upload bill items to see revenue trends." />;

    const dates = data.map(d => (d.day || d.date)?.slice(5) || d.day || d.date);
    const total = data.map(d => toLakhs(d.revenue || d.total_revenue || d.ftd_revenue));
    const op    = data.map(d => toLakhs(d.op_revenue));
    const ip    = data.map(d => toLakhs(d.ip_revenue));

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 48 }),
            tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)' },
            legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11, color: '#64748b' } },
            xAxis: { type: 'category', data: dates, axisLabel: axisLabel(), ...AXIS },
            yAxis: { type: 'value', axisLabel: { ...axisLabel(), formatter: v => `₹${v}L` }, ...AXIS },
            series: [
                { name: 'Total', type: 'line', data: total, smooth: 0.3, symbol: 'none', lineStyle: { color: '#1d4ed8', width: 2.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(29,78,216,0.16)' }, { offset: 1, color: 'rgba(29,78,216,0)' }] } } },
                { name: 'OP',    type: 'line', data: op,    smooth: 0.3, symbol: 'none', lineStyle: { color: '#059669', width: 1.5, type: 'dashed' } },
                { name: 'IP',    type: 'line', data: ip,    smooth: 0.3, symbol: 'none', lineStyle: { color: '#7c3aed', width: 1.5, type: 'dashed' } },
            ],
        }} />
    );
};

// ─── Patient Mix Bar Chart ─────────────────────────────────────────────────────
export const PatientMixChartE = ({ data, isLoading, height = 200 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState title="No patient mix data" />;

    const dates = data.map(d => (d.day || d.date)?.slice(5) || d.day || d.date);
    const op    = data.map(d => d.op ?? d.op_count ?? 0);
    const ip    = data.map(d => d.ip ?? d.ip_count ?? 0);
    const er    = data.map(d => d.er ?? d.er_count ?? 0);

    return (
        <EChart height={height} option={{
            grid: gridDefault({ left: 36 }),
            tooltip: tooltipCount(),
            legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11, color: '#64748b' } },
            xAxis: { type: 'category', data: dates, axisLabel: axisLabel(), ...AXIS },
            yAxis: { type: 'value', axisLabel: axisLabel(), ...AXIS },
            series: [
                { name: 'OP', type: 'bar', data: op, barMaxWidth: 18, stack: 'vol', itemStyle: { color: '#1d4ed8' } },
                { name: 'IP', type: 'bar', data: ip, barMaxWidth: 18, stack: 'vol', itemStyle: { color: '#7c3aed' } },
                { name: 'ER', type: 'bar', data: er, barMaxWidth: 18, stack: 'vol', itemStyle: { color: '#d97706', borderRadius: [4, 4, 0, 0] } },
            ],
        }} />
    );
};

// ─── Payer Donut Chart ─────────────────────────────────────────────────────────
export const PayerChartE = ({ data, isLoading, height = 180 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState title="No payer data" />;

    const rows = data.slice(0, 8).map((d, i) => ({
        name:  d.payer_type || d.payer_name || d.payer || 'Unknown',
        value: toLakhs(d.amount || d.total_amount),
        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
    }));

    return (
        <div className="flex items-center gap-4">
            <EChart height={height} style={{ width: '45%', flexShrink: 0 }} option={{
                tooltip: { trigger: 'item', formatter: p => `${p.name}: ₹${p.value}L (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)' },
                series: [{
                    type: 'pie', radius: ['44%', '70%'], center: ['50%', '50%'],
                    data: rows, label: { show: false }, labelLine: { show: false },
                    itemStyle: { borderWidth: 2, borderColor: '#fff' },
                }],
            }} />
            <div className="flex-1 space-y-1.5 min-w-0">
                {rows.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[11px]">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                        <span className="font-700 text-slate-800">₹{d.value}L</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
