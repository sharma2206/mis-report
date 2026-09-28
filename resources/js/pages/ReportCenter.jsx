import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    TrendingUp, Banknote, DollarSign, Activity, Stethoscope,
    Building2, Scissors, Pill, FileText, Clock, Star,
    ArrowRight, Search, Download, Mail, Calendar,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { Navigate } from 'react-router-dom';
import { selectBranch as selBranch, selectDate as selDate } from '../store/reportSlice';
import { misApi } from '../services/api';

const REPORT_CATALOG = [
    {
        category: 'MIS',
        color: 'blue',
        reports: [
            {
                id: 'daily-mis',
                title: 'Daily MIS Report',
                desc: 'Revenue, Volume, Collections for a single day across all departments and services.',
                icon: TrendingUp,
                path: '/mis',
                tags: ['Daily', 'Excel', 'PDF', 'Email'],
                lastGen: 'Today 09:30',
                scheduled: true,
            },
            {
                id: 'monthly-mis',
                title: 'Monthly MIS Report',
                desc: 'Consolidated monthly summary with MTD trend analysis and branch comparisons.',
                icon: Calendar,
                path: '/mis',
                tags: ['Monthly', 'Excel', 'Email'],
                lastGen: 'Jul 1',
                scheduled: true,
            },
        ],
    },
    {
        category: 'BRM',
        color: 'violet',
        reports: [
            {
                id: 'brm-doctor',
                title: 'BRM Report (Doctor-wise)',
                desc: 'Doctor-wise revenue in 7-sheet Excel. OP/IP/ER/Pharmacy/Procedure/Radiology/Grand Total.',
                icon: Banknote,
                path: '/brm',
                tags: ['Weekly', 'Monthly', 'Excel', 'Multi-sheet'],
                lastGen: 'Monday 08:30',
                scheduled: true,
                isKey: true,
            },
        ],
    },
    {
        category: 'Financial',
        color: 'green',
        reports: [
            {
                id: 'revenue-summary',
                title: 'Revenue Summary',
                desc: 'Net revenue by service type, payer category, and department with discount analysis.',
                icon: DollarSign,
                path: '/financial',
                tags: ['Date Range', 'Excel', 'PDF'],
                lastGen: 'Yesterday',
            },
            {
                id: 'collection-report',
                title: 'Collection Report',
                desc: 'Payment mode breakdown — Cash, POS, UPI, NEFT, TPA, Corporate with daily trend.',
                icon: DollarSign,
                path: '/financial',
                tags: ['Daily', 'Date Range', 'Excel'],
                lastGen: 'Today',
            },
            {
                id: 'payer-report',
                title: 'Payer-wise Report',
                desc: 'Revenue split by Cash, TPA, Corporate, Insurance, and self-pay with outstanding.',
                icon: FileText,
                path: '/financial',
                tags: ['Monthly', 'Excel'],
                lastGen: 'Jul 5',
            },
        ],
    },
    {
        category: 'Operational',
        color: 'amber',
        reports: [
            {
                id: 'bed-occupancy',
                title: 'Bed Occupancy Report',
                desc: 'Ward-wise occupancy %, average LOS, bed turnover rate for selected date range.',
                icon: Activity,
                path: '/operational',
                tags: ['Daily', 'Excel'],
                lastGen: 'Today',
            },
            {
                id: 'admission-report',
                title: 'Admission & Discharge',
                desc: 'IP/ER admission trend, discharge analysis, and census report with demographics.',
                icon: Activity,
                path: '/operational',
                tags: ['Daily', 'Monthly', 'Excel'],
                lastGen: 'Today',
            },
        ],
    },
    {
        category: 'Clinical',
        color: 'red',
        reports: [
            {
                id: 'surgery-report',
                title: 'Surgery Analytics',
                desc: 'OT utilization, surgeon ranking, major/minor split, anaesthesia types, TAT analysis.',
                icon: Scissors,
                path: '/surgery',
                tags: ['Date Range', 'Excel'],
                lastGen: 'Today',
            },
            {
                id: 'doctor-performance',
                title: 'Doctor Performance',
                desc: 'Revenue, unique patients, surgeries, admissions, avg LOS per doctor with speciality ranking.',
                icon: Stethoscope,
                path: '/doctors',
                tags: ['Monthly', 'Excel'],
                lastGen: 'Today',
            },
            {
                id: 'department-report',
                title: 'Department Report',
                desc: 'Revenue and volume breakdown per department with month-over-month trend comparison.',
                icon: Building2,
                path: '/departments',
                tags: ['Monthly', 'Excel'],
                lastGen: 'Jul 5',
            },
            {
                id: 'pharmacy-report',
                title: 'Pharmacy Analytics',
                desc: 'Pharmacy revenue by department, top drugs, generic vs brand, patient type split.',
                icon: Pill,
                path: '/pharmacy',
                tags: ['Daily', 'Excel'],
                lastGen: 'Today',
            },
        ],
    },
];

