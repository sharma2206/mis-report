import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, CheckCircle2, XCircle, AlertTriangle, Clock,
    FileText, ChevronDown, ChevronUp, Info, Calendar,
    Building2, Trash2, RefreshCw, Package, Hospital,
    Stethoscope, CreditCard, BarChart3, CheckCheck,
    ScanLine, ToggleLeft, ToggleRight, ArrowRight,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch as selBranch, setBranch } from '../store/reportSlice';
import { Navigate } from 'react-router-dom';
import { misApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { BRANCHES } from '../constants';
import { cn } from '../utils/cn';

// ─── Field mappings ───────────────────────────────────────────────────────────
const FILE_FIELD_MAP = {
    bill_items: 'bill_file',
    cashier:    'cashier_file',
    er:         'er_file',
    ip:         'ip_file',
    surgery:    'surgery_file',
    package:    'package_file',
};

const REQUIRED_FIELDS = {
    chromepet: ['bill_file', 'cashier_file', 'package_file'],
    oragadam:  ['bill_file', 'cashier_file'],
};

// ─── Date column patterns to scan in CSV headers ──────────────────────────────
const DATE_COL_PATTERNS = [
    /^bill\s*date/i,
    /^bill\s*date\s*time/i,
    /^admission\s*date/i,
    /^discharge\s*date/i,
    /^visit\s*date/i,
    /^surgery\s*date/i,
    /^collection\s*date/i,
    /^procedure\s*date/i,
    /^transaction\s*date/i,
    /^created\s*at/i,
    /\bdate\b/i,      // fallback: any column containing "date"
];

// KareXpert CSV date format: "05/07/2026, 11:48 pm" or "05/07/2026"
function parseKareDate(raw) {
    if (!raw) return null;
    const s = raw.trim().replace(/"/g, '');
    // "dd/mm/yyyy, hh:mm am/pm"
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m1) {
        const [, d, mo, y] = m1;
        const ts = Date.UTC(+y, +mo - 1, +d);
        return isNaN(ts) ? null : ts;
    }
    // "yyyy-mm-dd"
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const [, y, mo, d] = m2;
        const ts = Date.UTC(+y, +mo - 1, +d);
        return isNaN(ts) ? null : ts;
    }
    return null;
}

function fmtDMY(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

function tsToYMD(ts) {
    const d = new Date(ts);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Read first N rows of a File object as text, parse headers + dates
function scanCsvFile(file, maxRows = 200) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text  = e.target.result;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) return resolve({ min: null, max: null, col: null });

                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                // Find first matching date column index
                let colIdx = -1;
                let colName = null;
                for (const pat of DATE_COL_PATTERNS) {
                    colIdx = headers.findIndex(h => pat.test(h));
                    if (colIdx !== -1) { colName = headers[colIdx]; break; }
                }
                if (colIdx === -1) return resolve({ min: null, max: null, col: null });

                let minTs = Infinity, maxTs = -Infinity;
                const limit = Math.min(lines.length, maxRows + 1);
                for (let i = 1; i < limit; i++) {
                    // Simple CSV split (handles quoted commas imperfectly but fine for date columns)
                    const cells = lines[i].split(',');
                    const raw   = cells[colIdx];
                    const ts    = parseKareDate(raw);
                    if (ts !== null) {
                        if (ts < minTs) minTs = ts;
                        if (ts > maxTs) maxTs = ts;
                    }
                }
                resolve({
                    min: minTs === Infinity  ? null : minTs,
                    max: maxTs === -Infinity ? null : maxTs,
                    col: colName,
                });
            } catch {
                resolve({ min: null, max: null, col: null });
            }
        };
        reader.onerror = () => resolve({ min: null, max: null, col: null });
        // Only read first ~100 KB to keep scanning fast
        reader.readAsText(file.slice(0, 1024 * 100));
    });
}

// ─── File type detector ───────────────────────────────────────────────────────
const DETECT_RULES = [
    { pattern: /bill_item|bill_wise/i,         typeKey: 'bill_items', label: 'Bill Items',          icon: BarChart3,   color: 'blue'   },
    { pattern: /cashier|collection_detail/i,   typeKey: 'cashier',    label: 'Cashier Collection',  icon: CreditCard,  color: 'green'  },
    { pattern: /er_admission|emergency/i,      typeKey: 'er',         label: 'ER Admission',        icon: Hospital,    color: 'red'    },
    { pattern: /ip_admission/i,                typeKey: 'ip',         label: 'IP Admission',        icon: Building2,   color: 'violet' },
    { pattern: /surgery/i,                     typeKey: 'surgery',    label: 'Surgery Detail',      icon: Stethoscope, color: 'amber'  },
    { pattern: /package_consumption|package/i, typeKey: 'package',    label: 'Package Consumption', icon: Package,     color: 'cyan'   },
];

