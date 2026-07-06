import { useQueries } from '@tanstack/react-query';
import { misApi, analyticsApi } from '../services/api';
import { monthStart } from '../utils/dateHelpers';

/**
 * Fetch all dashboard data for a given branch + date.
 * @param {string|null} branch
 * @param {string|null} date   - YYYY-MM-DD  (FTD / range end)
 * @param {string|null} from   - YYYY-MM-DD  (range start; defaults to month start)
 */
export const useDashboard = (branch, date, from = null) => {
    // If no explicit from, fall back to month start (existing behaviour)
    const rangeFrom = from || monthStart(date) || null;

    const results = useQueries({
        queries: [
            {
                queryKey: ['mis', branch, date],
                queryFn:  () => misApi.show(branch, date).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
                retry: 1,
            },
            {
                queryKey: ['kpi', branch, date],
                queryFn:  () => analyticsApi.kpi(branch, date).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
                retry: 1,
            },
            {
                queryKey: ['dailyTrend', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.dailyTrend({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['payerMix', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.payerMix({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['patientMix', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.patientMix({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['ipDemo', branch, date],
                queryFn:  () => analyticsApi.ipDemographics({ branch, date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['surgeryDetail', branch, date],
                queryFn:  () => analyticsApi.surgeryDetail({ branch, date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['opMetrics', branch, date],
                queryFn:  () => analyticsApi.opMetrics({ branch, date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['collection', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.collection({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['serviceRevenue', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.serviceRevenue({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['doctorPerformance', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.doctorPerformance({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            // Admissions trend for Admissions vs Discharges chart
            {
                queryKey: ['admissions', branch, rangeFrom, date],
                queryFn:  () => analyticsApi.admissions({ branch, from: rangeFrom, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
        ],
    });

    const [mis, kpi, trend, payer, mix, ipDemo, surgery, op, collection, serviceRev, doctorPerf, admissions] = results;

    return {
        mis:         mis.data?.success        ? mis.data.data         : null,
        kpi:         kpi.data?.success        ? kpi.data.data         : null,
        trend:       trend.data?.success      ? trend.data.data       : [],
        payer:       payer.data?.success      ? payer.data.data       : [],
        mix:         mix.data?.success        ? mix.data.data         : [],
        ipDemo:      ipDemo.data?.success     ? ipDemo.data.data      : null,
        surgery:     surgery.data?.success    ? surgery.data.data     : null,
        op:          op.data?.success         ? op.data.data          : null,
        collection:  collection.data?.success ? collection.data.data  : null,
        serviceRev:  serviceRev.data?.success ? serviceRev.data.data  : null,
        doctorPerf:  doctorPerf.data?.success ? doctorPerf.data.data  : null,
        admissions:  admissions.data?.success ? admissions.data.data  : null,
        isLoading: results.some(r => r.isLoading),
        isError:   mis.isError,
        error:     mis.error,
        refetch:   () => results.forEach(r => r.refetch()),
    };
};
