import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, Home, Menu, Hospital } from 'lucide-react';
import { selectSidebarOpen, setSidebarOpen, toggleSidebar, selectDarkMode } from '../../store/reportSlice';
import { setCredentials, selectIsAuthenticated } from '../../store/authSlice';
import { authApi } from '../../services/api';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useUrlFilters } from '../../hooks/useUrlFilters';

// Pages that use the global date filter (handled by each page's own GlobalFilterBar)
const DATE_FILTER_ROUTES = new Set([
    '/brm', '/financial', '/operational', '/mis', '/surgery', '/pharmacy',
    '/doctors', '/departments', '/branch-comparison', '/patient-analytics', '/payment-analytics',
]);

const BREADCRUMB_MAP = {
    '/dashboard':          ['Dashboard'],
    '/import':             ['Data Management', 'Import Center'],
    '/reports':            ['Reports', 'Report Center'],
    '/mis':                ['Reports', 'MIS Reports'],
    '/brm':                ['Reports', 'BRM Reports'],
    '/financial':          ['Reports', 'Financial Reports'],
    '/operational':        ['Reports', 'Operational Reports'],
    '/branch-comparison':  ['Analytics', 'Branch Comparison'],
    '/doctors':            ['Analytics', 'Doctor Analytics'],
    '/departments':        ['Analytics', 'Department Analytics'],
    '/surgery':            ['Analytics', 'Surgery Analytics'],
    '/pharmacy':           ['Analytics', 'Pharmacy Analytics'],
    '/patient-analytics':  ['Analytics', 'Patient Analytics'],
    '/payment-analytics':  ['Analytics', 'Payment Analytics'],
    '/scheduler':          ['Administration', 'Scheduler'],
    '/notifications':      ['Administration', 'Notifications'],
    '/users':              ['Administration', 'User Management'],
    '/roles':              ['Administration', 'Role Management'],
    '/audit-logs':         ['Administration', 'Audit Logs'],
    '/settings':           ['Administration', 'Settings'],
};

const Breadcrumb = () => {
    const { pathname } = useLocation();
    const crumbs = BREADCRUMB_MAP[pathname] || [];
    if (!crumbs.length) return null;
    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
            <NavLink to="/dashboard" aria-label="Dashboard" className="transition-colors no-underline" style={{ color: 'var(--color-muted)' }}>
                <Home className="w-3.5 h-3.5" />
            </NavLink>
            {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    <span className={i === crumbs.length - 1 ? 'font-600' : ''} style={{ color: i === crumbs.length - 1 ? 'var(--color-text)' : 'var(--color-muted)' }}>{c}</span>
                </span>
            ))}
        </nav>
    );
};

let sessionRefreshed = false;

export const AppLayout = ({ children, topbar, onPrint }) => {
    const open     = useSelector(selectSidebarOpen);
    const darkMode = useSelector(selectDarkMode);
    const authed   = useSelector(selectIsAuthenticated);
    const dispatch = useDispatch();

    // Pull a fresh permission list once per page load so an existing
    // localStorage session picks up RBAC without forcing a new login.
    useEffect(() => {
        if (!authed || sessionRefreshed) return;
        sessionRefreshed = true;
        authApi.me()
            .then(({ data }) => {
                if (data?.data) dispatch(setCredentials({ user: data.data }));
            })
            .catch(() => {});
    }, [authed, dispatch]);
    const isMobile = useIsMobile();
    const { pathname } = useLocation();
    const showBreadcrumb  = pathname !== '/dashboard' && BREADCRUMB_MAP[pathname];

    // Sync URL with Redux filters globally
    useUrlFilters();

    // Apply dark mode to document
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
            {/* Mobile backdrop */}
            <AnimatePresence>
                {isMobile && open && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="sidebar-backdrop"
                        onClick={() => dispatch(setSidebarOpen(false))}
                    />
                )}
            </AnimatePresence>

            <Sidebar isMobile={isMobile} />

            <motion.div
                animate={{ marginLeft: isMobile ? 0 : (open ? 240 : 64) }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex-1 flex flex-col h-screen overflow-hidden min-w-0"
            >
                {/* ── Mobile top bar (hamburger + brand) ── */}
                {isMobile && (
                    <div className="flex items-center gap-3 px-3 h-12 flex-shrink-0" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={() => dispatch(toggleSidebar())}
                            aria-label="Open navigation menu"
                            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors border-0 cursor-pointer focus-ring"
                            style={{ color: 'var(--color-text)' }}
                        >
                            <Menu className="w-4.5 h-4.5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                                <Hospital className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-[13px] font-600" style={{ color: 'var(--color-text)' }}>Hospital MIS</span>
                        </div>
                    </div>
                )}

                {topbar}

                {showBreadcrumb && (
                    <div className="px-5 py-2" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                        <Breadcrumb />
                    </div>
                )}

                {children}
            </motion.div>
        </div>
    );
};
