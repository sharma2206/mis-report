import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, Plus, Search, Copy, Trash2, ToggleLeft, ToggleRight,
    ChevronDown, ChevronRight, Users, Lock, GitBranch, Settings,
    Check, X, Edit3, Save, AlertTriangle, Activity, Shield,
    LayoutDashboard, FileBarChart, TrendingUp, Database, Cog, UserCog,
    MoreVertical, RefreshCw,
} from 'lucide-react';
import { selectUser } from '../store/authSlice';
import { rbacApi } from '../services/api';
import { AppLayout } from '../components/layout/AppLayout';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
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
    { key: 'oragadam',  label: 'Oragadam'  },
];

// Static map — template literals like `text-${color}-700` are invisible to
// Tailwind's compiler and produce no CSS
const STAT_TEXT = {
    violet: 'text-violet-700', emerald: 'text-emerald-700', amber: 'text-amber-700',
    blue: 'text-blue-700', slate: 'text-slate-700', teal: 'text-teal-700',
};

const COLOR_PRESETS = [
    '#dc2626','#ea580c','#d97706','#16a34a','#0891b2','#2563eb',
    '#7c3aed','#be185d','#374151','#0f766e','#92400e','#6366f1',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPermLookup(groups) {
    const lookup = {};
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

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => onChange(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: value === c ? '#1d4ed8' : 'transparent', transform: value === c ? 'scale(1.2)' : 'scale(1)' }} />
            ))}
        </div>
    );
}

