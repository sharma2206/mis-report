import { useQueries } from '@tanstack/react-query';
import { misApi, analyticsApi } from '../services/api';
import { monthStart } from '../utils/dateHelpers';

const STALE = 1000 * 60 * 15;

/**
 * Fetch all dashboard data for a given branch + date.
 * Tab-specific queries are deferred until that tab is first visited.
 */
export const useDashboard = (branch, date, from = null, activeTab = 'overview') => {
    const rangeFrom = from || monthStart(date) || null;
    const base      = !!(branch && date);

    const results = useQueries({
        queries: [
            // ── Always-on: core data needed by overview ─────────────────────
            {
                queryKey: ['mis', branch, date],
                queryFn:  () => misApi.show(branch, date).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
                retry: 1,
            },
            {
                queryKey: ['kpi', branch, date],
                queryFn:  () => analyticsApi.kpi(branch, date).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
                retry: 1,
            },
            {
                queryKey: ['dailyTrend', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.dailyTrend({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
            },
            {
                queryKey: ['payerMix', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.payerMix({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
            },
            {
                queryKey: ['patientMix', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.patientMix({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
            },
            {
                queryKey: ['serviceRevenue', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.serviceRevenue({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
            },
            {
                queryKey: ['admissions', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.admissions({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base,
                staleTime: STALE,
            },
            // ── Tab-specific: only load when that tab is first visited ───────
            {
                queryKey: ['ipDemo', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.ipDemographics({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base && activeTab === 'ip',
                staleTime: STALE,
            },
            {
                queryKey: ['surgeryDetail', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.surgeryDetail({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base && activeTab === 'surgery',
                staleTime: STALE,
            },
            {
                queryKey: ['opMetrics', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.opMetrics({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base && activeTab === 'op',
                staleTime: STALE,
            },
            {
                queryKey: ['collection', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.collection({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base && activeTab === 'collection',
                staleTime: STALE,
            },
            {
                queryKey: ['doctorPerformance', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.doctorPerformance({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  base && activeTab === 'doctors',
                staleTime: STALE,
            },
        ],
    });

    const [mis, kpi, trend, payer, mix, serviceRev, admissions, ipDemo, surgery, op, collection, doctorPerf] = results;

    const d = (r) => (r.data?.success ? r.data.data : null);

    return {
        mis:        d(mis),
        kpi:        d(kpi),
        trend:      mis.data?.success ? (trend.data?.success ? trend.data.data : []) : [],
        payer:      payer.data?.success      ? payer.data.data      : [],
        mix:        mix.data?.success        ? mix.data.data        : [],
        serviceRev: serviceRev.data?.success ? serviceRev.data.data : null,
        admissions: admissions.data?.success ? admissions.data.data : null,
        ipDemo:     d(ipDemo),
        surgery:    d(surgery),
        op:         d(op),
        collection: d(collection),
        doctorPerf: d(doctorPerf),

        // Per-query loading — lets each tab show its own skeleton independently
        isLoading:     mis.isLoading || kpi.isLoading,
        isTrendLoading: trend.isLoading,
        isPayerLoading: payer.isLoading,
        isMixLoading:   mix.isLoading,
        isIpLoading:    ipDemo.isLoading,
        isSurgLoading:  surgery.isLoading,
        isOpLoading:    op.isLoading,
        isCollLoading:  collection.isLoading,
        isSvcLoading:   serviceRev.isLoading,
        isDrLoading:    doctorPerf.isLoading,
        isAdmLoading:   admissions.isLoading,
        isAnyLoading:   results.some(r => r.isLoading),

        isError:       mis.isError,
        error:         mis.error,
        dataUpdatedAt: mis.dataUpdatedAt ?? null,
        refetch: () => results.forEach(r => r.refetch()),
    };
};
