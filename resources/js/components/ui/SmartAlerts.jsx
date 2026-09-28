import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, CheckCircle2, Info, XCircle, X, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { selectAlerts, dismissAlert, selectLastImportInfo, selectDate } from '../../store/reportSlice';
import { cn } from '../../utils/cn';
import { formatDisplayDate } from '../../utils/dateHelpers';

const TYPE_CONFIG = {
    error:   { icon: XCircle,      border: 'border-red-200',     bg: 'bg-red-50',      text: 'text-red-700',     iconColor: 'text-red-500',     dot: 'bg-red-400'     },
    warning: { icon: AlertTriangle, border: 'border-amber-200',   bg: 'bg-amber-50',    text: 'text-amber-700',   iconColor: 'text-amber-500',   dot: 'bg-amber-400'   },
    info:    { icon: Info,          border: 'border-blue-200',    bg: 'bg-blue-50',     text: 'text-blue-700',    iconColor: 'text-blue-500',    dot: 'bg-blue-400'    },
    success: { icon: CheckCircle2,  border: 'border-emerald-200', bg: 'bg-emerald-50',  text: 'text-emerald-700', iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
};

const useAutoAlerts = (mis, kpi, importInfo) => {
    const auto = [];

    if (!importInfo) {
        auto.push({
            id: 'no-import',
            type: 'warning',
            title: 'No Import Detected',
            message: 'No CSV upload recorded for this branch. Upload reports to populate the dashboard.',
            dismissible: false,
        });
    } else {
        auto.push({
            id: 'import-ok',
            type: 'success',
            title: 'Data Imported',
            message: `Last import: ${formatDisplayDate(importInfo.date)}${importInfo.file ? ` · ${importInfo.file}` : ''}`,
            dismissible: true,
        });
    }

    if (mis?.sales?.ftd) {
        const ftd   = mis.sales.ftd;
        const parts = (Number(ftd.op) || 0) + (Number(ftd.ip) || 0) +
                      (Number(ftd.er) || 0) + (Number(ftd.ph) || 0);
        const stated = Number(mis.totals?.sales_ftd) || 0;
        if (stated > 0 && Math.abs(stated - parts) > 100) {
            auto.push({
                id: 'rev-mismatch',
                type: 'warning',
                title: 'Revenue Mismatch',
                message: `Total (₹${stated.toLocaleString('en-IN')}) ≠ sum of departments (₹${Math.round(parts).toLocaleString('en-IN')}).`,
                dismissible: true,
            });
        }
    }

    if (kpi?.duplicate_count > 0) {
        auto.push({
            id: 'duplicates',
            type: 'error',
            title: 'Duplicate Records',
            message: `${kpi.duplicate_count} duplicate bill records detected.`,
            dismissible: true,
        });
    }

    return auto;
};

export const SmartAlerts = ({ mis, kpi }) => {
    const dispatch     = useDispatch();
    const manualAlerts = useSelector(selectAlerts);
    const importInfo   = useSelector(selectLastImportInfo);
    const [collapsed, setCollapsed] = useState(false);

    const autoAlerts = useAutoAlerts(mis, kpi, importInfo);
    const allAlerts  = [...autoAlerts, ...manualAlerts];

    const errorCount   = allAlerts.filter(a => a.type === 'error').length;
    const warningCount = allAlerts.filter(a => a.type === 'warning').length;
    const successCount = allAlerts.filter(a => a.type === 'success').length;

    if (!allAlerts.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4"
        >
            {/* Header */}
            <button
                onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer bg-transparent border-0 text-left"
                style={{ borderBottom: collapsed ? 'none' : '1px solid #f1f5f9' }}
            >
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-600 flex-1">
                    Smart Alerts
                </span>
                <div className="flex items-center gap-1.5">
                    {errorCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-700">
                            {errorCount} error{errorCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-700">
                            {warningCount} warning{warningCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {successCount > 0 && !errorCount && !warningCount && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-700">
                            {successCount} ok
                        </span>
                    )}
                    {collapsed
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronUp   className="w-3.5 h-3.5 text-slate-400" />
                    }
                </div>
            </button>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 py-2.5 flex flex-wrap gap-2">
                            {allAlerts.map((alert) => {
                                const cfg  = TYPE_CONFIG[alert.type] || TYPE_CONFIG.info;
                                const Icon = cfg.icon;
                                return (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        className={cn(
                                            'flex items-start gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[220px]',
                                            cfg.border, cfg.bg,
                                        )}
                                    >
                                        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', cfg.iconColor)} />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-[11px] font-700', cfg.text)}>{alert.title}</p>
                                            {alert.message && (
                                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{alert.message}</p>
                                            )}
                                        </div>
                                        {alert.dismissible && (
                                            <button
                                                onClick={() => dispatch(dismissAlert(alert.id))}
                                                className="w-4 h-4 flex-shrink-0 rounded text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent flex items-center justify-center"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
