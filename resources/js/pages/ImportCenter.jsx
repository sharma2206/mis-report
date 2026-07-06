import { useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, CheckCircle2, XCircle, AlertTriangle, Clock,
    FileText, ChevronDown, ChevronUp, Info, Calendar,
    Building2, Trash2, RefreshCw, Package, Hospital,
    Stethoscope, CreditCard, BarChart3, Send, CheckCheck,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch as selBranch, setBranch } from '../store/reportSlice';
import { Navigate } from 'react-router-dom';
import { misApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { BRANCHES } from '../constants';
import { cn } from '../utils/cn';

// ─── Field name mapping: detected type key → Laravel FormData field name ──────
const FILE_FIELD_MAP = {
    bill_items: 'bill_file',
    cashier:    'cashier_file',
    er:         'er_file',
    ip:         'ip_file',
    surgery:    'surgery_file',
    package:    'package_file',
};

// Which fields are required per branch (must be uploaded before import)
const REQUIRED_FIELDS = {
    chromepet: ['bill_file', 'cashier_file', 'package_file'],
    oragadam:  ['bill_file', 'cashier_file'],
};

// ─── File type auto-detector ──────────────────────────────────────────────────
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
    for (const rule of DETECT_RULES) {
        if (rule.pattern.test(filename)) return rule;
    }
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
    const info   = detectFile(item.name);
    const c      = COLOR_CLASSES[info.color];
    const Icon   = info.icon;
    const hasIssues = item.issues?.length > 0;

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`border rounded-xl bg-white overflow-hidden ${item.status === 'error' ? 'border-red-200' : item.status === 'done' ? 'border-green-200' : c.border}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                    <Icon className={`w-4.5 h-4.5 ${c.text}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-600 text-slate-800 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-600 ${c.text}`}>{info.label}</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{fmtSize(item.size)}</span>
                        {item.rowCount != null && (
                            <><span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-green-600 font-600">{item.rowCount.toLocaleString()} rows</span></>
                        )}
                        {item.fieldName && (
                            <><span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400 font-mono">{item.fieldName}</span></>
                        )}
                    </div>
                    {/* Progress bar */}
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

                {/* Actions */}
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

            {/* Issue list */}
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
        const csvs = Array.from(rawFiles).filter(f =>
            f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv'
        );
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

// ─── Validation panel ─────────────────────────────────────────────────────────
const ValidationPanel = ({ items, branch }) => {
    const required      = REQUIRED_FIELDS[branch] || [];
    const mappedFields  = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing       = required.filter(r => !mappedFields.includes(r));
    const allErrors     = items.flatMap(f => (f.issues || []).map(i => ({ ...i, file: f.name })));
    const errors        = allErrors.filter(i => i.type === 'error');
    const warnings      = allErrors.filter(i => i.type === 'warning');
    const readyCount    = items.filter(f => ['ready', 'done'].includes(f.status)).length;

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
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Files Queued', value: items.length,  color: 'text-slate-700' },
                        { label: 'Ready',        value: readyCount,    color: 'text-green-700' },
                        { label: 'Errors',       value: errors.length, color: 'text-red-600'   },
                        { label: 'Warnings',     value: warnings.length,color: 'text-amber-600'},
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider">{label}</div>
                            <div className={`text-[22px] font-800 mt-0.5 ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Missing required files */}
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

                {/* All good */}
                {missing.length === 0 && items.length > 0 && errors.length === 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        All required files present — ready to import
                    </div>
                )}

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="space-y-1.5">
                        {errors.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{e.message}</span>
                            </div>
                        ))}
                        {errors.length > 5 && (
                            <div className="text-[10px] text-red-500 text-center">{errors.length - 5} more errors — click a file card to expand</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Import history (static mock — replace with real API call) ─────────────────
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

// ─── Volume fields (optional, default 0) ─────────────────────────────────────
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

export default function ImportCenter() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selBranch);
    const dispatch = useDispatch();

    const [items,       setItems]       = useState([]);
    const [isDragging,  setIsDragging]  = useState(false);
    const [importDate,  setImportDate]  = useState(today());
    const [isImporting, setIsImporting] = useState(false);
    const [result,      setResult]      = useState(null);   // { imported, errors, message, breakdown }
    const [volume, setVolume] = useState({ occupancy: '', admission: '', discharge: '', er_count: '' });

    if (!token) return <Navigate to="/login" replace />;

    // ── Derive validation state ─────────────────────────────────────────────
    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const hasErrors    = items.some(f => f.status === 'error');
    const canImport    = items.length > 0 && !isImporting && missing.length === 0 && !hasErrors;

    // ── Add files ──────────────────────────────────────────────────────────
    const addFiles = (rawFiles) => {
        const next = rawFiles.map(f => {
            const info      = detectFile(f.name);
            const fieldName = FILE_FIELD_MAP[info.typeKey];
            // Deduplicate: replace existing card with same field name
            return { id: ++_id, file: f, name: f.name, size: f.size, status: 'ready', progress: null, issues: [], fieldName: fieldName || null };
        });

        setItems(prev => {
            // Replace any existing card for the same field name
            const updatedIds = new Set(next.map(n => n.fieldName).filter(Boolean));
            const filtered   = prev.filter(p => !updatedIds.has(p.fieldName));
            return [...filtered, ...next];
        });
        setResult(null);
    };

    const removeItem = (id) => setItems(prev => prev.filter(f => f.id !== id));

    // ── Import handler ─────────────────────────────────────────────────────
    const handleImport = async () => {
        if (!canImport) return;
        setIsImporting(true);
        setResult(null);

        // Mark all as importing
        setItems(prev => prev.map(f => ({ ...f, status: 'importing', progress: 30 })));

        try {
            // ── Build ONE FormData with correct named fields ────────────────
            const fd = new FormData();
            fd.append('date', importDate);

            // Volume fields (default 0 if blank)
            fd.append('occupancy',  volume.occupancy  || '0');
            fd.append('admission',  volume.admission  || '0');
            fd.append('discharge',  volume.discharge  || '0');
            fd.append('er_count',   volume.er_count   || '0');

            // Attach each file under its correct Laravel field name
            for (const item of items) {
                const info      = detectFile(item.name);
                const fieldName = FILE_FIELD_MAP[info.typeKey];
                if (fieldName) {
                    fd.append(fieldName, item.file);
                }
            }

            // Update progress to 60%
            setItems(prev => prev.map(f => ({ ...f, progress: 60 })));

            const { data } = await misApi.upload(branch, fd);

            if (!data.success) {
                throw new Error(data.message || 'Import failed');
            }

            // ── Parse per-file row counts from response ─────────────────────
            // data.imported looks like: { bill_items: { count: 1234 }, cashier: { count: 567 }, ... }
            const imported    = data.imported || {};
            let totalImported = 0;
            let totalSkipped  = 0;
            let totalErrors   = 0;

            // Build a fieldName → result map
            const fieldResults = {};
            const KEY_TO_FIELD = {
                bill_items:  'bill_file',
                cashier:     'cashier_file',
                er:          'er_file',
                ip:          'ip_file',
                surgery:     'surgery_file',
                package:     'package_file',
            };
            Object.entries(imported).forEach(([key, val]) => {
                const count   = typeof val === 'object' ? (val.count ?? val.imported ?? 0) : (Number(val) || 0);
                const skipped = typeof val === 'object' ? (val.skipped ?? 0) : 0;
                const errs    = typeof val === 'object' ? (val.errors ?? 0) : 0;
                totalImported += count;
                totalSkipped  += skipped;
                totalErrors   += errs;
                const field = KEY_TO_FIELD[key] || key;
                fieldResults[field] = { count, skipped, errs };
            });

            // Update each card to done + show row count
            setItems(prev => prev.map(item => {
                const info      = detectFile(item.name);
                const fieldName = FILE_FIELD_MAP[info.typeKey];
                const res       = fieldResults[fieldName];
                return {
                    ...item,
                    status:   'done',
                    progress: 100,
                    rowCount: res?.count ?? null,
                    issues:   [],
                };
            }));

            setResult({
                success:  true,
                imported: totalImported,
                skipped:  totalSkipped,
                errors:   totalErrors,
                message:  data.message || 'Import complete',
            });

        } catch (err) {
            // ── Parse Laravel validation errors ────────────────────────────
            const apiErrors = err.response?.data?.errors || {};
            const topMsg    = err.response?.data?.message || err.message || 'Upload failed';

            // Flatten all validation messages for display
            const allMessages = Object.entries(apiErrors).flatMap(([field, msgs]) =>
                msgs.map(m => ({ field, message: m }))
            );

            setItems(prev => prev.map(item => {
                const info      = detectFile(item.name);
                const fieldName = FILE_FIELD_MAP[info.typeKey];

                // Field-specific messages first, then global
                const fieldMsgs = apiErrors[fieldName] || [];
                const issue     = fieldMsgs[0]
                    || (allMessages.length > 0 ? allMessages[0].message : topMsg);

                return {
                    ...item,
                    status:   'error',
                    progress: 100,
                    issues:   [{ type: 'error', message: issue }],
                };
            }));

            setResult({
                success: false,
                errors:  items.length,
                message: topMsg,
                detail:  allMessages.length > 0
                    ? allMessages.map(m => `${m.field}: ${m.message}`).join(' · ')
                    : null,
            });
        } finally {
            setIsImporting(false);
        }
    };

    // ── Topbar ─────────────────────────────────────────────────────────────
    const topbar = (
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-4">
            <div>
                <h1 className="text-[16px] font-700 text-slate-800">Import Center</h1>
                <p className="text-[11px] text-slate-400">Upload KareXpert CSVs — all files in one batch</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* Branch */}
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

                {/* Date */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] font-600 text-slate-500">To Date</span>
                    <input type="date" value={importDate} max={today()}
                        onChange={e => setImportDate(e.target.value)}
                        className="text-[12px] border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-400" />
                </div>

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

                {/* ── Left: Drop zone + File cards ────────────────────────── */}
                <div className="xl:col-span-2 space-y-4">
                    <DropZone onFiles={addFiles} isDragging={isDragging} setIsDragging={setIsDragging} />

                    {/* Detection legend (shown when empty) */}
                    {items.length === 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-3">Auto-detected file types</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DETECT_RULES.map(({ typeKey, label, icon: Icon, color }) => {
                                    const c = COLOR_CLASSES[color];
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

                    {/* File cards */}
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
                                <button onClick={() => { setItems([]); setResult(null); }}
                                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                                </button>
                            </div>
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {items.map(item => (
                                        <FileCard key={item.id} item={item} onRemove={removeItem} />
                                    ))}
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
                                        {result.success && result.skipped  > 0 && ` · ${result.skipped} skipped (duplicates)`}
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

                {/* ── Right: Validation + Volume + History ─────────────────── */}
                <div className="space-y-4">
                    <ValidationPanel items={items} branch={branch} />

                    <VolumeFields values={volume} onChange={(k, v) => setVolume(p => ({ ...p, [k]: v }))} />

                    {/* Import History */}
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

                    {/* Tips */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-[12px] font-700 text-blue-800 mb-2">
                            <Info className="w-4 h-4" /> Import Tips
                        </div>
                        <ul className="text-[11px] text-blue-700 space-y-1.5">
                            <li>• <strong>Bill Items + Cashier</strong> are always required. Package is required for Chromepet.</li>
                            <li>• All 6 files are uploaded in <strong>one batch</strong> — do not upload one at a time.</li>
                            <li>• Duplicate bill numbers are automatically skipped, not rejected.</li>
                            <li>• Date format in CSVs: <code className="bg-blue-100 px-1 rounded text-[10px]">dd/mm/yyyy, hh:mm am</code></li>
                        </ul>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
