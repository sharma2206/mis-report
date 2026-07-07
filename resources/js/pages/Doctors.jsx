import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import {
    Stethoscope, TrendingUp, Users, BedDouble, Filter, X,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES } from '../constants';
import { fmtL, fmtRupee } from '../utils/formatters';
import { monthStart } from '../utils/dateHelpers';
import { cn } from '../utils/cn';

const PALETTE = ['#1d4ed8','#7c3aed','#dc2626','#059669','#d97706','#0891b2','#9333ea','#ea580c','#0f766e','#be185d'];

const TOOLTIP_STYLE = {
    borderRadius: 10, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px',
};

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
            {Icon && (
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
            )}
            <span className="text-[12px] font-700 text-slate-700 flex-1">{title}</span>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const colHelper = createColumnHelper();

const TABLE_COLS = [
    colHelper.display({ id: 'rank', header: '#', cell: info => info.row.index + 1, meta: { className: 'w-8 text-center text-slate-400' }, enableSorting: false }),
    colHelper.accessor('treating_doctor', { header: 'Doctor', cell: info => <span className="font-600">{info.getValue() || '—'}</span>, meta: { className: 'min-w-[140px]' } }),
    colHelper.accessor('treating_doctor_speciality', { header: 'Speciality', cell: info => info.getValue() || '—', meta: { className: 'min-w-[110px] text-slate-500' } }),
    colHelper.accessor('total_revenue', { header: 'Revenue', cell: info => <span className="font-700 text-slate-800">{fmtL(info.getValue())}</span>, meta: { align: 'right' } }),
    colHelper.accessor('unique_patients', { header: 'Patients', cell: info => Number(info.getValue()).toLocaleString('en-IN'), meta: { align: 'right' } }),
    colHelper.accessor('op_revenue', { header: 'OP Rev', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    colHelper.accessor('ip_revenue', { header: 'IP Rev', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    colHelper.accessor('er_revenue', { header: 'ER Rev', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    colHelper.accessor('total_discount', { header: 'Discount', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    colHelper.accessor('ip_admissions', { header: 'IP Adm.', cell: info => info.getValue() ?? '—', meta: { align: 'right' } }),
    colHelper.accessor('avg_los', { header: 'Avg LOS', cell: info => info.getValue() != null ? Number(info.getValue()).toFixed(1) + 'd' : '—', meta: { align: 'right' } }),
];

export default function Doctors() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);
    const from   = monthStart(date) || date;

    const [selectedSpecialities, setSelectedSpecialities] = useState([]);
    const [minRevenue, setMinRevenue] = useState('');

    const { data: raw, isLoading } = useQuery({
        queryKey: ['doctorPerf', branch, from, date],
        queryFn:  () => analyticsApi.doctorPerformance({ branch, from, to: date }).then(r => r.data),
        enabled:  !!(branch && date),
    });

    if (!token) return <Navigate to="/login" replace />;

    const perf    = raw?.success ? raw.data : null;
    const allDoctors = perf?.doctors ?? perf ?? [];

    // Derive unique specialities for filter chips
    const specialities = useMemo(() => {
        const set = new Set(allDoctors.map(d => d.treating_doctor_speciality).filter(Boolean));
        return [...set].sort();
    }, [allDoctors]);

    // Apply filters
    const doctors = useMemo(() => {
        let arr = allDoctors;
        if (selectedSpecialities.length > 0) {
            arr = arr.filter(d => selectedSpecialities.includes(d.treating_doctor_speciality));
        }
        if (minRevenue && Number(minRevenue) > 0) {
            const threshold = Number(minRevenue) * 100000; // input is in lakhs
            arr = arr.filter(d => (Number(d.total_revenue) || 0) >= threshold);
        }
        return arr;
    }, [allDoctors, selectedSpecialities, minRevenue]);

    const toggleSpeciality = (s) => setSelectedSpecialities(prev =>
        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );

    const clearFilters = () => { setSelectedSpecialities([]); setMinRevenue(''); };
    const hasFilters   = selectedSpecialities.length > 0 || (minRevenue && Number(minRevenue) > 0);

    const top10 = useMemo(() => [...doctors]
        .sort((a, b) => (Number(b.total_revenue) || 0) - (Number(a.total_revenue) || 0))
        .slice(0, 10)
        .map(d => ({
            name: (d.treating_doctor || '').split(' ').slice(0, 2).join(' '),
            revenue: Number(d.total_revenue) || 0,
        }))
    , [doctors]);

    const totalRevenue = doctors.reduce((s, d) => s + (Number(d.total_revenue) || 0), 0);
    const totalPts     = doctors.reduce((s, d) => s + (Number(d.unique_patients) || 0), 0);

    const branchLabel = BRANCHES[branch]?.label || branch;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                    <h1 className="text-[15px] font-700 text-slate-800">Doctor Analytics</h1>
                    <p className="text-[11px] text-slate-400">{branchLabel} · MTD {from} – {date}</p>
                </div>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Summary KPIs */}
                {!isLoading && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Active Doctors',  value: doctors.length,                        icon: Stethoscope, color: 'violet' },
                            { label: 'Total Revenue',   value: fmtL(totalRevenue),                     icon: TrendingUp,  color: 'blue'   },
                            { label: 'Total Patients',  value: totalPts.toLocaleString('en-IN'),        icon: Users,       color: 'green'  },
                            { label: 'Avg Rev/Doctor',  value: doctors.length ? fmtL(totalRevenue / doctors.length) : '—', icon: BedDouble, color: 'amber' },
                        ].map(({ label, value, icon: Icon, color }) => {
                            const cc = { violet: 'text-violet-700 bg-violet-50', blue: 'text-blue-700 bg-blue-50', green: 'text-emerald-700 bg-emerald-50', amber: 'text-amber-700 bg-amber-50' }[color];
                            return (
                                <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cc}`}>
                                            <Icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                                            <p className={`text-[1.15rem] font-800 tabular-nums ${cc?.split(' ')[0]}`}>{value}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Filter panel */}
                {!isLoading && specialities.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[12px] font-700 text-slate-700">Filters</span>
                                {hasFilters && (
                                    <span className="text-[10px] font-700 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                        {selectedSpecialities.length + (minRevenue && Number(minRevenue) > 0 ? 1 : 0)} active
                                    </span>
                                )}
                            </div>
                            {hasFilters && (
                                <button onClick={clearFilters}
                                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                                    <X className="w-3 h-3" /> Clear all
                                </button>
                            )}
                        </div>

                        {/* Speciality chips */}
                        <div>
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Speciality</div>
                            <div className="flex flex-wrap gap-1.5">
                                {specialities.map(s => {
                                    const active = selectedSpecialities.includes(s);
                                    return (
                                        <button key={s} onClick={() => toggleSpeciality(s)}
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer',
                                                active
                                                    ? 'bg-violet-600 border-violet-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-700',
                                            )}>
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Min revenue filter */}
                        <div className="flex items-center gap-3">
                            <label htmlFor="min-revenue" className="text-[10px] font-700 uppercase tracking-wider text-slate-400 whitespace-nowrap">Min Revenue</label>
                            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1 focus-within:border-violet-400 bg-white max-w-[140px]">
                                <span className="text-[11px] text-slate-400" aria-hidden="true">₹</span>
                                <input
                                    id="min-revenue"
                                    type="number" min="0" step="0.5"
                                    value={minRevenue}
                                    onChange={e => setMinRevenue(e.target.value)}
                                    placeholder="0"
                                    aria-label="Minimum revenue in lakhs"
                                    className="w-full text-[12px] outline-none bg-transparent text-slate-700"
                                />
                                <span className="text-[10px] text-slate-400" aria-hidden="true">L</span>
                            </div>
                            {hasFilters && (
                                <span className="text-[11px] text-slate-500">
                                    Showing <strong className="text-slate-700">{doctors.length}</strong> of {allDoctors.length} doctors
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Top 10 chart */}
                <Section title="Top 10 Doctors by Revenue" icon={TrendingUp}>
                    {isLoading ? <ChartSkeleton /> : top10.length === 0 ? (
                        <EmptyState title="No doctor data" description="Upload bill items CSV to see doctor analytics." />
                    ) : (
                        <EChart height={240} option={{
                            grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: top10.map(d => d.name), axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{ type: 'bar', barMaxWidth: 20, label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' },
                                data: top10.map((d, i) => ({ value: (d.revenue / 100000).toFixed(2), itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                        }} />
                    )}
                </Section>

                {/* Table */}
                <Section title="Doctor Performance Table" icon={Stethoscope}>
                    {isLoading ? <TableSkeleton rows={8} cols={6} /> : doctors.length === 0 ? (
                        <EmptyState title="No doctors found" description="Upload bill items CSV to see data." />
                    ) : (
                        <DataTable
                            data={doctors}
                            columns={TABLE_COLS}
                            pageSize={20}
                            searchable={true}
                            emptyText="No doctors match your search."
                        />
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