const COLOR_CLASSES = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   iconBg: 'bg-blue-100',   text: 'text-blue-600'   },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  iconBg: 'bg-green-100',  text: 'text-green-600'  },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    iconBg: 'bg-red-100',    text: 'text-red-600'    },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', iconBg: 'bg-violet-100', text: 'text-violet-600' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  iconBg: 'bg-amber-100',  text: 'text-amber-600'  },
    cyan:   { bg: 'bg-cyan-50',   border: 'border-cyan-200',   iconBg: 'bg-cyan-100',   text: 'text-cyan-600'   },
    slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  iconBg: 'bg-slate-100',  text: 'text-slate-500'  },
};

function detectFile(filename) {
    for (const r of DETECT_RULES) { if (r.pattern.test(filename)) return r; }
    return { typeKey: 'unknown', label: 'Unknown CSV', icon: FileText, color: 'slate' };
}

function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Status chip ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
    pending:   { label: 'Pending',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock        },
    ready:     { label: 'Ready',     cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2 },
    importing: { label: 'Importing', cls: 'bg-blue-100 text-blue-700',    Icon: RefreshCw    },
    done:      { label: 'Imported',  cls: 'bg-green-100 text-green-700',  Icon: CheckCheck   },
    warning:   { label: 'Warning',   cls: 'bg-amber-100 text-amber-700',  Icon: AlertTriangle},
    error:     { label: 'Errors',    cls: 'bg-red-100 text-red-700',      Icon: XCircle      },
    skipped:   { label: 'Skipped',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock        },
};

