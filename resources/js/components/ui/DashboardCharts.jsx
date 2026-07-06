import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { ChartSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { toLakhs, fmtRupee } from '../../utils/formatters';
import { CHART_PALETTE } from '../../constants';

const fmtIndia = (v) => `₹${Number(v||0).toLocaleString('en-IN', {maximumFractionDigits:0})}`;

// ─── Admissions vs Discharges ─────────────────────────────────
export const AdmissionsChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={220} />;
    if (!data?.length) return <EmptyState title="No admissions data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        Admissions: d.admissions || d.admission_count || 0,
        Discharges: d.discharges || d.discharge_count || 0,
    }));
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="Admissions" fill="#1d4ed8" radius={[3,3,0,0]} />
                <Bar dataKey="Discharges" fill="#059669" radius={[3,3,0,0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── Department Revenue ───────────────────────────────────────
export const DeptRevenueChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={220} />;
    const depts = data?.by_department || data?.by_dept || [];
    if (!depts.length) return <EmptyState title="No department revenue data" />;
    const chartData = depts.slice(0, 8).map(d => ({
        dept: (d.department || d.dept_name || '').substring(0, 14),
        revenue: toLakhs(d.total_revenue || d.revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top:4, right:40, left:0, bottom:0 }}>
                <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}L`} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize:10, fill:'#64748b' }}
                    axisLine={false} tickLine={false} width={96} />
                <Tooltip formatter={v => [`₹${v}L`, 'Revenue']} contentStyle={{ fontSize:12, borderRadius:8 }} />
                <Bar dataKey="revenue" radius={[0,3,3,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── Pharmacy Revenue Trend ───────────────────────────────────
export const PharmacyTrendChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={180} />;
    if (!data?.length) return <EmptyState title="No pharmacy trend data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        pharmacy: toLakhs(d.pharmacy_revenue || d.pharmacy || 0),
    }));
    return (
        <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <defs>
                    <linearGradient id="pharmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#d97706" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} />
                <Tooltip formatter={v => [`₹${v}L`, 'Pharmacy']} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="pharmacy" stroke="#d97706" fill="url(#pharmGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Bed Occupancy Trend ──────────────────────────────────────
export const BedOccupancyChart = ({ data, occupancyPct, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={180} />;
    if (!data?.length && !occupancyPct) return <EmptyState title="No occupancy data" />;
    const chartData = data?.length
        ? data.map(d => ({ date: d.date?.slice(5)||d.date, occupancy: Number(d.occupancy_pct||0).toFixed(1) }))
        : [{ date: 'FTD', occupancy: Number(occupancyPct||0).toFixed(1) }];
    return (
        <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${v}%`} domain={[0, 100]} />
                <Tooltip formatter={v => [`${v}%`, 'Occupancy']} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="occupancy" stroke="#0891b2" strokeWidth={2} dot={{ r:3, fill:'#0891b2' }} />
            </LineChart>
        </ResponsiveContainer>
    );
};
