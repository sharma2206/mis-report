import { cn } from '../../utils/cn';

const styles = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
};

export const Badge = ({ children, variant = 'slate', className }) => (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-600 border', styles[variant], className)}>
        {children}
    </span>
);
