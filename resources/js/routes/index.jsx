import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';
import Login         from '../pages/Login';
import Dashboard     from '../pages/Dashboard';
import ImportCenter  from '../pages/ImportCenter';
import ReportCenter  from '../pages/ReportCenter';
import MISReport     from '../pages/MISReport';
import { PlaceholderPage } from '../pages/Placeholder';

const ProtectedRoute = ({ children }) => {
    const token = useSelector(selectToken);
    return token ? children : <Navigate to="/login" replace />;
};

const P = (props) => <ProtectedRoute><PlaceholderPage {...props} /></ProtectedRoute>;

export const AppRoutes = () => (
    <Routes>
        <Route path="/login"     element={<Login />} />

        {/* Core */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/import"    element={<ProtectedRoute><ImportCenter /></ProtectedRoute>} />
        <Route path="/reports"   element={<ProtectedRoute><ReportCenter /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/mis"         element={<ProtectedRoute><MISReport /></ProtectedRoute>} />
        <Route path="/brm"         element={<P title="BRM Reports"        description="Doctor-wise revenue in multi-sheet Excel. Use the BRM export from Dashboard." icon="🏦" />} />
        <Route path="/financial"   element={<P title="Financial Reports"  description="Revenue summary, collection report, payer analysis, corporate & TPA reports." icon="💰" />} />
        <Route path="/operational" element={<P title="Operational Reports" description="Bed occupancy, admission/discharge, OT utilization, patient census reports."  icon="⚙️" />} />

        {/* Analytics */}
        <Route path="/doctors"     element={<P title="Doctor Analytics"     description="Revenue, patients, surgeries, LOS per doctor with speciality and trend analysis." icon="👨‍⚕️" />} />
        <Route path="/departments" element={<P title="Department Analytics" description="Revenue and volume breakdown by department with month-over-month comparison."    icon="🏢" />} />
        <Route path="/surgery"     element={<P title="Surgery Analytics"    description="OT utilization, surgeon ranking, major/minor split, TAT and implant analysis."  icon="🔪" />} />
        <Route path="/pharmacy"    element={<P title="Pharmacy Analytics"   description="Pharmacy revenue, top drugs, generic vs brand, department-wise breakdown."     icon="💊" />} />

        {/* Administration */}
        <Route path="/scheduler"     element={<P title="Scheduler"        description="Configure automated daily, weekly and monthly report email schedules."  icon="⏰" />} />
        <Route path="/notifications" element={<P title="Notifications"    description="Import alerts, report completions, data anomalies and system notifications." icon="🔔" />} />
        <Route path="/users"         element={<P title="User Management"  description="Create, manage and assign roles to hospital system users."             icon="👥" />} />
        <Route path="/roles"         element={<P title="Role Management"  description="Configure role-based access control with module and branch permissions." icon="🛡️" />} />
        <Route path="/audit-logs"    element={<P title="Audit Logs"       description="Complete compliance trail of all user actions, exports and data changes." icon="📝" />} />
        <Route path="/settings"      element={<P title="System Settings"  description="Hospital branches, email SMTP, currency format, timezone and preferences." icon="⚙️" />} />

        {/* Legacy redirect */}
        <Route path="/upload" element={<Navigate to="/import" replace />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
);
