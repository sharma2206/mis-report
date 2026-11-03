import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';

const states = {
    connected: { Icon: CircleCheck, label: 'Connected', color: 'var(--color-success)' },
    degraded: { Icon: CircleDashed, label: 'Degraded', color: 'var(--color-warning)' },
    not_connected: { Icon: CircleX, label: 'Not connected', color: 'var(--color-muted)' },
};

export const MetricAvailability = ({ status = 'not_connected', label }) => {
    const state = states[status] || states.not_connected;
    const Icon = state.Icon;
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-600" style={{ color: state.color }}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label || state.label}
        </span>
    );
};
