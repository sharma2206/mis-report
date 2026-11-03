import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

const trendConfig = {
    up: { Icon: ArrowUpRight, color: 'var(--color-success)' },
    down: { Icon: ArrowDownRight, color: 'var(--color-danger)' },
    flat: { Icon: Minus, color: 'var(--color-muted)' },
};

export const KpiCard = ({
    label,
    value,
    comparison,
    trend = 'flat',
    target,
    icon: Icon,
    onClick,
    unavailable = false,
    className,
}) => {
    const TrendIcon = trendConfig[trend]?.Icon || Minus;
    const trendColor = trendConfig[trend]?.color || 'var(--color-muted)';
    const Tag = onClick && !unavailable ? 'button' : 'article';

    return (
        <Tag
            type={Tag === 'button' ? 'button' : undefined}
            onClick={onClick}
            disabled={Tag === 'button' ? unavailable : undefined}
            className={cn(
                'text-left w-full min-h-[126px] p-4 rounded-[var(--radius-card)] border transition-colors',
                onClick && !unavailable && 'cursor-pointer hover:border-blue-300',
                className,
            )}
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-650 uppercase tracking-[0.06em]" style={{ color: 'var(--color-muted)' }}>{label}</p>
                {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--color-muted)' }} aria-hidden="true" />}
            </div>
            {unavailable ? (
                <div className="mt-4">
                    <p className="text-[14px] font-600" style={{ color: 'var(--color-muted)' }}>Source not connected</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-faint)' }}>Connect a verified HIMS source to enable this metric.</p>
                </div>
            ) : (
                <>
                    <p className="text-[24px] leading-none font-650 tabular-nums mt-4" style={{ color: 'var(--color-text)' }}>{value ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-3 text-[11px]">
                        {comparison && (
                            <span className="inline-flex items-center gap-1 font-600" style={{ color: trendColor }}>
                                <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                {comparison}
                            </span>
                        )}
                        {target && <span style={{ color: 'var(--color-muted)' }}>Target {target}</span>}
                        {onClick && <ArrowRight className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--color-muted)' }} aria-hidden="true" />}
                    </div>
                </>
            )}
        </Tag>
    );
};
