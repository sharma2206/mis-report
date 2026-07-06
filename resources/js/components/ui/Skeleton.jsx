import { cn } from '../../utils/cn';

export const Skeleton = ({ className }) => (
    <div className={cn('skeleton-shimmer rounded-md', className)} />
);

export const KPISkeleton = () => (
    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px] bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between mb-2.5">
                    <Skeleton className="w-7 h-7 rounded-lg" />
                    <Skeleton className="w-4 h-4 rounded" />
                </div>
                <Skeleton className="h-2.5 w-20 mb-2" />
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-2 w-16" />
            </div>
        ))}
    </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
    <div className="space-y-2.5 p-1">
        {/* Header row */}
        <div className="flex gap-3 pb-1">
            {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-3 flex-1 rounded" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} className={cn('flex-1', j === 0 ? 'h-4' : 'h-3')} style={{ opacity: 1 - i * 0.08 }} />
                ))}
            </div>
        ))}
    </div>
);

export const ChartSkeleton = ({ height = 240 }) => (
    <div className="flex flex-col gap-2" style={{ height }}>
        <div className="flex-1 flex items-end gap-1.5 pb-4 px-2">
            {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t-md"
                    style={{ height: `${25 + ((i * 37 + 11) % 65)}%` }}
                />
            ))}
        </div>
        <Skeleton className="h-2 w-full mx-2 rounded" />
    </div>
);
