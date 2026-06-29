import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { selectToken } from '../store/authSlice';
import { selectBranch as selBranch, selectDate as selDate, selectActiveTab } from '../store/reportSlice';
import { useDashboard } from '../hooks/useDashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { Topbar } from '../components/layout/Topbar';
import { KPISkeleton, TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { RankedList, PayerChips } from '../components/ui/RankedList';
import { fmtL, fmtRupee, fmtPct, toLakhs, cfClass } from '../utils/formatters';
import { CHART_PALETTE } from '../constants';
import { misApi } from '../services/api';
import { cn } from '../utils/cn';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ label, ftd, mtd, icon: Icon, color = 'blue', format = 'rupee' }) => {
    const fmt = (v) => format === 'rupee' ? fmtL(v) : format === 'pct' ? fmtPct(v) : String(v ?? 0);
    const colors = {
        blue:   'from-blue-500 to-blue-700',
        green:  'from-emerald-500 to-emerald-700',
        violet: 'from-violet-500 to-violet-700',
        amber:  'from-amber-500 to-amber-700',
        red:    'from-red-500 to-red-700',
        cyan:   'from-cyan-500 to-cyan-700',
    };
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    {Icon && <Icon className="w-4 h-4 text-white" />}
                </div>
                <Badge variant={color === 'green' ? 'green' : color === 'amber' ? 'amber' : 'blue'}>FTD</Badge>
            </div>
            <p className="text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-[1.35rem] font-800 text-slate-900 leading-none mb-1">{fmt(ftd)}</p>
            {mtd !== undefined && (
                <p className="text-[11px] text-slate-400">MTD <span className="font-600 text-slate-600">{fmt(mtd)}</span></p>
            )}
        </motion.div>
    );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, children, action }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <span className="text-[12px] font-700 uppercase tracking-wider text-slate-500">{title}</span>
            {action && <div className="ml-auto">{action}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ─── Revenue Table ────────────────────────────────────────────────────────────
const REV_ROWS = [
    { key: 'op',        label: 'OP Revenue' },
    { key: 'ip',        label: 'IP Revenue' },
    { key: 'er',        label: 'ER Revenue' },
    { key: 'pharmacy',  label: 'Pharmacy' },
    { key: 'packages',  label: 'Packages' },
    { key: 'mri',       label: 'MRI / Scan' },
];

const RevenueTable = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={8} cols={4} />;
    if (!mis) return <EmptyState title="No revenue data" description="Load a report to see revenue breakdown." />;
    const ftd = mis.revenue?.ftd || {};
    const mtd = mis.revenue?.mtd || {};
    const rows = REV_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined);
    const totalFtd = rows.reduce((a, r) => a + (Number(ftd[r.key]) || 0), 0);
    const totalMtd = rows.reduce((a, r) => a + (Number(mtd[r.key]) || 0), 0);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 pr-4 font-700">Category</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD (₹)</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD (L)</th>
                        <th className="pb-2 text-right font-700">MTD (L)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, label }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2 pr-4 font-500 text-slate-700">{label}</td>
                            <td className={`py-2 pr-4 text-right font-600 ${cfClass(toLakhs(ftd[key]))}`}>{fmtRupee(ftd[key])}</td>
                            <td className={`py-2 pr-4 text-right font-700 ${cfClass(toLakhs(ftd[key]))}`}>{fmtL(ftd[key])}</td>
                            <td className="py-2 text-right font-600 text-slate-500">{fmtL(mtd[key])}</td>
                        </tr>
                    ))}
                    <tr className="font-700 bg-slate-50 border-t-2 border-slate-200">
                        <td className="py-2.5 pr-4 text-slate-800">Total</td>
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totalFtd))}`}>{fmtRupee(totalFtd)}</td>
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totalFtd))}`}>{fmtL(totalFtd)}</td>
                        <td className="py-2.5 text-right text-slate-600">{fmtL(totalMtd)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// ─── Volume Grid ──────────────────────────────────────────────────────────────
const VOLUME_ROWS = [
    { key: 'op_count',      label: 'OP Patients' },
    { key: 'ip_count',      label: 'IP Patients' },
    { key: 'er_count',      label: 'ER Patients' },
    { key: 'admission',     label: 'Admissions' },
    { key: 'discharge',     label: 'Discharges' },
    { key: 'pharmacy_bills',label: 'Pharmacy Bills' },
    { key: 'package_count', label: 'Packages' },
    { key: 'mri_count',     label: 'MRI / Scans' },
    { key: 'surgery_count', label: 'Surgeries' },
    { key: 'occupancy',     label: 'Beds Occupied' },
    { key: 'occupancy_pct', label: 'Occupancy %' },
];

const VolumeGrid = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={3} />;
    if (!mis) return <EmptyState title="No volume data" />;
    const ftd = mis.volume?.ftd || {};
    const mtd = mis.volume?.mtd || {};
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 pr-4 font-700">Metric</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD</th>
                        <th className="pb-2 text-right font-700">MTD</th>
                    </tr>
                </thead>
                <tbody>
                    {VOLUME_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined).map(({ key, label }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2 pr-4 font-500 text-slate-700">{label}</td>
                            <td className="py-2 pr-4 text-right font-700 text-blue-700">
                                {key === 'occupancy_pct' ? fmtPct(ftd[key]) : (ftd[key] ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-slate-500 font-600">
                                {key === 'occupancy_pct' ? fmtPct(mtd[key]) : (mtd[key] ?? 0).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Daily Trend Chart ────────────────────────────────────────────────────────
const TrendChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={240} />;
    if (!data?.length) return <EmptyState title="No trend data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        ftd: toLakhs(d.total_revenue || d.ftd_revenue),
        op:  toLakhs(d.op_revenue),
        ip:  toLakhs(d.ip_revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
                <Tooltip formatter={(v, n) => [`₹${v}L`, n.toUpperCase()]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="ftd" stroke="#1d4ed8" fill="url(#gradTotal)" strokeWidth={2} dot={false} name="Total" />
                <Area type="monotone" dataKey="op" stroke="#059669" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="OP" />
                <Area type="monotone" dataKey="ip" stroke="#7c3aed" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="IP" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Payer Mix Chart ──────────────────────────────────────────────────────────
const PayerChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No payer data" />;
    const chartData = data.slice(0, 8).map(d => ({
        name: d.payer_name || d.payer || 'Unknown',
        value: toLakhs(d.amount || d.total_amount),
    }));
    return (
        <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" strokeWidth={1} stroke="#fff">
                        {chartData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`₹${v}L`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
                {chartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[12px]">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                        <span className="font-700 text-slate-800">₹{d.value}L</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Patient Mix Bar Chart ────────────────────────────────────────────────────
const PatientMixChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No patient mix data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        OP: d.op_count || 0,
        IP: d.ip_count || 0,
        ER: d.er_count || 0,
    }));
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="OP" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="IP" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ER" fill="#d97706" radius={[2, 2, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── IP Demographics ──────────────────────────────────────────────────────────
const IPDemographics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={4} />;
    if (!data) return <EmptyState title="No IP demographics data" />;
    const admissions = data.admissions || [];
    const ageGroups  = data.age_groups || data.ageGroups || [];
    return (
        <div className="space-y-4">
            {admissions.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Recent Admissions</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th className="pb-1.5 pr-3">Patient</th>
                                    <th className="pb-1.5 pr-3">Ward</th>
                                    <th className="pb-1.5 pr-3">Doctor</th>
                                    <th className="pb-1.5 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admissions.slice(0, 8).map((a, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-1.5 pr-3 font-600 text-slate-700">{a.patient_name || a.name}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{a.ward || a.room || '—'}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{a.doctor_name || a.doctor || '—'}</td>
                                        <td className="py-1.5 text-right text-slate-400">{a.admission_date?.slice(5) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {ageGroups.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Age Distribution</p>
                    <div className="grid grid-cols-3 gap-2">
                        {ageGroups.map((g, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-slate-500 font-700 mb-0.5">{g.age_group || g.group}</div>
                                <div className="text-[15px] font-800 text-blue-700">{g.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Surgery Detail ───────────────────────────────────────────────────────────
const SurgeryDetail = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={4} />;
    if (!data) return <EmptyState title="No surgery data" description="Upload a surgery file to see details." />;
    const surgeries = data.surgeries || data.list || [];
    const bySurgeon = data.by_surgeon || data.bySurgeon || [];
    return (
        <div className="space-y-4">
            {bySurgeon.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Surgeon</p>
                    <RankedList items={bySurgeon} nameKey="surgeon_name" valueKey="count" barColor="#1d4ed8" />
                </div>
            )}
            {surgeries.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Recent Surgeries</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th className="pb-1.5 pr-3">Patient</th>
                                    <th className="pb-1.5 pr-3">Procedure</th>
                                    <th className="pb-1.5 pr-3">Surgeon</th>
                                    <th className="pb-1.5 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {surgeries.slice(0, 10).map((s, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-1.5 pr-3 font-600 text-slate-700">{s.patient_name || s.patient}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{s.procedure_name || s.procedure}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{s.surgeon_name || s.surgeon}</td>
                                        <td className="py-1.5 text-right text-slate-400">{s.surgery_date?.slice(5) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!bySurgeon.length && !surgeries.length && (
                <EmptyState title="No surgeries recorded" description="No surgeries found for selected date." />
            )}
        </div>
    );
};

// ─── OP Metrics ───────────────────────────────────────────────────────────────
const OPMetrics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={3} />;
    if (!data) return <EmptyState title="No OP metrics" />;
    const byDoctor  = data.by_doctor  || data.byDoctor  || [];
    const byDept    = data.by_dept    || data.byDept    || [];
    const summary   = data.summary    || {};
    return (
        <div className="space-y-4">
            {Object.keys(summary).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {[
                        ['Total OPs',    summary.total_op || summary.op_count || 0],
                        ['New Patients', summary.new_patients || 0],
                        ['Reviews',      summary.review_patients || summary.reviews || 0],
                    ].map(([label, val]) => (
                        <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                            <div className="text-[10px] font-700 text-slate-500 uppercase mb-0.5">{label}</div>
                            <div className="text-[1.1rem] font-800 text-blue-700">{(val).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
            {byDoctor.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors by OP Count</p>
                    <RankedList items={byDoctor} nameKey="doctor_name" valueKey="op_count" barColor="#059669" />
                </div>
            )}
            {byDept.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p>
                    <RankedList items={byDept} nameKey="dept_name" valueKey="patient_count" barColor="#7c3aed" />
                </div>
            )}
        </div>
    );
};

// ─── Overview KPI strip ───────────────────────────────────────────────────────
import {
    TrendingUp, CreditCard, BedDouble, Users, Stethoscope,
    Package, ShoppingBag, Scan, Activity,
} from 'lucide-react';

const OverviewTab = ({ mis, kpi, trend, payer, mix, isLoading }) => {
    const ftdRev = mis?.revenue?.ftd || {};
    const mtdRev = mis?.revenue?.mtd || {};
    const ftdVol = mis?.volume?.ftd   || {};
    const mtdVol = mis?.volume?.mtd   || {};

    const kpis = [
        { label: 'Total Revenue',   ftd: ftdRev.total   || ftdRev.op + ftdRev.ip + ftdRev.er + ftdRev.pharmacy + ftdRev.packages + ftdRev.mri,
          mtd: mtdRev.total, icon: TrendingUp, color: 'blue' },
        { label: 'OP Revenue',      ftd: ftdRev.op,      mtd: mtdRev.op,      icon: CreditCard,   color: 'green' },
        { label: 'IP Revenue',      ftd: ftdRev.ip,      mtd: mtdRev.ip,      icon: BedDouble,    color: 'violet' },
        { label: 'Pharmacy',        ftd: ftdRev.pharmacy, mtd: mtdRev.pharmacy, icon: ShoppingBag, color: 'amber' },
        { label: 'Patients (FTD)',  ftd: ftdVol.op_count, mtd: mtdVol.op_count, icon: Users,       color: 'cyan', format: 'count' },
        { label: 'Admissions',      ftd: ftdVol.admission, mtd: mtdVol.admission, icon: Activity,  color: 'red',  format: 'count' },
    ];

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3"><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {kpis.map(k => <KPICard key={k.label} {...k} />)}
                </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Daily Revenue Trend (MTD)">
                        <TrendChart data={trend} isLoading={isLoading} />
                    </Section>
                </div>
                <div>
                    <Section title="Payer Mix (MTD)">
                        <PayerChart data={payer} isLoading={isLoading} />
                    </Section>
                </div>
            </div>
            <Section title="Patient Volume Trend">
                <PatientMixChart data={mix} isLoading={isLoading} />
            </Section>
        </div>
    );
};

// ─── Analytics Tab ────────────────────────────────────────────────────────────
const AnalyticsTab = ({ payer, mix, isLoading }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="Payer Mix Breakdown">
                <PayerChart data={payer} isLoading={isLoading} />
                {!isLoading && payer?.length > 0 && (
                    <div className="mt-3">
                        <PayerChips items={payer} nameKey="payer_name" countKey="patient_count" />
                    </div>
                )}
            </Section>
            <Section title="Patient Mix Trend">
                <PatientMixChart data={mix} isLoading={isLoading} />
            </Section>
        </div>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selBranch);
    const date   = useSelector(selDate);
    const tab    = useSelector(selectActiveTab);

    const [enabled, setEnabled] = useState(false);
    const { mis, kpi, trend, payer, mix, ipDemo, surgery, op, isLoading, isError, refetch } =
        useDashboard(enabled ? branch : null, enabled ? date : null);

    if (!token) return <Navigate to="/login" replace />;

    const handleLoad = useCallback(() => { setEnabled(true); refetch(); }, [refetch]);

    const handlePrint = () => {
        window.open(misApi.printPreview(branch, date), '_blank');
    };

    const tabContent = () => {
        switch (tab) {
            case 'overview':
                return <OverviewTab mis={mis} kpi={kpi} trend={trend} payer={payer} mix={mix} isLoading={isLoading} />;
            case 'revenue':
                return (
                    <div className="space-y-4">
                        <Section title="Revenue Breakdown">
                            <RevenueTable mis={mis} isLoading={isLoading} />
                        </Section>
                        <Section title="Daily Revenue Trend">
                            <TrendChart data={trend} isLoading={isLoading} />
                        </Section>
                    </div>
                );
            case 'volume':
                return (
                    <div className="space-y-4">
                        <Section title="Volume & MRI Metrics">
                            <VolumeGrid mis={mis} isLoading={isLoading} />
                        </Section>
                        <Section title="Patient Volume Trend">
                            <PatientMixChart data={mix} isLoading={isLoading} />
                        </Section>
                    </div>
                );
            case 'analytics':
                return <AnalyticsTab payer={payer} mix={mix} isLoading={isLoading} />;
            case 'ip':
                return (
                    <Section title="IP Admissions & Demographics">
                        <IPDemographics data={ipDemo} isLoading={isLoading} />
                    </Section>
                );
            case 'surgery':
                return (
                    <Section title="Surgery Analytics">
                        <SurgeryDetail data={surgery} isLoading={isLoading} />
                    </Section>
                );
            case 'op':
                return (
                    <Section title="OP Metrics">
                        <OPMetrics data={op} isLoading={isLoading} />
                    </Section>
                );
            default:
                return null;
        }
    };

    return (
        <AppLayout onPrint={handlePrint} topbar={
            <Topbar onLoad={handleLoad} isLoading={isLoading} onPrint={handlePrint} />
        }>
            <main className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                    {!enabled ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[60vh]">
                            <EmptyState
                                icon={Activity}
                                title="Select a branch and date"
                                description="Choose your branch and date above, then click Load Report to view the MIS dashboard."
                                action={
                                    <button onClick={handleLoad}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-violet-600 text-white text-[14px] font-700 rounded-lg shadow-md hover:opacity-90 transition-all cursor-pointer border-0">
                                        Load Report
                                    </button>
                                }
                            />
                        </motion.div>
                    ) : isError ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[60vh]">
                            <EmptyState
                                title="Failed to load report"
                                description="No data found for the selected branch and date. Try uploading data first."
                                action={
                                    <button onClick={handleLoad}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-[13px] font-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer border border-slate-200">
                                        Retry
                                    </button>
                                }
                            />
                        </motion.div>
                    ) : (
                        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            {tabContent()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </AppLayout>
    );
}
