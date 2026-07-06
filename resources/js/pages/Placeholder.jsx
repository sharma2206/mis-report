import { AppLayout } from '../components/layout/AppLayout';
import { useSelector } from 'react-redux';
import { selectToken } from '../store/authSlice';
import { Navigate } from 'react-router-dom';

export const PlaceholderPage = ({ title, description, icon = '🚧' }) => {
    const token = useSelector(selectToken);
    if (!token) return <Navigate to="/login" replace />;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3">
                <h1 className="text-[16px] font-700 text-slate-800">{title}</h1>
                <p className="text-[11px] text-slate-400">{description}</p>
            </div>
        }>
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="text-6xl mb-4">{icon}</div>
                    <h2 className="text-[18px] font-700 text-slate-700 mb-2">{title}</h2>
                    <p className="text-[13px] text-slate-400 leading-relaxed">{description}</p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-700 font-600">
                        🏗️ Under Development — Coming Soon
                    </div>
                </div>
            </main>
        </AppLayout>
    );
};
