import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Settings2, RefreshCw, Server, Database, GitBranch, Shield, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { cn } from '../utils/cn';
import client from '../services/api';

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

const Row = ({ label, value, status }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
        <span className="text-[11px] text-slate-500">{label}</span>
        <div className="flex items-center gap-1.5">
            {status === 'ok'    && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {status === 'error' && <XCircle     className="w-3.5 h-3.5 text-red-500"   />}
            <span className="text-[11px] font-600 text-slate-700">{value ?? '—'}</span>
        </div>
    </div>
);

const BRANCHES_INFO = [
    { key: 'chromepet', name: 'Chromepet', beds: 150, color: 'bg-blue-100 text-blue-700' },
    { key: 'oragadam',  name: 'Oragadam',  beds: 100, color: 'bg-violet-100 text-violet-700' },
];

export default function Settings() {
    const token = useSelector(selectToken);

    const healthQ = useQuery({
        queryKey: ['health-check'],
        queryFn:  () => client.get('/../../api/health').then(r => r.data),
        refetchInterval: 60_000,
    });

    if (!token) return <Navigate to="/login" replace />;

    const health = healthQ.data ?? {};

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">System Settings</h1>
                    <p className="text-[11px] text-slate-400">Configuration overview &amp; system health</p>
                </div>
                <button onClick={() => healthQ.refetch()}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', healthQ.isFetching && 'animate-spin text-slate-500')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* System health */}
                <Section title="System Health" icon={Server}>
                    {healthQ.isLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
                        </div>
                    ) : (
                        <div>
                            <Row label="API Status"       value={health.status === 'ok' ? 'Operational' : 'Degraded'} status={health.status === 'ok' ? 'ok' : 'error'} />
                            <Row label="Database"         value={health.db === 'ok' ? 'Connected' : 'Error'} status={health.db === 'ok' ? 'ok' : 'error'} />
                            <Row label="Last checked"     value={health.timestamp ? new Date(health.timestamp).toLocaleTimeString('en-IN') : '—'} />
                        </div>
                    )}
                </Section>

                {/* Branch configuration */}
                <Section title="Branches" icon={GitBranch}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {BRANCHES_INFO.map((b, i) => (
                            <motion.div key={b.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                className="border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={cn('text-[10px] font-700 uppercase px-2 py-0.5 rounded-full', b.color)}>{b.key}</span>
                                    <span className="text-[13px] font-700 text-slate-800">{b.name}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <Row label="Hospital name" value={`${b.name} Hospital`} />
                                    <Row label="Bed capacity"  value={`${b.beds} beds`} />
                                    <Row label="Status"        value="Active" status="ok" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Section>

                {/* Authentication */}
                <Section title="Authentication" icon={Shield}>
                    <Row label="Method"           value="Laravel Sanctum (SPA cookie)" />
                    <Row label="Session guard"    value="auth:sanctum" />
                    <Row label="Permission layer" value="Spatie Laravel Permission" />
                    <Row label="CSRF protection"  value="Enabled" status="ok" />
                </Section>

                {/* Scheduler */}
                <Section title="Task Scheduler" icon={Clock}>
                    <Row label="Laravel scheduler" value="routes/console.php" />
                    <Row label="Queue driver"       value="database" />
                    <Row label="MIS Daily"          value="07:00 daily" />
                    <Row label="MIS Weekly"         value="Monday 08:00" />
                    <Row label="MIS Monthly"        value="1st of month 08:00" />
                    <Row label="BRM Weekly"         value="Monday 08:30" />
                    <Row label="BRM Monthly"        value="Last day of month 22:00" />
                </Section>

            </main>
        </AppLayout>
    );
}