// ─── Permission Group Section (preserved exactly) ─────────────────────────────

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
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left" onClick={onToggleCollapse}>
                <GroupIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-[13px] font-600 text-slate-700">{group.name}</span>
                <span className="text-[11px] text-slate-500 mr-2">{checked}/{total}</span>
                {!collapsed && (
                    <div className="flex items-center gap-1 mr-2">
                        <button type="button" onClick={e => { e.stopPropagation(); toggleAll(true); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-600">All</button>
                        <button type="button" onClick={e => { e.stopPropagation(); toggleAll(false); }}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors font-600">None</button>
                    </div>
                )}
                {collapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-4 py-2 text-[10px] text-slate-500 font-600 w-36">Module</th>
                                        {ALL_ACTIONS.map(action => (
                                            <th key={action} className="px-2 py-2 text-center text-[10px] text-slate-500 font-600 whitespace-nowrap">{ACTION_LABELS[action]}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.modules.map(mod => (
                                        <tr key={mod.module} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2.5 text-[12px] text-slate-700 font-500 whitespace-nowrap">{mod.label}</td>
                                            {ALL_ACTIONS.map(action => {
                                                const perm = permLookup[mod.module]?.[action];
                                                if (!perm) return <td key={action} className="px-2 py-2.5 text-center"><span className="text-slate-200">—</span></td>;
                                                const isChecked = permIds.has(perm.id);
                                                return (
                                                    <td key={action} className="px-2 py-2.5 text-center">
                                                        <button type="button" onClick={() => { const next = new Set(permIds); isChecked ? next.delete(perm.id) : next.add(perm.id); onChange(next); }}
                                                            className={cn('w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all',
                                                                isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 hover:border-blue-400 bg-white')}>
                                                            {isChecked && <Check className="w-3 h-3 text-white" />}
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

// ─── Role Detail Modal ────────────────────────────────────────────────────────

const DETAIL_TABS = [
    { key: 'permissions', label: 'Permissions', Icon: Shield    },
    { key: 'branches',    label: 'Branches',    Icon: GitBranch },
    { key: 'users',       label: 'Users',       Icon: Users     },
    { key: 'settings',    label: 'Settings',    Icon: Settings  },
];

function RoleDetailModal({
    roleId, isAdmin, onClose,
    onDelete, onClone, onToggle,
    permsQ,
}) {
    const qc = useQueryClient();
    const [activeTab,        setActiveTab]        = useState('permissions');
    const [pendingPermIds,   setPendingPermIds]   = useState(new Set());
    const [isDirty,          setIsDirty]          = useState(false);
    const [pendingBranches,  setPendingBranches]  = useState([]);
    const [branchDirty,      setBranchDirty]      = useState(false);
    const [collapsedGroups,  setCollapsedGroups]  = useState({});
    const [savingPerms,      setSavingPerms]      = useState(false);
    const [savingBranches,   setSavingBranches]   = useState(false);
    const [err, setErr] = useState('');

    const roleDetailQ = useQuery({
        queryKey: ['rbac-role', roleId],
        queryFn:  () => rbacApi.getRole(roleId).then(r => r.data.data),
        enabled:  !!roleId,
    });
    const roleUsersQ = useQuery({
        queryKey: ['rbac-role-users', roleId],
        queryFn:  () => rbacApi.getRoleUsers(roleId).then(r => r.data.data),
        enabled:  !!roleId && activeTab === 'users',
    });
    const auditQ = useQuery({
        queryKey: ['rbac-audit', roleId],
        queryFn:  () => rbacApi.getAudit({ role_id: roleId }).then(r => r.data.data),
        enabled:  !!roleId,
    });

    const role   = roleDetailQ.data;
    const isSystem = role?.is_system;

    useEffect(() => {
        if (roleDetailQ.data) {
            setPendingPermIds(new Set(roleDetailQ.data.permission_ids ?? []));
            setPendingBranches(roleDetailQ.data.branches ?? []);
            setIsDirty(false);
            setBranchDirty(false);
        }
    }, [roleDetailQ.data]);

    const permLookup = useMemo(() => {
        if (!permsQ.data) return {};
        return buildPermLookup(permsQ.data);
    }, [permsQ.data]);

    const handlePermChange = useCallback((next) => {
        setPendingPermIds(next);
        setIsDirty(true);
    }, []);

    const handleSavePerms = async () => {
        setSavingPerms(true);
        try {
            await rbacApi.updateRolePermissions(roleId, [...pendingPermIds]);
            setIsDirty(false);
            qc.invalidateQueries({ queryKey: ['rbac-role', roleId] });
            qc.invalidateQueries({ queryKey: ['rbac-roles'] });
            qc.invalidateQueries({ queryKey: ['rbac-audit', roleId] });
        } catch (e) { setErr(e.response?.data?.message ?? 'Failed to save permissions'); }
        setSavingPerms(false);
    };

    const handleSaveBranches = async () => {
        setSavingBranches(true);
        try {
            await rbacApi.updateRoleBranches(roleId, pendingBranches);
            setBranchDirty(false);
            qc.invalidateQueries({ queryKey: ['rbac-role', roleId] });
            qc.invalidateQueries({ queryKey: ['rbac-audit', roleId] });
        } catch (e) { setErr(e.response?.data?.message ?? 'Failed to save branches'); }
        setSavingBranches(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-5 pt-4 pb-0 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-start gap-3 pb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: (role?.color ?? '#6366f1') + '22' }}>
                            <Shield className="w-4.5 h-4.5" style={{ color: role?.color ?? '#6366f1' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-[15px] font-700 text-slate-800">{role?.name ?? '…'}</h2>
                                {isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-600">System</span>}
                                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-600', role?.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                                    {role?.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-0.5">{role?.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {!isSystem && isAdmin && (
                                <>
                                    <button onClick={() => onToggle(roleId)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 hover:bg-slate-50 transition-colors">
                                        {role?.is_active ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />}
                                        {role?.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button onClick={() => onClone(roleId, role?.name)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 hover:bg-slate-50 transition-colors">
                                        <Copy className="w-3.5 h-3.5" /> Clone
                                    </button>
                                    <button onClick={() => onDelete(roleId, role?.name)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-200 rounded-lg text-[11px] text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </>
                            )}
                            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Stats row */}
                    {role && (
                        <div className="flex items-center gap-4 pb-3">
                            <span className="text-[12px] text-slate-500"><strong className="text-slate-800">{role.user_count ?? 0}</strong> users assigned</span>
                            <span className="text-[12px] text-slate-500"><strong className="text-slate-800">{pendingPermIds.size}</strong> permissions</span>
                        </div>
                    )}

                    {/* Error */}
                    <AnimatePresence>
                        {err && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                <span className="text-[12px] text-red-700 flex-1">{err}</span>
                                <button onClick={() => setErr('')}><X className="w-3.5 h-3.5 text-red-400" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tabs */}
                    <div className="flex gap-1">
                        {DETAIL_TABS.map(({ key, label, Icon }) => (
                            <button key={key} onClick={() => setActiveTab(key)}
                                className={cn('flex items-center gap-1.5 px-3 py-2 text-[12px] font-600 border-b-2 transition-colors',
                                    activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* Permissions tab */}
                    {activeTab === 'permissions' && (
                        <div>
                            {/* Dirty banner */}
                            <AnimatePresence>
                                {isDirty && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                        className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <span className="text-[12px] text-amber-800 flex-1">Unsaved permission changes.</span>
                                        <button onClick={handleSavePerms} disabled={savingPerms || isSystem}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                            {savingPerms ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            Save
                                        </button>
                                        <button onClick={() => { setPendingPermIds(new Set(roleDetailQ.data?.permission_ids ?? [])); setIsDirty(false); }}
                                            className="text-[12px] text-slate-600 hover:text-slate-800 px-2 py-0.5 rounded transition-colors">Discard</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Select / Deselect all */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[12px] text-slate-500">{pendingPermIds.size} permissions selected</span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => {
                                        if (!permsQ.data) return;
                                        const all = new Set();
                                        permsQ.data.forEach(g => g.modules.forEach(m => m.permissions.forEach(p => all.add(p.id))));
                                        setPendingPermIds(all); setIsDirty(true);
                                    }} className="text-[11px] px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-600">
                                        Select All
                                    </button>
                                    <button type="button" onClick={() => { setPendingPermIds(new Set()); setIsDirty(true); }}
                                        className="text-[11px] px-2.5 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors font-600">
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            {permsQ.isLoading || roleDetailQ.isLoading ? (
                                <TableSkeleton rows={6} cols={6} />
                            ) : !permsQ.data?.length ? (
                                <EmptyState icon={Shield} title="No permissions" description="No permission groups configured." />
                            ) : (
                                (permsQ.data ?? []).map(group => (
                                    <PermissionGroupSection
                                        key={group.slug}
                                        group={group}
                                        permLookup={permLookup}
                                        permIds={pendingPermIds}
                                        onChange={isSystem ? undefined : handlePermChange}
                                        collapsed={!!collapsedGroups[group.slug]}
                                        onToggleCollapse={() => setCollapsedGroups(prev => ({ ...prev, [group.slug]: !prev[group.slug] }))}
                                    />
                                ))
                            )}

                            {!isDirty && !isSystem && (
                                <div className="flex justify-end mt-3">
                                    <button onClick={handleSavePerms} disabled={savingPerms}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {savingPerms ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Permissions
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Branches tab */}
                    {activeTab === 'branches' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[13px] font-700 text-slate-700 mb-1">Branch Access</h3>
                                <p className="text-[12px] text-slate-500 mb-4">
                                    Restrict this role to specific hospital branches. Leave all unchecked to allow all branches.
                                </p>
                                <div className="flex gap-3">
                                    {BRANCHES.map(b => (
                                        <label key={b.key} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors flex-1 justify-center',
                                            pendingBranches.includes(b.key) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>
                                            <button type="button" onClick={() => {
                                                const next = pendingBranches.includes(b.key)
                                                    ? pendingBranches.filter(x => x !== b.key)
                                                    : [...pendingBranches, b.key];
                                                setPendingBranches(next); setBranchDirty(true);
                                            }} className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                                pendingBranches.includes(b.key) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white')}>
                                                {pendingBranches.includes(b.key) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </button>
                                            <span className="text-[13px] font-600 text-slate-700">{b.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {branchDirty && (
                                <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <span className="text-[12px] text-amber-800 flex-1">Unsaved branch changes.</span>
                                    <button onClick={handleSaveBranches} disabled={savingBranches}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {savingBranches ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save
                                    </button>
                                </div>
                            )}
                            {!branchDirty && (
                                <div className="flex justify-end">
                                    <button onClick={handleSaveBranches} disabled={savingBranches}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {savingBranches ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Branches
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users tab */}
                    {activeTab === 'users' && (
                        <div>
                            {roleUsersQ.isLoading ? (
                                <TableSkeleton rows={6} cols={3} />
                            ) : (roleUsersQ.data ?? []).length === 0 ? (
                                <EmptyState icon={Users} title="No users assigned" description="No users currently have this role." />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {(roleUsersQ.data ?? []).map(u => (
                                        <div key={u.id} className="flex items-center gap-3 py-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-700 flex-shrink-0">
                                                {(u.name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-600 text-slate-800 truncate">{u.name}</div>
                                                <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                                            </div>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-600 bg-slate-100 text-slate-600 capitalize">{u.branch || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings tab */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-[13px] font-700 text-slate-700 mb-3">Role Metadata</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Name',       value: role?.name          },
                                        { label: 'Type',       value: isSystem ? 'System' : 'Custom' },
                                        { label: 'Created',    value: role?.created_at ? new Date(role.created_at).toLocaleDateString('en-IN') : '—' },
                                        { label: 'Guard',      value: role?.guard_name ?? 'web' },
                                        { label: 'Users',      value: role?.user_count ?? 0 },
                                        { label: 'Permissions',value: pendingPermIds.size },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                                            <div className="text-[13px] font-600 text-slate-700">{value ?? '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent audit */}
                            <div>
                                <h3 className="text-[13px] font-700 text-slate-700 mb-3">Recent Activity</h3>
                                {auditQ.isLoading ? (
                                    <p className="text-[12px] text-slate-400">Loading…</p>
                                ) : (auditQ.data ?? []).length === 0 ? (
                                    <p className="text-[12px] text-slate-400">No audit events recorded.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(auditQ.data ?? []).slice(0, 8).map(log => (
                                            <div key={log.id} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                                <div className="min-w-0">
                                                    <p className="text-[12px] text-slate-700 font-500">{log.description ?? log.event}</p>
                                                    <p className="text-[10px] text-slate-400">{fmtDT(log.created_at)} {log.causer?.name ? `· ${log.causer.name}` : ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ─── New Role Modal ───────────────────────────────────────────────────────────

function NewRoleModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
    const [err,  setErr]  = useState('');

    const createMut = useMutation({
        mutationFn: (d) => rbacApi.createRole(d),
        onSuccess: (res) => { onCreated(res.data.data.id); },
        onError:   (e)   => setErr(e.response?.data?.message ?? 'Failed to create role'),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-700 text-slate-800">New Role</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {err && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
                    <div>
                        <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wide mb-1">Role Name *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Billing Supervisor"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-slate-50" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wide mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-slate-50 resize-none" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wide mb-1">Color</label>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex-shrink-0" style={{ background: form.color }} />
                            <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => createMut.mutate(form)} disabled={!form.name.trim() || createMut.isPending}
                        className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {createMut.isPending ? 'Creating…' : 'Create Role'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Clone Modal ──────────────────────────────────────────────────────────────

function CloneRoleModal({ roleId, sourceName, onClose, onCloned }) {
    const [name, setName] = useState(`Copy of ${sourceName}`);
    const [err,  setErr]  = useState('');

    const cloneMut = useMutation({
        mutationFn: () => rbacApi.cloneRole(roleId, name),
        onSuccess: (res) => { onCloned(res.data.data.id); },
        onError:   (e)   => setErr(e.response?.data?.message ?? 'Failed to clone role'),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-700 text-slate-800">Clone Role</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    {err && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
                    <p className="text-[13px] text-slate-500">Creates a new role with the same permissions as <strong>{sourceName}</strong>.</p>
                    <div>
                        <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wide mb-1">New Role Name *</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-slate-50" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => cloneMut.mutate()} disabled={!name.trim() || cloneMut.isPending}
                        className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {cloneMut.isPending ? 'Cloning…' : 'Clone'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteRoleModal({ roleName, onConfirm, onClose, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-700 text-slate-800">Delete Role</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-[13px] text-slate-600 mt-2">
                            This will permanently delete <strong>{roleName}</strong>. Users assigned to this role will lose all associated permissions.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={onConfirm} disabled={loading}
                        className="px-4 py-1.5 bg-red-600 text-white text-[13px] font-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RolesPage() {
    const currentUser = useSelector(selectUser);
    const isAdmin     = currentUser?.role === 'admin';
    const qc          = useQueryClient();

    const [search,      setSearch]      = useState('');
    const [typeFilter,  setTypeFilter]  = useState('all');
    const [selectedId,  setSelectedId]  = useState(null);
    const [openMenuId,  setOpenMenuId]  = useState(null);
    const [err,         setErr]         = useState('');

    // Modal state
    const [showNew,    setShowNew]    = useState(false);
    const [showClone,  setShowClone]  = useState(null);  // roleId
    const [cloneSrc,   setCloneSrc]   = useState('');    // source name
    const [deleteTarget, setDeleteTarget] = useState(null);  // { id, name }

    // ── Queries ───────────────────────────────────────────────────────────────
    const rolesQ = useQuery({
        queryKey: ['rbac-roles'],
        queryFn:  () => rbacApi.getRoles().then(r => r.data.data),
    });
    const permsQ = useQuery({
        queryKey: ['rbac-permissions'],
        queryFn:  () => rbacApi.getPermissions().then(r => r.data.data),
    });
    const statsQ = useQuery({
        queryKey: ['rbac-stats'],
        queryFn:  () => rbacApi.getStats().then(r => r.data.data),
    });

    const stats = statsQ.data ?? {};

    // ── Mutations ─────────────────────────────────────────────────────────────
    const invalidate = useCallback(() => {
        qc.invalidateQueries({ queryKey: ['rbac-roles'] });
        qc.invalidateQueries({ queryKey: ['rbac-stats'] });
    }, [qc]);

    const deleteMut = useMutation({
        mutationFn: (id) => rbacApi.deleteRole(id),
        onSuccess: () => {
            invalidate();
            if (selectedId === deleteTarget?.id) setSelectedId(null);
            setDeleteTarget(null);
        },
        onError: (e) => { setErr(e.response?.data?.message ?? 'Cannot delete this role'); setDeleteTarget(null); },
    });

    const toggleMut = useMutation({
        mutationFn: (id) => rbacApi.toggleRole(id),
        onSuccess: () => {
            invalidate();
            qc.invalidateQueries({ queryKey: ['rbac-role', selectedId] });
        },
        onError: (e) => setErr(e.response?.data?.message ?? 'Cannot toggle this role'),
    });

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

    const hasFilters = search || typeFilter !== 'all';

    const selectedRoleName = useMemo(() => (rolesQ.data ?? []).find(r => r.id === selectedId)?.name ?? '', [rolesQ.data, selectedId]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Roles & Permissions</h1>
                    <p className="text-[11px] text-slate-400">
                        {stats.total_roles != null
                            ? `${stats.total_roles} roles · ${stats.total_permissions ?? 0} permissions`
                            : 'Loading…'}
                    </p>
                </div>
                <button onClick={() => invalidate()}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                    <button onClick={() => setShowNew(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-600 rounded-lg transition-all">
                        <Plus className="w-3.5 h-3.5" /> New Role
                    </button>
                )}
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => openMenuId && setOpenMenuId(null)}>

                {/* Error banner */}
                <AnimatePresence>
                    {err && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-[13px] text-red-700 flex-1">{err}</span>
                            <button onClick={() => setErr('')} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { label: 'Total Roles',    value: stats.total_roles,       color: 'violet'  },
                        { label: 'Active Roles',   value: stats.active_roles,      color: 'emerald' },
                        { label: 'System Roles',   value: stats.system_roles,      color: 'amber'   },
                        { label: 'Custom Roles',   value: stats.custom_roles,      color: 'blue'    },
                        { label: 'Permissions',    value: stats.total_permissions, color: 'slate'   },
                        { label: 'Users Assigned', value: stats.users_with_roles,  color: 'teal'    },
                    ].map(({ label, value, color }, i) => (
                        <motion.div key={label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                            <div className={cn('text-[1.2rem] font-800 tabular-nums', STAT_TEXT[color] ?? STAT_TEXT.slate)}>{value ?? '—'}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Filter toolbar */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-violet-400 bg-white min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search roles…"
                            className="text-[12px] text-slate-700 bg-transparent outline-none flex-1 placeholder:text-slate-400" />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {[['all', 'All Types'], ['system', 'System'], ['custom', 'Custom']].map(([val, lbl]) => (
                            <button key={val} onClick={() => setTypeFilter(val)}
                                className={cn('text-[11px] px-2.5 py-1 rounded-full border font-600 transition-colors',
                                    typeFilter === val ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                    {hasFilters && (
                        <button onClick={() => { setSearch(''); setTypeFilter('all'); }}
                            className="text-[11px] text-violet-600 hover:text-violet-800 font-600 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                            Clear filters
                        </button>
                    )}
                    <span className="ml-auto text-[12px] text-slate-400 tabular-nums">{filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Roles table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-[12px] font-700 text-slate-700 flex-1">All Roles</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Role', 'Type', 'Users', 'Permissions', 'Branches', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {rolesQ.isLoading ? (
                                    <tr><td colSpan={7} className="py-4"><TableSkeleton rows={6} cols={6} /></td></tr>
                                ) : filteredRoles.length === 0 ? (
                                    <tr><td colSpan={7}>
                                        <EmptyState icon={ShieldCheck}
                                            title={hasFilters ? 'No roles match your filters' : 'No roles yet'}
                                            description={hasFilters ? 'Try adjusting your search.' : 'Create your first role to get started.'}
                                            action={isAdmin && !hasFilters
                                                ? <button onClick={() => setShowNew(true)} className="px-3 py-1.5 text-[12px] font-600 text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">New Role</button>
                                                : null}
                                        />
                                    </td></tr>
                                ) : filteredRoles.map(r => (
                                    <tr key={r.id}
                                        onClick={() => { setSelectedId(r.id); }}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                                                <div>
                                                    <div className="text-[13px] font-600 text-slate-800">{r.name}</div>
                                                    {r.description && <div className="text-[11px] text-slate-400 truncate max-w-[16rem]">{r.description}</div>}
                                                </div>
                                                {r.is_system && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-600', r.is_system ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                                                {r.is_system ? 'System' : 'Custom'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[12px] text-slate-600 tabular-nums">{r.user_count}</td>
                                        <td className="px-4 py-3 text-[12px] text-slate-600 tabular-nums">{r.permission_count}</td>
                                        <td className="px-4 py-3 text-[12px] text-slate-500">
                                            {r.branches?.length > 0 ? r.branches.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ') : 'All'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-600', r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                                                {r.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="relative">
                                                <button onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                                                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 transition-colors">
                                                    <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                                                </button>
                                                <AnimatePresence>
                                                    {openMenuId === r.id && (
                                                        <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.1 }}
                                                            className="absolute right-0 top-7 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-30 overflow-hidden">
                                                            <button onClick={() => { setSelectedId(r.id); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                                                <Edit3 className="w-3.5 h-3.5" /> Edit / View
                                                            </button>
                                                            {!r.is_system && isAdmin && (
                                                                <>
                                                                    <button onClick={() => { toggleMut.mutate(r.id); setOpenMenuId(null); }}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                                                        {r.is_active ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                                                        {r.is_active ? 'Disable' : 'Enable'}
                                                                    </button>
                                                                    <button onClick={() => { setShowClone(r.id); setCloneSrc(r.name); setOpenMenuId(null); }}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                                                        <Copy className="w-3.5 h-3.5" /> Clone
                                                                    </button>
                                                                    <button onClick={() => { setDeleteTarget({ id: r.id, name: r.name }); setOpenMenuId(null); }}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors text-left">
                                                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ── Modals ── */}
            <AnimatePresence>
                {selectedId && (
                    <RoleDetailModal
                        key={selectedId}
                        roleId={selectedId}
                        isAdmin={isAdmin}
                        permsQ={permsQ}
                        onClose={() => setSelectedId(null)}
                        onDelete={(id, name) => setDeleteTarget({ id, name })}
                        onClone={(id, name) => { setShowClone(id); setCloneSrc(name); }}
                        onToggle={(id) => toggleMut.mutate(id)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showNew && (
                    <NewRoleModal
                        onClose={() => setShowNew(false)}
                        onCreated={(id) => { invalidate(); setShowNew(false); setSelectedId(id); }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showClone && (
                    <CloneRoleModal
                        roleId={showClone}
                        sourceName={cloneSrc}
                        onClose={() => { setShowClone(null); setCloneSrc(''); }}
                        onCloned={(id) => { invalidate(); setShowClone(null); setCloneSrc(''); setSelectedId(id); }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteRoleModal
                        roleName={deleteTarget.name}
                        loading={deleteMut.isPending}
                        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
                        onClose={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
