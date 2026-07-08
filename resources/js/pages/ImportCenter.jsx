import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, CheckCircle2, XCircle, Info, Calendar,
    Trash2, RefreshCw,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch as selBranch, setBranch, setDate, setLastImportInfo } from '../store/reportSlice';
import { Navigate } from 'react-router-dom';
import { misApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { BRANCHES } from '../constants';
import { cn } from '../utils/cn';
import { detectFile, FILE_FIELD_MAP, REQUIRED_FIELDS, DETECT_RULES, COLOR_CLASSES } from '../utils/fileDetect';
import { scanCsvFile, tsToYMD, fmtDMY, parseKareDate } from '../utils/csvScanner';
import { DropZone } from '../components/import/DropZone';
import { FileCard } from '../components/import/FileCard';
import { ImportPeriodSelector } from '../components/import/ImportPeriodSelector';
import { ValidationPanel } from '../components/import/ValidationPanel';
import { ImportHistoryPanel } from '../components/import/ImportHistory';

let _id = 0;

function getApiDate(mode, period, manualTo) {
    if (mode === 'manual') return manualTo || today();
    if (period.max) return tsToYMD(period.max);
    if (period.min) return tsToYMD(period.min);
    return today();
}

const AutoKpiNotice = () => (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] font-700 text-slate-700">KPIs — Calculated Automatically</span>
        </div>
        <div className="p-4">
            <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                Beds Occupied, Admissions, Discharges, ER Count and every other KPI are
                derived from the imported reports — nothing to enter manually.
            </p>
            <ul className="text-[11px] text-slate-500 space-y-1">
                <li>• <strong>Beds Occupied / Admissions / Discharges</strong> — from IP Admission report</li>
                <li>• <strong>ER Count</strong> — from ER Admission report</li>
                <li>• A KPI shows <em>N/A</em> if its report wasn't included</li>
            </ul>
        </div>
    </div>
);

