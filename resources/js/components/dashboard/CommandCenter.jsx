import {
    Activity, BedDouble, CreditCard, HeartPulse, Pill, Scissors,
    TrendingUp, Users, Wallet,
} from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { ChartCard } from '../ui/ChartCard';
import {
    DeptRevenueChart, PatientMixChartE, PayerChartE, RevenueTrendChart,
} from '../ui/DashboardCharts';
import { fmtL, fmtPct } from '../../utils/formatters';

const count = (value) => value == null ? '—' : Number(value).toLocaleString('en-IN');

export const CommandCenter = ({
    kpi,
    trend,
    payer,
    patientMix,
    serviceRevenue,
    loading,
    onDrilldown,
}) => {
    const cards = [
        { key: 'bills', label: 'Net Revenue', value: fmtL(kpi?.total_revenue), icon: TrendingUp },
        { key: 'collections', label: 'Collections', value: fmtL(kpi?.net_collection), icon: Wallet },
        { key: 'bills', label: 'OP Visits', value: count(kpi?.op_count), icon: Users },
        { key: 'admissions', label: 'IP Admissions', value: count(kpi?.ip_count), icon: BedDouble },
        { key: 'discharges', label: 'IP Discharges', value: count(kpi?.discharge_count), icon: Activity },
        { key: 'admissions', label: 'Emergency', value: count(kpi?.er_count), icon: HeartPulse },
        {
            key: 'admissions',
            label: 'Bed Occupancy',
            value: fmtPct(kpi?.bed_occupancy_pct),
            comparison: kpi?.bed_occupancy != null ? `${count(kpi.bed_occupancy)} of ${count(kpi.bed_count)} beds` : null,
            icon: BedDouble,
        },
        { key: 'surgeries', label: 'Surgeries', value: count(kpi?.surgery_count), icon: Scissors },
        { key: 'bills', label: 'Pharmacy Sales', value: fmtL(kpi?.pharmacy_sales), icon: Pill },
        { key: 'bills', label: 'Discounts', value: fmtL(kpi?.discount_amount), icon: CreditCard },
    ];

    return (
        <div className="space-y-4">
            <section aria-label="Hospital performance KPIs" className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
                {cards.map((card, index) => (
                    <KpiCard
                        key={`${card.label}-${index}`}
                        {...card}
                        value={loading ? '—' : card.value}
                        onClick={onDrilldown ? () => onDrilldown(card.key, card.label) : undefined}
                    />
                ))}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ChartCard title="Revenue Trend" description="Net billing across the selected period" icon={TrendingUp} className="xl:col-span-2">
                    <RevenueTrendChart data={trend} isLoading={loading} />
                </ChartCard>
                <ChartCard title="Payer Mix" description="Collections by payer category" icon={CreditCard}>
                    <PayerChartE data={payer} isLoading={loading} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Patient Trend" description="Distinct visits by patient type" icon={Users}>
                    <PatientMixChartE data={patientMix} isLoading={loading} />
                </ChartCard>
                <ChartCard title="Department Performance" description="Revenue and patient activity by department" icon={Activity}>
                    <DeptRevenueChart data={serviceRevenue} isLoading={loading} />
                </ChartCard>
            </div>
        </div>
    );
};
