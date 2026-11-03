import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { intelligenceApi } from '../../services/api';
import { ChartCard } from '../ui/ChartCard';
import { MetricAvailability } from '../ui/MetricAvailability';

export const SourceHealth = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['source-capabilities'],
        queryFn: () => intelligenceApi.sourceCapabilities().then(r => r.data),
        staleTime: 1000 * 60 * 15,
    });
    const sources = data?.success ? data.data : [];

    return (
        <ChartCard title="Data Source Health" description="Only connected and verified sources contribute to command-center metrics." icon={Database}>
            {isLoading ? (
                <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>Checking source status…</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {sources.map(source => (
                        <div key={source.key} className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="text-[11px] font-600 mb-1.5" style={{ color: 'var(--color-text)' }}>{source.label}</p>
                            <MetricAvailability status={source.status} />
                        </div>
                    ))}
                </div>
            )}
        </ChartCard>
    );
};
