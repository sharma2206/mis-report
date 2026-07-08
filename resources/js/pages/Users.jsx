import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Download, RefreshCw, Edit3, Trash2,
    Lock, Unlock, UserCheck, UserX, Copy, Key, X, Check,
    AlertTriangle, Shield, Activity, LogIn, Phone, Calendar,
    Briefcase, MapPin, UserCog, ArrowLeft, Save, Settings,
    SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown,
    ChevronLeft, ChevronRight, Eye, EyeOff, MoreVertical,
    GitBranch, Building2,
} from 'lucide-react';
import { usersApi, rbacApi } from '../services/api';
import { cn } from '../utils/cn';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
    'Cardiology','Orthopaedics','ICU','Radiology','Laboratory',
    'Pharmacy','Billing','Administration','Surgery','Emergency',
    'Paediatrics','Gynaecology','General Medicine','Psychiatry',
];
const BRANCHES     = ['chromepet', 'oragadam'];
const LEGACY_ROLES = ['viewer', 'staff', 'manager', 'admin'];
const EMP_STATUSES = ['active', 'on_leave', 'resigned', 'terminated', 'probation'];

const ROLE_COLORS = {
    admin:   { bg: 'bg-red-100',    text: 'text-red-700'    },
    manager: { bg: 'bg-violet-100', text: 'text-violet-700' },
    staff:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    viewer:  { bg: 'bg-slate-100',  text: 'text-slate-600'  },
};

