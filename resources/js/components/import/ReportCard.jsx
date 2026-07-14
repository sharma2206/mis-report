import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
    Clock, Loader2, History, ChevronRight, RotateCcw,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { scanCsvFile, tsToYMD } from '../../utils/csvScanner';

// ── Status configuration ──────────────────────────────────────────────────────
const STATUS_CFG = {
    pending:    { label: 'Pending',    badge: 'bg-slate-100 text-slate-500',   border: 'border-slate-200', dot: 'bg-slate-400' },
    scanning:   { label: 'Scanning…', badge: 'bg-blue-100  text-blue-600',    border: 'border-blue-300',  dot: 'bg-blue-500 animate-pulse' },
    uploading:  { label: 'Importing…',badge: 'bg-blue-100  text-blue-600',    border: 'border-blue-300',  dot: 'bg-blue-500 animate-pulse' },
    success:    { label: 'Imported',   badge: 'bg-green-100 text-green-700',   border: 'border-green-300', dot: 'bg-green-500' },
    partial:    { label: 'Warning',    badge: 'bg-amber-100 text-amber-700',   border: 'border-amber-300', dot: 'bg-amber-500' },
    failed:     { label: 'Failed',     badge: 'bg-red-100   text-red-700',     border: 'border-red-300',   dot: 'bg-red-500' },
    error:      { label: 'Error',      badge: 'bg-red-100   text-red-700',     border: 'border-red-300',   dot: 'bg-red-500' },
    rolled_back:{ label: 'Rolled Back',badge: 'bg-slate-100 text-slate-500',   border: 'border-slate-200', dot: 'bg-slate-400' },
};

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

// ── ReportCard ────────────────────────────────────────────────────────────────
export const ReportCard = ({
    typeKey, label, fieldName, icon: Icon, color, required,
    description, serverStatus, branch, date, onSuccess, onHistory,
}) => {
    const inputRef   = useRef(null);
    const [localStatus, setLocalStatus] = useState(null); // 'scanning'|'uploading'|'error'|null
    const [errorMsg,    setErrorMsg]    = useState(null);
    const [localRows,   setLocalRows]   = useState(null);

    // Resolve display status
    const displayStatus = localStatus
        ?? (serverStatus?.status === 'rolled_back' ? 'pending' : serverStatus?.status)
        ?? 'pending';

    const cfg = STATUS_CFG[displayStatus] || STATUS_CFG.pending;
    const isActive   = displayStatus === 'scanning' || displayStatus === 'uploading';
    const isImported = displayStatus === 'success' || displayStatus === 'partial';

    const rows        = localRows ?? serverStatus?.rows;
    const importedAt  = serverStatus?.imported_at;
    const periodFrom  = serverStatus?.period_from;
    const periodTo    = serverStatus?.period_to;
    const uploadedBy  = serverStatus?.uploaded_by;

    // Color accent classes
    const ACCENT = {
        blue:   'bg-blue-600',
        green:  'bg-emerald-600',
        red:    'bg-red-600',
        violet: 'bg-violet-600',
        amber:  'bg-amber-500',
        cyan:   'bg-cyan-600',
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // reset input so the same file can be re-selected
        setErrorMsg(null);
        setLocalRows(null);

        try {
            // 1. Scan CSV for date period
            setLocalStatus('scanning');
            const scan = await scanCsvFile(file, typeKey);
            const periodFrom = scan.min ? tsToYMD(scan.min) : date;
            const periodTo   = scan.max ? tsToYMD(scan.max) : date;

            // 2. Build FormData and upload
            setLocalStatus('uploading');
            const { misApi } = await import('../../services/api');
            const fd = new FormData();
            fd.append('date',        periodTo || date);
            fd.append('period_from', periodFrom);
            fd.append('period_to',   periodTo);
            fd.append(fieldName,     file);

            const { data } = await misApi.uploadSingle(branch, fd);
            if (!data.success) throw new Error(data.message || 'Import failed');

            // Extract rows for this type from response
            const typeRows = data.imported?.[typeKey];
            const count    = typeof typeRows === 'object'
                ? (typeRows?.count ?? typeRows?.imported ?? 0)
                : (Number(typeRows) || 0);

            setLocalRows(count);
            setLocalStatus(null);
            onSuccess?.();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Upload failed';
            setErrorMsg(msg);
            setLocalStatus('error');
        }
    };

    const triggerUpload = () => inputRef.current?.click();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'relative bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden flex flex-col',
                cfg.border,
                isActive && 'shadow-md',
                !isActive && 'hover:shadow-md',
            )}
        >
            {/* Top accent stripe */}
            <div className={cn('h-1 w-full', ACCENT[color] || 'bg-slate-400')} />

            {/* Animated progress bar */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        className="h-0.5 bg-blue-500 absolute top-1 left-0 z-10"
                        initial={{ width: '0%' }}
                        animate={{ width: displayStatus === 'scanning' ? '40%' : '85%' }}
                        exit={{ width: '100%', opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                    />
                )}
            </AnimatePresence>

            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Header row: icon + label + status badge */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            ACCENT[color] || 'bg-slate-500',
                        )}>
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

                {/* Metadata (shown when imported) */}
                {isImported && (
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
                {displayStatus === 'pending' && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">
                            {required ? 'Required — upload to enable KPIs' : 'Optional report'}
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
                        disabled={isActive}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-600 border transition-all cursor-pointer flex-1 justify-center',
                            isImported
                                ? 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
                            isActive && 'opacity-60 cursor-not-allowed',
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
                        <History className="w-3.5 h-3.5" />
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
