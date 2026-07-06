import { AppLayout } from '../components/layout/AppLayout';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Construction, TrendingUp, BrainCircuit, Mail, FileBarChart2,
    Globe, Bell, ShieldCheck, Sparkles, ArrowUpRight,
} from 'lucide-react';

// Upcoming feature cards
const FEATURES = [
    {
        icon: TrendingUp,
        title: 'Advanced Revenue Forecasting',
        desc: 'ML-powered revenue projections with confidence intervals across departments.',
        color: 'blue',
        timeline: 'Q3 2026',
    },
    {
        icon: BrainCircuit,
        title: 'AI-Powered Anomaly Detection',
        desc: 'Automatic detection of unusual billing patterns, outlier cases, and data quality issues.',
        color: 'violet',
        timeline: 'Q3 2026',
    },
    {
        icon: Mail,
        title: 'Automated Report Delivery',
        desc: 'Schedule and deliver daily, weekly, or monthly PDF reports to stakeholders via email.',
        color: 'green',
        timeline: 'Q4 2026',
    },
    {
        icon: FileBarChart2,
        title: 'Custom Report Builder',
        desc: 'Drag-and-drop report builder with custom metrics, filters, and chart types.',
        color: 'amber',
        timeline: 'Q4 2026',
    },
    {
        icon: Globe,
        title: 'Multi-Branch Consolidation',
        desc: 'Consolidated view across all branches with drill-down capability.',
        color: 'cyan',
        timeline: 'Q1 2027',
    },
    {
        icon: Bell,
        title: 'Smart Notifications',
        desc: 'Threshold-based alerts for revenue drops, occupancy spikes, and data anomalies.',
        color: 'rose',
        timeline: 'Q1 2027',
    },
    {
        icon: ShieldCheck,
        title: 'Audit Trail & Compliance',
        desc: 'Complete audit log for all data imports, report accesses, and user actions.',
        color: 'teal',
        timeline: 'Q2 2027',
    },
    {
        icon: Sparkles,
        title: 'Executive AI Summary',
        desc: 'One-click natural language summary of today\'s performance for leadership.',
        color: 'indigo',
        timeline: 'Q2 2027',
    },
];

const COLOR_MAP = {
    blue:   { icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-50 text-blue-600 border-blue-200'   },
    violet: { icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-50 text-violet-600 border-violet-200' },
    green:  { icon: 'bg-green-100 text-green-600',  badge: 'bg-green-50 text-green-600 border-green-200'  },
    amber:  { icon: 'bg-amber-100 text-amber-600',  badge: 'bg-amber-50 text-amber-600 border-amber-200'  },
    cyan:   { icon: 'bg-cyan-100 text-cyan-600',    badge: 'bg-cyan-50 text-cyan-600 border-cyan-200'    },
    rose:   { icon: 'bg-rose-100 text-rose-600',    badge: 'bg-rose-50 text-rose-600 border-rose-200'    },
    teal:   { icon: 'bg-teal-100 text-teal-600',    badge: 'bg-teal-50 text-teal-600 border-teal-200'    },
    indigo: { icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
};

const FeatureCard = ({ feature, index }) => {
    const { icon: Icon, title, desc, color, timeline } = feature;
    const c = COLOR_MAP[color] || COLOR_MAP.blue;
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.04, duration: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-[13px] font-700 text-slate-800 leading-snug">{title}</h3>
                        <span className={`text-[9px] font-700 uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${c.badge}`}>
                            {timeline}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
            </div>
        </motion.div>
    );
};

export const PlaceholderPage = ({ title, description, icon = '🚧' }) => {
    const token = useSelector(selectToken);
    if (!token) return <Navigate to="/login" replace />;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Construction className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-[15px] font-700 text-slate-800">{title}</h1>
                    <p className="text-[11px] text-slate-400">{description}</p>
                </div>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-5">
                {/* Hero banner */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden mb-6"
                >
                    {/* Background glows */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_60%,rgba(29,78,216,.3)_0%,transparent_60%),radial-gradient(ellipse_at_80%_30%,rgba(124,58,237,.2)_0%,transparent_55%)]" />
                    <div className="relative z-10 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-700 text-amber-300 mb-4">
                                <Construction className="w-3 h-3" />
                                Under Development
                            </div>
                            <h2 className="text-[1.8rem] font-800 text-white tracking-tight leading-[1.2] mb-2">
                                {title}
                            </h2>
                            <p className="text-[14px] text-white/55 leading-relaxed max-w-lg">
                                {description} — We're building something great. Check back soon.
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/8 border border-white/12 flex items-center justify-center text-5xl select-none">
                            {icon}
                        </div>
                    </div>
                    <div className="relative z-10 border-t border-white/8 px-8 py-3 flex flex-wrap items-center gap-6">
                        {[
                            ['Roadmap items', FEATURES.length],
                            ['Planned for Q3 2026', FEATURES.filter(f => f.timeline.startsWith('Q3')).length],
                            ['Planned for Q4 2026', FEATURES.filter(f => f.timeline.startsWith('Q4')).length],
                        ].map(([label, count]) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className="text-[1.1rem] font-800 text-white">{count}</span>
                                <span className="text-[11px] text-white/40">{label}</span>
                            </div>
                        ))}
                        <a href="mailto:mis@hospital.com"
                            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-600 text-blue-300 hover:text-blue-200 transition-colors cursor-pointer">
                            Suggest a feature <ArrowUpRight className="w-3 h-3" />
                        </a>
                    </div>
                </motion.div>

                {/* Feature cards grid */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[13px] font-700 text-slate-700">Upcoming Features</h3>
                    <span className="text-[11px] text-slate-400">{FEATURES.length} items on the roadmap</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
                </div>

                {/* Footer note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center text-[11px] text-slate-400"
                >
                    Have a feature request? Contact the development team at{' '}
                    <a href="mailto:mis@hospital.com" className="text-blue-600 hover:underline">mis@hospital.com</a>
                </motion.div>
            </main>
        </AppLayout>
    );
};
