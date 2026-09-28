import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, RotateCcw } from 'lucide-react';
import { misApi } from '../../services/api';

const STATUS_COLOR = {
    success:     { dot: 'bg-emerald-400', text: 'text-emerald-700' },
    partial:     { dot: 'bg-amber-400',   text: 'text-amber-700'   },
    failed:      { dot: 'bg-red-400',     text: 'text-red-700'     },
    rolled_back: { dot: 'bg-slate-300',   text: 'text-slate-400'   },
};

const HistoryEntry = ({ log, onRollback, isRollingBack }) => {
    const [confirming, setConfirming] = useState(false);
    const sc          = STATUS_COLOR[log.status] || STATUS_COLOR.success;
    const dt          = new Date(log.created_at);
    const dateStr     = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
                        ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const files       = Array.isArray(log.files_uploaded) ? log.files_uploaded.join(', ') : '';
    const isRolledBack = log.status === 'rolled_back';

    return (
        <div className="py-2.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-600 ${isRolledBack ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {log.branch} · {log.report_date}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {dateStr}{files ? ` · ${files}` : ''}
                        {isRolledBack && log.rolled_back_by && ` · rolled back by ${log.rolled_back_by}`}
                    </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                    <div className={`text-[11px] font-700 ${isRolledBack ? 'text-slate-400' : 'text-green-700'}`}>
                        {Number(log.rows_imported).toLocaleString()} rows
                    </div>
                    {log.rows_errored > 0 && (
                        <div className="text-[9px] text-red-600">{log.rows_errored} errors</div>
                    )}
                </div>
                {!isRolledBack && (
                    <button
                        onClick={() => setConfirming(true)}
                        disabled={isRollingBack}
                        title="Rollback this import"
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {confirming && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 overflow-hidden">
                        <p className="text-[11px] font-600 text-amber-800 mb-2">
                            Rollback will delete all {Number(log.rows_imported).toLocaleString()} rows imported for {log.branch} on {log.report_date}. This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setConfirming(false); onRollback(log.id); }}
                                disabled={isRollingBack}
                                className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-700 rounded-md transition-colors cursor-pointer disabled:opacity-60">
                                {isRollingBack ? 'Rolling back…' : 'Yes, Rollback'}
                            </button>
                            <button
                                onClick={() => setConfirming(false)}
                                className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-600 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const ImportHistoryPanel = ({ branch }) => {
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['importLogs', branch],
        queryFn:  () => misApi.importLogs(branch, 15).then(r => r.data),
        staleTime: 0,
    });

    const { mutate: rollback, variables: rollingId, isPending: isRollingBack } = useMutation({
        mutationFn: (id) => misApi.rollbackImport(id).then(r => r.data),
        onSuccess:  () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['mis', branch] });
            queryClient.invalidateQueries({ queryKey: ['kpi', branch] });
        },
        onError: (err) => {
            alert(err.response?.data?.message || 'Rollback failed.');
        },
    });

    const logs = data?.success ? data.data : [];

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-[12px] font-700 text-slate-700">Import History</span>
                </div>
                <button onClick={() => refetch()}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-600 cursor-pointer flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
            </div>
            <div className="px-4 py-1">
                {isLoading && (
                    <div className="py-4 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                    </div>
                )}
                {!isLoading && logs.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-slate-400">No imports recorded yet.</div>
                )}
                {logs.map(log => (
                    <HistoryEntry
                        key={log.id}
                        log={log}
                        onRollback={rollback}
                        isRollingBack={isRollingBack && rollingId === log.id}
                    />
                ))}
            </div>
        </div>
    );
};
