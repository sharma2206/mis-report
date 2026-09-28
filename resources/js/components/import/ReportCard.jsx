import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
    Clock, Loader2, History, RotateCcw, File, AlertCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { scanCsvFile, tsToYMD } from '../../utils/csvScanner';
import { fmtSize } from '../../utils/fileDetect';

// ── Status configuration ──────────────────────────────────────────────────────
const STATUS_CFG = {
    pending:    { label: 'Pending',    badge: 'bg-slate-100 text-slate-500',   border: 'border-slate-200', dot: 'bg-slate-400' },
    scanning:   { label: 'Scanning…', badge: 'bg-blue-100  text-blue-600',    border: 'border-blue-300',  dot: 'bg-blue-500 animate-pulse' },
    uploading:  { label: 'Uploading…',badge: 'bg-violet-100 text-violet-600', border: 'border-violet-300',dot: 'bg-violet-500 animate-pulse' },
    success:    { label: 'Imported',   badge: 'bg-green-100 text-green-700',   border: 'border-green-300', dot: 'bg-green-500' },
    partial:    { label: 'Warning',    badge: 'bg-amber-100 text-amber-700',   border: 'border-amber-300', dot: 'bg-amber-500' },
    failed:     { label: 'Failed',     badge: 'bg-red-100   text-red-700',     border: 'border-red-300',   dot: 'bg-red-500' },
    error:      { label: 'Error',      badge: 'bg-red-100   text-red-700',     border: 'border-red-300',   dot: 'bg-red-500' },
    rolled_back:{ label: 'Rolled Back',badge: 'bg-slate-100 text-slate-500',   border: 'border-slate-200', dot: 'bg-slate-400' },
};

const STEPS = ['Select', 'Scan', 'Upload', 'Done'];

function fmtRows(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('en-IN');
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtPeriod(from, to) {
    if (!from) return null;
    const fmt = (d) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
    };
    if (!to || from === to) return fmt(from);
    return `${fmt(from)} → ${fmt(to)}`;
}

function getStepIndex(localStatus) {
    if (!localStatus) return -1;
    if (localStatus === 'scanning')  return 1;
    if (localStatus === 'uploading') return 2;
    if (localStatus === 'error')     return -1;
    return -1;
}

