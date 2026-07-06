import axios from 'axios';

const client = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json' },
});

// Attach Bearer token on every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('mis_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Redirect to /login on 401
client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('mis_token');
            localStorage.removeItem('mis_user');
            window.location.replace('/login');
        }
        return Promise.reject(err);
    },
);

export default client;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
    login:    (data)  => client.post('/auth/login', data),
    logout:   ()      => client.post('/auth/logout'),
    me:       ()      => client.get('/auth/me'),
    register: (data)  => client.post('/auth/register', data),
};

// ─── MIS Reports ─────────────────────────────────────────────────────────────

export const misApi = {
    upload:       (branch, fd)  => client.post(`/mis/${branch}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    show:         (branch, date) => client.get(`/mis/${branch}/${date}`),
    exportExcel:  (branch, date) => client.get(`/mis/${branch}/${date}/export`,     { responseType: 'blob' }),
    exportPdf:    (branch, date) => client.get(`/mis/${branch}/${date}/export-pdf`, { responseType: 'blob' }),
    exportCsv:    (branch, date) => client.get(`/mis/${branch}/${date}/export-csv`, { responseType: 'blob' }),
    exportBrm:    (branch, from, to) => client.get(`/mis/${branch}/export-brm`, { params: { from, to }, responseType: 'blob' }),
    emailReport:  (branch, date, to) => client.post(`/mis/${branch}/${date}/email`, { to }),
    dashboard:    (date)         => client.get(`/mis/dashboard/${date}`),
    printPreview: (branch, date) => `/print/${branch}/${date}`,
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsApi = {
    kpi:              (branch, date)  => client.get(`/analytics/kpi/${branch}/${date}`),
    dailyTrend:       (params)        => client.get('/analytics/charts/daily-trend', { params }),
    monthlyTrend:     (params)        => client.get('/analytics/charts/monthly-trend', { params }),
    deptRevenue:      (params)        => client.get('/analytics/charts/dept-revenue', { params }),
    payerMix:         (params)        => client.get('/analytics/charts/payer-mix', { params }),
    patientMix:       (params)        => client.get('/analytics/charts/patient-mix', { params }),
    branchComparison: (params)        => client.get('/analytics/charts/branch-comparison', { params }),
    doctorRevenue:    (params)        => client.get('/analytics/charts/doctor-revenue', { params }),
    admissions:       (params)        => client.get('/analytics/admissions', { params }),
    surgeries:        (params)        => client.get('/analytics/surgeries', { params }),
    ipDemographics:   (params)        => client.get('/analytics/ip-demographics', { params }),
    surgeryDetail:    (params)        => client.get('/analytics/surgery-detail', { params }),
    opMetrics:        (params)        => client.get('/analytics/op-metrics', { params }),
    collection:       (params)        => client.get('/analytics/collection', { params }),
    serviceRevenue:   (params)        => client.get('/analytics/service-revenue', { params }),
    doctorPerformance:(params)        => client.get('/analytics/doctor-performance', { params }),
};