const DEFAULT_FORM = {
    name: '', email: '', password: '', password_confirmation: '',
    role: 'viewer', branch: '', employee_id: '', employee_code: '',
    mobile: '', designation: '', department: '', speciality: '',
    reporting_manager_id: '', date_of_joining: '', employment_status: 'active',
    display_name: '', emergency_contact_name: '', emergency_contact_phone: '',
    bio: '', mfa_enabled: false, role_ids: [], branches: [], departments: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractError = (e) => {
    const errs = e?.response?.data?.errors;
    if (errs) return Object.values(errs).flat().join(' · ');
    return e?.response?.data?.message ?? 'Something went wrong';
};
const initials   = (name = '') => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT      = (d) => d ? new Date(d).toLocaleString('en-IN',  { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = {
        active:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        inactive: { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
        locked:   { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
    }[status] ?? { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
    return (
        <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-600', cfg.bg, cfg.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
            {capitalize(status)}
        </span>
    );
}

function RoleBadge({ role }) {
    const cfg = ROLE_COLORS[role] ?? ROLE_COLORS.viewer;
    return (
        <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded font-600 capitalize', cfg.bg, cfg.text)}>
            {role}
        </span>
    );
}

function UserAvatar({ user, size = 'md' }) {
    const sz = size === 'lg' ? 'w-12 h-12 text-[16px]' : size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]';
    const GRADS = ['from-blue-500 to-violet-600','from-emerald-500 to-teal-600','from-orange-500 to-red-500','from-pink-500 to-rose-600'];
    const g = GRADS[(user?.id ?? 0) % GRADS.length];
    if (user?.avatar) return <img src={user.avatar} alt={user?.name} className={cn(sz, 'rounded-full object-cover flex-shrink-0')} />;
    return (
        <div className={cn(sz, `rounded-full bg-gradient-to-br ${g} flex items-center justify-center text-white font-700 flex-shrink-0`)}>
            {initials(user?.name)}
        </div>
    );
}

function SortIcon({ col, sortBy, sortDir }) {
    if (sortBy !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-300 inline ml-1" />;
    return sortDir === 'asc'
        ? <ChevronUp   className="w-3 h-3 text-blue-500 inline ml-1" />
        : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
}

// ─── Modal shell — identical pattern to Roles.jsx ─────────────────────────────

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

// ─── Password Reset Modal ─────────────────────────────────────────────────────

function PasswordResetModal({ userId, onClose }) {
    const [pw, setPw]           = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw]   = useState(false);
    const [err, setErr]         = useState('');
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: (d) => usersApi.resetPassword(userId, d),
        onSuccess:  () => { qc.invalidateQueries({ queryKey: ['user-detail', userId] }); onClose(); },
        onError:    (e) => setErr(extractError(e)),
    });

    const submit = () => {
        if (pw !== confirm)  { setErr('Passwords do not match'); return; }
        if (pw.length < 8)   { setErr('Minimum 8 characters required'); return; }
        mut.mutate({ password: pw, password_confirmation: confirm, force_change: true });
    };

    return (
        <Modal show title="Reset Password" onClose={onClose}>
            <div className="p-5 space-y-3">
                {err && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
                <div>
                    <label className="block text-[12px] font-600 text-slate-600 mb-1">New Password</label>
                    <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 pr-9" />
                        <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-[12px] font-600 text-slate-600 mb-1">Confirm Password</label>
                    <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
                </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={submit} disabled={mut.isPending}
                    className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {mut.isPending ? 'Resetting…' : 'Reset Password'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Clone Modal ──────────────────────────────────────────────────────────────

function CloneModal({ userId, sourceName, onClose }) {
    const [name,  setName]  = useState('');
    const [email, setEmail] = useState('');
    const [err,   setErr]   = useState('');
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: (d) => usersApi.clone(userId, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            qc.invalidateQueries({ queryKey: ['users-stats'] });
            onClose();
        },
        onError: (e) => setErr(extractError(e)),
    });

    return (
        <Modal show title="Clone User" onClose={onClose}>
            <div className="p-5 space-y-3">
                <p className="text-[13px] text-slate-500">
                    Creates a new user with the same roles, branches and departments as <strong>{sourceName}</strong>.
                </p>
                {err && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
                <div>
                    <label className="block text-[12px] font-600 text-slate-600 mb-1">Full Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                    <label className="block text-[12px] font-600 text-slate-600 mb-1">Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
                </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={() => mut.mutate({ name, email })} disabled={!name.trim() || !email.trim() || mut.isPending}
                    className="px-4 py-1.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {mut.isPending ? 'Cloning…' : 'Clone User'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onClose, loading, danger }) {
    return (
        <Modal show title={title} onClose={onClose}>
            <div className="p-5">
                <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', danger ? 'bg-red-100' : 'bg-blue-100')}>
                        <AlertTriangle className={cn('w-5 h-5', danger ? 'text-red-600' : 'text-blue-600')} />
                    </div>
                    <p className="text-[13px] text-slate-600 mt-2">{message}</p>
                </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={onConfirm} disabled={loading}
                    className={cn('px-4 py-1.5 text-[13px] font-600 text-white rounded-lg disabled:opacity-50 transition-colors', danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700')}>
                    {loading ? 'Working…' : 'Confirm'}
                </button>
            </div>
        </Modal>
    );
}

// ─── User Form (center panel edit / create) ───────────────────────────────────

const FORM_TABS = [
    { key: 'profile',    label: 'Profile',    Icon: UserCog   },
    { key: 'employment', label: 'Employment', Icon: Briefcase },
    { key: 'access',     label: 'Access',     Icon: Shield    },
    { key: 'security',   label: 'Security',   Icon: Lock      },
];

function UserForm({ mode, userId, rolesData, managersData, onBack, onSaved }) {
    const [tab,     setTab]     = useState('profile');
    const [form,    setForm]    = useState(DEFAULT_FORM);
    const [showPw,  setShowPw]  = useState(false);
    const [dirty,   setDirty]   = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [formErr, setFormErr] = useState('');
    const qc = useQueryClient();

    const detailQ = useQuery({
        queryKey: ['user-detail', userId],
        queryFn:  () => usersApi.get(userId).then(r => r.data.data),
        enabled:  mode === 'edit' && !!userId,
    });
    const u = detailQ.data;

    useEffect(() => {
        if (mode === 'edit' && u) {
            setForm({
                name: u.name ?? '', email: u.email ?? '', password: '', password_confirmation: '',
                role: u.role ?? 'viewer', branch: u.branch ?? '',
                employee_id: u.employee_id ?? '', employee_code: u.employee_code ?? '',
                mobile: u.mobile ?? '', designation: u.designation ?? '',
                department: u.department ?? '', speciality: u.speciality ?? '',
                reporting_manager_id: u.reporting_manager?.id ?? '',
                date_of_joining: u.date_of_joining ?? '', employment_status: u.employment_status ?? 'active',
                display_name: u.profile?.display_name ?? '',
                emergency_contact_name: u.profile?.emergency_contact_name ?? '',
                emergency_contact_phone: u.profile?.emergency_contact_phone ?? '',
                bio: u.profile?.bio ?? '', mfa_enabled: u.mfa_enabled ?? false,
                role_ids: u.roles?.map(r => r.id) ?? [],
                branches: u.branches ?? [], departments: u.departments ?? [],
            });
            setDirty(false);
        }
    }, [u, mode]);

    const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

    const handleSubmit = async () => {
        setFormErr('');
        setSaving(true);
        const payload = { ...form };
        if (mode === 'edit' && !payload.password) { delete payload.password; delete payload.password_confirmation; }
        try {
            if (mode === 'create') await usersApi.create(payload);
            else                   await usersApi.update(userId, payload);
            qc.invalidateQueries({ queryKey: ['users'] });
            qc.invalidateQueries({ queryKey: ['users-stats'] });
            if (userId) qc.invalidateQueries({ queryKey: ['user-detail', userId] });
            onSaved();
        } catch (e) {
            setFormErr(extractError(e));
        }
        setSaving(false);
    };

    const IC = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-slate-50';
    const LC = 'block text-[11px] font-700 text-slate-500 uppercase tracking-wide mb-1';

    const CheckBox = ({ checked, onClick }) => (
        <button type="button" onClick={onClick}
            className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white hover:border-blue-400')}>
            {checked && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
    );

    return (
        <>
            {/* Form header — same structure as Roles.jsx center panel header */}
            <div className="px-5 pt-4 pb-0 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex items-start gap-3 pb-3">
                    <button onClick={onBack}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500 mt-1 flex-shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    {mode === 'edit' && u && <div className="mt-1"><UserAvatar user={u} size="md" /></div>}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-[15px] font-700 text-slate-800">
                                {mode === 'create' ? 'New User' : (u?.name ?? '…')}
                            </h2>
                            {mode === 'edit' && u && <StatusBadge status={u.status} />}
                            {mode === 'edit' && u && <RoleBadge role={u.role} />}
                        </div>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                            {mode === 'create' ? 'Fill in the details below to create a new user' : (u?.email ?? '…')}
                        </p>
                    </div>
                    <button onClick={handleSubmit} disabled={saving || (!dirty && mode === 'edit')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] font-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0">
                        {saving
                            ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>

                <AnimatePresence>
                    {formErr && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <span className="text-[12px] text-red-700 flex-1">{formErr}</span>
                            <button onClick={() => setFormErr('')}><X className="w-3.5 h-3.5 text-red-400" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {dirty && !formErr && mode === 'edit' && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="flex items-center gap-3 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="text-[12px] text-amber-800 flex-1">You have unsaved changes.</span>
                            <button onClick={() => { if (u) { setForm({ ...DEFAULT_FORM }); setDirty(false); } }}
                                className="text-[12px] text-slate-600 hover:text-slate-800 px-2 py-0.5 rounded transition-colors">Discard</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs — same pattern as Roles.jsx */}
                <div className="flex gap-1">
                    {FORM_TABS.map(({ key, label, Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={cn('flex items-center gap-1.5 px-3 py-2 text-[12px] font-600 border-b-2 transition-colors',
                                tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                            <Icon className="w-3.5 h-3.5" />{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

                {tab === 'profile' && (
                    <div className="max-w-2xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={LC}>Full Name *</label>
                                <input value={form.name} onChange={e => setF('name', e.target.value)} className={IC} placeholder="Dr. Priya Sharma" />
                            </div>
                            <div className="col-span-2">
                                <label className={LC}>Email Address *</label>
                                <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Display Name</label>
                                <input value={form.display_name} onChange={e => setF('display_name', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Mobile</label>
                                <input value={form.mobile} onChange={e => setF('mobile', e.target.value)} className={IC} placeholder="+91 98765 43210" />
                            </div>
                            <div>
                                <label className={LC}>Emergency Contact Name</label>
                                <input value={form.emergency_contact_name} onChange={e => setF('emergency_contact_name', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Emergency Contact Phone</label>
                                <input value={form.emergency_contact_phone} onChange={e => setF('emergency_contact_phone', e.target.value)} className={IC} />
                            </div>
                            <div className="col-span-2">
                                <label className={LC}>Bio</label>
                                <textarea value={form.bio} onChange={e => setF('bio', e.target.value)} rows={2} className={cn(IC, 'resize-none')} />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'employment' && (
                    <div className="max-w-2xl">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LC}>Employee ID</label>
                                <input value={form.employee_id} onChange={e => setF('employee_id', e.target.value)} className={IC} placeholder="E-001" />
                            </div>
                            <div>
                                <label className={LC}>Employee Code</label>
                                <input value={form.employee_code} onChange={e => setF('employee_code', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Designation</label>
                                <input value={form.designation} onChange={e => setF('designation', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Speciality</label>
                                <input value={form.speciality} onChange={e => setF('speciality', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Primary Department</label>
                                <select value={form.department} onChange={e => setF('department', e.target.value)} className={IC}>
                                    <option value="">Select…</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LC}>Date of Joining</label>
                                <input type="date" value={form.date_of_joining} onChange={e => setF('date_of_joining', e.target.value)} className={IC} />
                            </div>
                            <div>
                                <label className={LC}>Employment Status</label>
                                <select value={form.employment_status} onChange={e => setF('employment_status', e.target.value)} className={IC}>
                                    {EMP_STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LC}>Reporting Manager</label>
                                <select value={form.reporting_manager_id} onChange={e => setF('reporting_manager_id', e.target.value)} className={IC}>
                                    <option value="">None</option>
                                    {(managersData ?? []).filter(m => m.id !== userId).map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'access' && (
                    <div className="max-w-2xl space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LC}>Base Role *</label>
                                <select value={form.role} onChange={e => setF('role', e.target.value)} className={IC}>
                                    {LEGACY_ROLES.map(r => <option key={r} value={r}>{capitalize(r)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LC}>Primary Branch</label>
                                <select value={form.branch} onChange={e => setF('branch', e.target.value)} className={IC}>
                                    <option value="">All Branches</option>
                                    {BRANCHES.map(b => <option key={b} value={b}>{capitalize(b)}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* RBAC Roles */}
                        <div>
                            <label className={LC}>RBAC Roles</label>
                            <div className="border border-slate-200 rounded-lg overflow-hidden mt-1">
                                {(rolesData ?? []).length === 0
                                    ? <p className="text-[12px] text-slate-400 px-4 py-3">No roles available</p>
                                    : (rolesData ?? []).map((r, i) => (
                                        <label key={r.id} className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors', i > 0 && 'border-t border-slate-100')}>
                                            <button type="button" onClick={() => setF('role_ids', form.role_ids.includes(r.id) ? form.role_ids.filter(x => x !== r.id) : [...form.role_ids, r.id])}
                                                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                                    form.role_ids.includes(r.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white hover:border-blue-400')}>
                                                {form.role_ids.includes(r.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </button>
                                            <span className="text-[13px] text-slate-700 flex-1">{r.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-600" style={{ background: r.color + '22', color: r.color }}>{r.type}</span>
                                        </label>
                                    ))}
                            </div>
                        </div>

                        {/* Branch access */}
                        <div>
                            <label className={LC}>Multi-Branch Access</label>
                            <div className="flex gap-2 mt-1">
                                {BRANCHES.map(b => (
                                    <label key={b} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors flex-1 justify-center',
                                        form.branches.includes(b) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>
                                        <button type="button" onClick={() => setF('branches', form.branches.includes(b) ? form.branches.filter(x => x !== b) : [...form.branches, b])}
                                            className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                                form.branches.includes(b) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white')}>
                                            {form.branches.includes(b) && <Check className="w-2.5 h-2.5 text-white" />}
                                        </button>
                                        <span className="text-[13px] text-slate-700 capitalize">{b}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Department access */}
                        <div>
                            <label className={LC}>Department Access</label>
                            <div className="grid grid-cols-2 gap-1.5 mt-1">
                                {DEPARTMENTS.map(d => (
                                    <label key={d} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-[12px]',
                                        form.departments.includes(d) ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
                                        <button type="button" onClick={() => setF('departments', form.departments.includes(d) ? form.departments.filter(x => x !== d) : [...form.departments, d])}
                                            className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                                form.departments.includes(d) ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white')}>
                                            {form.departments.includes(d) && <Check className="w-2 h-2 text-white" />}
                                        </button>
                                        {d}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* MFA toggle */}
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                            <div>
                                <div className="text-[13px] font-600 text-slate-700">Two-Factor Authentication</div>
                                <div className="text-[11px] text-slate-500">Require MFA on login</div>
                            </div>
                            <button type="button" onClick={() => setF('mfa_enabled', !form.mfa_enabled)}
                                className={cn('relative w-10 h-5 rounded-full transition-colors flex-shrink-0', form.mfa_enabled ? 'bg-blue-600' : 'bg-slate-300')}>
                                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', form.mfa_enabled ? 'translate-x-5' : 'translate-x-0.5')} />
                            </button>
                        </div>
                    </div>
                )}

                {tab === 'security' && (
                    <div className="max-w-2xl space-y-4">
                        {mode === 'create' ? (
                            <>
                                <div>
                                    <label className={LC}>Password *</label>
                                    <div className="relative">
                                        <input type={showPw ? 'text' : 'password'} value={form.password}
                                            onChange={e => setF('password', e.target.value)}
                                            className={cn(IC, 'pr-10')} placeholder="Min. 8 characters" />
                                        <button type="button" onClick={() => setShowPw(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={LC}>Confirm Password *</label>
                                    <input type={showPw ? 'text' : 'password'} value={form.password_confirmation}
                                        onChange={e => setF('password_confirmation', e.target.value)} className={IC} />
                                </div>
                                {form.password && form.password_confirmation && form.password !== form.password_confirmation && (
                                    <p className="text-[12px] text-red-600">Passwords do not match</p>
                                )}
                                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-[12px] text-blue-700">The user will be prompted to change their password on first login.</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <Key className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[13px] font-600 text-amber-800">Password Management</p>
                                    <p className="text-[12px] text-amber-700 mt-0.5">
                                        Use the "Reset Password" quick action in the right panel to change this user's password securely.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
    const qc = useQueryClient();

    // ── Layout ────────────────────────────────────────────────────────────────
    const [centerMode, setCenterMode] = useState('table'); // 'table' | 'edit' | 'create'
    const [selectedId, setSelectedId] = useState(null);

    // ── Table state ───────────────────────────────────────────────────────────
    const [page,    setPage]    = useState(1);
    const [sortBy,  setSortBy]  = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [filters, setFilters] = useState({ search: '', branch: '', role: '', status: '', department: '', employment_status: '' });
    const [selected,    setSelected]    = useState(new Set());
    const [bulkAction,  setBulkAction]  = useState('');
    const [openMenuId,  setOpenMenuId]  = useState(null);

    // ── Modals ────────────────────────────────────────────────────────────────
    const [confirmAction,     setConfirmAction]     = useState(null);
    const [showPasswordReset, setShowPasswordReset] = useState(null);
    const [showClone,         setShowClone]         = useState(null);
    const [err,               setErr]               = useState('');

    // ── Queries ───────────────────────────────────────────────────────────────
    const queryParams = useMemo(() => ({
        page, per_page: 20, sort_by: sortBy, sort_dir: sortDir,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }), [page, sortBy, sortDir, filters]);

    const usersQ = useQuery({
        queryKey: ['users', queryParams],
        queryFn:  () => usersApi.list(queryParams).then(r => r.data),
        placeholderData: prev => prev,
    });
    const statsQ = useQuery({
        queryKey: ['users-stats'],
        queryFn:  () => usersApi.stats().then(r => r.data.data),
    });
    const rolesQ = useQuery({
        queryKey: ['rbac-roles'],
        queryFn:  () => rbacApi.getRoles().then(r => r.data.data),
    });
    const managersQ = useQuery({
        queryKey: ['users-select'],
        queryFn:  () => usersApi.select().then(r => r.data.data),
    });
    const selectedUserQ = useQuery({
        queryKey: ['user-detail', selectedId],
        queryFn:  () => usersApi.get(selectedId).then(r => r.data.data),
        enabled:  !!selectedId,
    });
    const logsQ = useQuery({
        queryKey: ['user-login-logs', selectedId],
        queryFn:  () => usersApi.loginLogs(selectedId).then(r => r.data.data),
        enabled:  !!selectedId,
    });

    const users = usersQ.data?.data ?? [];
    const meta  = usersQ.data?.meta  ?? { total: 0, per_page: 20, current_page: 1, last_page: 1 };
    const stats = statsQ.data ?? {};
    const su    = selectedUserQ.data;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const invalidate = useCallback(() => {
        qc.invalidateQueries({ queryKey: ['users'] });
        qc.invalidateQueries({ queryKey: ['users-stats'] });
        qc.invalidateQueries({ queryKey: ['users-select'] });
    }, [qc]);

    const setFilter    = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };
    const clearFilters = ()      => { setFilters({ search: '', branch: '', role: '', status: '', department: '', employment_status: '' }); setPage(1); };
    const hasFilters   = Object.values(filters).some(Boolean);

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
        setPage(1);
    };

    const allSelected  = users.length > 0 && users.every(u => selected.has(u.id));
    const someSelected = users.some(u => selected.has(u.id)) && !allSelected;
    const toggleAll    = () => setSelected(allSelected ? new Set() : new Set(users.map(u => u.id)));
    const toggleRow    = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const actionMut = useMutation({
        mutationFn: ({ type, id }) => ({
            activate:   () => usersApi.activate(id),
            deactivate: () => usersApi.deactivate(id),
            lock:       () => usersApi.lock(id),
            unlock:     () => usersApi.unlock(id),
            delete:     () => usersApi.delete(id),
        }[type]()),
        onSuccess: () => {
            invalidate();
            if (selectedId) qc.invalidateQueries({ queryKey: ['user-detail', selectedId] });
            setConfirmAction(null);
        },
        onError: (e) => { setErr(extractError(e)); setConfirmAction(null); },
    });

    const bulkMut = useMutation({
        mutationFn: (d) => usersApi.bulk(d),
        onSuccess: (res) => {
            invalidate(); setSelected(new Set()); setBulkAction('');
            const r = res.data?.data;
            if (r?.failed > 0) setErr(`${r.failed} user(s) failed: ${r.errors?.join(', ')}`);
        },
        onError: (e) => setErr(extractError(e)),
    });

    const CONFIRM_CFG = {
        activate:   { title: 'Activate User',   message: 'This user will be able to log in.',                    danger: false },
        deactivate: { title: 'Deactivate User', message: 'This user will not be able to log in.',                danger: true  },
        lock:       { title: 'Lock Account',    message: 'The account will be locked immediately.',              danger: true  },
        unlock:     { title: 'Unlock Account',  message: 'The user will be able to log in again.',               danger: false },
        delete:     { title: 'Delete User',     message: 'This is permanent. All roles and access are removed.', danger: true  },
    };

    const handleAction = (type, id) => {
        setOpenMenuId(null);
        if (type === 'edit')     { setSelectedId(id); setCenterMode('edit'); return; }
        if (type === 'password') { setShowPasswordReset(id); return; }
        if (type === 'clone')    { setShowClone(id); return; }
        setConfirmAction({ type, id, ...CONFIRM_CFG[type] });
    };

    const handleExport = async () => {
        try {
            const res = await usersApi.export(filters);
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
            const a = document.createElement('a');
            a.href = url; a.download = `users_${Date.now()}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { setErr('Export failed'); }
    };

    const SAVED_VIEWS = [
        { label: 'All Active Users', f: { status: 'active'   } },
        { label: 'Locked Accounts',  f: { status: 'locked'   } },
        { label: 'Administrators',   f: { role:   'admin'    } },
        { label: 'Doctors / Staff',  f: { role:   'staff'    } },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-slate-50" onClick={() => openMenuId && setOpenMenuId(null)}>

            {/* ── Top bar — same structure as Roles.jsx ── */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-700 text-slate-800">User Management</h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {stats.total != null
                                ? `${stats.total} total · ${stats.active ?? 0} active · ${stats.locked ?? 0} locked`
                                : 'Loading…'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[12px] text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    <button onClick={() => qc.invalidateQueries({ queryKey: ['users'] })}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setCenterMode('create'); setSelectedId(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-600 hover:bg-blue-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> New User
                    </button>
                </div>
            </div>

            {/* ── Error banner — same as Roles.jsx ── */}
            <AnimatePresence>
                {err && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-50 border-b border-red-200 flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-[13px] text-red-700 flex-1">{err}</span>
                        <button onClick={() => setErr('')} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Three-panel layout — same flex structure as Roles.jsx ── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

                {/* ╔══ Left Panel — Filters ══╗ */}
                <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[13px] font-600 text-slate-700">Filters</span>
                        </div>
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-[11px] text-blue-600 hover:text-blue-800 font-600 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={filters.search} onChange={e => setFilter('search', e.target.value)}
                                placeholder="Name, email, ID…"
                                className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-slate-50" />
                        </div>

                        {/* Status chips */}
                        <div>
                            <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-1.5">Status</p>
                            <div className="flex flex-wrap gap-1">
                                {[['', 'All'], ['active', 'Active'], ['inactive', 'Inactive'], ['locked', 'Locked']].map(([val, lbl]) => (
                                    <button key={val} onClick={() => setFilter('status', val)}
                                        className={cn('text-[11px] px-2 py-0.5 rounded-full border font-600 transition-colors',
                                            filters.status === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dropdown filters */}
                        {[
                            { key: 'branch',            label: 'Branch',     opts: BRANCHES     },
                            { key: 'role',              label: 'Role',       opts: LEGACY_ROLES },
                            { key: 'department',        label: 'Department', opts: DEPARTMENTS  },
                            { key: 'employment_status', label: 'Employment', opts: EMP_STATUSES },
                        ].map(({ key, label, opts }) => (
                            <div key={key}>
                                <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                <select value={filters[key]} onChange={e => setFilter(key, e.target.value)}
                                    className={cn('w-full text-[12px] border rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 bg-slate-50 transition-colors',
                                        filters[key] ? 'border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600')}>
                                    <option value="">All {label}s</option>
                                    {opts.map(o => <option key={o} value={o}>{capitalize(o)}</option>)}
                                </select>
                            </div>
                        ))}

                        {/* Quick stats */}
                        <div className="pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Quick Stats</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { label: 'Total',    value: stats.total,    bg: 'bg-blue-50',    text: 'text-blue-700'    },
                                    { label: 'Active',   value: stats.active,   bg: 'bg-emerald-50', text: 'text-emerald-700' },
                                    { label: 'Inactive', value: stats.inactive, bg: 'bg-slate-100',  text: 'text-slate-600'   },
                                    { label: 'Locked',   value: stats.locked,   bg: 'bg-red-50',     text: 'text-red-700'     },
                                ].map(({ label, value, bg, text }) => (
                                    <div key={label} className={cn('rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity', bg)}
                                        onClick={() => label !== 'Total' && setFilter('status', label.toLowerCase())}>
                                        <div className={cn('text-[16px] font-800 leading-none', text)}>{value ?? '—'}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Saved Views */}
                        <div className="pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-1.5">Saved Views</p>
                            <div className="space-y-0.5">
                                {SAVED_VIEWS.map(({ label, f }) => (
                                    <button key={label}
                                        onClick={() => { clearFilters(); Object.entries(f).forEach(([k, v]) => setFilter(k, v)); }}
                                        className="w-full text-left px-2 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* New user dashed button — matches Roles.jsx "New Custom Role" */}
                    <div className="p-3 border-t border-slate-100">
                        <button onClick={() => { setCenterMode('create'); setSelectedId(null); }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-slate-300 text-[12px] text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> New User
                        </button>
                    </div>
                </div>

                {/* ╔══ Center Panel ══╗ */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                    {centerMode !== 'table' ? (
                        <UserForm
                            mode={centerMode}
                            userId={centerMode === 'edit' ? selectedId : null}
                            rolesData={rolesQ.data}
                            managersData={managersQ.data}
                            onBack={() => setCenterMode('table')}
                            onSaved={() => { setCenterMode('table'); invalidate(); }}
                        />
                    ) : (
                        <>
                            {/* Table toolbar */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] text-slate-500">
                                        {meta.total > 0
                                            ? `${(page - 1) * meta.per_page + 1}–${Math.min(page * meta.per_page, meta.total)} of ${meta.total}`
                                            : '0 results'}
                                        {usersQ.isFetching && <span className="ml-1.5 text-blue-500">↻</span>}
                                    </span>
                                    {selected.size > 0 && (
                                        <span className="text-[11px] font-600 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {selected.size} selected
                                        </span>
                                    )}
                                </div>
                                {selected.size > 0 && (
                                    <div className="flex items-center gap-2">
                                        <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                                            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
                                            <option value="">Bulk action…</option>
                                            {['activate','deactivate','lock','unlock','delete'].map(a => (
                                                <option key={a} value={a}>{capitalize(a)}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => bulkAction && bulkMut.mutate({ action: bulkAction, user_ids: [...selected] })}
                                            disabled={!bulkAction || bulkMut.isPending}
                                            className="flex items-center gap-1.5 text-[12px] px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 font-600">
                                            {bulkMut.isPending ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                                            Apply
                                        </button>
                                        <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-2.5 w-10">
                                                <input type="checkbox" checked={allSelected}
                                                    ref={el => el && (el.indeterminate = someSelected)}
                                                    onChange={toggleAll} className="w-3.5 h-3.5 accent-blue-600" />
                                            </th>
                                            {[
                                                { label: 'Name / Email', col: 'name',         cls: 'min-w-48' },
                                                { label: 'Emp ID',       col: 'employee_id',  cls: 'w-24'     },
                                                { label: 'Mobile',       col: null,           cls: 'w-28'     },
                                                { label: 'Role',         col: 'role',         cls: 'w-20'     },
                                                { label: 'Department',   col: 'department',   cls: 'w-32'     },
                                                { label: 'Branch',       col: 'branch',       cls: 'w-24'     },
                                                { label: 'Status',       col: 'status',       cls: 'w-22'     },
                                                { label: 'Last Login',   col: 'last_login_at',cls: 'w-32'     },
                                                { label: '',             col: null,           cls: 'w-10'     },
                                            ].map(({ label, col, cls }) => (
                                                <th key={label + (col ?? '')}
                                                    onClick={() => col && handleSort(col)}
                                                    className={cn('px-3 py-2.5 text-left text-[10px] font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap', col && 'cursor-pointer hover:text-slate-700 select-none', cls)}>
                                                    {label}{col && <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {usersQ.isLoading ? (
                                            <tr><td colSpan={9} className="py-14 text-center">
                                                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                                            </td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan={9} className="py-16 text-center">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                    <Users className="w-7 h-7 text-slate-400" />
                                                </div>
                                                <p className="text-[13px] text-slate-500">{hasFilters ? 'No users match your filters' : 'No users yet'}</p>
                                                {hasFilters && <button onClick={clearFilters} className="mt-2 text-[12px] text-blue-600 hover:text-blue-800 transition-colors">Clear filters</button>}
                                            </td></tr>
                                        ) : users.map(u => (
                                            <tr key={u.id}
                                                onClick={() => setSelectedId(u.id === selectedId ? null : u.id)}
                                                className={cn('cursor-pointer transition-colors hover:bg-slate-50', selectedId === u.id && 'bg-blue-50 hover:bg-blue-50')}>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleRow(u.id)} className="w-3.5 h-3.5 accent-blue-600" />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <UserAvatar user={u} size="sm" />
                                                        <div className="min-w-0">
                                                            <div className="text-[13px] font-600 text-slate-800 truncate">{u.name}</div>
                                                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-[12px] text-slate-600">{u.employee_id || '—'}</td>
                                                <td className="px-3 py-2.5 text-[12px] text-slate-500">{u.mobile || '—'}</td>
                                                <td className="px-3 py-2.5"><RoleBadge role={u.role} /></td>
                                                <td className="px-3 py-2.5 text-[12px] text-slate-600 truncate max-w-[8rem]">{u.department || '—'}</td>
                                                <td className="px-3 py-2.5 text-[12px] text-slate-600 capitalize">{u.branch || '—'}</td>
                                                <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                                                <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">{u.last_login_human ?? 'Never'}</td>
                                                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <div className="relative">
                                                        <button onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 transition-colors">
                                                            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                                                        </button>
                                                        <AnimatePresence>
                                                            {openMenuId === u.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                    transition={{ duration: 0.1 }}
                                                                    className="absolute right-0 top-7 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-30 overflow-hidden"
                                                                >
                                                                    {[
                                                                        { label: 'Edit',           icon: Edit3,    action: 'edit'                         },
                                                                        { label: 'Reset Password', icon: Key,      action: 'password'                     },
                                                                        { label: 'Clone',          icon: Copy,     action: 'clone'                        },
                                                                        { label: u.locked_at ? 'Unlock' : 'Lock', icon: u.locked_at ? Unlock : Lock, action: u.locked_at ? 'unlock' : 'lock' },
                                                                        { label: u.is_active ? 'Deactivate' : 'Activate', icon: u.is_active ? UserX : UserCheck, action: u.is_active ? 'deactivate' : 'activate', danger: u.is_active },
                                                                        { label: 'Delete', icon: Trash2, action: 'delete', danger: true },
                                                                    ].map(({ label, icon: Icon, action, danger }) => (
                                                                        <button key={action} onClick={() => handleAction(action, u.id)}
                                                                            className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-slate-50 transition-colors text-left', danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700')}>
                                                                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
                                                                        </button>
                                                                    ))}
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

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
                                <span className="text-[12px] text-slate-500">
                                    Page {meta.current_page} of {meta.last_page}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                                        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                                        const p = meta.last_page <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, meta.last_page - 4)) + i;
                                        return (
                                            <button key={p} onClick={() => setPage(p)}
                                                className={cn('w-7 h-7 flex items-center justify-center rounded text-[12px] transition-colors',
                                                    page === p ? 'bg-blue-600 text-white font-600' : 'border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.last_page}
                                        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ╔══ Right Panel — System Overview / User Profile ══╗ */}
                <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {selectedId && su ? (
                            /* ── Selected user ── */
                            <>
                                <div className="flex flex-col items-center py-3 text-center border-b border-slate-100">
                                    <UserAvatar user={su} size="lg" />
                                    <h3 className="text-[14px] font-700 text-slate-800 mt-2 truncate max-w-full">{su.name}</h3>
                                    <p className="text-[11px] text-slate-500 truncate max-w-full">{su.email}</p>
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                                        <StatusBadge status={su.status} />
                                        <RoleBadge role={su.role} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Details</h3>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Employee ID', value: su.employee_id  },
                                            { label: 'Designation', value: su.designation  },
                                            { label: 'Department',  value: su.department   },
                                            { label: 'Branch',      value: su.branch       },
                                            { label: 'Joined',      value: fmtDate(su.date_of_joining) },
                                            { label: 'Last Login',  value: fmtDT(su.last_login_at) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between text-[12px]">
                                                <span className="text-slate-500">{label}</span>
                                                <span className="font-600 text-slate-800 text-right ml-2 truncate max-w-32">{value || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h3>
                                    <div className="space-y-1">
                                        {[
                                            { label: 'Edit profile',    icon: Edit3,      action: () => handleAction('edit', su.id)      },
                                            { label: 'Reset password',  icon: Key,        action: () => handleAction('password', su.id)  },
                                            { label: 'Clone user',      icon: Copy,       action: () => handleAction('clone', su.id)     },
                                        ].map(({ label, icon: Icon, action }) => (
                                            <button key={label} onClick={action}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-700 hover:bg-slate-100 transition-colors text-left">
                                                <Icon className="w-3.5 h-3.5 text-slate-400" />{label}
                                            </button>
                                        ))}
                                        <button onClick={() => handleAction(su.locked_at ? 'unlock' : 'lock', su.id)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-700 hover:bg-slate-100 transition-colors text-left">
                                            {su.locked_at
                                                ? <><Unlock className="w-3.5 h-3.5 text-blue-500" /> Unlock account</>
                                                : <><Lock className="w-3.5 h-3.5 text-slate-400" /> Lock account</>}
                                        </button>
                                        <button onClick={() => handleAction(su.is_active ? 'deactivate' : 'activate', su.id)}
                                            className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors text-left',
                                                su.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50')}>
                                            {su.is_active
                                                ? <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                                                : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                                        </button>
                                        <button onClick={() => handleAction('delete', su.id)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-red-600 hover:bg-red-50 transition-colors text-left">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete user
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Security</h3>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { label: 'MFA',    value: su.mfa_enabled ? 'Enabled' : 'Off', ok: su.mfa_enabled },
                                            { label: 'Failed', value: su.failed_login_attempts,            ok: su.failed_login_attempts === 0 },
                                        ].map(({ label, value, ok }) => (
                                            <div key={label} className={cn('rounded-lg p-2.5', ok ? 'bg-slate-50' : 'bg-red-50')}>
                                                <div className={cn('text-[14px] font-800', ok ? 'text-slate-700' : 'text-red-700')}>{value}</div>
                                                <div className="text-[10px] text-slate-500">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {su.roles?.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">RBAC Roles</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {su.roles.map(r => (
                                                <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded font-600"
                                                    style={{ background: r.color + '22', color: r.color }}>{r.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Recent Activity</h3>
                                    {logsQ.isLoading ? (
                                        <p className="text-[11px] text-slate-400">Loading…</p>
                                    ) : (logsQ.data ?? []).length === 0 ? (
                                        <p className="text-[11px] text-slate-400">No login history</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(logsQ.data ?? []).slice(0, 7).map(log => {
                                                const DOT = { login: 'bg-emerald-500', logout: 'bg-slate-400', failed_login: 'bg-red-500', locked: 'bg-red-600', unlocked: 'bg-blue-500', password_reset: 'bg-amber-500' }[log.event] ?? 'bg-slate-400';
                                                return (
                                                    <div key={log.id} className="flex items-start gap-2">
                                                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', DOT)} />
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] text-slate-700 capitalize font-500">{log.event.replace(/_/g, ' ')}</p>
                                                            <p className="text-[10px] text-slate-400">{fmtDT(log.created_at)}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* ── System overview — same structure as Roles.jsx right panel ── */
                            <>
                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">System Overview</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Total Users',    value: stats.total,        bg: 'bg-blue-50',    text: 'text-blue-700'    },
                                            { label: 'Active',         value: stats.active,       bg: 'bg-emerald-50', text: 'text-emerald-700' },
                                            { label: 'Inactive',       value: stats.inactive,     bg: 'bg-slate-100',  text: 'text-slate-600'   },
                                            { label: 'Locked',         value: stats.locked,       bg: 'bg-red-50',     text: 'text-red-700'     },
                                            { label: 'Admins',         value: stats.admins,       bg: 'bg-violet-50',  text: 'text-violet-700'  },
                                            { label: 'Doctors',        value: stats.doctors,      bg: 'bg-teal-50',    text: 'text-teal-700'    },
                                            { label: 'New This Month', value: stats.newThisMonth, bg: 'bg-orange-50',  text: 'text-orange-700'  },
                                            { label: 'Online Today',   value: stats.recentLogins, bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
                                        ].map(({ label, value, bg, text }) => (
                                            <div key={label} className={cn('rounded-lg p-2.5', bg)}>
                                                <div className={cn('text-[18px] font-800', text)}>{value ?? '—'}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h3>
                                    <div className="space-y-1">
                                        {[
                                            { label: 'Create new user',  icon: Plus,      fn: () => setCenterMode('create')                                          },
                                            { label: 'Export all users', icon: Download,  fn: handleExport                                                            },
                                            { label: 'View locked',      icon: Lock,      fn: () => setFilter('status', 'locked')                                    },
                                            { label: 'View admins',      icon: Shield,    fn: () => setFilter('role', 'admin')                                       },
                                            { label: 'Refresh data',     icon: RefreshCw, fn: () => qc.invalidateQueries({ queryKey: ['users'] }) },
                                        ].map(({ label, icon: Icon, fn }) => (
                                            <button key={label} onClick={fn}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-700 hover:bg-slate-100 transition-colors text-left">
                                                <Icon className="w-3.5 h-3.5 text-slate-400" />{label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Get Started</h3>
                                    <div className="flex flex-col items-center py-5 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                            <Users className="w-7 h-7 text-slate-400" />
                                        </div>
                                        <p className="text-[12px] text-slate-500 max-w-44">
                                            Click any row to view a user's profile, quick actions and login history here.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {confirmAction && (
                    <ConfirmModal
                        title={confirmAction.title}
                        message={confirmAction.message}
                        danger={confirmAction.danger}
                        loading={actionMut.isPending}
                        onConfirm={() => actionMut.mutate({ type: confirmAction.type, id: confirmAction.id })}
                        onClose={() => setConfirmAction(null)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showPasswordReset && (
                    <PasswordResetModal userId={showPasswordReset} onClose={() => setShowPasswordReset(null)} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showClone && (
                    <CloneModal
                        userId={showClone}
                        sourceName={su?.name ?? users.find(u => u.id === showClone)?.name ?? 'user'}
                        onClose={() => setShowClone(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
