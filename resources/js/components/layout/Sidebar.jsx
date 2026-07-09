import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Download, FileText, TrendingUp, Building2,
    Stethoscope, DollarSign, Activity, Scissors,
    Pill, Clock, Bell, Users, ShieldCheck, ClipboardList,
    Settings, ChevronLeft, Hospital, ChevronDown,
    Banknote, LogOut, X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarOpen, toggleSidebar, setSidebarOpen } from '../../store/reportSlice';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const ROLE_RANK = { viewer: 0, staff: 1, manager: 2, admin: 3 };

const NAV_GROUPS = [
    {
        label: 'Core',
        items: [
            { path: '/dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
            { path: '/import',    label: 'Import Center', Icon: Download, badge: 'New', minRole: 'staff' },
            { path: '/reports',   label: 'Report Center', Icon: FileText },
        ],
    },
    {
        label: 'Reports',
        items: [
            { path: '/mis',         label: 'MIS Reports', Icon: TrendingUp },
            { path: '/brm',         label: 'BRM Reports', Icon: Banknote,    minRole: 'staff'   },
            { path: '/financial',   label: 'Financial',   Icon: DollarSign,  minRole: 'manager' },
            { path: '/operational', label: 'Operational', Icon: Activity },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { path: '/doctors',       label: 'Doctors',       Icon: Stethoscope },
            { path: '/departments',   label: 'Departments',   Icon: Building2 },
            { path: '/surgery',       label: 'Surgery',       Icon: Scissors },
            { path: '/pharmacy',      label: 'Pharmacy',      Icon: Pill },
            { path: '/notifications', label: 'Notifications', Icon: Bell },
        ],
    },
    {
        label: 'Administration',
        minRole: 'admin',
        items: [
            { path: '/scheduler',  label: 'Scheduler',  Icon: Clock },
            { path: '/users',      label: 'Users',      Icon: Users },
            { path: '/roles',      label: 'Roles',      Icon: ShieldCheck },
            { path: '/audit-logs', label: 'Audit Logs', Icon: ClipboardList },
            { path: '/settings',   label: 'Settings',   Icon: Settings },
        ],
    },
];

export const Sidebar = ({ isMobile = false }) => {
    const open       = useSelector(selectSidebarOpen);
    const user       = useSelector(selectUser);
    const dispatch   = useDispatch();
    const { logout } = useAuth();

    const name    = user?.name || user?.email || 'User';
    const role    = user?.role || 'viewer';
    const initial = name.charAt(0).toUpperCase();
    const rank    = ROLE_RANK[role] ?? 0;

    const handleNavClick = () => {
        if (isMobile) dispatch(setSidebarOpen(false));
    };

    const sidebarAnimate = isMobile
        ? { x: open ? 0 : -280, width: 260 }
        : { width: open ? 232 : 60, x: 0 };

    return (
        <motion.aside
            animate={sidebarAnimate}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', boxShadow: '4px 0 24px -4px rgba(0,0,0,0.3)' }}
        >
            {/* ── Brand row ── */}
            <div className="flex items-center gap-2.5 px-3 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg" style={{ boxShadow: '0 4px 12px rgba(29,78,216,0.4)' }}>
                    <Hospital className="w-4 h-4 text-white" />
                </div>
                <AnimatePresence>
                    {(open || isMobile) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
                        >
                            <span className="text-[13px] font-700 text-white whitespace-nowrap truncate">Hospital MIS</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-600 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>v3.0</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMobile ? (
                    <button
                        onClick={() => dispatch(setSidebarOpen(false))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-0 transition-colors flex-shrink-0 ml-auto"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className={cn(
                            'w-6 h-6 rounded-md cursor-pointer border-0 flex items-center justify-center transition-colors flex-shrink-0',
                            open ? 'ml-auto' : 'mx-auto',
                        )}
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
                    >
                        <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.22 }}>
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </motion.div>
                    </button>
                )}
            </div>

            {/* ── Nav ── */}
            <nav className="sidebar-scroll flex-1 py-2 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
                <div className="px-2">
                    {NAV_GROUPS.map(({ label, items, minRole: groupMinRole }) => {
                        // Filter items by user role
                        const visibleItems = items.filter(item => rank >= (ROLE_RANK[item.minRole || groupMinRole || 'viewer'] ?? 0));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={label}>
                                <AnimatePresence>
                                    {(open || isMobile) && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12 }}
                                            className="text-[9px] font-700 uppercase tracking-widest px-2 pt-3 pb-1 whitespace-nowrap"
                                            style={{ color: 'rgba(255,255,255,0.2)' }}
                                        >
                                            {label}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {!open && !isMobile && <div className="my-2 h-px mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />}

                                {visibleItems.map(({ path, label: itemLabel, Icon, badge }) => (
                                    <div key={path}>
                                        <NavLink
                                            to={path}
                                            onClick={handleNavClick}
                                            className={({ isActive }) => cn(
                                                'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-0 text-left w-full transition-all duration-150 mb-0.5 font-500 text-[13px] whitespace-nowrap no-underline relative',
                                                isActive ? 'text-blue-300' : 'hover:text-white/85',
                                            )}
                                            style={({ isActive }) => isActive
                                                ? { background: 'rgba(59,130,246,0.2)', color: undefined }
                                                : { color: 'rgba(255,255,255,0.5)' }
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    {isActive && (
                                                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-blue-400" />
                                                    )}
                                                    <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-400' : '')} />
                                                    <AnimatePresence>
                                                        {(open || isMobile) && (
                                                            <motion.span
                                                                initial={{ opacity: 0, width: 0 }}
                                                                animate={{ opacity: 1, width: 'auto' }}
                                                                exit={{ opacity: 0, width: 0 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="overflow-hidden flex-1 min-w-0"
                                                            >
                                                                {itemLabel}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                    {(open || isMobile) && badge && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-700 flex-shrink-0" style={{ background: 'rgba(59,130,246,0.3)', color: '#93c5fd' }}>{badge}</span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    <div className="my-2 h-px mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 font-500 text-[13px] whitespace-nowrap w-full border-0 text-left cursor-pointer"
                        style={{ color: 'rgba(252,165,165,0.6)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(252,165,165,0.6)'; }}
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <AnimatePresence>
                            {(open || isMobile) && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                >
                                    Sign Out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </nav>

            {/* ── User profile ── */}
            <div className="px-3 py-2.5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-700 flex-shrink-0 shadow-sm">
                        {initial}
                    </div>
                    <AnimatePresence>
                        {(open || isMobile) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden min-w-0"
                            >
                                <div className="text-[12px] font-600 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{name}</div>
                                <div className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.3)' }}>{role}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.aside>
    );
};