export default function ImportCenter() {
    const token       = useSelector(selectToken);
    const branch      = useSelector(selBranch);
    const dispatch    = useDispatch();
    const queryClient = useQueryClient();

    const [items,       setItems]       = useState([]);
    const [isDragging,  setIsDragging]  = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [result,      setResult]      = useState(null);
    const [periodMode,  setPeriodMode]  = useState('auto');
    const [period,      setPeriod]      = useState({ status: 'idle', min: null, max: null, sources: [], scanCount: 0 });
    const [manualFrom,  setManualFrom]  = useState('');
    const [manualTo,    setManualTo]    = useState(today());

    if (!token) return <Navigate to="/login" replace />;

    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const hasErrors    = items.some(f => f.status === 'error');
    const periodReady  = periodMode === 'manual'
        ? !!manualTo
        : ['single', 'range', 'inconsistent'].includes(period.status);
    const canImport    = items.length > 0 && !isImporting && missing.length === 0 && !hasErrors && periodReady;

    // ── Scan CSV files for date columns ───────────────────────────────────────
    const scanFiles = async (files) => {
        setPeriod({ status: 'scanning', min: null, max: null, sources: [], scanCount: files.length });
        const results = await Promise.all(files.map(item => scanCsvFile(item.file)));

        let globalMin = Infinity, globalMax = -Infinity;
        const sources = [];
        let filesWithDates = 0;
        const perFile = {};

        results.forEach((res, i) => {
            const item = files[i];
            const info = detectFile(item.name);
            if (res.min !== null) {
                filesWithDates++;
                if (res.min < globalMin) globalMin = res.min;
                if (res.max > globalMax) globalMax = res.max;
                sources.push(info.label);
                perFile[item.id] = res.col;
            }
        });

        setItems(prev => prev.map(item => {
            const col = perFile[item.id];
            return col ? { ...item, detectedCol: col } : item;
        }));

        if (filesWithDates === 0) {
            setPeriod({ status: 'no_dates', min: null, max: null, sources: [] });
            setPeriodMode('manual');
            return;
        }

        const isSingle       = tsToYMD(globalMin) === tsToYMD(globalMax);
        const fileMins       = results.filter(r => r.min).map(r => tsToYMD(r.min));
        const fileMaxs       = results.filter(r => r.max).map(r => tsToYMD(r.max));
        const isInconsistent = (new Set(fileMins).size > 1 || new Set(fileMaxs).size > 1) && !isSingle;

        setPeriod({
            status:  isInconsistent ? 'inconsistent' : isSingle ? 'single' : 'range',
            min:     globalMin === Infinity  ? null : globalMin,
            max:     globalMax === -Infinity ? null : globalMax,
            sources,
        });

        if (globalMin !== Infinity)  setManualFrom(tsToYMD(globalMin));
        if (globalMax !== -Infinity) setManualTo(tsToYMD(globalMax));
    };

    // ── Add files ──────────────────────────────────────────────────────────────
    const addFiles = (rawFiles) => {
        const next = rawFiles.map(f => {
            const info      = detectFile(f.name);
            const fieldName = FILE_FIELD_MAP[info.typeKey];
            return { id: ++_id, file: f, name: f.name, size: f.size, status: 'ready', progress: null, issues: [], fieldName: fieldName || null };
        });

        setItems(prev => {
            const updatedIds = new Set(next.map(n => n.fieldName).filter(Boolean));
            const filtered   = prev.filter(p => !updatedIds.has(p.fieldName));
            const merged     = [...filtered, ...next];
            scanFiles(merged.filter(f => f.file));
            return merged;
        });
        setResult(null);
    };

    const removeItem = (id) => {
        setItems(prev => {
            const next = prev.filter(f => f.id !== id);
            if (next.length > 0) scanFiles(next.filter(f => f.file));
            else setPeriod({ status: 'idle', min: null, max: null, sources: [] });
            return next;
        });
    };

    // ── Import handler ─────────────────────────────────────────────────────────
    const handleImport = async () => {
        if (!canImport) return;
        setIsImporting(true);
        setResult(null);

        const importDate = getApiDate(periodMode, period, manualTo);
        setItems(prev => prev.map(f => ({ ...f, status: 'importing', progress: 30 })));

        try {
            const fd = new FormData();
            fd.append('date', importDate);
            for (const item of items) {
                const fieldName = FILE_FIELD_MAP[detectFile(item.name).typeKey];
                if (fieldName) fd.append(fieldName, item.file);
            }

            setItems(prev => prev.map(f => ({ ...f, progress: 60 })));
            const { data } = await misApi.upload(branch, fd);
            if (!data.success) throw new Error(data.message || 'Import failed');

            const imported    = data.imported || {};
            let totalImported = 0, totalSkipped = 0, totalErrors = 0;
            const KEY_TO_FIELD = { bill_items: 'bill_file', cashier: 'cashier_file', er: 'er_file', ip: 'ip_file', surgery: 'surgery_file', package: 'package_file' };
            const fieldResults = {};
            Object.entries(imported).forEach(([key, val]) => {
                const count   = typeof val === 'object' ? (val.count ?? val.imported ?? 0) : (Number(val) || 0);
                const skipped = typeof val === 'object' ? (val.skipped ?? 0) : 0;
                const errs    = typeof val === 'object' ? (val.errors ?? 0) : 0;
                totalImported += count; totalSkipped += skipped; totalErrors += errs;
                fieldResults[KEY_TO_FIELD[key] || key] = { count, skipped, errs };
            });

            setItems(prev => prev.map(item => {
                const fieldName = FILE_FIELD_MAP[detectFile(item.name).typeKey];
                const res       = fieldResults[fieldName];
                return { ...item, status: 'done', progress: 100, rowCount: res?.count ?? null, issues: [] };
            }));

            dispatch(setDate(importDate));
            dispatch(setLastImportInfo({ branch, date: importDate, uploadedAt: new Date().toISOString() }));

            // Invalidate all queries so Dashboard auto-refreshes
            ['mis','kpi','dailyTrend','payerMix','patientMix','ipDemo','surgeryDetail',
             'opMetrics','collection','serviceRevenue','doctorPerformance','admissions',
            ].forEach(key => queryClient.invalidateQueries({ queryKey: [key, branch] }));

            setResult({ success: true, imported: totalImported, skipped: totalSkipped, errors: totalErrors, message: data.message || 'Import complete' });

        } catch (err) {
            const apiErrors   = err.response?.data?.errors || {};
            const topMsg      = err.response?.data?.message || err.message || 'Upload failed';
            const allMessages = Object.entries(apiErrors).flatMap(([field, msgs]) => msgs.map(m => ({ field, message: m })));

            setItems(prev => prev.map(item => {
                const fieldName = FILE_FIELD_MAP[detectFile(item.name).typeKey];
                const fieldMsgs = apiErrors[fieldName] || [];
                const issue     = fieldMsgs[0] || (allMessages.length > 0 ? allMessages[0].message : topMsg);
                return { ...item, status: 'error', progress: 100, issues: [{ type: 'error', message: issue }] };
            }));

            setResult({
                success: false, errors: items.length, message: topMsg,
                detail:  allMessages.length > 0 ? allMessages.slice(0, 3).map(m => `${m.field}: ${m.message}`).join(' · ') : null,
                errorLines: allMessages,
            });
        } finally {
            setIsImporting(false);
        }
    };

    const periodSummary = (() => {
        if (period.status === 'single') return fmtDMY(period.min);
        if (period.status === 'range' || period.status === 'inconsistent')
            return `${fmtDMY(period.min)} → ${fmtDMY(period.max)}`;
        if (periodMode === 'manual' && manualTo)
            return manualFrom && manualFrom !== manualTo
                ? `${fmtDMY(parseKareDate(manualFrom))} → ${fmtDMY(parseKareDate(manualTo))}`
                : fmtDMY(parseKareDate(manualTo));
        return null;
    })();

    const topbar = (
        <div className="bg-white border-b border-slate-200">
            <div className="px-5 pt-3 pb-1 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-[15px] font-700 text-slate-800 leading-tight">Import Center</h1>
                    <p className="text-[10px] text-slate-400">Upload KareXpert CSVs — all files in one batch</p>
                </div>
            </div>
            <div className="overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-3 px-5 pb-3 min-w-max">
                    <div className="flex gap-1.5">
                        {Object.entries(BRANCHES).map(([key, { label }]) => (
                            <button key={key} onClick={() => dispatch(setBranch(key))}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-[12px] font-600 border transition-all cursor-pointer whitespace-nowrap',
                                    branch === key
                                        ? 'bg-blue-700 border-blue-700 text-white shadow-sm shadow-blue-200'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700',
                                )}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

                    {periodSummary ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="text-[11px] font-600 text-blue-700 whitespace-nowrap">{periodSummary}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">Period: Auto-detect</span>
                        </div>
                    )}

                    <button onClick={handleImport} disabled={!canImport}
                        className={cn(
                            'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-700 transition-all border-0 whitespace-nowrap flex-shrink-0',
                            canImport
                                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white cursor-pointer hover:opacity-90 shadow-md shadow-blue-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                        )}>
                        {isImporting
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</>
                            : <><Upload className="w-4 h-4" />
                              <span>{items.length > 0 ? `Import ${items.length} file${items.length > 1 ? 's' : ''}` : 'Import'}</span></>
                        }
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <AppLayout topbar={topbar}>
            <main className="flex-1 overflow-y-auto p-5 grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-0">

                {/* ── Left: Drop zone + File cards ──────────────────────────── */}
                <div className="xl:col-span-2 space-y-4">
                    <DropZone onFiles={addFiles} isDragging={isDragging} setIsDragging={setIsDragging} />

                    {items.length === 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-3">Auto-detected file types</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DETECT_RULES.map(({ typeKey, label, icon: Icon, color }) => {
                                    const c     = COLOR_CLASSES[color];
                                    const isReq = REQUIRED_FIELDS[branch]?.includes(FILE_FIELD_MAP[typeKey]);
                                    return (
                                        <div key={typeKey} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${c.iconBg}`}>
                                                <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                                            </div>
                                            <div>
                                                <div className={`text-[11px] font-600 ${c.text}`}>{label}</div>
                                                {isReq && <div className="text-[9px] text-red-500 font-600">Required</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {items.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-700 text-slate-700">
                                    {items.length} file{items.length !== 1 ? 's' : ''} queued
                                    {missing.length > 0 && (
                                        <span className="ml-2 text-[11px] text-amber-600 font-600">
                                            · {missing.length} required file{missing.length > 1 ? 's' : ''} missing
                                        </span>
                                    )}
                                </span>
                                <button onClick={() => { setItems([]); setResult(null); setPeriod({ status: 'idle', min: null, max: null, sources: [] }); }}
                                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                                </button>
                            </div>
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {items.map(item => <FileCard key={item.id} item={item} onRemove={removeItem} />)}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Result banner */}
                    <AnimatePresence>
                        {result && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className={`border rounded-xl p-4 flex items-start gap-3 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                {result.success
                                    ? <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                    : <XCircle      className="w-6 h-6 text-red-600   flex-shrink-0 mt-0.5" />}
                                <div className="flex-1">
                                    <div className={`text-[13px] font-700 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.success ? 'Import Complete' : 'Import Failed'}
                                    </div>
                                    <div className={`text-[12px] mt-0.5 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                        {result.message}
                                        {result.success && result.imported > 0 && ` · ${result.imported.toLocaleString()} rows imported`}
                                        {result.success && result.skipped  > 0 && ` · ${result.skipped} skipped`}
                                        {result.success && result.errors   > 0 && ` · ${result.errors} errors`}
                                    </div>
                                    {result.detail && (
                                        <div className="text-[11px] text-red-600 mt-1 leading-relaxed">{result.detail}</div>
                                    )}
                                    {!result.success && result.errorLines?.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const csv = ['File,Message', ...result.errorLines.map(l => `"${l.field}","${l.message}"`)].join('\n');
                                                const a   = document.createElement('a');
                                                a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                                                a.download = 'import-errors.csv';
                                                a.click();
                                            }}
                                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-600 text-red-700 underline hover:no-underline cursor-pointer"
                                        >
                                            Download error report ({result.errorLines.length} errors)
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setResult(null)}
                                    className={`text-[11px] font-600 cursor-pointer flex-shrink-0 ${result.success ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}>
                                    Dismiss
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Right sidebar ──────────────────────────────────────────── */}
                <div className="space-y-4">
                    <ImportPeriodSelector
                        period={period}
                        mode={periodMode}
                        onModeChange={setPeriodMode}
                        manualFrom={manualFrom}
                        manualTo={manualTo}
                        onManualFrom={setManualFrom}
                        onManualTo={setManualTo}
                        onForceManual={() => setPeriodMode('manual')}
                    />
                    <ValidationPanel items={items} branch={branch} />
                    <AutoKpiNotice />
                    <ImportHistoryPanel branch={branch} />
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-[12px] font-700 text-blue-800 mb-2">
                            <Info className="w-4 h-4" /> Import Tips
                        </div>
                        <ul className="text-[11px] text-blue-700 space-y-1.5">
                            <li>• <strong>Bill Items + Cashier</strong> are always required. Package is required for Chromepet.</li>
                            <li>• All files are uploaded in <strong>one batch</strong> — the period is auto-detected from CSV date columns.</li>
                            <li>• Duplicate bill numbers are automatically skipped, not rejected.</li>
                            <li>• Switch to <strong>Manual Range</strong> to override the detected period.</li>
                        </ul>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