const COLOR_MAP = {
    blue:   { header: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',   icon: 'bg-blue-100 text-blue-600',   border: 'border-blue-200', hover: 'hover:border-blue-400' },
    violet: { header: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700',icon: 'bg-violet-100 text-violet-600',border: 'border-violet-200', hover: 'hover:border-violet-400' },
    green:  { header: 'bg-green-600',  badge: 'bg-green-100 text-green-700',  icon: 'bg-green-100 text-green-600',  border: 'border-green-200', hover: 'hover:border-green-400' },
    amber:  { header: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700',  icon: 'bg-amber-100 text-amber-600',  border: 'border-amber-200', hover: 'hover:border-amber-400' },
    red:    { header: 'bg-red-600',    badge: 'bg-red-100 text-red-700',      icon: 'bg-red-100 text-red-600',      border: 'border-red-200',   hover: 'hover:border-red-400'   },
};

const FILTERS = ['All', 'MIS', 'BRM', 'Financial', 'Operational', 'Clinical', 'Scheduled'];

const ReportCard = ({ report, colorKey, onNavigate, onExport }) => {
    const c = COLOR_MAP[colorKey];
    const { icon: Icon } = report;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className={`bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${c.border} ${c.hover} shadow-sm hover:shadow-md`}
            onClick={() => onNavigate(report.path)}
        >
            <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-700 text-slate-800 leading-tight">{report.title}</span>
                            {report.isKey && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{report.desc}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {report.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-600">{t}</span>
                    ))}
                    {report.scheduled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Scheduled
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {report.lastGen}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={e => { e.stopPropagation(); onExport(report); }}
                            aria-label={`Download ${report.title}`}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onExport(report); }}
                            aria-label={`Email ${report.title}`}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-50 border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors"
                        >
                            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-700 ${c.icon} transition-colors`}>
                            Open <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function ReportCenter() {
    const token    = useSelector(selectToken);
    const branch   = useSelector(selBranch);
    const date     = useSelector(selDate);
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('All');
    const [search, setSearch]             = useState('');

    if (!token) return <Navigate to="/login" replace />;

    const filteredCatalog = REPORT_CATALOG
        .map(group => ({
            ...group,
            reports: group.reports.filter(r => {
                const matchCat = activeFilter === 'All' || activeFilter === group.category
                    || (activeFilter === 'Scheduled' && r.scheduled);
                const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase())
                    || r.desc.toLowerCase().includes(search.toLowerCase());
                return matchCat && matchSearch;
            }),
        }))
        .filter(g => g.reports.length > 0);

    const handleExport = (report) => {
        if (report.id === 'daily-mis') {
            const url = misApi.exportExcel(branch, date);
            window.open(url, '_blank');
        }
    };

    const totalReports = REPORT_CATALOG.reduce((s, g) => s + g.reports.length, 0);

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4">
                <div>
                    <h1 className="text-[16px] font-700 text-slate-800">Report Center</h1>
                    <p className="text-[11px] text-slate-400">{totalReports} reports available · Branch: <span className="font-600 capitalize">{branch}</span></p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search reports…"
                            aria-label="Search reports"
                            className="pl-8 pr-4 py-1.5 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-blue-400 focus:bg-white w-48 transition-all"
                        />
                    </div>
                </div>
            </div>
        }>
            <main className=" overflow-y-auto flex-1 p-5">
                {/* Filter Pills */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {FILTERS.map(f => (
                        <button key={f} onClick={() => setActiveFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-600 transition-all border cursor-pointer ${
                                activeFilter === f
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Report Groups */}
                <div className="space-y-8">
                    {filteredCatalog.map(group => {
                        const c = COLOR_MAP[group.color];
                        return (
                            <div key={group.category}>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-[10px] font-700 uppercase tracking-widest px-3 py-1 rounded-full text-white ${c.header}`}>
                                        {group.category}
                                    </span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-[11px] text-slate-400">{group.reports.length} report{group.reports.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {group.reports.map(r => (
                                        <ReportCard
                                            key={r.id}
                                            report={r}
                                            colorKey={group.color}
                                            onNavigate={navigate}
                                            onExport={handleExport}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredCatalog.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🔍</div>
                        <div className="text-[15px] font-600 text-slate-500">No reports match your search</div>
                        <div className="text-[12px] text-slate-400 mt-1">Try a different filter or search term</div>
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
