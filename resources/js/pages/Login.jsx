import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AtSign, Lock, ArrowRight, Loader2, Hospital, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';

const schema = z.object({
    email:    z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

const FEATURES = [
    'FTD & MTD revenue breakdown by category',
    'Bed occupancy, admissions & discharge tracking',
    'Payer mix, pharmacy, and package analytics',
    'Automated daily, weekly & monthly email reports',
];

export default function Login() {
    const token = useSelector(selectToken);
    const { login } = useAuth();
    const [showPw, setShowPw]     = useState(false);
    const [apiError, setApiError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    });

    if (token) return <Navigate to="/upload" replace />;

    const onSubmit = async (values) => {
        setApiError('');
        const result = await login(values);
        if (!result.success) setApiError(result.message);
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            {/* ── Left branding panel ── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden md:flex flex-col justify-between bg-slate-900 p-10 relative overflow-hidden"
            >
                {/* radial glows */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(29,78,216,.35)_0%,transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(124,58,237,.25)_0%,transparent_55%)]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <Hospital className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-700 text-white">Hospital MIS</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50 font-600 tracking-wide">v2.0</span>
                    </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/12 bg-white/6 text-[11px] font-600 text-white/60 mb-6 w-fit">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                        Management Information System
                    </div>
                    <h1 className="text-[2.4rem] font-800 text-white leading-[1.15] tracking-tight mb-4">
                        Your daily<br />
                        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            hospital intelligence
                        </span><br />
                        at a glance.
                    </h1>
                    <p className="text-[15px] text-white/50 leading-relaxed max-w-sm">
                        Real-time revenue, collections, occupancy, and patient analytics — across all branches, all in one place.
                    </p>
                    <div className="mt-8 space-y-2.5">
                        {FEATURES.map((f, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                                className="flex items-center gap-2.5 text-[13px] text-white/55">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                {f}
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-[11px] text-white/25">
                    © {new Date().getFullYear()} Hospital MIS · Chromepet &amp; Oragadam
                </div>
            </motion.div>

            {/* ── Right login panel ── */}
            <div className="flex items-center justify-center bg-slate-50 p-8 md:pt-8 pt-14">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-full max-w-[400px]"
                >
                    <div className="mb-8">
                        <h2 className="text-[1.7rem] font-800 text-slate-900 tracking-tight mb-1">Welcome back</h2>
                        <p className="text-[14px] text-slate-500">Sign in with your MIS credentials to continue</p>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                        {apiError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-500 mb-5"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {apiError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-[12px] font-600 text-slate-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                                <input
                                    type="email"
                                    placeholder="you@hospital.com"
                                    autoComplete="username"
                                    {...register('email')}
                                    className={`w-full pl-10 pr-4 py-3 border-[1.5px] rounded-xl text-[14px] text-slate-900 bg-white outline-none transition-all
                                        ${errors.email ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                                />
                            </div>
                            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[12px] font-600 text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    {...register('password')}
                                    className={`w-full pl-10 pr-11 py-3 border-[1.5px] rounded-xl text-[14px] text-slate-900 bg-white outline-none transition-all
                                        ${errors.password ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                                />
                                <button type="button" onClick={() => setShowPw(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 border-0 bg-transparent cursor-pointer p-0">
                                    {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password.message}</p>}
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-700 to-violet-600 text-white rounded-xl text-[15px] font-700 shadow-md shadow-blue-300 hover:opacity-92 transition-all cursor-pointer disabled:opacity-60 border-0"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </motion.button>
                    </form>

                    <p className="mt-6 text-center text-[12px] text-slate-400">Hospital MIS · Internal use only</p>
                </motion.div>
            </div>
        </div>
    );
}
