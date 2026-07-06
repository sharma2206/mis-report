import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Download, FileText, TrendingUp, Building2,
    Stethoscope, DollarSign, Activity, UserCheck, Scissors,
    Pill, Wrench, Clock, Bell, Users, ShieldCheck, ClipboardList,
    Settings, History, ChevronLeft, Hospital, ChevronDown,
    BarChart3, Banknote, LogOut, Search,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarOpen, toggleSidebar, selectActiveTab, setActiveTab } from '../../store/reportSlice';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { useState } from 'react';

const NAV_GROUPS = [
    {
        label: 'Core',
        items: [
            { path: '/dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
            { path: '/import',        label: 'Import Center', Icon: Download,  badge: 'New' },
            { path: '/reports',       label: 'Report Center', Icon: FileText },
        ],
    },
    {
        label: 'Reports',
        items: [
            { path: '/mis',           label: 'MIS Reports',   Icon: TrendingUp },
            { path: '/brm',           label: 'BRM Reports',   Icon: Banknote },
            { path: '/financial',     label: 'Financial',     Icon: DollarSign },
            { path: '/operational',   label: 'Operational',   Icon: Activity },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { path: '/doctors',       label: 'Doctors',       Icon: Stethoscope },
            { path: '/departments',   label: 'Departments',   Icon: Building2 },
            { path: '/surgery',       label: 'Surgery',       Icon: Scissors },
            { path: '/pharmacy',      label: 'Pharmacy',      Icon: Pill },
        ],
    },
    {
        label: 'Administration',
        items: [
            { path: '/scheduler',     label: 'Scheduler',     Icon: Clock },
            { path: '/notifications', label: 'Notifications', Icon: Bell, notifKey: true },
            { path: '/users',         label: 'Users',         Icon: Users },
            { path: '/roles',         label: 'Roles',         Icon: ShieldCheck },
            { path: '/audit-logs',    label: 'Audit Logs',    Icon: ClipboardList },
            { path: '/settings',      label: 'Settings',      Icon: Settings },
        ],
    },
];

const DASHBOARD_TABS = [
    { key: 'overview',    label: 'Overview'    },
    { key: 'revenue',     label: 'Revenue'     },
    { key: 'volume',      label: 'Volume'      },
    { key: 'analytics',   label: 'Analytics'   },
    { key: 'ip',          label: 'IP'          },
    { key: 'surgery',     label: 'Surgery'     },
    { key: 'op',          label: 'OP'          },
    { key: 'collection',  label: 'Collection'  },
    { key: 'service',     label: 'Service Mix' },
    { key: 'doctors',     label: 'Doctor Perf.'},
];

export const Sidebar = ({ onPrint }) => {
    const open      = useSelector(selectSidebarOpen);
    const activeTab = useSelector(selectActiveTab);
    const user      = useSelector(selectUser);
    const dispatch  = useDispatch();
    const { logout } = useAuth();
    const location  = useLocation();
    const [dashExpanded, setDashExpanded] = useState(true);

    const name    = user?.name || user?.email || 'User';
    const role    = user?.role || 'viewer';
    const initial = name.charAt(0).toUpperCase();
    const isDash  = location.pathname === '/dashboard' || location.pathname === '/';

    return (
        <motion.aside
            animate={{ width: open ? 232 : 60 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="fixed left-0 top-0 bottom-0 bg-slate-900 flex flex-col z-50 overflow-hidden shadow-xl shadow-black/20"
        >
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-white/8 min-h-[58px] flex-shrink-0">
                <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
                    <Hospital className="w-4.5 h-4.5 text-white" />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                            <span className="text-[13px] font-700 text-white whitespace-nowrap truncate">Hospital MIS</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-600 flex-shrink-0">v3.0</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    className={cn(
                        'w-6 h-6 rounded-md bg-white/7 border-0 cursor-pointer text-white/50 hover:bg-white/15 hover:text-white flex items-center justify-center transition-colors flex-shrink-0',
                        open ? 'ml-auto' : 'mx-auto',
                    )}
                >
                    <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.22 }}>
                        <ChevronLeft className="w-4 h-4" />
                    </motion.div>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
                <div className="px-2">
                    {NAV_GROUPS.map(({ label, items }) => (
                        <div key={label}>
                            <AnimatePresence>
                                {open && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="text-[9px] font-700 uppercase tracking-widest text-white/25 px-2 pt-3 pb-1 whitespace-nowrap">
                                        {label}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {!open && <div className="my-2 h-px bg-white/7 mx-1" />}

                            {items.map(({ path, label: itemLabel, Icon, badge, notifKey }) => (
                                <div key={path}>
                                    <NavLink
                                        to={path}
                                        className={({ isActive }) => cn(
                                            'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-0 text-left w-full transition-all duration-150 mb-0.5 font-500 text-[13px] whitespace-nowrap no-underline',
                                            isActive
                                                ? 'bg-blue-700/30 text-blue-300'
                                                : 'text-white/55 hover:bg-white/7 hover:text-white/85',
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-blue-400')} />
                                                <AnimatePresence>
                                                    {open && (
                                                        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex-1 min-w-0">
                                                            {itemLabel}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                                {open && badge && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 font-700 flex-shrink-0">{badge}</span>
                                                )}
                                            </>
                                        )}
                                    </NavLink>

                                    {/* Dashboard sub-tabs when on /dashboard */}
                                    {path === '/dashboard' && isDash && open && (
                                        <div className="ml-7 border-l border-white/8 pl-2 mb-1">
                                            {DASHBOARD_TABS.map(t => (
                                                <button key={t.key}
                                                    onClick={() => dispatch(setActiveTab(t.key))}
                                                    className={cn(
                                                        'w-full text-left px-2 py-1 rounded-md text-[11px] font-500 transition-colors border-0 cursor-pointer',
                                                        activeTab === t.key
                                                            ? 'text-blue-300 bg-blue-700/20'
                                                            : 'text-white/35 hover:text-white/60',
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="my-2 h-px bg-white/7 mx-1" />

                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-300/60 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 font-500 text-[13px] whitespace-nowrap w-full border-0 text-left cursor-pointer"
                    >
                        <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                        <AnimatePresence>
                            {open && (
                                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                                    Sign Out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </nav>

            {/* User */}
            <div className="px-3 py-2.5 border-t border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-[11px] font-700 flex-shrink-0">
                        {initial}
                    </div>
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden min-w-0">
                                <div className="text-[12px] font-600 text-white/80 truncate">{name}</div>
                                <div className="text-[10px] text-white/35 capitalize">{role}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.aside>
    );
};
