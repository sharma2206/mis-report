import axios from 'axios';

const client = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
    // Send session cookie + XSRF-TOKEN on every request (Sanctum SPA auth)
    withCredentials: true,
});

// Redirect to /login on 401 (session expired or not authenticated)
client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('mis_user');
            window.location.replace('/login');
        }
        return Promise.reject(err);
    },
);

export default client;

// ─── Branches ────────────────────────────────────────────────────────────────

export const branchesApi = {
    list: () => client.get('/branches'),
};

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
    importLogs:      (branch, limit = 20) => client.get('/mis/import-logs', { params: { branch, limit } }),
    rollbackImport:  (id)               => client.delete(`/mis/import-logs/${id}`),
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

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
    list:             (params)      => client.get('/users', { params }),
    stats:            ()            => client.get('/users/stats'),
    select:           ()            => client.get('/users/select'),
    export:           (params)      => client.get('/users/export', { params, responseType: 'blob' }),
    get:              (id)          => client.get(`/users/${id}`),
    create:           (data)        => client.post('/users', data),
    update:           (id, data)    => client.put(`/users/${id}`, data),
    delete:           (id)          => client.delete(`/users/${id}`),
    activate:         (id)          => client.post(`/users/${id}/activate`),
    deactivate:       (id)          => client.post(`/users/${id}/deactivate`),
    lock:             (id)          => client.post(`/users/${id}/lock`),
    unlock:           (id)          => client.post(`/users/${id}/unlock`),
    resetPassword:    (id, data)    => client.post(`/users/${id}/reset-password`, data),
    clone:            (id, data)    => client.post(`/users/${id}/clone`, data),
    syncRoles:        (id, ids)     => client.put(`/users/${id}/roles`, { role_ids: ids }),
    syncBranches:     (id, branches)=> client.put(`/users/${id}/branches`, { branches }),
    syncDepartments:  (id, depts)   => client.put(`/users/${id}/departments`, { departments: depts }),
    bulk:             (data)        => client.post('/users/bulk', data),
    loginLogs:        (id)          => client.get(`/users/${id}/login-logs`),
};

// ─── RBAC ────────────────────────────────────────────────────────────────────

export const rbacApi = {
    getRoles:             (params)      => client.get('/rbac/roles', { params }),
    getRole:              (id)          => client.get(`/rbac/roles/${id}`),
    createRole:           (data)        => client.post('/rbac/roles', data),
    updateRole:           (id, data)    => client.put(`/rbac/roles/${id}`, data),
    deleteRole:           (id)          => client.delete(`/rbac/roles/${id}`),
    cloneRole:            (id, name)    => client.post(`/rbac/roles/${id}/clone`, { name }),
    toggleRole:           (id)          => client.patch(`/rbac/roles/${id}/toggle`),
    updateRolePermissions:(id, ids)     => client.put(`/rbac/roles/${id}/permissions`, { permission_ids: ids }),
    updateRoleBranches:   (id, branches)=> client.put(`/rbac/roles/${id}/branches`, { branches }),
    getRoleUsers:         (id)          => client.get(`/rbac/roles/${id}/users`),
    getPermissions:       ()            => client.get('/rbac/permissions'),
    assignRoles:          (data)        => client.post('/rbac/assign', data),
    removeRoleFromUser:   (roleId, uid) => client.delete(`/rbac/roles/${roleId}/users/${uid}`),
    getStats:             ()            => client.get('/rbac/stats'),
    getAudit:             (params)      => client.get('/rbac/audit', { params }),
};

// ─── Operational Centre ───────────────────────────────────────────────────────

export const operationalApi = {
    kpis:        (params) => client.get('/operational/kpis',          { params }),
    bedOccupancy:(params) => client.get('/operational/bed-occupancy',  { params }),
    admissions:  (params) => client.get('/operational/admissions',     { params }),
    census:      (params) => client.get('/operational/census',         { params }),
    surgery:     (params) => client.get('/operational/surgery',        { params }),
    departments: (params) => client.get('/operational/departments',    { params }),
    doctors:     (params) => client.get('/operational/doctors',        { params }),
    alerts:      (params) => client.get('/operational/alerts',         { params }),
    analytics:   (params) => client.get('/operational/analytics',      { params }),
};
