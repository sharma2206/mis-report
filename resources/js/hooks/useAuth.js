import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { setCredentials, clearCredentials, selectUser, selectToken } from '../store/authSlice';

export const useAuth = () => {
    const dispatch  = useDispatch();
    const navigate  = useNavigate();
    const user      = useSelector(selectUser);
    const token     = useSelector(selectToken);

    const login = async ({ email, password }) => {
        const { data } = await authApi.login({ email, password });
        if (data.success && data.token) {
            dispatch(setCredentials({ token: data.token, user: data.user }));
            sessionStorage.removeItem('mis_last_branch');
            sessionStorage.removeItem('mis_last_date');
            navigate('/upload');
            return { success: true };
        }
        const msg = data.errors?.email?.[0] || data.message || 'Invalid credentials.';
        return { success: false, message: msg };
    };

    const logout = async () => {
        try { await authApi.logout(); } catch (_) {}
        dispatch(clearCredentials());
        navigate('/login');
    };

    return { user, token, isAuthenticated: !!token, login, logout };
};
