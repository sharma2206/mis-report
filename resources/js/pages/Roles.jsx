import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, Plus, Search, Copy, Trash2, ToggleLeft, ToggleRight,
    ChevronDown, ChevronRight, Users, Lock, GitBranch, Settings,
    Check, X, Edit3, Save, AlertTriangle, Activity, Shield,
    LayoutDashboard, FileBarChart, TrendingUp, Database, Cog, UserCog,
} from 'lucide-react';
import { selectUser } from '../store/authSlice';
import { rbacApi } from '../services/api';
import { cn } from '../utils/cn';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'email', 'import', 'schedule', 'drill_down'];

const ACTION_LABELS = {
    view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete',
    approve: 'Approve', export: 'Export', print: 'Print', email: 'Email',
    import: 'Import', schedule: 'Schedule', drill_down: 'Drill Down',
};

const GROUP_ICONS = {
    core_access: LayoutDashboard, reports: FileBarChart, analytics: TrendingUp,
    data_management: Database, administration: Cog, user_management: UserCog,
};

const BRANCHES = [
    { key: 'chromepet', label: 'Chromepet' },
    { key: 'oragadam',  label: 'Oragadam' },
];

const COLOR_PRESETS = [
    '#dc2626','#ea580c','#d97706','#16a34a','#0891b2','#2563eb',
    '#7c3aed','#be185d','#374151','#0f766e','#92400e','#6366f1',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPermLookup(groups) {
    const lookup = {}; // module -> action -> permission
    for (const group of groups) {
        for (const mod of group.modules) {
            lookup[mod.module] = {};
            for (const perm of mod.permissions) {
                lookup[mod.module][perm.action] = perm;
            }
        }
    }
    return lookup;
}

function groupPermCount(group, permIds) {
    let total = 0, checked = 0;
    for (const mod of group.modules) {
        for (const p of mod.permissions) {
            total++;
            if (permIds.has(p.id)) checked++;
        }
    }
    return { total, checked };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleListItem({ role, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg border mb-1 transition-all',
                selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-200',
            )}
        >
            <div className="flex items-center gap-2.5">
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: role.color }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={cn('text-[13px] font-600 truncate', selected ? 'text-blue-700' : 'text-slate-800')}>
                            {role.name}
                        </span>
                        {role.is_system && (
                            <Lock className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                            {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400">
                            {role.permission_count} perms
                        </span>
                    </div>
                </div>
                <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-600 flex-shrink-0',
                    role.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500',
                )}>
                    {role.is_active ? 'Active' : 'Off'}
                </span>
            </div>
        </button>
    );
}

function Modal({ show, onClose, title, children, width = 'max-w-md' }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn('bg-white rounded-xl shadow-2xl w-full', width)}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-700 text-slate-800">{title}</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function ColorPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                        background: c,
                        borderColor: value === c ? '#1d4ed8' : 'transparent',
                        transform: value === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                />
            ))}
        </div>
    );
}