// Color accent classes
const ACCENT = {
    blue:   { bg: 'bg-blue-600',   light: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   drag: 'bg-blue-50 border-blue-400'   },
    green:  { bg: 'bg-emerald-600',light: 'bg-emerald-50',text: 'text-emerald-600',border: 'border-emerald-200',drag: 'bg-emerald-50 border-emerald-400'},
    red:    { bg: 'bg-red-600',    light: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200',    drag: 'bg-red-50 border-red-400'       },
    violet: { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', drag: 'bg-violet-50 border-violet-400'  },
    amber:  { bg: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200',  drag: 'bg-amber-50 border-amber-400'   },
    cyan:   { bg: 'bg-cyan-600',   light: 'bg-cyan-50',   text: 'text-cyan-600',   border: 'border-cyan-200',   drag: 'bg-cyan-50 border-cyan-400'     },
};

// ── ReportCard ────────────────────────────────────────────────────────────────
export const ReportCard = ({
    typeKey, label, fieldName, icon: Icon, color, required,
    description, serverStatus, branch, date, onSuccess, onHistory,
}) => {
    const inputRef = useRef(null);

    // Local UI state
    const [localStatus,   setLocalStatus]   = useState(null); // 'scanning'|'uploading'|'error'|null
    const [errorMsg,      setErrorMsg]       = useState(null);
    const [localRows,     setLocalRows]      = useState(null);
    const [isDragging,    setIsDragging]     = useState(false);
    const [filePreview,   setFilePreview]    = useState(null); // { name, size } before upload starts
    const [scanProgress,  setScanProgress]   = useState(0);
    const [uploadProgress,setUploadProgress] = useState(0);

    // Duplicate guard — track last successfully imported fingerprint
    const [lastFingerprint, setLastFingerprint] = useState(null);
    const [dupWarning,      setDupWarning]      = useState(false); // show confirmation prompt
    const pendingFileRef = useRef(null); // hold file while user confirms dup

    // Resolve display status
    const displayStatus = localStatus
        ?? (serverStatus?.status === 'rolled_back' ? 'pending' : serverStatus?.status)
        ?? 'pending';

    const cfg      = STATUS_CFG[displayStatus] || STATUS_CFG.pending;
    const isActive = displayStatus === 'scanning' || displayStatus === 'uploading';
    const isImported = displayStatus === 'success' || displayStatus === 'partial';

    const rows       = localRows ?? serverStatus?.rows;
    const importedAt = serverStatus?.imported_at;
    const periodFrom = serverStatus?.period_from;
    const periodTo   = serverStatus?.period_to;
    const uploadedBy = serverStatus?.uploaded_by;

    const ac = ACCENT[color] || ACCENT.blue;

    // ── Core upload logic ──────────────────────────────────────────────────
    const doUpload = useCallback(async (file) => {
        setErrorMsg(null);
        setLocalRows(null);
        setFilePreview({ name: file.name, size: file.size });
        setDupWarning(false);
        pendingFileRef.current = null;

        try {
            // Step 2: Scan
            setLocalStatus('scanning');
            setScanProgress(0);
            const scan = await scanCsvFile(file, typeKey);
            setScanProgress(100);
            const detectedFrom = scan.min ? tsToYMD(scan.min) : date;
            const detectedTo   = scan.max ? tsToYMD(scan.max) : date;

            // Step 3: Upload
            setLocalStatus('uploading');
            setUploadProgress(0);
            const { misApi } = await import('../../services/api');
            const fd = new FormData();
            fd.append('date',        detectedTo || date);
            fd.append('period_from', detectedFrom);
            fd.append('period_to',   detectedTo);
            fd.append(fieldName,     file);

            setUploadProgress(40);
            const { data } = await misApi.uploadSingle(branch, fd);
            setUploadProgress(100);
            if (!data.success) throw new Error(data.message || 'Import failed');

            // Extract rows
            const typeRows = data.imported?.[typeKey];
            const count    = typeof typeRows === 'object'
                ? (typeRows?.count ?? typeRows?.imported ?? 0)
                : (Number(typeRows) || 0);

            setLocalRows(count);
            setLocalStatus(null);
            setFilePreview(null);
            // Record fingerprint to guard against accidental re-upload
            setLastFingerprint(`${file.name}|${file.size}`);
            onSuccess?.();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Upload failed';
            setErrorMsg(msg);
            setLocalStatus('error');
            setUploadProgress(0);
            setScanProgress(0);
        }
    }, [typeKey, fieldName, branch, date, onSuccess]);

    // ── File entry point — check for duplicates ────────────────────────────
    const handleFile = useCallback((file) => {
        if (!file) return;
        const fp = `${file.name}|${file.size}`;
        if (fp === lastFingerprint) {
            // Same file fingerprint — ask for confirmation
            pendingFileRef.current = file;
            setDupWarning(true);
        } else {
            doUpload(file);
        }
    }, [lastFingerprint, doUpload]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // reset so same file can be picked again
        handleFile(file);
    };

    // ── Drag & drop ────────────────────────────────────────────────────────
    const handleDragOver  = (e) => { e.preventDefault(); if (!isActive) setIsDragging(true); };
    const handleDragLeave = ()  => setIsDragging(false);
    const handleDrop      = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (isActive) return;
        const file = Array.from(e.dataTransfer.files).find(
            f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv'
        );
        handleFile(file);
    };

    const triggerUpload = () => { if (!isActive) inputRef.current?.click(); };

    // Derive active step for stepper
    const stepIdx = localStatus === 'scanning' ? 1 : localStatus === 'uploading' ? 2 : -1;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                'relative bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden flex flex-col',
                isDragging ? `${ac.drag} shadow-lg` : cfg.border,
                isActive && 'shadow-md',
                !isActive && !isDragging && 'hover:shadow-md',
            )}
        >
            {/* Top accent stripe */}
            <div className={cn('h-1 w-full', ac.bg)} />

            {/* Animated progress bar (scan or upload) */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        className={cn('h-0.5 absolute top-1 left-0 z-10', localStatus === 'uploading' ? 'bg-violet-500' : 'bg-blue-500')}
                        initial={{ width: '0%' }}
                        animate={{ width: localStatus === 'scanning'
                            ? `${Math.max(scanProgress, 40)}%`
                            : `${Math.max(uploadProgress, 15)}%`
                        }}
                        exit={{ width: '100%', opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                )}
            </AnimatePresence>

            {/* Drag overlay hint */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
                    >
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', ac.light)}>
                            <Upload className={cn('w-5 h-5', ac.text)} />
                        </div>
                        <span className={cn('text-[12px] font-700', ac.text)}>Drop to upload</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={cn('p-4 flex flex-col gap-3 flex-1', isDragging && 'opacity-30')}>
                {/* Header row: icon + label + status badge */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', ac.bg)}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-700 text-slate-800 leading-tight truncate">{label}</p>
                            <p className="text-[10px] text-slate-400 leading-tight">{description}</p>
                        </div>
                    </div>
                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 whitespace-nowrap flex-shrink-0', cfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {isActive ? (
                            <span className="flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {cfg.label}
                            </span>
                        ) : cfg.label}
                    </div>
                </div>

                {/* Step indicator (only while processing) */}
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-1">
                                {STEPS.map((step, i) => {
                                    const done   = i < stepIdx + 1;
                                    const active = i === stepIdx;
                                    return (
                                        <div key={step} className="flex items-center gap-1 flex-1">
                                            <div className={cn(
                                                'flex items-center gap-1 text-[9px] font-700 whitespace-nowrap',
                                                active ? ac.text : done ? 'text-slate-500' : 'text-slate-300',
                                            )}>
                                                <div className={cn(
                                                    'w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-800',
                                                    active ? `${ac.bg} text-white` : done ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-300',
                                                )}>
                                                    {done && !active ? '✓' : i + 1}
                                                </div>
                                                <span className="hidden sm:block">{step}</span>
                                            </div>
                                            {i < STEPS.length - 1 && (
                                                <div className={cn('flex-1 h-px', done ? 'bg-slate-300' : 'bg-slate-100')} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className={cn('text-[10px] mt-1.5', ac.text)}>
                                {localStatus === 'scanning'
                                    ? 'Reading date columns from CSV…'
                                    : 'Uploading to server…'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* File preview (before/during upload) */}
                <AnimatePresence>
                    {filePreview && isActive && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
                                <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-600 text-slate-700 truncate">{filePreview.name}</p>
                                    <p className="text-[10px] text-slate-400">{fmtSize(filePreview.size)}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Duplicate-file warning prompt */}
                <AnimatePresence>
                    {dupWarning && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-800 font-600 leading-snug">
                                    This file was already imported. Import again?
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setDupWarning(false); pendingFileRef.current = null; }}
                                    className="flex-1 px-2 py-1 text-[10px] font-700 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { doUpload(pendingFileRef.current); }}
                                    className="flex-1 px-2 py-1 text-[10px] font-700 rounded-md bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                                >
                                    Yes, Re-import
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Metadata (shown when imported) */}
                {isImported && !isActive && (
                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-600 uppercase tracking-wide">Rows</span>
                            <span className="text-[12px] font-700 text-slate-700 tabular-nums">{fmtRows(rows)}</span>
                        </div>
                        {fmtPeriod(periodFrom, periodTo) && (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-600 uppercase tracking-wide">Period</span>
                                <span className="text-[11px] font-600 text-slate-600">{fmtPeriod(periodFrom, periodTo)}</span>
                            </div>
                        )}
                        {importedAt && (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-600 uppercase tracking-wide">Last Import</span>
                                <span className="text-[10px] text-slate-500">{fmtDate(importedAt)}</span>
                            </div>
                        )}
                        {uploadedBy && (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-600 uppercase tracking-wide">By</span>
                                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{uploadedBy}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending hint */}
                {displayStatus === 'pending' && !dupWarning && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-slate-400">
                        <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[11px]">
                            {required ? 'Required — drag a file here or click Upload' : 'Optional — drag & drop or click Upload'}
                        </span>
                    </div>
                )}

                {/* Error message */}
                {displayStatus === 'error' && errorMsg && (
                    <div className="flex items-start gap-1.5 bg-red-50 rounded-lg p-2 border border-red-100">
                        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-700 leading-snug">{errorMsg}</p>
                    </div>
                )}

                {/* Warning indicator */}
                {displayStatus === 'partial' && (
                    <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Imported with warnings — check history</span>
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                        onClick={triggerUpload}
                        disabled={isActive || dupWarning}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-600 border transition-all cursor-pointer flex-1 justify-center',
                            isImported
                                ? 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                : `border-transparent ${ac.bg} text-white hover:opacity-90`,
                            (isActive || dupWarning) && 'opacity-60 cursor-not-allowed',
                        )}
                    >
                        {isActive ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isImported ? (
                            <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                            <Upload className="w-3.5 h-3.5" />
                        )}
                        {isImported ? 'Re-import' : 'Upload'}
                    </button>

                    <button
                        onClick={() => onHistory?.(typeKey)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-600 border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                        title="View history"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={handleFileChange}
            />
        </motion.div>
    );
};
