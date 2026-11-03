export const ChartCard = ({ title, description, icon: Icon, actions, children, className = '' }) => (
    <section
        className={`rounded-[var(--radius-card)] border overflow-hidden ${className}`}
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
        <header className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {Icon && (
                <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-hover-bg)', color: 'var(--color-primary)' }}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
            )}
            <div className="min-w-0">
                <h2 className="text-[13px] font-650" style={{ color: 'var(--color-text)' }}>{title}</h2>
                {description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{description}</p>}
            </div>
            {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
        <div className="p-4">{children}</div>
    </section>
);