function PermissionGroupSection({ group, permLookup, permIds, onChange, collapsed, onToggleCollapse }) {
    const { total, checked } = groupPermCount(group, permIds);
    const GroupIcon = GROUP_ICONS[group.slug] ?? Shield;
    const allChecked = total > 0 && checked === total;

    const toggleAll = (check) => {
        const next = new Set(permIds);
        for (const mod of group.modules) {
            for (const p of mod.permissions) {
                check ? next.add(p.id) : next.delete(p.id);
            }
        }
        onChange(next);
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                onClick={onToggleCollapse}
            >
                <GroupIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-[13px] font-600 text-slate-700">{group.name}</span>
                <span className="text-[11px] text-slate-500 mr-2">{checked}/{total}</span>
                {!collapsed && (
                    <div className="flex items-center gap-1 mr-2">
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggleAll(true); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-600"
                        >All</button>
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggleAll(false); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors font-600"
                        >None</button>
                    </div>
                )}
                {collapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-4 py-2 text-[10px] text-slate-500 font-600 w-36">Module</th>
                                        {ALL_ACTIONS.map(action => (
                                            <th key={action} className="px-2 py-2 text-center text-[10px] text-slate-500 font-600 whitespace-nowrap">
                                                {ACTION_LABELS[action]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.modules.map(mod => (
                                        <tr key={mod.module} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2.5 text-[12px] text-slate-700 font-500 whitespace-nowrap">
                                                {mod.label}
                                            </td>
                                            {ALL_ACTIONS.map(action => {
                                                const perm = permLookup[mod.module]?.[action];
                                                if (!perm) {
                                                    return (
                                                        <td key={action} className="px-2 py-2.5 text-center">
                                                            <span className="text-slate-200">—</span>
                                                        </td>
                                                    );
                                                }
                                                const checked = permIds.has(perm.id);
                                                return (
                                                    <td key={action} className="px-2 py-2.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = new Set(permIds);
                                                                checked ? next.delete(perm.id) : next.add(perm.id);
                                                                onChange(next);
                                                            }}
                                                            className={cn(
                                                                'w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all',
                                                                checked
                                                                    ? 'bg-blue-600 border-blue-600'
                                                                    : 'border-slate-300 hover:border-blue-400 bg-white',
                                                            )}
                                                        >
                                                            {checked && <Check className="w-3 h-3 text-white" />}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RolesPage() {
    const currentUser     = useSelector(selectUser);
    const isAdmin         = currentUser?.role === 'admin';
    const qc              = useQueryClient();

    // State
    const [selectedId, setSelectedId]     = useState(null);
    const [activeTab, setActiveTab]       = useState('permissions');
    const [search, setSearch]             = useState('');
    const [typeFilter, setTypeFilter]     = useState('all');
    const [pendingPermIds, setPendingPermIds] = useState(new Set());
    const [isDirty, setIsDirty]           = useState(false);
    const [pendingBranches, setPendingBranches] = useState([]);
    const [branchDirty, setBranchDirty]   = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [showNewModal, setShowNewModal] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [newForm, setNewForm]   = useState({ name: '', description: '', color: '#6366f1' });
    const [cloneName, setCloneName]       = useState('');
    const [savingPerms, setSavingPerms]   = useState(false);
    const [savingBranches, setSavingBranches] = useState(false);
    const [err, setErr] = useState('');

    // ── Queries ──────────────────────────────────────────────────────────────

    const rolesQ = useQuery({
        queryKey: ['rbac-roles'],
        queryFn: () => rbacApi.getRoles().then(r => r.data.data),
    });

    const permsQ = useQuery({
        queryKey: ['rbac-permissions'],
        queryFn: () => rbacApi.getPermissions().then(r => r.data.data),
    });

    const roleDetailQ = useQuery({
        queryKey: ['rbac-role', selectedId],
        queryFn:  () => rbacApi.getRole(selectedId).then(r => r.data.data),
        enabled: !!selectedId,
    });

    const roleUsersQ = useQuery({
        queryKey: ['rbac-role-users', selectedId],
        queryFn:  () => rbacApi.getRoleUsers(selectedId).then(r => r.data.data),
        enabled: !!selectedId && activeTab === 'users',
    });

    const statsQ = useQuery({
        queryKey: ['rbac-stats'],
        queryFn: () => rbacApi.getStats().then(r => r.data.data),
    });

    const auditQ = useQuery({
        queryKey: ['rbac-audit', selectedId],
        queryFn:  () => rbacApi.getAudit({ role_id: selectedId }).then(r => r.data.data),
        enabled: !!selectedId,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['rbac-roles'] });
        qc.invalidateQueries({ queryKey: ['rbac-stats'] });
    };

    const createMut = useMutation({
        mutationFn: (data) => rbacApi.createRole(data),
        onSuccess: (res) => {
            invalidate();
            setShowNewModal(false);
            setNewForm({ name: '', description: '', color: '#6366f1' });
            setSelectedId(res.data.data.id);
        },
        onError: (e) => setErr(e.response?.data?.message ?? 'Failed to create role'),
    });

    const cloneMut = useMutation({
        mutationFn: ({ id, name }) => rbacApi.cloneRole(id, name),
        onSuccess: (res) => {
            invalidate();
            setShowCloneModal(false);
            setCloneName('');
            setSelectedId(res.data.data.id);
        },
        onError: (e) => setErr(e.response?.data?.message ?? 'Failed to clone role'),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => rbacApi.deleteRole(id),
        onSuccess: () => {
            invalidate();
            setDeleteTarget(null);
            if (selectedId === deleteTarget) setSelectedId(null);
        },
        onError: (e) => setErr(e.response?.data?.message ?? 'Cannot delete this role'),
    });

    const toggleMut = useMutation({
        mutationFn: (id) => rbacApi.toggleRole(id),
        onSuccess: () => {
            invalidate();
            qc.invalidateQueries({ queryKey: ['rbac-role', selectedId] });
        },
        onError: (e) => setErr(e.response?.data?.message ?? 'Cannot toggle this role'),
    });

    // ── Sync pending perms from role detail ───────────────────────────────────

    useEffect(() => {
        if (roleDetailQ.data) {
            setPendingPermIds(new Set(roleDetailQ.data.permission_ids ?? []));
            setPendingBranches(roleDetailQ.data.branches ?? []);
            setIsDirty(false);
            setBranchDirty(false);
        }
    }, [roleDetailQ.data]);

    // ── Permission matrix lookup ──────────────────────────────────────────────

    const permLookup = useMemo(() => {
        if (!permsQ.data) return {};
        return buildPermLookup(permsQ.data);
    }, [permsQ.data]);

    // ── Filtered roles ────────────────────────────────────────────────────────

    const filteredRoles = useMemo(() => {
        const roles = rolesQ.data ?? [];
        return roles.filter(r => {
            if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (typeFilter === 'system' && !r.is_system) return false;
            if (typeFilter === 'custom' && r.is_system) return false;
            return true;
        });
    }, [rolesQ.data, search, typeFilter]);

    const selectedRole = useMemo(() => {
        return (rolesQ.data ?? []).find(r => r.id === selectedId) ?? null;
    }, [rolesQ.data, selectedId]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handlePermChange = useCallback((next) => {
        setPendingPermIds(next);
        setIsDirty(true);
    }, []);

    const handleSavePerms = async () => {
        setSavingPerms(true);
        try {
            await rbacApi.updateRolePermissions(selectedId, [...pendingPermIds]);
            setIsDirty(false);
            qc.invalidateQueries({ queryKey: ['rbac-role', selectedId] });
            qc.invalidateQueries({ queryKey: ['rbac-roles'] });
            qc.invalidateQueries({ queryKey: ['rbac-audit', selectedId] });
        } catch (e) {
            setErr(e.response?.data?.message ?? 'Failed to save permissions');
        }
        setSavingPerms(false);
    };

    const handleSaveBranches = async () => {
        setSavingBranches(true);
        try {
            await rbacApi.updateRoleBranches(selectedId, pendingBranches);
            setBranchDirty(false);
            qc.invalidateQueries({ queryKey: ['rbac-role', selectedId] });
            qc.invalidateQueries({ queryKey: ['rbac-audit', selectedId] });
        } catch (e) {
            setErr(e.response?.data?.message ?? 'Failed to save branches');
        }
        setSavingBranches(false);
    };

    const handleToggleGroup = (slug) => {
        setCollapsedGroups(prev => ({ ...prev, [slug]: !prev[slug] }));
    };

    const tabs = [
        { key: 'permissions', label: 'Permissions', Icon: Lock },
        { key: 'branches',    label: 'Branches',    Icon: GitBranch },
        { key: 'users',       label: 'Users',        Icon: Users },
        { key: 'settings',    label: 'Settings',     Icon: Settings },
    ];

    // ── Stats ─────────────────────────────────────────────────────────────────

    const stats = statsQ.data;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-slate-50">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-700 text-slate-800">Role & Permission Management</h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {stats ? `${stats.totalRoles} roles · ${stats.totalPerms} permissions · ${stats.usersWithRole} users assigned` : 'Loading…'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setShowNewModal(true); setErr(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-600 hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Role
                    </button>
                </div>
            </div>

            {/* ── Error banner ── */}
            <AnimatePresence>
                {err && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-50 border-b border-red-200 flex-shrink-0"
                    >
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-[13px] text-red-700 flex-1">{err}</span>
                        <button onClick={() => setErr('')} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Three-panel layout ── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

                {/* ╔══ Left Panel — Role List ══╗ */}
                <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    {/* Search + filter */}
                    <div className="p-3 border-b border-slate-100">
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search roles…"
                                className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-slate-50"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400"
                        >
                            <option value="all">All roles ({rolesQ.data?.length ?? 0})</option>
                            <option value="system">System roles</option>
                            <option value="custom">Custom roles</option>
                        </select>
                    </div>

                    {/* Role list */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {rolesQ.isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : filteredRoles.length === 0 ? (
                            <p className="text-[12px] text-slate-400 text-center py-8">No roles found</p>
                        ) : (
                            filteredRoles.map(role => (
                                <RoleListItem
                                    key={role.id}
                                    role={role}
                                    selected={role.id === selectedId}
                                    onClick={() => {
                                        setSelectedId(role.id);
                                        setActiveTab('permissions');
                                        setIsDirty(false);
                                        setBranchDirty(false);
                                    }}
                                />
                            ))
                        )}
                    </div>

                    {/* New role button */}
                    <div className="p-3 border-t border-slate-100">
                        <button
                            onClick={() => { setShowNewModal(true); setErr(''); }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-slate-300 text-[12px] text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Custom Role
                        </button>
                    </div>
                </div>

                {/* ╔══ Center Panel — Permission Editor ══╗ */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {!selectedId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-[15px] font-600 text-slate-700 mb-1">Select a role to edit</h2>
                            <p className="text-[13px] text-slate-400 max-w-xs">
                                Choose a role from the left panel to view and configure its permissions, branches, and users.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Role header */}
                            <div className="px-5 pt-4 pb-0 bg-white border-b border-slate-200 flex-shrink-0">
                                <div className="flex items-start gap-3 pb-3">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ background: selectedRole?.color ?? '#6366f1' + '22' }}
                                    >
                                        <Shield className="w-5 h-5" style={{ color: selectedRole?.color ?? '#6366f1' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-[15px] font-700 text-slate-800">{selectedRole?.name}</h2>
                                            {selectedRole?.is_system && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-600">System</span>
                                            )}
                                            <span className={cn(
                                                'text-[10px] px-1.5 py-0.5 rounded font-600',
                                                selectedRole?.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
                                            )}>
                                                {selectedRole?.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 mt-0.5 truncate">{selectedRole?.description}</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-1">
                                    {tabs.map(({ key, label, Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-2 text-[12px] font-600 border-b-2 transition-colors',
                                                activeTab === key
                                                    ? 'border-blue-600 text-blue-700'
                                                    : 'border-transparent text-slate-500 hover:text-slate-700',
                                            )}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-y-auto">

                                {/* ── Permissions tab ── */}
                                {activeTab === 'permissions' && (
                                    <div className="p-5">
                                        {/* Save bar */}
                                        <AnimatePresence>
                                            {isDirty && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg"
                                                >
                                                    <span className="text-[12px] text-amber-800 flex-1">You have unsaved permission changes.</span>
                                                    <button
                                                        onClick={() => {
                                                            setPendingPermIds(new Set(roleDetailQ.data?.permission_ids ?? []));
                                                            setIsDirty(false);
                                                        }}
                                                        className="text-[12px] text-slate-600 hover:text-slate-800 px-2 py-1 rounded transition-colors"
                                                    >
                                                        Discard
                                                    </button>
                                                    <button
                                                        onClick={handleSavePerms}
                                                        disabled={savingPerms}
                                                        className="flex items-center gap-1.5 text-[12px] px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 font-600"
                                                    >
                                                        {savingPerms ? (
                                                            <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Save className="w-3 h-3" />
                                                        )}
                                                        Save
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {permsQ.isLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            (permsQ.data ?? []).map(group => (
                                                <PermissionGroupSection
                                                    key={group.slug}
                                                    group={group}
                                                    permLookup={permLookup}
                                                    permIds={pendingPermIds}
                                                    onChange={handlePermChange}
                                                    collapsed={!!collapsedGroups[group.slug]}
                                                    onToggleCollapse={() => handleToggleGroup(group.slug)}
                                                />
                                            ))
                                        )}

                                        {!isDirty && !permsQ.isLoading && (
                                            <div className="flex justify-end mt-4">
                                                <button
                                                    onClick={handleSavePerms}
                                                    disabled={savingPerms}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-600 hover:bg-blue-700 transition-colors disabled:opacity-60"
                                                >
                                                    {savingPerms ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Save Permissions
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Branches tab ── */}
                                {activeTab === 'branches' && (
                                    <div className="p-5">
                                        <p className="text-[13px] text-slate-500 mb-4">
                                            Restrict this role to specific hospital branches. Users with this role will only see data from the selected branches.
                                            Leave all unchecked for no branch restriction.
                                        </p>
                                        <div className="space-y-2 mb-6">
                                            {BRANCHES.map(b => {
                                                const checked = pendingBranches.includes(b.key);
                                                return (
                                                    <label key={b.key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                const next = checked
                                                                    ? pendingBranches.filter(x => x !== b.key)
                                                                    : [...pendingBranches, b.key];
                                                                setPendingBranches(next);
                                                                setBranchDirty(true);
                                                            }}
                                                            className="w-4 h-4 accent-blue-600"
                                                        />
                                                        <span className="text-[13px] font-600 text-slate-700">{b.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {branchDirty && (
                                            <button
                                                onClick={handleSaveBranches}
                                                disabled={savingBranches}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-600 hover:bg-blue-700 transition-colors disabled:opacity-60"
                                            >
                                                {savingBranches ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Save className="w-3.5 h-3.5" />
                                                )}
                                                Save Branch Settings
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* ── Users tab ── */}
                                {activeTab === 'users' && (
                                    <div className="p-5">
                                        {roleUsersQ.isLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                            </div>
                                        ) : (roleUsersQ.data ?? []).length === 0 ? (
                                            <div className="text-center py-12">
                                                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-[13px] text-slate-500">No users assigned to this role</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(roleUsersQ.data ?? []).map(u => (
                                                    <div key={u.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-700 flex-shrink-0">
                                                            {u.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[13px] font-600 text-slate-800 truncate">{u.name}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-[11px] text-slate-500 capitalize">{u.role}</div>
                                                            {u.branch && <div className="text-[10px] text-slate-400 capitalize">{u.branch}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Settings tab ── */}
                                {activeTab === 'settings' && (
                                    <div className="p-5 space-y-6">
                                        <div>
                                            <h3 className="text-[13px] font-700 text-slate-700 mb-3">Role Actions</h3>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => { setCloneName(`${selectedRole?.name} (Copy)`); setShowCloneModal(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Clone Role
                                                </button>
                                                {!selectedRole?.is_system && (
                                                    <>
                                                        <button
                                                            onClick={() => toggleMut.mutate(selectedId)}
                                                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                                                        >
                                                            {selectedRole?.is_active
                                                                ? <><ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> Disable Role</>
                                                                : <><ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Enable Role</>
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(selectedId)}
                                                            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete Role
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {selectedRole?.is_system && (
                                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[13px] font-600 text-amber-800">System Role</p>
                                                    <p className="text-[12px] text-amber-700 mt-0.5">
                                                        This is a system-managed role. It cannot be deleted or disabled, but you can modify its permissions.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ╔══ Right Panel — Summary ══╗ */}
                <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* Global stats */}
                        <div>
                            <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">System Overview</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Total Roles',  value: stats?.totalRoles,      color: 'text-blue-700',    bg: 'bg-blue-50' },
                                    { label: 'Active Roles', value: stats?.activeRoles,     color: 'text-emerald-700', bg: 'bg-emerald-50' },
                                    { label: 'Custom Roles', value: stats?.customRoles,     color: 'text-violet-700',  bg: 'bg-violet-50' },
                                    { label: 'Permissions',  value: stats?.totalPerms,      color: 'text-amber-700',   bg: 'bg-amber-50' },
                                ].map(({ label, value, color, bg }) => (
                                    <div key={label} className={cn('rounded-lg p-2.5', bg)}>
                                        <div className={cn('text-[18px] font-800', color)}>{value ?? '—'}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Selected role summary */}
                        {selectedRole && (
                            <div>
                                <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Selected Role</h3>
                                <div className="border border-slate-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedRole.color }} />
                                        <span className="text-[13px] font-700 text-slate-800 truncate">{selectedRole.name}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Users', value: roleDetailQ.data?.user_count ?? selectedRole.user_count },
                                            { label: 'Permissions', value: pendingPermIds.size },
                                            { label: 'Branches', value: pendingBranches.length === 0 ? 'All' : pendingBranches.join(', ') },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between text-[12px]">
                                                <span className="text-slate-500">{label}</span>
                                                <span className="font-600 text-slate-800">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick actions for selected role */}
                        {selectedRole && !selectedRole.is_system && (
                            <div>
                                <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h3>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => { setCloneName(`${selectedRole.name} (Copy)`); setShowCloneModal(true); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        Clone this role
                                    </button>
                                    <button
                                        onClick={() => toggleMut.mutate(selectedId)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                    >
                                        {selectedRole.is_active
                                            ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                                            : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                                        }
                                        {selectedRole.is_active ? 'Disable role' : 'Enable role'}
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(selectedId)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-red-600 hover:bg-red-50 transition-colors text-left"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete role
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Recent audit */}
                        {selectedId && (
                            <div>
                                <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Recent Activity</h3>
                                {auditQ.isLoading ? (
                                    <p className="text-[11px] text-slate-400">Loading…</p>
                                ) : (auditQ.data ?? []).length === 0 ? (
                                    <p className="text-[11px] text-slate-400">No activity yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(auditQ.data ?? []).slice(0, 8).map(log => (
                                            <div key={log.id} className="flex items-start gap-2">
                                                <Activity className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-slate-700 truncate">{log.action.replace('.', ' ')}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {log.actor_name ?? 'System'} · {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}

            {/* New Role Modal */}
            <AnimatePresence>
                {showNewModal && (
                    <Modal show={showNewModal} onClose={() => setShowNewModal(false)} title="Create New Role">
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[12px] font-600 text-slate-600 mb-1">Role Name *</label>
                                <input
                                    value={newForm.name}
                                    onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Clinical Analyst"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-600 text-slate-600 mb-1">Description</label>
                                <textarea
                                    value={newForm.description}
                                    onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What can this role do?"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-600 text-slate-600 mb-1">Color</label>
                                <ColorPicker value={newForm.color} onChange={c => setNewForm(f => ({ ...f, color: c }))} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
                            <button onClick={() => setShowNewModal(false)} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => createMut.mutate(newForm)}
                                disabled={!newForm.name.trim() || createMut.isPending}
                                className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {createMut.isPending ? 'Creating…' : 'Create Role'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Clone Modal */}
            <AnimatePresence>
                {showCloneModal && (
                    <Modal show={showCloneModal} onClose={() => setShowCloneModal(false)} title="Clone Role">
                        <div className="p-5">
                            <p className="text-[13px] text-slate-500 mb-3">
                                Creates a new custom role with all the same permissions as <strong>{selectedRole?.name}</strong>.
                            </p>
                            <label className="block text-[12px] font-600 text-slate-600 mb-1">New Role Name *</label>
                            <input
                                value={cloneName}
                                onChange={e => setCloneName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
                            <button onClick={() => setShowCloneModal(false)} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => cloneMut.mutate({ id: selectedId, name: cloneName })}
                                disabled={!cloneName.trim() || cloneMut.isPending}
                                className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {cloneMut.isPending ? 'Cloning…' : 'Clone Role'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Delete Confirm Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Role">
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-600 text-slate-800 mb-1">Are you sure?</p>
                                    <p className="text-[12px] text-slate-500">
                                        Deleting <strong>{selectedRole?.name}</strong> will remove it from all users currently assigned to it. This cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
                            <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMut.mutate(deleteTarget)}
                                disabled={deleteMut.isPending}
                                className="px-4 py-1.5 bg-red-600 text-white text-[13px] font-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {deleteMut.isPending ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}
