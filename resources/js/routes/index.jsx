import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';
import Login    from '../pages/Login';
import Upload   from '../pages/Upload';
import Dashboard from '../pages/Dashboard';

const ProtectedRoute = ({ children }) => {
    const token = useSelector(selectToken);
    return token ? children : <Navigate to="/login" replace />;
};

export const AppRoutes = () => (
    <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/upload"    element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/"          element={<Navigate to="/dashboard" replace />} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
);
