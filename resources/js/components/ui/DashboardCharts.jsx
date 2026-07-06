import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts';
import { ChartSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toLakhs, fmtRupee } from '../../utils/formatters';
import { CHART_PALETTE } from '../../constants';
import { TrendingDown, Activity } from 'lucide-react';

const TOOLTIP_STYLE = {
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)',
    fontSize: 12,
    padding: '8px 12px',
};

const AXIS_TICK_STYLE = { fontSize: 10, fill: '#94a3b8' };

// ─── Admissions vs Discharges ──────────────────────────────────────
export const AdmissionsChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={220} />;
    if (!data?.length) return <EmptyState icon={Activity} title="No admissions data" description="IP admission data will appear here once imported." />;
    const chartData = data.map(d => ({
        date:       d.date?.slice(5) || d.date,
        Admissions: d.admissions || d.admission_count || 0,
        Discharges: d.discharges || d.discharge_count || 0,
    }));
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <defs>
                    <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="disGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="Admissions" fill="url(#admGrad)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Discharges" fill="url(#disGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── Department Revenue ────────────────────────────────────────────
export const DeptRevenueChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={220} />;
    const depts = data?.by_department || data?.by_dept || [];
    if (!depts.length) return <EmptyState title="No department revenue data" description="Bill items data will populate this chart." />;
    const chartData = depts.slice(0, 8).map(d => ({
        dept:    (d.department || d.dept_name || '').substring(0, 16),
        revenue: toLakhs(d.total_revenue || d.revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                <XAxis
                    type="number" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}L`}
                />
                <YAxis
                    type="category" dataKey="dept" tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false} tickLine={false} width={100}
                />
                <Tooltip
                    formatter={v => [`₹${v}L`, 'Revenue']}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── Pharmacy Revenue Trend ────────────────────────────────────────
export const PharmacyTrendChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={180} />;
    if (!data?.length) return <EmptyState title="No pharmacy trend data" />;
    const chartData = data.map(d => ({
        date:     (d.day || d.date)?.slice(5) || d.day || d.date,
        pharmacy: toLakhs(d.ph_revenue || d.pharmacy_revenue || d.pharmacy || 0),
    }));
    const max = Math.max(...chartData.map(d => d.pharmacy));
    return (
        <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="pharmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#d97706" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0}    />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
                {max > 0 && <ReferenceLine y={max * 0.8} stroke="#d97706" strokeDasharray="4 3" strokeOpacity={0.3} />}
                <Tooltip formatter={v => [`₹${v}L`, 'Pharmacy']} contentStyle={TOOLTIP_STYLE} />
                <Area
                    type="monotone" dataKey="pharmacy"
                    stroke="#d97706" strokeWidth={2}
                    fill="url(#pharmGrad)"
                    dot={false} activeDot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Bed Occupancy Chart ───────────────────────────────────────────
export const BedOccupancyChart = ({ data, occupancyPct, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={180} />;
    if (!data?.length && !occupancyPct) return <EmptyState title="No occupancy data" description="IP admission report required." />;
    const chartData = data?.length
        ? data.map(d => ({ date: (d.day || d.date)?.slice(5) || d.day || d.date, occupancy: +Number(d.occupancy_pct || 0).toFixed(1) }))
        : [{ date: 'FTD', occupancy: +Number(occupancyPct || 0).toFixed(1) }];

    const pct = Number(occupancyPct || 0);
    const lineColor = pct >= 80 ? '#dc2626' : pct >= 60 ? '#d97706' : '#0891b2';

    return (
        <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={lineColor} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0}    />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 3" strokeOpacity={0.35} label={{ value: '80%', position: 'insideTopRight', fontSize: 9, fill: '#dc2626' }} />
                <Tooltip formatter={v => [`${v}%`, 'Occupancy']} contentStyle={TOOLTIP_STYLE} />
                <Line
                    type="monotone" dataKey="occupancy"
                    stroke={lineColor} strokeWidth={2.5}
                    dot={{ r: 3, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

// ─── Revenue Trend (exported for use in Dashboard) ─────────────────
export const RevenueTrendChart = ({ data, isLoading, height = 240 }) => {
    if (isLoading) return <ChartSkeleton height={height} />;
    if (!data?.length) return <EmptyState title="No trend data" description="Upload bill items to see revenue trends." />;
    const chartData = data.map(d => ({
        date: (d.day || d.date)?.slice(5) || d.day || d.date,
        ftd:  toLakhs(d.revenue || d.total_revenue || d.ftd_revenue),
        op:   toLakhs(d.op_revenue),
        ip:   toLakhs(d.ip_revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradTotal2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#1d4ed8" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gradOp2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#059669" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0}   />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
                <Tooltip
                    formatter={(v, n) => [`₹${v}L`, n.toUpperCase()]}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1 }}
                />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Area type="monotone" dataKey="ftd"  name="Total" stroke="#1d4ed8" fill="url(#gradTotal2)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="op"   name="OP"    stroke="#059669" fill="url(#gradOp2)"   strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                <Area type="monotone" dataKey="ip"   name="IP"    stroke="#7c3aed" fill="none"            strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
};
