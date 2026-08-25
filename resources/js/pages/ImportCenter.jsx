import { useState, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, BarChart3, CreditCard, Hospital, Building2,
    Stethoscope, Package, CheckCircle2, AlertTriangle, History,
    Layers, RefreshCw, ChevronRight, Info, X, Loader2, Calendar,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken, selectUser } from '../store/authSlice';
import { selectBranch as selBranch, setBranch, setDate, setLastImportInfo } from '../store/reportSlice';
import { Navigate } from 'react-router-dom';
import { misApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { BRANCHES } from '../constants';
import { cn } from '../utils/cn';
import { FILE_FIELD_MAP, DETECT_RULES } from '../utils/fileDetect';
import { scanCsvFile, tsToYMD, fmtDMY, parseKareDate } from '../utils/csvScanner';
import { DropZone } from '../components/import/DropZone';
import { FileCard } from '../components/import/FileCard';
import { ImportPeriodSelector } from '../components/import/ImportPeriodSelector';
import { ValidationPanel } from '../components/import/ValidationPanel';
import { ImportHistoryPanel } from '../components/import/ImportHistory';
import { ReportCard } from '../components/import/ReportCard';
import { HistoryDrawer } from '../components/import/HistoryDrawer';
import { useBranches } from '../hooks/useBranches';

// ── Report type definitions ───────────────────────────────────────────────────
const REPORT_TYPES = [
    { typeKey: 'bill_items', label: 'Bill Items',          fieldName: 'bill_file',     required: true,  icon: BarChart3,   color: 'blue',   description: 'OP / IP / ER / Pharmacy revenue'     },
    { typeKey: 'cashier',    label: 'Cashier Collection',  fieldName: 'cashier_file',  required: true,  icon: CreditCard,  color: 'green',  description: 'Cash & UPI collections'               },
    { typeKey: 'ip',         label: 'IP Admission',        fieldName: 'ip_file',       required: true,  icon: Building2,   color: 'violet', description: 'Inpatient admission & discharge data'  },
    { typeKey: 'er',         label: 'ER Admission',        fieldName: 'er_file',       required: true,  icon: Hospital,    color: 'red',    description: 'Emergency department admissions'       },
    { typeKey: 'surgery',    label: 'Surgery Detail',      fieldName: 'surgery_file',  required: false, icon: Stethoscope, color: 'amber',  description: 'OT surgery & surgeon performance'     },
    { typeKey: 'package',    label: 'Package Consumption', fieldName: 'package_file',  required: false, icon: Package,     color: 'cyan',   description: 'Health package billing'               },
];

// ── Helper: format a YYYY-MM-DD date for display ─────────────────────────────
function fmtYMD(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

function getApiDate(mode, period, manualTo) {
    if (mode === 'auto' && period?.max) return tsToYMD(period.max);
    if (mode === 'manual' && manualTo) return manualTo;
    return today();
}

// ── Completeness pill ─────────────────────────────────────────────────────────
const CompletenessBar = ({ statuses }) => {
    const required = REPORT_TYPES.filter(r => r.required);
    const imported = required.filter(r => {
        const s = statuses?.[r.typeKey]?.status;
        return s === 'success' || s === 'partial';
    });
    const pct = required.length ? Math.round((imported.length / required.length) * 100) : 0;
    const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden min-w-[80px]">
                <motion.div
                    className={cn('h-full rounded-full', color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
            <span className="text-[11px] font-700 text-slate-600 whitespace-nowrap">
                {imported.length} / {required.length} required
            </span>
        </div>
    );
};

// ── Overall period bar ────────────────────────────────────────────────────────
const PeriodBar = ({ overallFrom, overallTo }) => {
    if (!overallFrom) return (
        <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span className="text-[11px]">No reports imported yet</span>
        </div>
    );
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-700 uppercase tracking-wide text-slate-400">Report Period</span>
            <span className="text-[13px] font-700 text-slate-700">
                {fmtYMD(overallFrom)}
                {overallTo && overallTo !== overallFrom && (
                    <> <span className="text-slate-400 font-400">→</span> {fmtYMD(overallTo)}</>
                )}
            </span>
        </div>
    );
};

// ── Batch import state (reused from original) ─────────────────────────────────
function useBatchState() {
    const [items,      setItems]      = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [period,     setPeriod]     = useState({ status: 'idle', min: null, max: null, sources: [], scanCount: 0 });
    const [periodMode, setPeriodMode] = useState('auto');
    const [manualFrom, setManualFrom] = useState('');
    const [manualTo,   setManualTo]   = useState(today());
    const [perFilePeriods, setPerFilePeriods] = useState([]);

    const scanFiles = async (files) => {
        setPeriod({ status: 'scanning', min: null, max: null, sources: [], scanCount: files.length });
        const results = await Promise.all(files.map(item => scanCsvFile(item.file, detectFile(item.name).typeKey)));
        const collectedPerFile = [];
        const updatedItems = files.map((item, idx) => {
            const r    = results[idx];
            const info = detectFile(item.name);
            const col  = r?.detectedCol ?? null;
            if (info.typeKey !== 'unknown') {
                collectedPerFile.push({
                    typeKey: info.typeKey, label: info.label, col,
                    from: r.min ? tsToYMD(r.min) : null,
                    to:   r.max ? tsToYMD(r.max) : null,
                });
            }
            return col ? { ...item, detectedCol: col } : item;
        });
        setItems(updatedItems);
        setPerFilePeriods(collectedPerFile);
        const validResults = results.filter(r => r.min);
        if (!validResults.length) { setPeriod({ status: 'idle', min: null, max: null, sources: [], scanCount: files.length }); return; }
        const allMins = validResults.map(r => r.min);
        const allMaxs = validResults.map(r => r.max);
        const minTs   = Math.min(...allMins);
        const maxTs   = Math.max(...allMaxs);
        const status  = minTs === maxTs ? 'single' : allMins.some(m => m !== minTs) || allMaxs.some(m => m !== maxTs) ? 'inconsistent' : 'range';
        setPeriod({ status, min: minTs, max: maxTs, sources: validResults.map(r => r.detectedCol).filter(Boolean), scanCount: files.length });
    };

    const addFiles = (rawFiles) => {
        const next = rawFiles.map(f => {
            const info = detectFile(f.name);
            return { id: crypto.randomUUID(), file: f, name: f.name, size: f.size, status: 'pending', progress: 0, issues: [], ...info };
        });
        setItems(prev => {
            const updatedIds = new Set(next.map(n => n.fieldName).filter(Boolean));
            const filtered   = prev.filter(p => !updatedIds.has(p.fieldName));
            const merged     = [...filtered, ...next];
            scanFiles(merged.filter(f => f.file));
            return merged;
        });
    };

    const removeItem = (id) => {
        setItems(prev => {
            const next = prev.filter(f => f.id !== id);
            if (next.length > 0) scanFiles(next.filter(f => f.file));
            else setPeriod({ status: 'idle', min: null, max: null, sources: [], scanCount: 0 });
            return next;
        });
    };

    return {
        items, setItems, isDragging, setIsDragging,
        period, setPeriod, periodMode, setPeriodMode,
        manualFrom, setManualFrom, manualTo, setManualTo,
        perFilePeriods, setPerFilePeriods,
        addFiles, removeItem, scanFiles,
    };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImportCenter() {
    const token    = useSelector(selectToken);
    const user     = useSelector(selectUser);
    const branch   = useSelector(selBranch);
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const { branches } = useBranches();

    const [mode,         setMode]         = useState('individual'); // 'individual' | 'batch'
    const [historyOpen,  setHistoryOpen]  = useState(false);
    const [historyType,  setHistoryType]  = useState(null);
    const [isImporting,  setIsImporting]  = useState(false);
    const [batchResult,  setBatchResult]  = useState(null);
    // Individual mode — report date (defaults to today, user can override)
    const [indivDate,    setIndivDate]    = useState(today());

    const batch = useBatchState();

    // ── Fetch per-type status ─────────────────────────────────────────────────
    const { data: statusData, refetch: refetchStatus } = useQuery({
        queryKey: ['import-status', branch],
        queryFn:  () => misApi.importStatus(branch).then(r => r.data),
        enabled:  !!branch && !!token,
        staleTime: 15_000,
        refetchInterval: mode === 'individual' ? 30_000 : false,
    });

    const statuses    = statusData?.data     || {};
    const overallFrom = statusData?.overall_from;
    const overallTo   = statusData?.overall_to;

    if (!token) return <Navigate to="/login" replace />;

    // ── Individual card success callback ──────────────────────────────────────
    const handleCardSuccess = () => {
        refetchStatus();
        // Invalidate dashboard queries
        ['mis','kpi','dailyTrend','payerMix','patientMix','ipDemo','surgeryDetail',
         'opMetrics','collection','serviceRevenue','doctorPerformance','admissions',
        ].forEach(k => queryClient.invalidateQueries({ queryKey: [k, branch] }));
    };

    // ── Batch import handler (original logic) ─────────────────────────────────
    const handleBatchImport = async () => {
        const { items, period, periodMode, manualTo, perFilePeriods } = batch;
        if (!items.length) return;
        setIsImporting(true);
        setBatchResult(null);
        const importDate = getApiDate(periodMode, period, manualTo);
        batch.setItems(prev => prev.map(f => ({ ...f, status: 'importing', progress: 30 })));

        try {
            const fd = new FormData();
            fd.append('date', importDate);
            if (period.min) fd.append('period_from', tsToYMD(period.min));
            if (period.max) fd.append('period_to',   tsToYMD(period.max));
            for (const item of items) {
                const fieldName = FILE_FIELD_MAP[item.typeKey];
                if (fieldName && item.file) fd.append(fieldName, item.file);
            }

            batch.setItems(prev => prev.map(f => ({ ...f, progress: 60 })));
            const { data } = await misApi.upload(branch, fd);
            if (!data.success) throw new Error(data.message || 'Import failed');

            const imported  = data.imported || {};
            let totalImported = 0, totalSkipped = 0, totalErrors = 0;
            Object.entries(imported).forEach(([, val]) => {
                const v = typeof val === 'object' ? val : {};
                totalImported += v.count ?? Number(val) ?? 0;
                totalSkipped  += v.skipped ?? 0;
                totalErrors   += v.errors  ?? 0;
            });

            batch.setItems(prev => prev.map(item => ({ ...item, status: 'done', progress: 100 })));

            dispatch(setDate(importDate));
            dispatch(setLastImportInfo({
                branch, date: importDate, uploadedAt: new Date().toISOString(),
                uploadedBy: user?.name || user?.email || 'Unknown',
                periodFrom: period.min ? tsToYMD(period.min) : importDate,
                periodTo:   period.max ? tsToYMD(period.max) : importDate,
                files: items.map(i => i.label),
                perFilePeriods,
                detectedSource: periodMode === 'auto' ? 'CSV Auto-Scan' : 'Manual Range',
            }));

            ['mis','kpi','dailyTrend','payerMix','patientMix','ipDemo','surgeryDetail',
             'opMetrics','collection','serviceRevenue','doctorPerformance','admissions',
            ].forEach(k => queryClient.invalidateQueries({ queryKey: [k, branch] }));

            refetchStatus();
            setBatchResult({ success: true, imported: totalImported, skipped: totalSkipped, errors: totalErrors, message: data.message || 'Import complete' });
        } catch (err) {
            const apiErrors   = err.response?.data?.errors || {};
            const topMsg      = err.response?.data?.message || err.message || 'Upload failed';
            const allMessages = Object.entries(apiErrors).flatMap(([field, msgs]) => msgs.map(m => ({ field, message: m })));
            batch.setItems(prev => prev.map(item => ({
                ...item, status: 'error', progress: 100,
                issues: [{ type: 'error', message: apiErrors[FILE_FIELD_MAP[item.typeKey]]?.[0] || topMsg }],
            })));
            setBatchResult({ success: false, errors: items.length, message: topMsg,
                errorLines: allMessages });
        } finally {
            setIsImporting(false);
        }
    };

    const required    = REPORT_TYPES.filter(r => r.required);
    const importedReq = required.filter(r => ['success','partial'].includes(statuses[r.typeKey]?.status));
    const allReqDone  = importedReq.length === required.length;

    // ── Topbar ────────────────────────────────────────────────────────────────
    const topbar = (
        <div className="bg-white border-b border-slate-200">
            <div className="px-5 pt-4 pb-1 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                        <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-700 text-slate-800">Import Center</h1>
                        <p className="text-[10px] text-slate-400">Upload KareXpert CSV reports</p>
                    </div>
                </div>
                <button
                    onClick={() => { setHistoryType(null); setHistoryOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-600 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </button>
            </div>

            {/* Branch tabs */}
            <div className="overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 px-5 py-2 min-w-max">
                    {branches.map(b => (
                        <button key={b.key} onClick={() => dispatch(setBranch(b.key))}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-[12px] font-600 border transition-all cursor-pointer whitespace-nowrap',
                                branch === b.key
                                    ? 'bg-blue-700 border-blue-700 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600',
                            )}>
                            {b.name || b.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center gap-0 px-5 border-t border-slate-100">
                {[
                    { key: 'individual', label: 'Individual Import', icon: Layers },
                    { key: 'batch',      label: 'Batch Import',      icon: Upload },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setMode(key)}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-600 border-b-2 transition-all cursor-pointer',
                            mode === key
                                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700',
                        )}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <AppLayout topbar={topbar}>
            <main className="flex-1 overflow-y-auto bg-slate-50">

                {/* ── Status summary bar ────────────────────────────────────── */}
                <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-6 flex-wrap">
                    <PeriodBar overallFrom={overallFrom} overallTo={overallTo} />
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex-1 min-w-[200px]">
                        <CompletenessBar statuses={statuses} />
                    </div>
                    {allReqDone && (
                        <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[11px] font-700">All required reports imported</span>
                        </div>
                    )}
                </div>

                {/* ── INDIVIDUAL MODE ───────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {mode === 'individual' && (
                        <motion.div
                            key="individual"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-5 space-y-4"
                        >
                            {/* Info banner + date picker */}
                            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-[12px] font-700 text-blue-800">Individual Import Mode</p>
                                    <p className="text-[11px] text-blue-600 mt-0.5">
                                        Upload reports one by one. Each upload only replaces data for that report type — other reports are unaffected.
                                    </p>
                                </div>
                                {/* Report date surfaced for individual mode */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                    <label className="text-[9px] font-700 uppercase tracking-wider text-blue-500">Report Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={indivDate}
                                            max={today()}
                                            onChange={e => setIndivDate(e.target.value)}
                                            className="pl-2.5 pr-7 py-1 text-[11px] border border-blue-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-400 bg-white/80 appearance-none"
                                        />
                                        <Calendar className="w-3 h-3 text-blue-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Required reports */}
                            <div>
                                <p className="text-[11px] font-700 uppercase tracking-wide text-slate-400 mb-3">
                                    Required Reports
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {REPORT_TYPES.filter(r => r.required).map(rt => (
                                        <ReportCard
                                            key={rt.typeKey}
                                            {...rt}
                                            branch={branch}
                                            date={indivDate}
                                            serverStatus={statuses[rt.typeKey]}
                                            onSuccess={handleCardSuccess}
                                            onHistory={(type) => { setHistoryType(type); setHistoryOpen(true); }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Optional reports */}
                            <div>
                                <p className="text-[11px] font-700 uppercase tracking-wide text-slate-400 mb-3">
                                    Optional Reports
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {REPORT_TYPES.filter(r => !r.required).map(rt => (
                                        <ReportCard
                                            key={rt.typeKey}
                                            {...rt}
                                            branch={branch}
                                            date={indivDate}
                                            serverStatus={statuses[rt.typeKey]}
                                            onSuccess={handleCardSuccess}
                                            onHistory={(type) => { setHistoryType(type); setHistoryOpen(true); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── BATCH MODE ────────────────────────────────────────── */}
                    {mode === 'batch' && (
                        <motion.div
                            key="batch"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-5 space-y-4"
                        >
                            {/* ── Step 1: Upload Area ─────────────────────────── */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-700 flex items-center justify-center flex-shrink-0">1</span>
                                    <div>
                                        <p className="text-[13px] font-700 text-slate-700">Upload Files</p>
                                        <p className="text-[11px] text-slate-400">Drag &amp; drop all CSV reports — types are auto-detected</p>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <DropZone
                                        isDragging={batch.isDragging}
                                        setIsDragging={batch.setIsDragging}
                                        onFiles={batch.addFiles}
                                        fileCount={batch.items.length}
                                    />
                                </div>
                                {/* File cards */}
                                {batch.items.length > 0 && (
                                    <div className="px-5 pb-5 space-y-2">
                                        {batch.items.map(item => (
                                            <FileCard key={item.id} item={item} onRemove={batch.removeItem} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Step 2: Report Date ─────────────────────────── */}
                            {batch.items.length > 0 && (
                                <ImportPeriodSelector
                                    period={batch.period}
                                    mode={batch.periodMode}
                                    onModeChange={batch.setPeriodMode}
                                    manualFrom={batch.manualFrom}
                                    onManualFrom={batch.setManualFrom}
                                    manualTo={batch.manualTo}
                                    onManualTo={batch.setManualTo}
                                    onForceManual={() => batch.setPeriodMode('manual')}
                                    stepNumber={2}
                                />
                            )}

                            {/* ── Step 3: Validation ──────────────────────────── */}
                            {batch.items.length > 0 && (
                                <ValidationPanel items={batch.items} branch={branch} stepNumber={3} />
                            )}

                            {/* ── Step 4: Import ──────────────────────────────── */}
                            {batch.items.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2.5">
                                        <span className={cn(
                                            'w-5 h-5 rounded-full text-[10px] font-700 flex items-center justify-center flex-shrink-0',
                                            batchResult?.success ? 'bg-green-500 text-white' : 'bg-blue-600 text-white',
                                        )}>4</span>
                                        <div>
                                            <p className="text-[13px] font-700 text-slate-700">Import</p>
                                            <p className="text-[11px] text-slate-400">Push all validated files to the database</p>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {/* Batch result banner */}
                                        <AnimatePresence>
                                            {batchResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.97 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={cn(
                                                        'rounded-xl border px-4 py-3 flex items-start gap-3',
                                                        batchResult.success
                                                            ? 'bg-green-50 border-green-200'
                                                            : 'bg-red-50 border-red-200',
                                                    )}
                                                >
                                                    {batchResult.success
                                                        ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        : <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn('text-[13px] font-700', batchResult.success ? 'text-green-800' : 'text-red-800')}>
                                                            {batchResult.message}
                                                        </p>
                                                        {batchResult.success && (
                                                            <p className="text-[11px] text-green-700 mt-0.5">
                                                                {Number(batchResult.imported).toLocaleString('en-IN')} rows imported
                                                                {batchResult.skipped > 0 && `, ${batchResult.skipped} skipped`}
                                                                {batchResult.errors > 0 && `, ${batchResult.errors} errors`}
                                                            </p>
                                                        )}
                                                        {!batchResult.success && batchResult.errorLines?.length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                {batchResult.errorLines.slice(0, 3).map((e, i) => (
                                                                    <p key={i} className="text-[10px] text-red-600">{e.field}: {e.message}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => setBatchResult(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer border-0">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Import button */}
                                        <button
                                            onClick={handleBatchImport}
                                            disabled={isImporting || !batch.items.length}
                                            className={cn(
                                                'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-[13px] font-700 transition-all border-0',
                                                isImporting
                                                    ? 'bg-blue-400 text-white cursor-not-allowed'
                                                    : batchResult?.success
                                                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md cursor-pointer'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md cursor-pointer',
                                            )}
                                        >
                                            {isImporting ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                                            ) : batchResult?.success ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Import Complete — Re-import</>                                       
                                            ) : (
                                                <><Upload className="w-4 h-4" /> Import All Files</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* History panel */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <History className="w-4 h-4 text-slate-400" />
                                    <span className="text-[13px] font-700 text-slate-700">Batch Import History</span>
                                </div>
                                <ImportHistoryPanel branch={branch} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* History drawer (slide-in from right) */}
            <HistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                branch={branch}
                filterType={historyType}
            />
        </AppLayout>
    );
}
