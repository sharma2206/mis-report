import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, AlertTriangle, Clock,
    ChevronDown, ChevronUp, Trash2, RefreshCw, CheckCheck,
    ScanLine, Upload,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { detectFile, COLOR_CLASSES, fmtSize } from '../../utils/fileDetect';

const STATUS_CFG = {
    pending:   { label: 'Pending',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock,          prog: null    },
    ready:     { label: 'Ready',     cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2,   prog: null    },
    scanning:  { label: 'Scanning…', cls: 'bg-blue-100 text-blue-700',    Icon: ScanLine,       prog: 'blue'  },
    importing: { label: 'Uploading…',cls: 'bg-violet-100 text-violet-700',Icon: Upload,         prog: 'violet'},
    done:      { label: 'Imported',  cls: 'bg-green-100 text-green-700',  Icon: CheckCheck,     prog: 'green' },
    warning:   { label: 'Warning',   cls: 'bg-amber-100 text-amber-700',  Icon: AlertTriangle,  prog: null    },
    error:     { label: 'Errors',    cls: 'bg-red-100 text-red-700',      Icon: XCircle,        prog: 'red'   },
    skipped:   { label: 'Skipped',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock,          prog: null    },
};

const PROG_COLOR = {
    blue:   'bg-blue-500',
    violet: 'bg-violet-500',
    green:  'bg-green-500',
    red:    'bg-red-500',
};

// Status chip — exported for reuse
export const StatusChip = ({ status }) => {
    const { label, cls, Icon } = STATUS_CFG[status] || STATUS_CFG.pending;
    const spinning = status === 'importing' || status === 'scanning';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-600 whitespace-nowrap ${cls}`}>
            <Icon className={cn('w-3 h-3', spinning && 'animate-spin')} />
            {label}
        </span>
    );
};

export const FileCard = ({ item, onRemove }) => {
    const [open, setOpen] = useState(false);
    const info      = detectFile(item.name);
    const c         = COLOR_CLASSES[info.color];
    const Icon      = info.icon;
    const hasIssues = item.issues?.length > 0;

    const cfg        = STATUS_CFG[item.status] || STATUS_CFG.pending;
    const progColor  = PROG_COLOR[cfg.prog] ?? 'bg-blue-500';
    const showProg   = item.progress != null && cfg.prog != null;
    const isActive   = item.status === 'importing' || item.status === 'scanning';
    const canRemove  = ['pending', 'ready', 'error'].includes(item.status);

    // Derive user-visible progress label
    const progLabel = item.status === 'scanning'
        ? 'Scanning CSV…'
        : item.status === 'importing'
            ? `Uploading${item.progress != null ? ` ${item.progress}%` : '…'}`
            : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            layout
            className={cn(
                'border rounded-xl bg-white overflow-hidden transition-colors',
                item.status === 'error' ? 'border-red-200'
                    : item.status === 'done' ? 'border-green-200'
                    : item.status === 'importing' || item.status === 'scanning' ? 'border-blue-200'
                    : c.border,
            )}
        >
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon */}
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', c.iconBg)}>
                    <Icon className={cn('w-4.5 h-4.5', c.text)} />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="text-[12px] font-600 text-slate-800 truncate">{item.name}</div>

                    {/* Metadata row */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-600', c.text)}>{info.label}</span>
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

                    {/* Progress bar + label */}
                    {showProg && (
                        <div className="mt-1.5 space-y-0.5">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className={cn('h-full rounded-full', progColor)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.progress ?? 0}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            {progLabel && (
                                <p className="text-[9px] text-slate-400">{progLabel}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusChip status={item.status} />
                    {hasIssues && (
                        <button
                            onClick={() => setOpen(o => !o)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            aria-label={open ? 'Hide issues' : 'Show issues'}
                        >
                            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    {canRemove && (
                        <button
                            onClick={() => onRemove(item.id)}
                            className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                            aria-label="Remove file"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Issues panel */}
            <AnimatePresence>
                {open && hasIssues && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-100 px-4 py-3 space-y-1.5">
                            {item.issues.map((issue, i) => (
                                <div key={i} className={cn(
                                    'flex items-start gap-2 text-[11px]',
                                    issue.type === 'error' ? 'text-red-700' : 'text-amber-700',
                                )}>
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
