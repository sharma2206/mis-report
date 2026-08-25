import { CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react';
import { detectFile, FILE_FIELD_MAP, REQUIRED_FIELDS } from '../../utils/fileDetect';
import { cn } from '../../utils/cn';

// Map fieldName → display label
const FIELD_LABELS = {
    bill_file:    'Bill Items',
    cashier_file: 'Cashier Collection',
    ip_file:      'IP Admission',
    er_file:      'ER Admission',
    surgery_file: 'Surgery Detail',
    package_file: 'Package Consumption',
};

// All known report fields in order
const ALL_FIELDS = ['bill_file', 'cashier_file', 'ip_file', 'er_file', 'surgery_file', 'package_file'];

export const ValidationPanel = ({ items, branch, stepNumber }) => {
    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const allErrors    = items.flatMap(f => (f.issues || []).map(i => ({ ...i, file: f.name })));
    const errors       = allErrors.filter(i => i.type === 'error');
    const warnings     = allErrors.filter(i => i.type === 'warning');
    const readyCount   = items.filter(f => ['ready', 'done'].includes(f.status)).length;

    const isReady = missing.length === 0 && errors.length === 0 && items.length > 0;

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {stepNumber != null && (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-700 flex items-center justify-center flex-shrink-0">
                            {stepNumber}
                        </span>
                    )}
                    <CheckCircle2 className={cn('w-4 h-4', isReady ? 'text-green-500' : 'text-slate-400')} />
                    <span className="text-[12px] font-700 text-slate-700">Validation</span>
                </div>
                {isReady && (
                    <span className="text-[10px] font-700 text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        Ready to Import
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: 'Files',    value: items.length,    color: 'text-slate-700' },
                        { label: 'Ready',    value: readyCount,      color: 'text-green-700' },
                        { label: 'Errors',   value: errors.length,   color: errors.length > 0 ? 'text-red-600' : 'text-slate-400' },
                        { label: 'Warnings', value: warnings.length, color: warnings.length > 0 ? 'text-amber-600' : 'text-slate-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider">{label}</div>
                            <div className={cn('text-[20px] font-800 mt-0.5', color)}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Per-type checklist */}
                <div className="space-y-1.5">
                    <p className="text-[9px] font-700 uppercase tracking-wider text-slate-400 mb-2">Report Checklist</p>
                    {ALL_FIELDS.map(field => {
                        const isPresent  = mappedFields.includes(field);
                        const isRequired = required.includes(field);
                        const fileItem   = items.find(f => FILE_FIELD_MAP[detectFile(f.name).typeKey] === field);
                        const hasError   = fileItem?.issues?.some(i => i.type === 'error');
                        const hasWarning = fileItem?.issues?.some(i => i.type === 'warning');

                        // Status determination
                        let icon, iconCls, labelCls, rowCls;
                        if (isPresent && hasError) {
                            icon = XCircle; iconCls = 'text-red-500'; labelCls = 'text-red-700'; rowCls = 'bg-red-50 border-red-100';
                        } else if (isPresent && hasWarning) {
                            icon = AlertTriangle; iconCls = 'text-amber-500'; labelCls = 'text-amber-700'; rowCls = 'bg-amber-50 border-amber-100';
                        } else if (isPresent) {
                            icon = CheckCircle2; iconCls = 'text-green-500'; labelCls = 'text-slate-700'; rowCls = 'bg-green-50 border-green-100';
                        } else if (isRequired) {
                            icon = AlertTriangle; iconCls = 'text-amber-400'; labelCls = 'text-amber-800'; rowCls = 'bg-amber-50 border-amber-100';
                        } else {
                            icon = Circle; iconCls = 'text-slate-200'; labelCls = 'text-slate-400'; rowCls = 'bg-slate-50 border-slate-100';
                        }

                        const StatusIcon = icon;

                        return (
                            <div key={field} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[11px]', rowCls)}>
                                <StatusIcon className={cn('w-3.5 h-3.5 flex-shrink-0', iconCls)} />
                                <span className={cn('flex-1 font-600', labelCls)}>{FIELD_LABELS[field] || field}</span>
                                {isRequired && !isPresent && (
                                    <span className="text-[9px] font-700 text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">Required</span>
                                )}
                                {!isRequired && !isPresent && (
                                    <span className="text-[9px] text-slate-300">Optional</span>
                                )}
                                {isPresent && fileItem && (
                                    <span className="text-[9px] text-slate-400 tabular-nums">
                                        {(fileItem.size / 1024).toFixed(0)} KB
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Ready banner */}
                {isReady && (
                    <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        All required files present — ready to import
                    </div>
                )}

                {/* Error list */}
                {errors.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-700 uppercase tracking-wider text-red-400">Errors</p>
                        {errors.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{e.file && <span className="font-600">{e.file}: </span>}{e.message}</span>
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
