import axios from "axios";

const client = axios.create({
    baseURL: "/api/v1",
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
});

let logoutInProgress = false;

const isAuthBootstrapRequest = (url = "") => {
    const normalized = String(url).replace(/^\/+/, "");

    return ["sanctum/csrf-cookie", "auth/login", "auth/logout", "auth/me"].some(
        (segment) =>
            normalized === segment || normalized.endsWith(`/${segment}`),
    );
};

const handleUnauthorized = (config = {}) => {
    if (logoutInProgress || isAuthBootstrapRequest(config.url)) {
        return;
    }

    logoutInProgress = true;

    const hasStoredUser = !!localStorage.getItem("mis_user");
    localStorage.removeItem("mis_user");

    if (hasStoredUser) {
        window.location.replace("/login");
    }
};

client.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;

        if (status === 401) {
            handleUnauthorized(err?.config);
            return Promise.reject(err);
        }

        if (
            status === 403 ||
            status === 419 ||
            status === 500 ||
            !err.response
        ) {
            return Promise.reject(err);
        }

        return Promise.reject(err);
    },
);

client.interceptors.request.use(
    (config) => {
        if (config.url && config.url.includes("/auth/login")) {
            logoutInProgress = false;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

export default client;

export const branchesApi = {
    list: () => client.get("/branches"),
};

export const authApi = {
    login: (data) => client.post("/auth/login", data),
    logout: () => client.post("/auth/logout"),
    me: () => client.get("/auth/me"),
    register: (data) => client.post("/auth/register", data),
};

export const misApi = {
    upload: (branch, fd) =>
        client.post(`/mis/${branch}/upload`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    uploadSingle: (branch, fd) =>
        client.post(`/mis/${branch}/upload-single`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    importStatus: (branch) => client.get(`/mis/${branch}/import-status`),
    show: (branch, date) => client.get(`/mis/${branch}/${date}`),
    exportExcel: (branch, date) =>
        client.get(`/mis/${branch}/${date}/export`, { responseType: "blob" }),
    exportPdf: (branch, date) =>
        client.get(`/mis/${branch}/${date}/export-pdf`, {
            responseType: "blob",
        }),
    exportCsv: (branch, date) =>
        client.get(`/mis/${branch}/${date}/export-csv`, {
            responseType: "blob",
        }),
    exportBrm: (branch, from, to) =>
        client.get(`/mis/${branch}/export-brm`, {
            params: { from, to },
            responseType: "blob",
        }),
    emailReport: (branch, date, to) =>
        client.post(`/mis/${branch}/${date}/email`, { to }),
    dashboard: (date) => client.get(`/mis/dashboard/${date}`),
    printPreview: (branch, date) => `/print/${branch}/${date}`,
    importLogs: (branch, limit = 20) =>
        client.get("/mis/import-logs", { params: { branch, limit } }),
    rollbackImport: (id) => client.delete(`/mis/import-logs/${id}`),
};

export const analyticsApi = {
    kpi: (branch, date, params = {}) =>
        client.get(`/analytics/kpi/${branch}/${date}`, { params }),
    filterOptions: (params) =>
        client.get("/analytics/filter-options", { params }),
    drilldown: (type, params) =>
        client.get(`/analytics/drilldown/${type}`, { params }),
    dailyTrend: (params) =>
        client.get("/analytics/charts/daily-trend", { params }),
    monthlyTrend: (params) =>
        client.get("/analytics/charts/monthly-trend", { params }),
    deptRevenue: (params) =>
        client.get("/analytics/charts/dept-revenue", { params }),
    payerMix: (params) => client.get("/analytics/charts/payer-mix", { params }),
    patientMix: (params) =>
        client.get("/analytics/charts/patient-mix", { params }),
    branchComparison: (params) =>
        client.get("/analytics/charts/branch-comparison", { params }),
    doctorRevenue: (params) =>
        client.get("/analytics/charts/doctor-revenue", { params }),
    admissions: (params) => client.get("/analytics/admissions", { params }),
    surgeries: (params) => client.get("/analytics/surgeries", { params }),
    ipDemographics: (params) =>
        client.get("/analytics/ip-demographics", { params }),
    surgeryDetail: (params) =>
        client.get("/analytics/surgery-detail", { params }),
    opMetrics: (params) => client.get("/analytics/op-metrics", { params }),
    collection: (params) => client.get("/analytics/collection", { params }),
    serviceRevenue: (params) =>
        client.get("/analytics/service-revenue", { params }),
    doctorPerformance: (params) =>
        client.get("/analytics/doctor-performance", { params }),
};

export const intelligenceApi = {
    sourceCapabilities: () => client.get("/source-capabilities"),
    qualitySummary: (params) => client.get("/data-quality/summary", { params }),
    qualityIssues: (code, params) =>
        client.get(`/data-quality/issues/${code}`, { params }),
    createQualitySnapshot: (params) =>
        client.post("/data-quality/snapshots", params),
};

export const surgeryAnalyticsApi = {
    kpis: (params) => client.get("/analytics/surgery/kpis", { params }),
    trend: (params) => client.get("/analytics/surgery/trend", { params }),
    distribution: (params) =>
        client.get("/analytics/surgery/distribution", { params }),
    surgeonPerformance: (params) =>
        client.get("/analytics/surgery/surgeon-performance", { params }),
    otDashboard: (params) =>
        client.get("/analytics/surgery/ot-dashboard", { params }),
    anaesthesia: (params) =>
        client.get("/analytics/surgery/anaesthesia", { params }),
    patientProfile: (params) =>
        client.get("/analytics/surgery/patient-profile", { params }),
    quality: (params) => client.get("/analytics/surgery/quality", { params }),
    payer: (params) => client.get("/analytics/surgery/payer", { params }),
    insights: (params) => client.get("/analytics/surgery/insights", { params }),
};

export const usersApi = {
    list: (params) => client.get("/users", { params }),
    stats: () => client.get("/users/stats"),
    select: () => client.get("/users/select"),
    export: (params) =>
        client.get("/users/export", { params, responseType: "blob" }),
    get: (id) => client.get(`/users/${id}`),
    create: (data) => client.post("/users", data),
    update: (id, data) => client.put(`/users/${id}`, data),
    delete: (id) => client.delete(`/users/${id}`),
    activate: (id) => client.post(`/users/${id}/activate`),
    deactivate: (id) => client.post(`/users/${id}/deactivate`),
    lock: (id) => client.post(`/users/${id}/lock`),
    unlock: (id) => client.post(`/users/${id}/unlock`),
    resetPassword: (id, data) =>
        client.post(`/users/${id}/reset-password`, data),
    clone: (id, data) => client.post(`/users/${id}/clone`, data),
    syncRoles: (id, ids) => client.put(`/users/${id}/roles`, { role_ids: ids }),
    syncBranches: (id, branches) =>
        client.put(`/users/${id}/branches`, { branches }),
    syncDepartments: (id, depts) =>
        client.put(`/users/${id}/departments`, { departments: depts }),
    bulk: (data) => client.post("/users/bulk", data),
    loginLogs: (id) => client.get(`/users/${id}/login-logs`),
};

export const rbacApi = {
    getRole: (id) => client.get(`/rbac/roles/${id}`),
    getRoles: (params) => client.get("/rbac/roles", { params }),
    createRole: (data) => client.post("/rbac/roles", data),
    updateRole: (id, data) => client.put(`/rbac/roles/${id}`, data),
    deleteRole: (id) => client.delete(`/rbac/roles/${id}`),
    cloneRole: (id, data) => client.post(`/rbac/roles/${id}/clone`, data),
    toggleRole: (id) => client.patch(`/rbac/roles/${id}/toggle`),
    getPermissions: () => client.get("/rbac/permissions"),
    getRoleUsers: (id) => client.get(`/rbac/roles/${id}/users`),
    updateRolePermissions: (id, permissionIds) =>
        client.put(`/rbac/roles/${id}/permissions`, {
            permission_ids: permissionIds,
        }),
    updatePermissions: (id, permissionIds) =>
        client.put(`/rbac/roles/${id}/permissions`, {
            permission_ids: permissionIds,
        }),
    updateRoleBranches: (id, branches) =>
        client.put(`/rbac/roles/${id}/branches`, { branches }),
    assignRoles: (data) => client.post("/rbac/assign", data),
    stats: () => client.get("/rbac/stats"),
    getStats: () => client.get("/rbac/stats"),
    audit: (params) => client.get("/rbac/audit", { params }),
    getAudit: (params) => client.get("/rbac/audit", { params }),
};
