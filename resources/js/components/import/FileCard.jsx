import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, AlertTriangle, Clock,
    ChevronDown, ChevronUp, Trash2, RefreshCw, CheckCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { detectFile, COLOR_CLASSES, fmtSize } from '../../utils/fileDetect';

const STATUS_CFG = {
    pending:   { label: 'Pending',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock         },
    ready:     { label: 'Ready',     cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2  },
    importing: { label: 'Importing', cls: 'bg-blue-100 text-blue-700',    Icon: RefreshCw     },
    done:      { label: 'Imported',  cls: 'bg-green-100 text-green-700',  Icon: CheckCheck    },
    warning:   { label: 'Warning',   cls: 'bg-amber-100 text-amber-700',  Icon: AlertTriangle },
    error:     { label: 'Errors',    cls: 'bg-red-100 text-red-700',      Icon: XCircle       },
    skipped:   { label: 'Skipped',   cls: 'bg-slate-100 text-slate-500',  Icon: Clock         },
};

export const StatusChip = ({ status }) => {
    const { label, cls, Icon } = STATUS_CFG[status] || STATUS_CFG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-600 whitespace-nowrap ${cls}`}>
            <Icon className={cn('w-3 h-3', status === 'importing' && 'animate-spin')} />
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

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`border rounded-xl bg-white overflow-hidden ${
                item.status === 'error' ? 'border-red-200' : item.status === 'done' ? 'border-green-200' : c.border
            }`}>
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
                                className={`h-full rounded-full ${
                                    item.status === 'error' ? 'bg-red-500' : item.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                                }`}
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
