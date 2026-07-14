import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, XCircle, RotateCcw, Clock, Loader2 } from 'lucide-react';
import { misApi } from '../../services/api';
import { cn } from '../../utils/cn';

const TYPE_LABELS = {
    bill_items: 'Bill Items',
    cashier:    'Cashier Collection',
    er:         'ER Admission',
    ip:         'IP Admission',
    surgery:    'Surgery Detail',
    package:    'Package Consumption',
};

const STATUS_ICON = {
    success:     <CheckCircle2 className="w-4 h-4 text-green-500" />,
    partial:     <AlertTriangle className="w-4 h-4 text-amber-500" />,
    failed:      <XCircle className="w-4 h-4 text-red-500" />,
    rolled_back: <RotateCcw className="w-4 h-4 text-slate-400" />,
};

function fmtRows(n) { return Number(n || 0).toLocaleString('en-IN'); }
function fmtMs(ms)  { return ms ? `${(ms / 1000).toFixed(1)}s` : '—'; }
function fmtAt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const HistoryDrawer = ({ open, onClose, branch, filterType }) => {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['import-logs', branch, filterType],
        queryFn:  () => misApi.importLogs(branch, 50).then(r => r.data),
        enabled:  open && !!branch,
        staleTime: 10_000,
    });

    const logs = (data?.data || []).filter(log =>
        !filterType || (log.files_uploaded || []).includes(filterType) || log.report_type === filterType
    );

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/30 z-40"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        key="drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-[15px] font-700 text-slate-800">Import History</h2>
                                {filterType && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Showing: {TYPE_LABELS[filterType] || filterType}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-[12px]">Loading history…</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                    <Clock className="w-8 h-8 text-slate-300" />
                                    <p className="text-[13px] font-600">No import history</p>
                                    <p className="text-[11px]">Import records will appear here</p>
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div
                                        key={log.id}
                                        className={cn(
                                            'rounded-xl border p-3.5 space-y-2.5',
                                            log.status === 'rolled_back'
                                                ? 'border-slate-200 bg-slate-50 opacity-60'
                                                : 'border-slate-200 bg-white',
                                        )}
                                    >
                                        {/* Log header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {STATUS_ICON[log.status] || <CheckCircle2 className="w-4 h-4 text-slate-400" />}
                                                <div>
                                                    <p className="text-[11px] font-700 text-slate-700 leading-tight">
                                                        {log.report_type
                                                            ? TYPE_LABELS[log.report_type] || log.report_type
                                                            : 'Batch Import'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">{fmtAt(log.created_at)}</p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                'text-[10px] font-700 px-2 py-0.5 rounded-full',
                                                log.status === 'success'     && 'bg-green-100 text-green-700',
                                                log.status === 'partial'     && 'bg-amber-100 text-amber-700',
                                                log.status === 'failed'      && 'bg-red-100 text-red-700',
                                                log.status === 'rolled_back' && 'bg-slate-100 text-slate-500',
                                            )}>
                                                {log.status}
                                            </span>
                                        </div>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'Imported', value: fmtRows(log.rows_imported) },
                                                { label: 'Skipped',  value: fmtRows(log.rows_skipped)  },
                                                { label: 'Errors',   value: fmtRows(log.rows_errored)  },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                                                    <p className="text-[10px] text-slate-400 font-600">{label}</p>
                                                    <p className="text-[12px] font-700 text-slate-700 tabular-nums">{value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Extra info */}
                                        <div className="text-[10px] text-slate-400 space-y-0.5">
                                            {log.uploaded_by && <p>By: <span className="text-slate-600 font-600">{log.uploaded_by}</span></p>}
                                            {log.duration_ms && <p>Duration: <span className="text-slate-600">{fmtMs(log.duration_ms)}</span></p>}
                                            {(log.period_from || log.period_to) && (
                                                <p>Period: <span className="text-slate-600">{log.period_from} → {log.period_to || log.period_from}</span></p>
                                            )}
                                            {log.files_uploaded?.length > 0 && (
                                                <p>Files: <span className="text-slate-600">{log.files_uploaded.map(f => TYPE_LABELS[f] || f).join(', ')}</span></p>
                                            )}
                                            {log.rolled_back_at && (
                                                <p className="text-red-400">Rolled back at {fmtAt(log.rolled_back_at)} by {log.rolled_back_by}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
