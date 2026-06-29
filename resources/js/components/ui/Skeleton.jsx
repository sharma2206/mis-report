import { cn } from '../../utils/cn';

export const Skeleton = ({ className }) => (
    <div className={cn('animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] rounded-md', className)} />
);

export const KPISkeleton = () => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-slate-200">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-2.5 w-16" />
    </div>
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
    <div className="space-y-2 p-4">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-3">
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} className="h-8 flex-1" />
                ))}
            </div>
        ))}
    </div>
);

export const ChartSkeleton = ({ height = 'h-52' }) => (
    <div className={cn('flex items-end gap-1.5 px-4 pb-4 pt-6', height)}>
        {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
    </div>
);
