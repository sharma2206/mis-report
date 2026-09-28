import { cn } from '../../utils/cn';

/**
 * Shared section card used across all report and analytics pages.
 * Consistent header with icon + title, optional action slot, padded body.
 */
export const Section = ({ title, icon: Icon, children, action, className, compact = false }) => (
    <div className={cn('bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden', className)}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
            {Icon && (
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
            )}
            <span className="text-[12px] font-700 text-slate-700 flex-1">{title}</span>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className={compact ? 'p-3' : 'p-4'}>{children}</div>
    </div>
);
