import { useQueries } from '@tanstack/react-query';
import { misApi, analyticsApi } from '../services/api';
import { monthStart } from '../utils/dateHelpers';

export const useDashboard = (branch, date) => {
    const from = monthStart(date) ?? null;

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
                queryKey: ['dailyTrend', branch, from, date],
                queryFn:  () => analyticsApi.dailyTrend({ branch, from, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['payerMix', branch, date],
                queryFn:  () => analyticsApi.payerMix({ branch, date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['patientMix', branch, from, date],
                queryFn:  () => analyticsApi.patientMix({ branch, from, to: date }).then(r => r.data),
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
                queryKey: ['collection', branch, from, date],
                queryFn:  () => analyticsApi.collection({ branch, from, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['serviceRevenue', branch, from, date],
                queryFn:  () => analyticsApi.serviceRevenue({ branch, from, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
            {
                queryKey: ['doctorPerformance', branch, from, date],
                queryFn:  () => analyticsApi.doctorPerformance({ branch, from, to: date }).then(r => r.data),
                enabled:  !!(branch && date),
                staleTime: 1000 * 60 * 15,
            },
        ],
    });

    const [mis, kpi, trend, payer, mix, ipDemo, surgery, op, collection, serviceRev, doctorPerf] = results;

    return {
        mis:        mis.data?.success ? mis.data.data       : null,
        kpi:        kpi.data?.success ? kpi.data.data       : null,
        trend:      trend.data?.success ? trend.data.data   : [],
        payer:      payer.data?.success ? payer.data.data   : [],
        mix:        mix.data?.success ? mix.data.data       : [],
        ipDemo:     ipDemo.data?.success ? ipDemo.data.data : null,
        surgery:    surgery.data?.success ? surgery.data.data : null,
        op:         op.data?.success ? op.data.data         : null,
        collection: collection.data?.success ? collection.data.data : null,
        serviceRev: serviceRev.data?.success ? serviceRev.data.data : null,
        doctorPerf: doctorPerf.data?.success ? doctorPerf.data.data : null,
        isLoading: results.some(r => r.isLoading),
        isError:   mis.isError,
        error:     mis.error,
        refetch:   () => results.forEach(r => r.refetch()),
    };
};
