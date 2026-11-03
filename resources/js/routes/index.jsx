import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "../store/authSlice";
import { hasAnyPermission } from "../utils/authorization";

import Login from "../pages/Login";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const ImportCenter = lazy(() => import("../pages/ImportCenter"));
const ReportCenter = lazy(() => import("../pages/ReportCenter"));
const MISReport = lazy(() => import("../pages/MISReport"));
const BRMReport = lazy(() => import("../pages/BRMReport"));
const Financial = lazy(() => import("../pages/Financial"));
const Operational = lazy(() => import("../pages/Operational"));
const Doctors = lazy(() => import("../pages/Doctors"));
const Roles = lazy(() => import("../pages/Roles"));
const Users = lazy(() => import("../pages/Users"));
const Departments = lazy(() => import("../pages/Departments"));
const Surgery = lazy(() => import("../pages/Surgery"));
const Pharmacy = lazy(() => import("../pages/Pharmacy"));
const AuditLogs = lazy(() => import("../pages/AuditLogs"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Scheduler = lazy(() => import("../pages/Scheduler"));
const Settings = lazy(() => import("../pages/Settings"));
const BranchComparison = lazy(() => import("../pages/BranchComparison"));
const PatientAnalytics = lazy(() => import("../pages/PatientAnalytics"));
const PaymentAnalytics = lazy(() => import("../pages/PaymentAnalytics"));

const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
);

const ProtectedRoute = ({ children, permission }) => {
    const token = useSelector(selectToken);
    const user = useSelector((state) => state.auth.user);

    if (!token) return <Navigate to="/login" replace />;

    if (permission) {
        const allowed = permission
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean);
        if (!hasAnyPermission(user, ...allowed))
            return <Navigate to="/dashboard" replace />;
    }

    return children;
};

const Wrap = ({ children, permission }) => (
    <ProtectedRoute permission={permission}>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ProtectedRoute>
);

export const AppRoutes = () => (
    <Routes>
        <Route path="/login" element={<Login />} />

        <Route
            path="/dashboard"
            element={
                <Wrap permission="dashboard.view">
                    <Dashboard />
                </Wrap>
            }
        />
        <Route
            path="/import"
            element={
                <Wrap permission="import_center.view">
                    <ImportCenter />
                </Wrap>
            }
        />
        <Route
            path="/reports"
            element={
                <Wrap permission="report_center.view">
                    <ReportCenter />
                </Wrap>
            }
        />
        <Route
            path="/mis"
            element={
                <Wrap permission="mis_report.view">
                    <MISReport />
                </Wrap>
            }
        />
        <Route
            path="/brm"
            element={
                <Wrap permission="brm_report.view">
                    <BRMReport />
                </Wrap>
            }
        />
        <Route
            path="/financial"
            element={
                <Wrap permission="financial.view">
                    <Financial />
                </Wrap>
            }
        />
        <Route
            path="/operational"
            element={
                <Wrap permission="operational.view">
                    <Operational />
                </Wrap>
            }
        />
        <Route
            path="/doctors"
            element={
                <Wrap permission="doctors.view">
                    <Doctors />
                </Wrap>
            }
        />
        <Route
            path="/departments"
            element={
                <Wrap permission="departments.view">
                    <Departments />
                </Wrap>
            }
        />
        <Route
            path="/surgery"
            element={
                <Wrap permission="surgery.view">
                    <Surgery />
                </Wrap>
            }
        />
        <Route
            path="/pharmacy"
            element={
                <Wrap permission="pharmacy.view">
                    <Pharmacy />
                </Wrap>
            }
        />
        <Route
            path="/branch-comparison"
            element={
                <Wrap permission="dashboard.drill_down">
                    <BranchComparison />
                </Wrap>
            }
        />
        <Route
            path="/patient-analytics"
            element={
                <Wrap permission="dashboard.view">
                    <PatientAnalytics />
                </Wrap>
            }
        />
        <Route
            path="/payment-analytics"
            element={
                <Wrap permission="dashboard.view|financial.view">
                    <PaymentAnalytics />
                </Wrap>
            }
        />

        <Route
            path="/notifications"
            element={
                <Wrap permission="notifications.view">
                    <Notifications />
                </Wrap>
            }
        />
        <Route
            path="/users"
            element={
                <Wrap permission="users.view">
                    <Users />
                </Wrap>
            }
        />
        <Route
            path="/roles"
            element={
                <Wrap permission="roles.view">
                    <Roles />
                </Wrap>
            }
        />
        <Route
            path="/scheduler"
            element={
                <Wrap permission="scheduler.view">
                    <Scheduler />
                </Wrap>
            }
        />
        <Route
            path="/audit-logs"
            element={
                <Wrap permission="audit_logs.view">
                    <AuditLogs />
                </Wrap>
            }
        />
        <Route
            path="/settings"
            element={
                <Wrap permission="settings.view">
                    <Settings />
                </Wrap>
            }
        />

        <Route path="/upload" element={<Navigate to="/import" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
);