const StatusChip = ({ status }) => {
    const { label, cls, Icon } = STATUS_CFG[status] || STATUS_CFG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-600 whitespace-nowrap ${cls}`}>
            <Icon className={cn('w-3 h-3', status === 'importing' && 'animate-spin')} />
            {label}
        </span>
    );
};

// ─── File card ────────────────────────────────────────────────────────────────
const FileCard = ({ item, onRemove }) => {
    const [open, setOpen] = useState(false);
    const info = detectFile(item.name);
    const c    = COLOR_CLASSES[info.color];
    const Icon = info.icon;
    const hasIssues = item.issues?.length > 0;

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`border rounded-xl bg-white overflow-hidden ${item.status === 'error' ? 'border-red-200' : item.status === 'done' ? 'border-green-200' : c.border}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                    <Icon className={`w-4.5 h-4.5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-600 text-slate-800 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-600 ${c.text}`}>{info.label}</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{fmtSize(item.size)}</span>
                        {item.detectedCol && (
                            <><span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400">📅 {item.detectedCol}</span></>
                        )}
                        {item.rowCount != null && (
                            <><span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-green-600 font-600">{item.rowCount.toLocaleString()} rows</span></>
                        )}
                    </div>
                    {item.progress != null && (
                        <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${item.status === 'error' ? 'bg-red-500' : item.status === 'done' ? 'bg-green-500' : 'bg-blue-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusChip status={item.status} />
                    {hasIssues && (
                        <button onClick={() => setOpen(o => !o)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    {['pending', 'ready', 'error'].includes(item.status) && (
                        <button onClick={() => onRemove(item.id)}
                            className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {open && hasIssues && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="border-t border-slate-100 px-4 py-3 space-y-1.5">
                            {item.issues.map((issue, i) => (
                                <div key={i} className={`flex items-start gap-2 text-[11px] ${issue.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                                    {issue.type === 'error'
                                        ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                                    <span>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Drop zone ────────────────────────────────────────────────────────────────
const DropZone = ({ onFiles, isDragging, setIsDragging }) => {
    const ref = useRef(null);
    const handle = (rawFiles) => {
        const csvs = Array.from(rawFiles).filter(f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv');
        if (csvs.length) onFiles(csvs);
    };
    return (
        <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handle(e.dataTransfer.files); }}
            onClick={() => ref.current?.click()}
            className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer select-none transition-all duration-200',
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70',
            )}
        >
            <input ref={ref} type="file" accept=".csv" multiple className="hidden"
                onChange={e => { handle(e.target.files); e.target.value = ''; }} />
            <div className={cn('w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors', isDragging ? 'bg-blue-100' : 'bg-slate-100')}>
                <Upload className={cn('w-7 h-7', isDragging ? 'text-blue-600' : 'text-slate-400')} />
            </div>
            <div className="text-[15px] font-700 text-slate-700 mb-1">
                {isDragging ? 'Release to add files' : 'Drop KareXpert CSV files here'}
            </div>
            <div className="text-[12px] text-slate-400 mb-5">
                Bill Items · Cashier Collection · ER Admission · IP Admission · Surgery · Packages
            </div>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                <FileText className="w-4 h-4" /> Browse Files
            </span>
            <div className="text-[11px] text-slate-400 mt-3">Accepts .csv · Multiple files · Up to 20 MB each</div>
        </div>
    );
};

// ─── Intelligent Report Period Selector ───────────────────────────────────────
const ReportPeriodSelector = ({ period, mode, onModeChange, manualFrom, manualTo, onManualFrom, onManualTo, onForceManual }) => {
    const isAuto   = mode === 'auto';
    const scanning = period.status === 'scanning';

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-slate-400" />
                    <span className="text-[12px] font-700 text-slate-700">Report Period</span>
                </div>
                {/* Toggle */}
                <button
                    onClick={() => onModeChange(isAuto ? 'manual' : 'auto')}
                    className="flex items-center gap-1.5 text-[11px] font-600 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                    {isAuto
                        ? <><ToggleLeft className="w-4 h-4" /> Auto Detect</>
                        : <><ToggleRight className="w-4 h-4 text-blue-600" /> Manual Range</>
                    }
                </button>
            </div>

            <div className="p-4">
                {/* ── Auto mode ── */}
                <AnimatePresence mode="wait">
                {isAuto && (
                    <motion.div key="auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Idle — no files yet */}
                        {period.status === 'idle' && (
                            <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <div className="text-[12px] font-600 text-slate-500">Auto Detect</div>
                                    <div className="text-[11px] text-slate-400">Upload CSV files to detect the report period</div>
                                </div>
                            </div>
                        )}

                        {/* Scanning */}
                        {period.status === 'scanning' && (
                            <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                </div>
                                <div>
                                    <div className="text-[12px] font-600 text-blue-700">Scanning date columns…</div>
                                    <div className="text-[11px] text-slate-400">Reading {period.scanCount || 0} file{period.scanCount !== 1 ? 's' : ''}</div>
                                </div>
                            </div>
                        )}

                        {/* Single date detected */}
                        {period.status === 'single' && (
                            <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-0.5">Detected Report Date</div>
                                    <div className="text-[14px] font-700 text-slate-800">{fmtDMY(period.min)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">From {period.sources?.join(', ')}</div>
                                </div>
                            </div>
                        )}

                        {/* Range detected */}
                        {period.status === 'range' && (
                            <div>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-0.5">Detected Report Period</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-700 text-slate-800">{fmtDMY(period.min)}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[13px] font-700 text-slate-800">{fmtDMY(period.max)}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">Across {period.sources?.length} file{period.sources?.length !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                                {/* Multi-day warning */}
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-[11px] font-700 text-amber-800">Files span multiple days</div>
                                        <div className="text-[10px] text-amber-700 mt-0.5">Verify this is expected, or switch to Manual Range to set a specific period.</div>
                                    </div>
                                    <button onClick={onForceManual}
                                        className="text-[10px] font-700 text-amber-700 hover:text-amber-900 whitespace-nowrap cursor-pointer">
                                        Set Manually
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Inconsistent */}
                        {period.status === 'inconsistent' && (
                            <div>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] font-700 text-amber-800">Inconsistent date ranges across files</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Overall: {fmtDMY(period.min)} → {fmtDMY(period.max)}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-1.5">
                                    <button
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-600 text-slate-600 hover:border-slate-300 bg-white cursor-pointer"
                                        onClick={() => {/* continue with detected range */}}>
                                        Continue Anyway
                                    </button>
                                    <button
                                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-700 hover:bg-amber-700 cursor-pointer"
                                        onClick={onForceManual}>
                                        Set Manually
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* No date columns found */}
                        {period.status === 'no_dates' && (
                            <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <XCircle className="w-4 h-4 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[12px] font-700 text-red-700">No date columns found</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Please select the report period manually.</div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Manual mode ── */}
                {!isAuto && (
                    <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1.5">From Date</label>
                            <div className="relative">
                                <input type="date" value={manualFrom} max={manualTo || today()}
                                    onChange={e => onManualFrom(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2 text-[12px] border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 appearance-none bg-white" />
                                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1.5">To Date</label>
                            <div className="relative">
                                <input type="date" value={manualTo} min={manualFrom} max={today()}
                                    onChange={e => onManualTo(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2 text-[12px] border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 appearance-none bg-white" />
                                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                        {manualFrom && manualTo && (
                            <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                {manualFrom === manualTo
                                    ? `Report Date: ${fmtDMY(new Date(manualTo).getTime() + 86400000 * 0)}`
                                    : `Period: ${fmtDMY(parseKareDate(manualFrom))} → ${fmtDMY(parseKareDate(manualTo))}`
                                }
                            </div>
                        )}
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Validation panel ─────────────────────────────────────────────────────────
const ValidationPanel = ({ items, branch }) => {
    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const allErrors    = items.flatMap(f => (f.issues || []).map(i => ({ ...i, file: f.name })));
    const errors       = allErrors.filter(i => i.type === 'error');
    const warnings     = allErrors.filter(i => i.type === 'warning');
    const readyCount   = items.filter(f => ['ready', 'done'].includes(f.status)).length;

    const FIELD_LABELS = {
        bill_file:    'Bill Item Report',
        cashier_file: 'Cashier Collection',
        package_file: 'Package Consumption',
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span className="text-[12px] font-700 text-slate-700">Validation</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Files Queued', value: items.length,  color: 'text-slate-700' },
                        { label: 'Ready',        value: readyCount,    color: 'text-green-700' },
                        { label: 'Errors',       value: errors.length, color: 'text-red-600'   },
                        { label: 'Warnings',     value: warnings.length,color:'text-amber-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider">{label}</div>
                            <div className={`text-[22px] font-800 mt-0.5 ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                {missing.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                        <div className="text-[10px] font-700 text-amber-700 uppercase tracking-wider mb-1">Required files missing</div>
                        {missing.map(f => (
                            <div key={f} className="flex items-center gap-2 text-[11px] text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                {FIELD_LABELS[f] || f}
                            </div>
                        ))}
                    </div>
                )}

                {missing.length === 0 && items.length > 0 && errors.length === 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        All required files present — ready to import
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="space-y-1.5">
                        {errors.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{e.message}</span>
                            </div>
                        ))}
                        {errors.length > 5 && (
                            <div className="text-[10px] text-red-500 text-center">{errors.length - 5} more errors</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Import history ───────────────────────────────────────────────────────────
const HISTORY = [
    { name: 'formatted_bill_item_wise_detail.csv',  date: 'Today 09:30',  branch: 'Chromepet', rows: 12847, errors: 0 },
    { name: 'formatted_er_admission_report.csv',    date: 'Today 09:30',  branch: 'Chromepet', rows: 432,   errors: 0 },
    { name: 'formatted_ip_admission_report.csv',    date: 'Jul 5 08:15',  branch: 'Chromepet', rows: 891,   errors: 2 },
    { name: 'formatted_surgery_detail_report.csv',  date: 'Jul 5 08:15',  branch: 'Chromepet', rows: 234,   errors: 0 },
    { name: 'formatted_cashier_collection.csv',     date: 'Jul 4 22:00',  branch: 'Oragadam',  rows: 5201,  errors: 12},
];

const HistoryRow = ({ item }) => {
    const info = detectFile(item.name);
    const Icon = info.icon;
    const c    = COLOR_CLASSES[info.color];
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${c.text}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-600 text-slate-700 truncate">{item.name.replace(/^formatted_/, '')}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.date} · {item.branch}</div>
            </div>
            <div className="text-right flex-shrink-0">
                <div className="text-[11px] font-700 text-green-700">{item.rows.toLocaleString()} rows</div>
                {item.errors > 0 && <div className="text-[9px] text-red-600">{item.errors} errors</div>}
            </div>
        </div>
    );
};

// ─── Volume fields ────────────────────────────────────────────────────────────
const VolumeFields = ({ values, onChange }) => (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[12px] font-700 text-slate-700">Volume Data (optional)</span>
            <span className="text-[10px] text-slate-400">Defaults to 0 if blank</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
            {[
                { key: 'occupancy', label: 'Beds Occupied',  placeholder: 'e.g. 56' },
                { key: 'admission', label: 'Admissions',     placeholder: 'e.g. 8'  },
                { key: 'discharge', label: 'Discharges',     placeholder: 'e.g. 6'  },
                { key: 'er_count',  label: 'ER Count',       placeholder: 'e.g. 14' },
            ].map(({ key, label, placeholder }) => (
                <div key={key}>
                    <label className="block text-[10px] font-700 text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                    <input
                        type="number" min="0" value={values[key] || ''} placeholder={placeholder}
                        onChange={e => onChange(key, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    />
                </div>
            ))}
        </div>
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
let _id = 0;

// Derive the single API date from period state
function getApiDate(mode, period, manualTo) {
    if (mode === 'manual') return manualTo || today();
    if (period.max) return tsToYMD(period.max);
    if (period.min) return tsToYMD(period.min);
    return today();
}

export default function ImportCenter() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selBranch);
    const dispatch = useDispatch();

    const [items,       setItems]       = useState([]);
    const [isDragging,  setIsDragging]  = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [result,      setResult]      = useState(null);
    const [volume,      setVolume]      = useState({ occupancy: '', admission: '', discharge: '', er_count: '' });

    // Period detection state
    const [periodMode,  setPeriodMode]  = useState('auto');   // 'auto' | 'manual'
    const [period,      setPeriod]      = useState({ status: 'idle', min: null, max: null, sources: [], scanCount: 0 });
    const [manualFrom,  setManualFrom]  = useState('');
    const [manualTo,    setManualTo]    = useState(today());

    if (!token) return <Navigate to="/login" replace />;

    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const hasErrors    = items.some(f => f.status === 'error');
    const periodReady  = periodMode === 'manual' ? !!(manualTo) : ['single', 'range', 'inconsistent'].includes(period.status);
    const canImport    = items.length > 0 && !isImporting && missing.length === 0 && !hasErrors && periodReady;

    // ── Scan uploaded files for date columns ────────────────────────────────
    const scanFiles = async (files) => {
        setPeriod({ status: 'scanning', min: null, max: null, sources: [], scanCount: files.length });

        const results = await Promise.all(files.map(item => scanCsvFile(item.file)));

        // Collect per-file results, update cards with detected column name
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

        // Update file cards with detected column
        setItems(prev => prev.map(item => {
            const col = perFile[item.id];
            return col ? { ...item, detectedCol: col } : item;
        }));

        if (filesWithDates === 0) {
            setPeriod({ status: 'no_dates', min: null, max: null, sources: [] });
            setPeriodMode('manual');
            return;
        }

        const isSingle = tsToYMD(globalMin) === tsToYMD(globalMax);
        // Check inconsistency: per-file ranges differ significantly
        const fileMins = results.filter(r => r.min).map(r => tsToYMD(r.min));
        const fileMaxs = results.filter(r => r.max).map(r => tsToYMD(r.max));
        const uniqueMins = new Set(fileMins).size;
        const uniqueMaxs = new Set(fileMaxs).size;
        const isInconsistent = (uniqueMins > 1 || uniqueMaxs > 1) && !isSingle;

        setPeriod({
            status:  isInconsistent ? 'inconsistent' : isSingle ? 'single' : 'range',
            min:     globalMin === Infinity  ? null : globalMin,
            max:     globalMax === -Infinity ? null : globalMax,
            sources,
        });

        // Pre-fill manual fields in case user switches
        if (globalMin !== Infinity)  setManualFrom(tsToYMD(globalMin));
        if (globalMax !== -Infinity) setManualTo(tsToYMD(globalMax));
    };

    // ── Add files ───────────────────────────────────────────────────────────
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
            // Trigger scan on ALL current files including new ones
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

    // ── Import handler ──────────────────────────────────────────────────────
    const handleImport = async () => {
        if (!canImport) return;
        setIsImporting(true);
        setResult(null);

        const importDate = getApiDate(periodMode, period, manualTo);
        setItems(prev => prev.map(f => ({ ...f, status: 'importing', progress: 30 })));

        try {
            const fd = new FormData();
            fd.append('date',      importDate);
            fd.append('occupancy', volume.occupancy  || '0');
            fd.append('admission', volume.admission  || '0');
            fd.append('discharge', volume.discharge  || '0');
            fd.append('er_count',  volume.er_count   || '0');

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

            setResult({ success: true, imported: totalImported, skipped: totalSkipped, errors: totalErrors, message: data.message || 'Import complete' });

        } catch (err) {
            const apiErrors  = err.response?.data?.errors || {};
            const topMsg     = err.response?.data?.message || err.message || 'Upload failed';
            const allMessages = Object.entries(apiErrors).flatMap(([field, msgs]) => msgs.map(m => ({ field, message: m })));

            setItems(prev => prev.map(item => {
                const fieldName = FILE_FIELD_MAP[detectFile(item.name).typeKey];
                const fieldMsgs = apiErrors[fieldName] || [];
                const issue     = fieldMsgs[0] || (allMessages.length > 0 ? allMessages[0].message : topMsg);
                return { ...item, status: 'error', progress: 100, issues: [{ type: 'error', message: issue }] };
            }));

            setResult({
                success: false,
                errors:  items.length,
                message: topMsg,
                detail:  allMessages.length > 0 ? allMessages.map(m => `${m.field}: ${m.message}`).join(' · ') : null,
            });
        } finally {
            setIsImporting(false);
        }
    };

    const importDateLabel = getApiDate(periodMode, period, manualTo);

    // ── Topbar ──────────────────────────────────────────────────────────────
    const topbar = (
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-4">
            <div>
                <h1 className="text-[16px] font-700 text-slate-800">Import Center</h1>
                <p className="text-[11px] text-slate-400">Upload KareXpert CSVs — all files in one batch</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* Branch pills */}
                <div className="flex gap-1.5">
                    {Object.entries(BRANCHES).map(([key, { label }]) => (
                        <button key={key} onClick={() => dispatch(setBranch(key))}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-[12px] font-600 border transition-all cursor-pointer',
                                branch === key
                                    ? 'bg-blue-700 border-blue-700 text-white shadow-sm shadow-blue-200'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700',
                            )}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Period summary chip */}
                {periodReady && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-600 text-blue-700">
                            {period.status === 'single'
                                ? fmtDMY(period.min)
                                : period.status === 'range' || period.status === 'inconsistent'
                                    ? `${fmtDMY(period.min)} → ${fmtDMY(period.max)}`
                                    : periodMode === 'manual' && manualTo
                                        ? manualFrom && manualFrom !== manualTo ? `${fmtDMY(parseKareDate(manualFrom))} → ${fmtDMY(parseKareDate(manualTo))}` : fmtDMY(parseKareDate(manualTo))
                                        : ''
                            }
                        </span>
                    </div>
                )}

                {/* Import button */}
                <button onClick={handleImport} disabled={!canImport}
                    className={cn(
                        'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-700 transition-all border-0',
                        canImport
                            ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white cursor-pointer hover:opacity-90 shadow-md shadow-blue-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    )}>
                    {isImporting
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</>
                        : <><Upload className="w-4 h-4" />
                          {items.length > 0 ? `Import ${items.length} file${items.length > 1 ? 's' : ''}` : 'Import'}</>
                    }
                </button>
            </div>
        </div>
    );

    return (
        <AppLayout topbar={topbar}>
            <main className="flex-1 p-5 grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-0">

                {/* ── Left: Drop zone + File cards ─────────────────────────── */}
                <div className="xl:col-span-2 space-y-4">
                    <DropZone onFiles={addFiles} isDragging={isDragging} setIsDragging={setIsDragging} />

                    {items.length === 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-3">Auto-detected file types</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DETECT_RULES.map(({ typeKey, label, icon: Icon, color }) => {
                                    const c    = COLOR_CLASSES[color];
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
                                    : <XCircle      className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />}
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
                                </div>
                                <button onClick={() => setResult(null)}
                                    className={`text-[11px] font-600 cursor-pointer ${result.success ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}>
                                    Dismiss
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Right sidebar ─────────────────────────────────────────── */}
                <div className="space-y-4">
                    {/* 1. Intelligent Period Selector */}
                    <ReportPeriodSelector
                        period={period}
                        mode={periodMode}
                        onModeChange={setPeriodMode}
                        manualFrom={manualFrom}
                        manualTo={manualTo}
                        onManualFrom={setManualFrom}
                        onManualTo={setManualTo}
                        onForceManual={() => setPeriodMode('manual')}
                    />

                    {/* 2. Validation */}
                    <ValidationPanel items={items} branch={branch} />

                    {/* 3. Volume Data */}
                    <VolumeFields values={volume} onChange={(k, v) => setVolume(p => ({ ...p, [k]: v }))} />

                    {/* 4. Import History */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-[12px] font-700 text-slate-700">Import History</span>
                            </div>
                            <button className="text-[11px] text-blue-600 hover:text-blue-700 font-600 cursor-pointer">View All</button>
                        </div>
                        <div className="px-4 py-1">
                            {HISTORY.map((item, i) => <HistoryRow key={i} item={item} />)}
                        </div>
                    </div>

                    {/* 5. Tips */}
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
