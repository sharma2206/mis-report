import { ChevronRight, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const PageHeader = ({ title, description, eyebrow, breadcrumbs = [], actions }) => (
    <div className="px-4 sm:px-5 py-4" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] mb-2" style={{ color: 'var(--color-muted)' }}>
                <NavLink to="/dashboard" aria-label="Dashboard" style={{ color: 'var(--color-muted)' }}>
                    <Home className="w-3.5 h-3.5" />
                </NavLink>
                {breadcrumbs.map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                        <span>{item}</span>
                    </span>
                ))}
            </nav>
        )}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="min-w-0">
                {eyebrow && <p className="text-[11px] font-600 uppercase tracking-wider mb-1" style={{ color: 'var(--color-primary)' }}>{eyebrow}</p>}
                <h1 className="text-[20px] font-650 tracking-tight" style={{ color: 'var(--color-text)' }}>{title}</h1>
                {description && <p className="text-[12px] mt-1 max-w-3xl" style={{ color: 'var(--color-muted)' }}>{description}</p>}
            </div>
            {actions && <div className="sm:ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    </div>
);
