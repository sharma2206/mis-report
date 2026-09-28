import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setCredentials, clearCredentials, selectUser, selectIsAuthenticated } from '../store/authSlice';

export const useAuth = () => {
    const dispatch        = useDispatch();
    const navigate        = useNavigate();
    const user            = useSelector(selectUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const login = async ({ email, password }) => {
        try {
            // Obtain CSRF cookie so Sanctum accepts the login POST
            await axios.get('/sanctum/csrf-cookie', { withCredentials: true });

            const { data } = await authApi.login({ email, password });
            if (data.success) {
                dispatch(setCredentials({ user: data.user }));
                navigate('/dashboard');
                return { success: true };
            }
            return { success: false, message: data.message || 'Login failed.' };
        } catch (err) {
            const msg =
                err.response?.data?.errors?.email?.[0] ||
                err.response?.data?.message ||
                'Invalid credentials.';
            return { success: false, message: msg };
        }
    };

    const logout = async () => {
        try { await authApi.logout(); } catch (_) {}
        dispatch(clearCredentials());
        navigate('/login');
    };

    return { user, isAuthenticated, login, logout };
};
