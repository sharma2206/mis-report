import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken, selectUser } from '../store/authSlice';

// ── Eager: tiny auth page — no point splitting it
import Login from '../pages/Login';

// ── Lazy: every real page — split into its own chunk
const Dashboard        = lazy(() => import('../pages/Dashboard'));
const ImportCenter     = lazy(() => import('../pages/ImportCenter'));
const ReportCenter     = lazy(() => import('../pages/ReportCenter'));
const MISReport        = lazy(() => import('../pages/MISReport'));
const BRMReport        = lazy(() => import('../pages/BRMReport'));
const Financial        = lazy(() => import('../pages/Financial'));
const Operational      = lazy(() => import('../pages/Operational'));
const Doctors          = lazy(() => import('../pages/Doctors'));
const Roles            = lazy(() => import('../pages/Roles'));
const Users            = lazy(() => import('../pages/Users'));
const Departments      = lazy(() => import('../pages/Departments'));
const Surgery          = lazy(() => import('../pages/Surgery'));
const Pharmacy         = lazy(() => import('../pages/Pharmacy'));
const AuditLogs        = lazy(() => import('../pages/AuditLogs'));
const Notifications    = lazy(() => import('../pages/Notifications'));
const Scheduler        = lazy(() => import('../pages/Scheduler'));
const Settings         = lazy(() => import('../pages/Settings'));
const BranchComparison = lazy(() => import('../pages/BranchComparison'));
const PatientAnalytics = lazy(() => import('../pages/PatientAnalytics'));
const PaymentAnalytics = lazy(() => import('../pages/PaymentAnalytics'));

// ── Shared page loader spinner shown while a chunk downloads
const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
);

// ── Route access levels
// Roles in ascending privilege order: viewer < staff < manager < admin
const ROLE_RANK = { viewer: 0, staff: 1, manager: 2, admin: 3 };

const ProtectedRoute = ({ children, minRole = 'viewer' }) => {
    const token = useSelector(selectToken);
    const user  = useSelector(selectUser);

    if (!token) return <Navigate to="/login" replace />;

    const userRank    = ROLE_RANK[user?.role] ?? 0;
    const requiredRank = ROLE_RANK[minRole]   ?? 0;

    if (userRank < requiredRank) return <Navigate to="/dashboard" replace />;

    return children;
};

const Wrap = ({ children, minRole = 'viewer' }) => (
    <ProtectedRoute minRole={minRole}>
        <Suspense fallback={<PageLoader />}>
            {children}
        </Suspense>
    </ProtectedRoute>
);


export const AppRoutes = () => (
    <Routes>
        <Route path="/login" element={<Login />} />

        {/* Core */}
        <Route path="/dashboard" element={<Wrap><Dashboard /></Wrap>} />
        <Route path="/import"    element={<Wrap minRole="staff"><ImportCenter /></Wrap>} />
        <Route path="/reports"   element={<Wrap><ReportCenter /></Wrap>} />

        {/* Reports */}
        <Route path="/mis"         element={<Wrap><MISReport /></Wrap>} />
        <Route path="/brm"         element={<Wrap minRole="staff"><BRMReport /></Wrap>} />
        <Route path="/financial"   element={<Wrap minRole="manager"><Financial /></Wrap>} />
        <Route path="/operational" element={<Wrap minRole="staff"><Operational /></Wrap>} />

        {/* Analytics */}
        <Route path="/doctors"             element={<Wrap><Doctors /></Wrap>} />
        <Route path="/departments"         element={<Wrap><Departments /></Wrap>} />
        <Route path="/surgery"             element={<Wrap><Surgery /></Wrap>} />
        <Route path="/pharmacy"            element={<Wrap><Pharmacy /></Wrap>} />
        <Route path="/branch-comparison"   element={<Wrap minRole="manager"><BranchComparison /></Wrap>} />
        <Route path="/patient-analytics"   element={<Wrap><PatientAnalytics /></Wrap>} />
        <Route path="/payment-analytics"   element={<Wrap><PaymentAnalytics /></Wrap>} />

        {/* Administration */}
        <Route path="/notifications" element={<Wrap><Notifications /></Wrap>} />
        <Route path="/users"         element={<Wrap minRole="admin"><Users /></Wrap>} />
        <Route path="/roles"         element={<Wrap minRole="admin"><Roles /></Wrap>} />
        <Route path="/scheduler"     element={<Wrap minRole="admin"><Scheduler /></Wrap>} />
        <Route path="/audit-logs"    element={<Wrap minRole="admin"><AuditLogs /></Wrap>} />
        <Route path="/settings"      element={<Wrap minRole="admin"><Settings /></Wrap>} />

        {/* Legacy redirect */}
        <Route path="/upload" element={<Navigate to="/import" replace />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
);
