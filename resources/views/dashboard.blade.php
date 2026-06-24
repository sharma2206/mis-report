<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIS Dashboard — Hospital MIS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

        :root {
            --sidebar-w: 220px;
            --sidebar-collapsed: 60px;
            --header-h: 58px;
            --bg: #f0f2f7;
            --surface: #ffffff;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --text: #0f172a;
            --text-2: #334155;
            --muted: #64748b;
            --primary: #1d4ed8;
            --primary-light: #dbeafe;
            --primary-soft: #eff6ff;
            --accent: #7c3aed;
            --accent-light: #ede9fe;
            --success: #059669;
            --success-light: #d1fae5;
            --warning: #d97706;
            --warning-light: #fef3c7;
            --danger: #dc2626;
            --danger-light: #fee2e2;
            --info: #0891b2;
            --info-light: #cffafe;
            --shadow-sm: 0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
            --shadow: 0 4px 6px -1px rgba(0,0,0,.07),0 2px 4px -2px rgba(0,0,0,.05);
            --shadow-md: 0 10px 15px -3px rgba(0,0,0,.07),0 4px 6px -4px rgba(0,0,0,.05);
            --shadow-lg: 0 20px 25px -5px rgba(0,0,0,.08),0 8px 10px -6px rgba(0,0,0,.04);
            --radius: 14px;
            --radius-sm: 9px;
            --grad: linear-gradient(135deg,#1d4ed8,#7c3aed);
        }

        body { font-family:'Inter',system-ui,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; -webkit-font-smoothing:antialiased; display:flex; overflow-x:hidden }

        /* ── Sidebar ── */
        #sidebar {
            position: fixed; left:0; top:0; bottom:0; width:var(--sidebar-w);
            background:#0f172a; display:flex; flex-direction:column;
            z-index: 200; transition: width .25s ease; overflow: hidden;
        }
        #sidebar.collapsed { width: var(--sidebar-collapsed) }

        .sb-brand {
            display:flex; align-items:center; gap:.65rem; padding:1rem .85rem;
            border-bottom:1px solid rgba(255,255,255,.08); min-height:58px; flex-shrink:0;
        }
        .sb-logo {
            width:32px; height:32px; border-radius:9px; background:var(--grad);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;
            box-shadow:0 4px 12px rgba(29,78,216,.35);
        }
        .sb-logo .material-icons-round { color:#fff; font-size:18px }
        .sb-title { font-size:.88rem; font-weight:700; color:#fff; white-space:nowrap; opacity:1; transition:opacity .2s }
        #sidebar.collapsed .sb-title { opacity:0; pointer-events:none }
        .sb-badge { font-size:.58rem; padding:.1rem .35rem; border-radius:4px; background:rgba(255,255,255,.1); color:rgba(255,255,255,.5); font-weight:600; white-space:nowrap }
        #sidebar.collapsed .sb-badge { display:none }

        .sb-toggle {
            width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,.07);
            border:none; cursor:pointer; color:rgba(255,255,255,.5); display:flex;
            align-items:center; justify-content:center; margin-left:auto; flex-shrink:0;
            transition:background .15s;
        }
        .sb-toggle:hover { background:rgba(255,255,255,.15) }
        .sb-toggle .material-icons-round { font-size:17px; transition:transform .25s }
        #sidebar.collapsed .sb-toggle .material-icons-round { transform:rotate(180deg) }
        #sidebar.collapsed .sb-toggle { margin:0 auto }

        .sb-nav { flex:1; padding:.5rem 0; overflow-y:auto; overflow-x:hidden }
        .sb-section { padding:.35rem .55rem; overflow:hidden }
        .sb-label { font-size:.58rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:rgba(255,255,255,.25); padding:.4rem .5rem; white-space:nowrap; transition:opacity .2s }
        #sidebar.collapsed .sb-label { opacity:0 }

        .nav-item {
            display:flex; align-items:center; gap:.75rem; padding:.55rem .75rem;
            border-radius:9px; cursor:pointer; border:none; background:transparent;
            color:rgba(255,255,255,.55); font-size:.82rem; font-weight:500; font-family:inherit;
            width:100%; text-align:left; text-decoration:none; white-space:nowrap;
            transition:background .15s, color .15s; margin-bottom:.15rem;
        }
        .nav-item .material-icons-round { font-size:19px; flex-shrink:0; transition:color .15s }
        .nav-item:hover { background:rgba(255,255,255,.07); color:#fff }
        .nav-item.active { background:rgba(29,78,216,.35); color:#93c5fd }
        .nav-item.active .material-icons-round { color:#60a5fa }
        .nav-item .ni-label { transition:opacity .2s; opacity:1 }
        #sidebar.collapsed .nav-item .ni-label { opacity:0; width:0; overflow:hidden }

        .sb-divider { height:1px; background:rgba(255,255,255,.07); margin:.4rem .55rem }

        .sb-user { padding:.75rem .85rem; border-top:1px solid rgba(255,255,255,.08); flex-shrink:0 }
        .sb-user-info { display:flex; align-items:center; gap:.6rem }
        .sb-avatar { width:30px; height:30px; border-radius:50%; background:var(--grad); display:flex; align-items:center; justify-content:center; color:#fff; font-size:.75rem; font-weight:700; flex-shrink:0 }
        .sb-user-name { font-size:.75rem; font-weight:600; color:rgba(255,255,255,.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:opacity .2s }
        .sb-user-role { font-size:.65rem; color:rgba(255,255,255,.35); white-space:nowrap; transition:opacity .2s }
        #sidebar.collapsed .sb-user-name, #sidebar.collapsed .sb-user-role { opacity:0; width:0 }

        /* ── Main wrapper ── */
        .main-wrapper {
            margin-left: var(--sidebar-w); flex:1; display:flex; flex-direction:column;
            min-height:100vh; transition:margin-left .25s ease;
        }
        .main-wrapper.expanded { margin-left: var(--sidebar-collapsed) }

        /* ── Header ── */
        .topbar {
            position:sticky; top:0; z-index:100; height:var(--header-h);
            background:#fff; border-bottom:1px solid var(--border);
            box-shadow:var(--shadow-sm); display:flex; align-items:center;
            gap:.75rem; padding:0 1.5rem; flex-shrink:0;
        }
        .topbar-branch { display:flex; gap:.35rem }
        .branch-pill {
            padding:.38rem .85rem; border-radius:20px; font-size:.8rem; font-weight:600;
            border:1.5px solid var(--border); background:#fff; cursor:pointer;
            color:var(--muted); transition:all .15s; font-family:inherit;
        }
        .branch-pill.active { background:var(--primary); border-color:var(--primary); color:#fff; box-shadow:0 2px 8px rgba(29,78,216,.3) }

        .topbar-sep { width:1px; height:22px; background:var(--border); flex-shrink:0 }

        .date-nav { display:flex; align-items:center; gap:.3rem }
        .date-nav-btn {
            width:28px; height:28px; border-radius:7px; border:1.5px solid var(--border);
            background:#fff; cursor:pointer; color:var(--muted); display:flex;
            align-items:center; justify-content:center; transition:all .15s;
        }
        .date-nav-btn:hover { border-color:var(--primary); color:var(--primary) }
        .date-nav-btn .material-icons-round { font-size:17px }
        #reportDate {
            padding:.38rem .7rem; border:1.5px solid var(--border); border-radius:8px;
            font-size:.82rem; font-family:inherit; color:var(--text); outline:none;
            transition:border .15s; background:#fff;
        }
        #reportDate:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(29,78,216,.1) }

        .preset-strip { display:flex; gap:.25rem }
        .preset-btn {
            padding:.3rem .6rem; border-radius:6px; font-size:.72rem; font-weight:600;
            border:1.5px solid var(--border); background:#fff; cursor:pointer;
            color:var(--muted); transition:all .15s; font-family:inherit; white-space:nowrap;
        }
        .preset-btn:hover, .preset-btn.active { border-color:var(--primary); color:var(--primary); background:var(--primary-soft) }

        .topbar-actions { display:flex; gap:.4rem; margin-left:auto; align-items:center }
        .btn-action {
            display:inline-flex; align-items:center; gap:.3rem; padding:.4rem .85rem;
            border-radius:8px; font-size:.78rem; font-weight:600; cursor:pointer;
            border:1.5px solid var(--border); background:#fff; color:var(--text-2);
            font-family:inherit; transition:all .15s; text-decoration:none; white-space:nowrap;
        }
        .btn-action .material-icons-round { font-size:16px }
        .btn-action:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-soft) }
        .btn-action.primary { background:var(--grad); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(29,78,216,.25) }
        .btn-action.primary:hover { opacity:.92; box-shadow:0 4px 14px rgba(29,78,216,.35) }
        .btn-action.primary:disabled { opacity:.55; cursor:not-allowed; box-shadow:none }
        .btn-action.danger { color:var(--danger) }
        .btn-action.danger:hover { border-color:var(--danger); background:var(--danger-light) }

        .export-menu { position:relative }
        .export-dropdown {
            display:none; position:absolute; right:0; top:calc(100% + 6px);
            background:#fff; border:1px solid var(--border); border-radius:10px;
            box-shadow:var(--shadow-md); min-width:170px; z-index:300; overflow:hidden;
        }
        .export-menu:hover .export-dropdown, .export-dropdown.show { display:block }
        .export-item {
            display:flex; align-items:center; gap:.6rem; padding:.6rem 1rem;
            font-size:.8rem; font-weight:500; color:var(--text-2); cursor:pointer;
            text-decoration:none; transition:background .1s;
        }
        .export-item:hover { background:var(--border-light) }
        .export-item .material-icons-round { font-size:17px; color:var(--muted) }

        /* ── Alert bar ── */
        .alert-bar {
            display:none; align-items:center; gap:.75rem; padding:.75rem 1.5rem;
            background:var(--danger-light); border-bottom:2px solid rgba(220,38,38,.25);
            font-size:.83rem; font-weight:500; color:var(--danger);
        }
        .alert-bar.show { display:flex }
        .alert-bar .material-icons-round { font-size:18px }
        .alert-bar .ab-close { margin-left:auto; cursor:pointer; opacity:.6; transition:opacity .15s }
        .alert-bar .ab-close:hover { opacity:1 }

        /* ── Tabs ── */
        .tab-bar {
            display:flex; gap:0; padding:0 1.5rem; background:#fff;
            border-bottom:1px solid var(--border); overflow-x:auto; flex-shrink:0;
        }
        .tab-bar::-webkit-scrollbar { height:3px }
        .tab-bar::-webkit-scrollbar-thumb { background:var(--border) }
        .tab-btn {
            display:inline-flex; align-items:center; gap:.35rem; padding:.7rem 1rem;
            font-size:.8rem; font-weight:600; cursor:pointer; border:none;
            background:transparent; color:var(--muted); font-family:inherit;
            border-bottom:2.5px solid transparent; white-space:nowrap;
            transition:color .15s, border-color .15s; margin-bottom:-1px;
        }
        .tab-btn .material-icons-round { font-size:16px }
        .tab-btn:hover { color:var(--text) }
        .tab-btn.active { color:var(--primary); border-bottom-color:var(--primary) }

        /* ── Content area ── */
        .content-area { flex:1; padding:1.5rem; overflow-y:auto }
        .tab-section { display:none }
        .tab-section.active { display:block }

        /* ── KPI Grid ── */
        .kpi-grid {
            display:grid;
            grid-template-columns: repeat(5, 1fr);
            gap:1rem; margin-bottom:1.5rem;
        }
        .kpi-card {
            background:#fff; border-radius:var(--radius); padding:1.1rem 1.1rem .9rem;
            box-shadow:var(--shadow-sm); position:relative; overflow:hidden;
            border-left:4px solid transparent; transition:transform .15s, box-shadow .15s;
            cursor:default;
        }
        .kpi-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md) }
        .kpi-card::after { content:''; position:absolute; top:0; right:0; width:70px; height:70px; border-radius:50%; opacity:.06; transform:translate(20px,-20px) }
        .kpi-card.c1 { border-left-color:#1d4ed8 } .kpi-card.c1::after { background:#1d4ed8 }
        .kpi-card.c2 { border-left-color:#059669 } .kpi-card.c2::after { background:#059669 }
        .kpi-card.c3 { border-left-color:#7c3aed } .kpi-card.c3::after { background:#7c3aed }
        .kpi-card.c4 { border-left-color:#0891b2 } .kpi-card.c4::after { background:#0891b2 }
        .kpi-card.c5 { border-left-color:#d97706 } .kpi-card.c5::after { background:#d97706 }
        .kpi-card.c6 { border-left-color:#dc2626 } .kpi-card.c6::after { background:#dc2626 }
        .kpi-card.c7 { border-left-color:#0d9488 } .kpi-card.c7::after { background:#0d9488 }
        .kpi-card.c8 { border-left-color:#db2777 } .kpi-card.c8::after { background:#db2777 }
        .kpi-card.c9 { border-left-color:#4f46e5 } .kpi-card.c9::after { background:#4f46e5 }
        .kpi-card.c10{ border-left-color:#9333ea } .kpi-card.c10::after{ background:#9333ea }

        .kpi-label { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:.35rem }
        .kpi-value { font-size:1.4rem; font-weight:800; color:var(--text); letter-spacing:-.03em; line-height:1.1 }
        .kpi-unit  { font-size:.68rem; color:var(--muted); margin-top:.25rem }
        .kpi-badge { display:inline-flex; align-items:center; gap:.2rem; font-size:.65rem; font-weight:700; padding:.1rem .35rem; border-radius:4px; margin-top:.3rem }
        .kpi-badge.up   { background:#d1fae5; color:#059669 }
        .kpi-badge.down { background:#fee2e2; color:#dc2626 }
        .kpi-badge.flat { background:#f1f5f9; color:#64748b }

        /* ── Summary row ── */
        .summary-strip {
            display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem;
        }
        .summ-card {
            background:#fff; border-radius:var(--radius); padding:1.1rem 1.25rem;
            box-shadow:var(--shadow-sm); display:flex; align-items:flex-start; gap:.9rem;
        }
        .summ-icon {
            width:38px; height:38px; border-radius:10px; display:flex;
            align-items:center; justify-content:center; flex-shrink:0;
        }
        .summ-icon .material-icons-round { font-size:20px }
        .summ-icon.blue   { background:var(--primary-soft); color:var(--primary) }
        .summ-icon.green  { background:var(--success-light); color:var(--success) }
        .summ-icon.amber  { background:var(--warning-light); color:var(--warning) }
        .summ-icon.purple { background:var(--accent-light); color:var(--accent) }
        .summ-body { flex:1 min-width:0 }
        .summ-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:.4rem }
        .summ-row   { display:flex; gap:1rem }
        .summ-block { flex:1 }
        .summ-period{ font-size:.6rem; font-weight:700; text-transform:uppercase; color:var(--muted); letter-spacing:.06em }
        .summ-val   { font-size:1.05rem; font-weight:800; color:var(--text); letter-spacing:-.02em }
        .summ-val.ftd { color:var(--primary) }
        .summ-val.mtd { color:var(--accent) }
        .summ-sub   { font-size:.65rem; color:var(--muted) }

        /* ── Charts ── */
        .charts-grid { display:grid; grid-template-columns:1.8fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem }
        .chart-card {
            background:#fff; border-radius:var(--radius); box-shadow:var(--shadow-sm);
            overflow:hidden; display:flex; flex-direction:column;
        }
        .chart-head {
            padding:.85rem 1.1rem .65rem; border-bottom:1px solid var(--border-light);
            display:flex; align-items:center; justify-content:space-between;
        }
        .chart-title-text { font-size:.78rem; font-weight:700; color:var(--text-2); display:flex; align-items:center; gap:.4rem }
        .chart-title-text .material-icons-round { font-size:16px; color:var(--muted) }
        .chart-sub { font-size:.65rem; color:var(--muted) }
        .chart-body { padding:.75rem; flex:1; position:relative }
        canvas { display:block; width:100%!important }
        .chart-h-200 { height:200px }
        .chart-h-220 { height:220px }

        /* ── Pkg notice ── */
        .pkg-notice {
            display:flex; align-items:center; gap:.65rem; background:var(--warning-light);
            border:1px solid rgba(217,119,6,.25); border-radius:9px; padding:.65rem 1rem;
            font-size:.78rem; color:var(--warning); font-weight:500; margin-bottom:1rem;
        }
        .pkg-notice .material-icons-round { font-size:18px }
        .pkg-vals { display:flex; gap:1rem; margin-left:auto; font-weight:700 }

        /* ── Section ── */
        .section { margin-bottom:1.5rem }
        .section-head {
            display:flex; align-items:center; justify-content:space-between;
            margin-bottom:.75rem;
        }
        .section-title {
            font-size:.9rem; font-weight:700; color:var(--text); display:flex;
            align-items:center; gap:.45rem;
        }
        .section-title .material-icons-round { font-size:19px; color:var(--muted) }
        .section-title .sub { font-size:.73rem; font-weight:500; color:var(--muted); margin-left:.2rem }
        .section-actions { display:flex; gap:.4rem }
        .btn-sm {
            display:inline-flex; align-items:center; gap:.25rem; padding:.3rem .7rem;
            border-radius:6px; font-size:.73rem; font-weight:600; cursor:pointer;
            border:1.5px solid var(--border); background:#fff; color:var(--text-2);
            font-family:inherit; transition:all .15s; text-decoration:none;
        }
        .btn-sm .material-icons-round { font-size:14px }
        .btn-sm:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-soft) }
        .btn-sm.pdf-btn:hover { border-color:var(--danger); color:var(--danger); background:var(--danger-light) }
        .btn-sm.csv-btn:hover { border-color:var(--success); color:var(--success); background:var(--success-light) }

        /* ── Revenue table ── */
        .table-wrap { background:#fff; border-radius:var(--radius); box-shadow:var(--shadow-sm); overflow:hidden }
        .table-scroll { overflow-x:auto }
        .tbl { width:100%; border-collapse:collapse; font-size:.8rem }
        .tbl thead { position:sticky; top:0; z-index:10 }
        .tbl .super-header th { background:#0f172a; color:rgba(255,255,255,.7); font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:.55rem .9rem; text-align:center; white-space:nowrap }
        .tbl .super-header .ftd-h { background:rgba(29,78,216,.85) }
        .tbl .super-header .mtd-h { background:rgba(124,58,237,.85) }
        .tbl thead tr:not(.super-header) th { background:#1e293b; color:rgba(255,255,255,.8); padding:.5rem .9rem; font-size:.72rem; font-weight:600; text-align:right; border-right:1px solid rgba(255,255,255,.06); white-space:nowrap }
        .tbl thead tr:not(.super-header) th:first-child { text-align:left; min-width:110px }
        .tbl tbody tr { border-bottom:1px solid var(--border-light); transition:background .1s }
        .tbl tbody tr:hover { background:#f8fafc }
        .tbl tbody td { padding:.55rem .9rem; color:var(--text-2); text-align:right; border-right:1px solid var(--border-light); font-variant-numeric:tabular-nums; white-space:nowrap }
        .tbl tbody td:first-child { text-align:left; font-weight:600; color:var(--text); border-right:2px solid var(--border) }
        .tbl .total-col.ftd-total { background:rgba(29,78,216,.05); font-weight:700; color:var(--primary) }
        .tbl .total-col.mtd-total { background:rgba(124,58,237,.05); font-weight:700; color:var(--accent) }
        .tbl tbody tr:last-child td { border-bottom:none }

        /* Conditional formatting */
        .tbl .val-zero  { color:#94a3b8 }
        .tbl .val-high  { color:#059669; font-weight:700 }
        .tbl .val-warn  { color:#d97706; font-weight:600 }
        .tbl .val-neg   { color:#dc2626; font-weight:600 }
        .tbl tbody tr.row-highlight { background:#fffbeb }

        /* ── Volume grid ── */
        .vol-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:.85rem }
        .vol-card {
            background:#fff; border-radius:var(--radius-sm); padding:1rem;
            box-shadow:var(--shadow-sm); border-top:3px solid var(--border);
            transition:transform .15s, box-shadow .15s;
        }
        .vol-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md) }
        .vol-card.wide { grid-column:span 2 }
        .vol-label { font-size:.67rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:.6rem }
        .vol-values { display:flex; gap:.85rem }
        .vol-item { flex:1 }
        .vol-period { font-size:.58rem; font-weight:700; text-transform:uppercase; color:var(--muted); margin-bottom:.15rem }
        .vol-num { font-size:1.35rem; font-weight:800; color:var(--text); letter-spacing:-.03em }
        .vol-num.ftd { color:var(--primary) }
        .vol-num.mtd { color:var(--accent) }
        .vol-num.sm  { font-size:1rem }

        /* ── Loading ── */
        .loading-overlay {
            display:none; position:fixed; inset:0; background:rgba(15,23,42,.35);
            backdrop-filter:blur(2px); z-index:500; align-items:center; justify-content:center;
        }
        .loading-overlay.show { display:flex }
        .loader {
            width:44px; height:44px; border:3px solid rgba(255,255,255,.2);
            border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg) } }

        /* ── Empty state ── */
        .empty-state { text-align:center; padding:4rem 2rem }
        .empty-state .es-icon { width:72px; height:72px; border-radius:20px; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem }
        .empty-state .es-icon .material-icons-round { font-size:36px; color:var(--primary) }
        .empty-state h3 { font-size:1.05rem; font-weight:700; color:var(--text); margin-bottom:.4rem }
        .empty-state p { font-size:.83rem; color:var(--muted); max-width:340px; margin:0 auto }

        /* ── Skeleton ── */
        .skeleton { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200%; animation:shimmer 1.4s infinite; border-radius:6px }
        @keyframes shimmer { from{background-position:200%} to{background-position:-200%} }

        /* login handled by /login page */

        /* ── Responsive ── */
        @media(max-width:1200px) {
            .kpi-grid { grid-template-columns:repeat(5,1fr) }
            .charts-grid { grid-template-columns:1fr 1fr }
            .charts-grid .chart-card:first-child { grid-column:1/-1 }
        }
        @media(max-width:900px) {
            #sidebar { width:var(--sidebar-collapsed) }
            .main-wrapper { margin-left:var(--sidebar-collapsed) }
            .sb-title, .sb-badge, .ni-label, .sb-user-name, .sb-user-role, .sb-label { opacity:0; width:0; overflow:hidden }
            .sb-toggle { margin:0 auto }
            .kpi-grid { grid-template-columns:repeat(3,1fr) }
            .summary-strip { grid-template-columns:1fr 1fr }
            .charts-grid { grid-template-columns:1fr }
        }
        @media(max-width:640px) {
            .kpi-grid { grid-template-columns:repeat(2,1fr) }
            .summary-strip { grid-template-columns:1fr }
            .topbar { padding:0 .85rem; gap:.4rem; flex-wrap:wrap; height:auto; min-height:var(--header-h); padding-top:.4rem; padding-bottom:.4rem }
            .preset-strip { display:none }
            .topbar-sep { display:none }
            .topbar-actions .btn-action span:not(.material-icons-round) { display:none }
            .content-area { padding:1rem .85rem }
            .vol-grid { grid-template-columns:repeat(2,1fr) }
            .vol-card.wide { grid-column:span 1 }
        }
    </style>
</head>
<body>

<!-- ══ SIDEBAR ════════════════════════════════════════════════════════════ -->
<aside id="sidebar">
    <div class="sb-brand">
        <div class="sb-logo"><span class="material-icons-round">local_hospital</span></div>
        <span class="sb-title">Hospital MIS</span>
        <span class="sb-badge">v2.0</span>
        <button class="sb-toggle" onclick="toggleSidebar()" title="Toggle sidebar">
            <span class="material-icons-round">chevron_left</span>
        </button>
    </div>

    <nav class="sb-nav">
        <div class="sb-section">
            <div class="sb-label">Reports</div>
            <button class="nav-item active" data-tab="overview" onclick="switchTab('overview')">
                <span class="material-icons-round">dashboard</span><span class="ni-label">Overview</span>
            </button>
            <button class="nav-item" data-tab="revenue" onclick="switchTab('revenue')">
                <span class="material-icons-round">payments</span><span class="ni-label">Revenue</span>
            </button>
            <button class="nav-item" data-tab="volume" onclick="switchTab('volume')">
                <span class="material-icons-round">trending_up</span><span class="ni-label">Volume & MRI</span>
            </button>
            <button class="nav-item" data-tab="analytics" onclick="switchTab('analytics')">
                <span class="material-icons-round">bar_chart</span><span class="ni-label">Analytics</span>
            </button>
        </div>
        <div class="sb-divider"></div>
        <div class="sb-section">
            <div class="sb-label">Actions</div>
            <a href="/upload" class="nav-item">
                <span class="material-icons-round">upload_file</span><span class="ni-label">Upload Data</span>
            </a>
            <button class="nav-item" onclick="openPrint()">
                <span class="material-icons-round">print</span><span class="ni-label">Print Report</span>
            </button>
            <button class="nav-item" onclick="doLogout()" style="color:rgba(252,165,165,.7)">
                <span class="material-icons-round">logout</span><span class="ni-label">Sign Out</span>
            </button>
        </div>
    </nav>

    <div class="sb-user">
        <div class="sb-user-info">
            <div class="sb-avatar" id="sbAvatar">A</div>
            <div style="overflow:hidden">
                <div class="sb-user-name" id="sbUserName">—</div>
                <div class="sb-user-role" id="sbUserRole">Hospital MIS</div>
            </div>
        </div>
    </div>

</aside>

<!-- ══ MAIN WRAPPER ═══════════════════════════════════════════════════════ -->
<div class="main-wrapper" id="mainWrapper">

    <!-- ── Top bar ── -->
    <header class="topbar">
        <div class="topbar-branch">
            <button class="branch-pill active" data-branch="chromepet" onclick="switchBranch('chromepet')">Chromepet</button>
            <button class="branch-pill" data-branch="oragadam" onclick="switchBranch('oragadam')">Oragadam</button>
        </div>

        <div class="topbar-sep"></div>

        <div class="date-nav">
            <button class="date-nav-btn" onclick="shiftDate(-1)" title="Previous day">
                <span class="material-icons-round">chevron_left</span>
            </button>
            <input type="date" id="reportDate">
            <button class="date-nav-btn" onclick="shiftDate(1)" title="Next day">
                <span class="material-icons-round">chevron_right</span>
            </button>
        </div>

        <div class="preset-strip">
            <button class="preset-btn" onclick="setPreset('today',event)">Today</button>
            <button class="preset-btn" onclick="setPreset('yesterday',event)">Yesterday</button>
            <button class="preset-btn" onclick="setPreset('week',event)">This Week</button>
            <button class="preset-btn" onclick="setPreset('mtd',event)">MTD</button>
            <button class="preset-btn" onclick="setPreset('last_month',event)">Last Month</button>
        </div>

        <div class="topbar-actions">
            <button class="btn-action primary" id="loadBtn" onclick="loadReport()">
                <span class="material-icons-round" style="font-size:16px">sync</span>
                <span id="loadText">Load Report</span>
            </button>

            <div class="export-menu">
                <button class="btn-action" id="exportMenuBtn" onclick="toggleExportMenu()">
                    <span class="material-icons-round" style="font-size:16px">download</span>
                    <span>Export</span>
                    <span class="material-icons-round" style="font-size:14px">expand_more</span>
                </button>
                <div class="export-dropdown" id="exportDropdown">
                    <a class="export-item" id="exportExcel" href="#" target="_blank">
                        <span class="material-icons-round" style="color:#059669">table_view</span> Excel (.xlsx)
                    </a>
                    <a class="export-item" id="exportPdf" href="#" target="_blank">
                        <span class="material-icons-round" style="color:#dc2626">picture_as_pdf</span> PDF Report
                    </a>
                    <a class="export-item" id="exportCsv" href="#" target="_blank">
                        <span class="material-icons-round" style="color:#d97706">data_object</span> CSV (Flat)
                    </a>
                    <div class="export-item" onclick="openPrint()">
                        <span class="material-icons-round" style="color:#7c3aed">print</span> Print Preview
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- ── Alert bar ── -->
    <div class="alert-bar" id="alertBox">
        <span class="material-icons-round">error_outline</span>
        <span id="alertMsg"></span>
        <span class="ab-close material-icons-round" onclick="document.getElementById('alertBox').classList.remove('show')">close</span>
    </div>

    <!-- ── Tab bar ── -->
    <div class="tab-bar">
        <button class="tab-btn active" data-tab="overview" onclick="switchTab('overview')">
            <span class="material-icons-round">dashboard</span> Overview
        </button>
        <button class="tab-btn" data-tab="revenue" onclick="switchTab('revenue')">
            <span class="material-icons-round">payments</span> Revenue
        </button>
        <button class="tab-btn" data-tab="volume" onclick="switchTab('volume')">
            <span class="material-icons-round">trending_up</span> Volume & MRI
        </button>
        <button class="tab-btn" data-tab="analytics" onclick="switchTab('analytics')">
            <span class="material-icons-round">bar_chart</span> Analytics
        </button>
    </div>

    <!-- ── Content area ── -->
    <main class="content-area">

        <!-- Overview tab -->
        <div class="tab-section active" data-tab="overview">
            <div id="sec-kpi">
                <div class="kpi-grid" id="kpiGrid">
                    <!-- skeleton -->
                    <div class="kpi-card c1"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:24px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:8px;width:40%"></div></div>
                    <div class="kpi-card c2"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:24px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:8px;width:40%"></div></div>
                    <div class="kpi-card c3"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:24px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:8px;width:40%"></div></div>
                    <div class="kpi-card c4"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:24px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:8px;width:40%"></div></div>
                    <div class="kpi-card c5"><div class="skeleton" style="height:10px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:24px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:8px;width:40%"></div></div>
                </div>
            </div>

            <div id="sec-summary">
                <!-- populated by renderReport -->
            </div>

            <div class="charts-grid">
                <div class="chart-card">
                    <div class="chart-head">
                        <div><div class="chart-title-text"><span class="material-icons-round">show_chart</span>Daily Revenue Trend</div><div class="chart-sub">MTD — ₹ Lakhs</div></div>
                    </div>
                    <div class="chart-body chart-h-220"><canvas id="chartDailyTrend"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-head">
                        <div><div class="chart-title-text"><span class="material-icons-round">donut_large</span>Payer Mix</div><div class="chart-sub">Collection by payer type</div></div>
                    </div>
                    <div class="chart-body chart-h-200"><canvas id="chartPayerMix"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-head">
                        <div><div class="chart-title-text"><span class="material-icons-round">stacked_bar_chart</span>Patient Mix</div><div class="chart-sub">Revenue by type (MTD)</div></div>
                    </div>
                    <div class="chart-body chart-h-200"><canvas id="chartPatientMix"></canvas></div>
                </div>
            </div>

            <div id="sec-pkg"></div>
        </div>

        <!-- Revenue tab -->
        <div class="tab-section" data-tab="revenue">
            <div id="sec-revenue">
                <div class="empty-state">
                    <div class="es-icon"><span class="material-icons-round">payments</span></div>
                    <h3>No report loaded</h3>
                    <p>Select a branch and date, then click Load Report</p>
                </div>
            </div>
        </div>

        <!-- Volume tab -->
        <div class="tab-section" data-tab="volume">
            <div id="sec-volume">
                <div class="empty-state">
                    <div class="es-icon"><span class="material-icons-round">trending_up</span></div>
                    <h3>No report loaded</h3>
                    <p>Select a branch and date, then click Load Report</p>
                </div>
            </div>
        </div>

        <!-- Analytics tab (big charts) -->
        <div class="tab-section" data-tab="analytics">
            <div class="charts-grid" style="grid-template-columns:1fr;gap:1.25rem">
                <div class="chart-card">
                    <div class="chart-head">
                        <div><div class="chart-title-text"><span class="material-icons-round">show_chart</span>Revenue Trend — Full View</div><div class="chart-sub">Daily breakdown by patient category (₹ Lakhs)</div></div>
                    </div>
                    <div class="chart-body" style="height:280px"><canvas id="chartDailyTrend2"></canvas></div>
                </div>
                <div class="charts-grid" style="grid-template-columns:1fr 1fr;margin-bottom:0">
                    <div class="chart-card">
                        <div class="chart-head"><div><div class="chart-title-text"><span class="material-icons-round">donut_large</span>Payer Mix</div><div class="chart-sub">Collection distribution</div></div></div>
                        <div class="chart-body" style="height:260px"><canvas id="chartPayerMix2"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-head"><div><div class="chart-title-text"><span class="material-icons-round">stacked_bar_chart</span>Patient Revenue Mix</div><div class="chart-sub">Stacked contribution by type</div></div></div>
                        <div class="chart-body" style="height:260px"><canvas id="chartPatientMix2"></canvas></div>
                    </div>
                </div>
            </div>
        </div>

    </main>
</div>

<!-- ══ LOADING OVERLAY ═══════════════════════════════════════════════════ -->
<div class="loading-overlay" id="loadingOverlay">
    <div class="loader"></div>
</div>


<script>
    /* ═══════════════════════════════════════════════════════════════════════
       STATE
    ═══════════════════════════════════════════════════════════════════════ */
    const BED = { chromepet: 74, oragadam: 14 };
    let branch = 'chromepet', reportData = null;
    let chartInstances = {};
    let sidebarCollapsed = false;
    let lastTrendData = null, lastPayerData = null, lastMixData = null;

    /* ═══════════════════════════════════════════════════════════════════════
       AUTH
    ═══════════════════════════════════════════════════════════════════════ */
    function getToken()   { return localStorage.getItem('mis_token') || ''; }
    function clearToken() { localStorage.removeItem('mis_token'); localStorage.removeItem('mis_user'); }
    function authHeaders(){ const t = getToken(); return { 'Authorization': 'Bearer ' + t, 'Accept': 'application/json' }; }

    async function apiFetch(url) {
        const r = await fetch(url, { headers: authHeaders() });
        if (r.status === 401) { clearToken(); window.location.replace('/login'); throw new Error('Unauthenticated'); }
        return r;
    }

    function doLogout() {
        fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() })
            .finally(() => { clearToken(); window.location.replace('/login'); });
    }

    function updateUserUI(user) {
        if (!user) return;
        const name = user.name || user.email || 'User';
        const role = user.role || 'viewer';
        const el = document.getElementById('sbUserName'); if (el) el.textContent = name;
        const re = document.getElementById('sbUserRole'); if (re) re.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        const av = document.getElementById('sbAvatar');   if (av) av.textContent = name.charAt(0).toUpperCase();
    }


    /* ═══════════════════════════════════════════════════════════════════════
       SIDEBAR & TABS
    ═══════════════════════════════════════════════════════════════════════ */
    function toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed;
        document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
        document.getElementById('mainWrapper').classList.toggle('expanded', sidebarCollapsed);
    }

    function switchTab(tab) {
        document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
        // Mirror charts to analytics tab on switch
        if (tab === 'analytics' && lastTrendData) {
            setTimeout(() => {
                renderDailyTrendChart2(lastTrendData);
                if (lastPayerData) renderPayerMixChart2(lastPayerData);
                if (lastMixData) renderPatientMixChart2(lastMixData);
            }, 50);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       DATE / BRANCH / PRESETS
    ═══════════════════════════════════════════════════════════════════════ */
    const di = document.getElementById('reportDate');
    di.max = new Date().toISOString().split('T')[0];
    di.value = di.max;

    function switchBranch(b) {
        branch = b;
        document.querySelectorAll('.branch-pill').forEach(p => p.classList.toggle('active', p.dataset.branch === b));
        if (reportData) loadReport();
    }

    function shiftDate(d) {
        const dt = new Date(di.value);
        dt.setDate(dt.getDate() + d);
        const s = dt.toISOString().split('T')[0];
        if (s <= di.max) { di.value = s; loadReport(); }
    }

    function setPreset(p, e) {
        const today = new Date();
        const fmt = d => d.toISOString().split('T')[0];
        let target;
        if      (p==='today')      { target = fmt(today); }
        else if (p==='yesterday')  { const d=new Date(today); d.setDate(d.getDate()-1); target=fmt(d); }
        else if (p==='week')       { const d=new Date(today); d.setDate(d.getDate()-d.getDay()); target=fmt(d); }
        else if (p==='mtd')        { target = fmt(today); }
        else if (p==='last_month') { const d=new Date(today.getFullYear(),today.getMonth(),0); target=fmt(d); }
        if (target && target <= di.max) {
            di.value = target;
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            if (e && e.currentTarget) e.currentTarget.classList.add('active');
            loadReport();
        }
    }

    function openPrint() {
        if (!di.value) return;
        window.open(`/print/${branch}/${di.value}`, '_blank');
    }

    function toggleExportMenu() {
        document.getElementById('exportDropdown').classList.toggle('show');
    }
    document.addEventListener('click', e => {
        if (!e.target.closest('.export-menu')) {
            document.getElementById('exportDropdown').classList.remove('show');
        }
    });

    function updateExportLinks(date) {
        document.getElementById('exportExcel').href = `/api/mis/${branch}/${date}/export`;
        document.getElementById('exportPdf').href   = `/api/mis/${branch}/${date}/export-pdf`;
        document.getElementById('exportCsv').href   = `/api/mis/${branch}/${date}/export-csv`;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       LOAD REPORT
    ═══════════════════════════════════════════════════════════════════════ */
    async function loadReport() {
        const date = di.value;
        if (!date) return;
        const btn = document.getElementById('loadBtn');
        const lt  = document.getElementById('loadText');
        const lo  = document.getElementById('loadingOverlay');
        btn.disabled = true; lt.textContent = 'Loading…'; lo.classList.add('show');
        document.getElementById('alertBox').classList.remove('show');
        updateExportLinks(date);
        try {
            const [misResp,kpiResp,trendResp,payerResp,mixResp] = await Promise.all([
                apiFetch(`/api/mis/${branch}/${date}`),
                apiFetch(`/api/analytics/kpi/${branch}/${date}`),
                apiFetch(`/api/analytics/charts/daily-trend?branch=${branch}&from=${monthStart(date)}&to=${date}`),
                apiFetch(`/api/analytics/charts/payer-mix?branch=${branch}&date=${date}`),
                apiFetch(`/api/analytics/charts/patient-mix?branch=${branch}&from=${monthStart(date)}&to=${date}`),
            ]);
            const [mis,kpi,trend,payer,mix] = await Promise.all([
                misResp.json(),kpiResp.json(),trendResp.json(),payerResp.json(),mixResp.json()
            ]);

            if (mis.success) {
                reportData = mis.data;
                renderReport(mis.data, date);
                if (kpi.success)   renderKPI(kpi.data, date);
                if (trend.success) { lastTrendData = trend.data; renderDailyTrendChart(trend.data); }
                if (payer.success) { lastPayerData = payer.data; renderPayerMixChart(payer.data); }
                if (mix.success)   { lastMixData   = mix.data;   renderPatientMixChart(mix.data); }
            } else {
                showError(mis.message || 'No data found for this date');
                document.getElementById('sec-summary').innerHTML = `
                    <div class="empty-state">
                        <div class="es-icon"><span class="material-icons-round">warning_amber</span></div>
                        <h3>${mis.message || 'No data for this date'}</h3>
                        <p>Upload CSV files for ${date} first, then reload the report.</p>
                    </div>`;
            }
        } catch(e) {
            if (e.message !== 'Unauthenticated') showError('Network error: ' + e.message);
        } finally {
            btn.disabled = false; lt.textContent = 'Load Report'; lo.classList.remove('show');
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       HELPERS
    ═══════════════════════════════════════════════════════════════════════ */
    function monthStart(date) { return date.substring(0,8) + '01'; }
    function showError(m) { document.getElementById('alertMsg').textContent = m; document.getElementById('alertBox').classList.add('show'); }
    function lk(v)       { return ((v||0)/100000).toFixed(2); }
    function fmtRupee(v) { return '₹'+Math.round(Number(v||0)).toLocaleString(); }
    function fmtL(v)     { return '₹'+((v||0)/100000).toFixed(2)+'L'; }

    function destroyChart(id) {
        if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
    }

    function cfClass(val) {
        const n = Number(val) || 0;
        if (n === 0)    return 'val-zero';
        if (n >= 5)     return 'val-high';
        return '';
    }

    /* ═══════════════════════════════════════════════════════════════════════
       RENDER KPI
    ═══════════════════════════════════════════════════════════════════════ */
    function renderKPI(kpi, date) {
        const occ = Number(kpi.bed_occupancy_pct || 0);
        const occClass = occ >= 80 ? 'c1' : occ >= 50 ? 'c5' : 'c6';

        const cards = [
            { cls:'c1', icon:'payments',       label:'Total Revenue',        val: fmtL(kpi.total_revenue),                      unit:'FTD net sales' },
            { cls:'c2', icon:'account_balance', label:'Net Collection',       val: fmtL(kpi.net_collection),                     unit:'Cash collected' },
            { cls:'c3', icon:'people',          label:'Total Patients',       val: (kpi.total_patients||0).toLocaleString(),      unit:'Unique patients today' },
            { cls:'c4', icon:'person_outline',  label:'OP Patients',          val: (kpi.op_count||0).toLocaleString(),            unit:'Outpatient visits' },
            { cls:'c5', icon:'hotel',           label:'IP Admissions',        val: (kpi.ip_count||0).toLocaleString(),            unit:'Inpatient today' },
            { cls:'c6', icon:'emergency',       label:'ER Visits',            val: (kpi.er_count||0).toLocaleString(),            unit:'Emergency today' },
            { cls:'c7', icon:'local_offer',     label:'Discount Given',       val: fmtL(kpi.discount_amount),                    unit:'Total discount' },
            { cls:'c8', icon:'medication',      label:'Pharmacy Sales',       val: fmtL(kpi.pharmacy_sales),                     unit:'Pharmacy revenue' },
            { cls:occClass,icon:'bed',          label:'Bed Occupancy',        val: occ.toFixed(1)+'%',                           unit:`${kpi.bed_occupancy||0} of ${kpi.bed_count||0} beds` },
            { cls:'c10',icon:'trending_up',     label:'Avg Rev/Patient',      val: fmtRupee(kpi.avg_revenue_per_patient),         unit:'Per patient' },
        ];

        if (kpi.surgery_count > 0) {
            cards.splice(5, 0, { cls:'c3', icon:'vaccines', label:'Surgeries', val: kpi.surgery_count, unit:`${kpi.major_surgeries||0} Major` });
            cards.pop();
        }

        document.getElementById('kpiGrid').innerHTML = cards.map(c => `
            <div class="kpi-card ${c.cls}">
                <div class="kpi-label">${c.label}</div>
                <div class="kpi-value">${c.val}</div>
                <div class="kpi-unit">${c.unit}</div>
            </div>`).join('');
    }

    /* ═══════════════════════════════════════════════════════════════════════
       RENDER REPORT (summary + revenue + volume)
    ═══════════════════════════════════════════════════════════════════════ */
    function renderReport(d, date) {
        const s   = d.sales || {};
        const c   = d.collection || {};
        const dc  = d.discount || {};
        const r   = d.refund || {};
        const v   = d.volume || {};
        const m   = d.mri || {};
        const t   = d.totals || {};
        const pkg = d.pkg_adjustment || { ftd:0, mtd:0 };
        date = date || d.date || di.value;
        const isChromepet = branch === 'chromepet';
        const isOragadam  = branch === 'oragadam';
        const revCols = ['op','ip','er','ph'];

        /* ── Summary strip ── */
        document.getElementById('sec-summary').innerHTML = `
            <div class="summary-strip">
                <div class="summ-card">
                    <div class="summ-icon blue"><span class="material-icons-round">payments</span></div>
                    <div class="summ-body">
                        <div class="summ-label">Total Sales</div>
                        <div class="summ-row">
                            <div class="summ-block"><div class="summ-period">FTD</div><div class="summ-val ftd">₹${lk(t.sales_ftd)}L</div></div>
                            <div class="summ-block"><div class="summ-period">MTD</div><div class="summ-val mtd">₹${lk(t.sales_mtd)}L</div></div>
                        </div>
                    </div>
                </div>
                <div class="summ-card">
                    <div class="summ-icon green"><span class="material-icons-round">account_balance</span></div>
                    <div class="summ-body">
                        <div class="summ-label">Collection</div>
                        <div class="summ-row">
                            <div class="summ-block"><div class="summ-period">FTD</div><div class="summ-val ftd">₹${lk(t.collection_ftd)}L</div></div>
                            <div class="summ-block"><div class="summ-period">MTD</div><div class="summ-val mtd">₹${lk(t.collection_mtd)}L</div></div>
                        </div>
                    </div>
                </div>
                <div class="summ-card">
                    <div class="summ-icon amber"><span class="material-icons-round">hotel</span></div>
                    <div class="summ-body">
                        <div class="summ-label">Occupancy</div>
                        <div class="summ-row">
                            <div class="summ-block"><div class="summ-period">Beds</div><div class="summ-val ftd">${v.ftd?.occupancy||0}</div><div class="summ-sub">of ${BED[branch]}</div></div>
                            <div class="summ-block"><div class="summ-period">FTD %</div><div class="summ-val mtd">${Number(v.ftd?.occupancy_pct||0).toFixed(1)}%</div></div>
                        </div>
                    </div>
                </div>
                <div class="summ-card">
                    <div class="summ-icon purple"><span class="material-icons-round">person_add</span></div>
                    <div class="summ-body">
                        <div class="summ-label">Admissions</div>
                        <div class="summ-row">
                            <div class="summ-block"><div class="summ-period">FTD</div><div class="summ-val ftd">${v.ftd?.admission||0}</div></div>
                            <div class="summ-block"><div class="summ-period">MTD</div><div class="summ-val mtd">${v.mtd?.admission||0}</div></div>
                        </div>
                    </div>
                </div>
            </div>`;

        /* ── Pkg notice ── */
        let pkgHtml = '';
        if ((pkg.ftd||0)>0||(pkg.mtd||0)>0) {
            pkgHtml = `<div class="pkg-notice"><span class="material-icons-round">inventory_2</span><span>Package Adjustment (Chromepet): Added to Pharmacy — subtracted from IP</span><div class="pkg-vals"><span>FTD: ₹${lk(pkg.ftd)}L</span><span>MTD: ₹${lk(pkg.mtd)}L</span></div></div>`;
        }
        document.getElementById('sec-pkg').innerHTML = pkgHtml;

        /* ── Revenue table ── */
        const colSpan = revCols.length + 1;
        const buildRow = (label, ftd, mtd) => {
            const ftT = revCols.reduce((a,k)=>a+(ftd[k]||0),0);
            const mtT = revCols.reduce((a,k)=>a+(mtd[k]||0),0);
            return `<tr>
                <td>${label}</td>
                ${revCols.map(k=>`<td class="${cfClass(lk(ftd[k]))}">${lk(ftd[k])}</td>`).join('')}
                <td class="total-col ftd-total">${lk(ftT)}</td>
                ${revCols.map(k=>`<td class="${cfClass(lk(mtd[k]))}">${lk(mtd[k])}</td>`).join('')}
                <td class="total-col mtd-total">${lk(mtT)}</td>
            </tr>`;
        };

        const revHtml = `
            <div class="section">
                <div class="section-head">
                    <div class="section-title"><span class="material-icons-round">table_chart</span>Revenue Breakdown <span class="sub">(₹ in Lakhs)</span></div>
                    <div class="section-actions">
                        <a class="btn-sm" href="/api/mis/${branch}/${date}/export" target="_blank"><span class="material-icons-round">download</span>Excel</a>
                        <a class="btn-sm pdf-btn" href="/api/mis/${branch}/${date}/export-pdf" target="_blank"><span class="material-icons-round">picture_as_pdf</span>PDF</a>
                        <a class="btn-sm csv-btn" href="/api/mis/${branch}/${date}/export-csv" target="_blank"><span class="material-icons-round">data_object</span>CSV</a>
                    </div>
                </div>
                <div class="table-wrap">
                    <div class="table-scroll">
                        <table class="tbl">
                            <thead>
                                <tr class="super-header">
                                    <th></th>
                                    <th colspan="${colSpan}" class="ftd-h">FTD — ${date}</th>
                                    <th colspan="${colSpan}" class="mtd-h">MTD (Month to Date)</th>
                                </tr>
                                <tr>
                                    <th>Category</th>
                                    ${revCols.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}
                                    <th>Total</th>
                                    ${revCols.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${buildRow('Sales',        s.ftd||{}, s.mtd||{})}
                                ${buildRow('Collection',   c.ftd||{}, c.mtd||{})}
                                ${buildRow('Discount 99%', dc.ftd?.partial||{}, dc.mtd?.partial||{})}
                                ${buildRow('Discount 100%',dc.ftd?.full||{},    dc.mtd?.full||{})}
                                ${buildRow('Refund',       r.ftd||{},           r.mtd||{})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

        document.getElementById('sec-revenue').innerHTML = revHtml;

        /* ── Volume section ── */
        const vols = [
            { label:'Occupancy',   ftd:v.ftd?.occupancy||0,                          mtd:v.mtd?.occupancy||0 },
            { label:'Occupancy %', ftd:(v.ftd?.occupancy_pct||0)+'%',                mtd:(v.mtd?.occupancy_pct||0)+'%' },
            { label:'Admission',   ftd:v.ftd?.admission||0,                          mtd:v.mtd?.admission||0 },
            { label:'Discharge',   ftd:v.ftd?.discharge||0,                          mtd:v.mtd?.discharge||0 },
            { label:'Total OP',    ftd:v.ftd?.total_op||0,                           mtd:v.mtd?.total_op||0 },
        ];
        if (isOragadam)  vols.push({ label:'Total ER', ftd:v.ftd?.er_count||0, mtd:v.mtd?.er_count||0 });
        if (isChromepet) vols.push(
            { label:'MRI OP (Count)', ftd:m.ftd?.op?.count||0,          mtd:m.mtd?.op?.count||0 },
            { label:'MRI IP (Count)', ftd:m.ftd?.ip?.count||0,          mtd:m.mtd?.ip?.count||0 },
            { label:'MRI OP Revenue', ftd:fmtRupee(m.ftd?.op?.revenue), mtd:fmtRupee(m.mtd?.op?.revenue), wide:true },
            { label:'MRI IP Revenue', ftd:fmtRupee(m.ftd?.ip?.revenue), mtd:fmtRupee(m.mtd?.ip?.revenue), wide:true },
        );

        document.getElementById('sec-volume').innerHTML = `
            <div class="section">
                <div class="section-head">
                    <div class="section-title"><span class="material-icons-round">trending_up</span>${isChromepet?'Volume Indicators & MRI':'Volume Indicators'}</div>
                </div>
                <div class="vol-grid">
                    ${vols.map(vi=>`
                        <div class="vol-card${vi.wide?' wide':''}">
                            <div class="vol-label">${vi.label}</div>
                            <div class="vol-values">
                                <div class="vol-item"><div class="vol-period">FTD</div><div class="vol-num ftd${vi.wide?' sm':''}">${vi.ftd}</div></div>
                                <div class="vol-item"><div class="vol-period">MTD</div><div class="vol-num mtd${vi.wide?' sm':''}">${vi.mtd}</div></div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       CHARTS (Overview tab — smaller)
    ═══════════════════════════════════════════════════════════════════════ */
    const CHART_COLORS = {
        blue:'#1d4ed8', green:'#059669', purple:'#7c3aed', amber:'#d97706',
        red:'#dc2626', teal:'#0d9488',
        blueA:'rgba(29,78,216,.08)', palette:['#1d4ed8','#059669','#7c3aed','#d97706','#dc2626','#0891b2','#0d9488','#db2777']
    };
    const CHART_OPTS = {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:9, font:{size:9}, padding:8 } } },
        animation:{ duration:500 }
    };

    function renderDailyTrendChart(rows) {
        destroyChart('dailyTrend');
        const el = document.getElementById('chartDailyTrend');
        if (!el || !rows.length) return;
        chartInstances['dailyTrend'] = new Chart(el, trendChartConfig(rows, 9));
    }

    function renderDailyTrendChart2(rows) {
        destroyChart('dailyTrend2');
        const el = document.getElementById('chartDailyTrend2');
        if (!el || !rows.length) return;
        chartInstances['dailyTrend2'] = new Chart(el, trendChartConfig(rows, 10));
    }

    function trendChartConfig(rows, fontSize) {
        return {
            type:'line',
            data:{
                labels: rows.map(r=>r.day.substring(5)),
                datasets:[
                    { label:'Total', data:rows.map(r=>+(r.revenue/100000).toFixed(2)),    borderColor:CHART_COLORS.blue,   backgroundColor:CHART_COLORS.blueA, fill:true, tension:.35, pointRadius:3, borderWidth:2 },
                    { label:'OP',    data:rows.map(r=>+(r.op_revenue/100000).toFixed(2)), borderColor:CHART_COLORS.green,  fill:false, tension:.35, pointRadius:2, borderWidth:1.5 },
                    { label:'IP',    data:rows.map(r=>+(r.ip_revenue/100000).toFixed(2)), borderColor:CHART_COLORS.purple, fill:false, tension:.35, pointRadius:2, borderWidth:1.5 },
                    { label:'PH',    data:rows.map(r=>+(r.ph_revenue/100000).toFixed(2)), borderColor:CHART_COLORS.amber,  fill:false, tension:.35, pointRadius:2, borderWidth:1.5, borderDash:[4,3] },
                ]
            },
            options:{ ...CHART_OPTS, scales:{ y:{ ticks:{font:{size:fontSize}}, title:{display:true,text:'₹ Lakhs',font:{size:9}}, grid:{color:'rgba(0,0,0,.04)'} }, x:{ticks:{font:{size:fontSize}}, grid:{display:false}} } }
        };
    }

    function renderPayerMixChart(rows) {
        destroyChart('payerMix');
        const el = document.getElementById('chartPayerMix');
        if (!el || !rows.length) return;
        chartInstances['payerMix'] = new Chart(el, payerChartConfig(rows));
    }
    function renderPayerMixChart2(rows) {
        destroyChart('payerMix2');
        const el = document.getElementById('chartPayerMix2');
        if (!el || !rows.length) return;
        chartInstances['payerMix2'] = new Chart(el, payerChartConfig(rows));
    }
    function payerChartConfig(rows) {
        return {
            type:'doughnut',
            data:{
                labels: rows.map(r=>(r.payer_type||'Unknown').toUpperCase()),
                datasets:[{ data:rows.map(r=>+(r.amount/100000).toFixed(2)), backgroundColor:CHART_COLORS.palette, borderWidth:2, borderColor:'#fff', hoverOffset:6 }]
            },
            options:{ ...CHART_OPTS, cutout:'65%', plugins:{ ...CHART_OPTS.plugins, tooltip:{ callbacks:{ label:ctx=>`₹${ctx.parsed.toFixed(2)}L` } } } }
        };
    }

    function renderPatientMixChart(rows) {
        destroyChart('patientMix');
        const el = document.getElementById('chartPatientMix');
        if (!el || !rows.length) return;
        chartInstances['patientMix'] = new Chart(el, patientMixConfig(rows));
    }
    function renderPatientMixChart2(rows) {
        destroyChart('patientMix2');
        const el = document.getElementById('chartPatientMix2');
        if (!el || !rows.length) return;
        chartInstances['patientMix2'] = new Chart(el, patientMixConfig(rows));
    }
    function patientMixConfig(rows) {
        return {
            type:'bar',
            data:{
                labels: rows.map(r=>r.day.substring(5)),
                datasets:[
                    { label:'OP', data:rows.map(r=>+(r.op/100000).toFixed(2)),       backgroundColor:'rgba(29,78,216,.75)', stack:'s' },
                    { label:'IP', data:rows.map(r=>+(r.ip/100000).toFixed(2)),       backgroundColor:'rgba(124,58,237,.75)',stack:'s' },
                    { label:'ER', data:rows.map(r=>+(r.er/100000).toFixed(2)),       backgroundColor:'rgba(220,38,38,.75)', stack:'s' },
                    { label:'PH', data:rows.map(r=>+(r.pharmacy/100000).toFixed(2)), backgroundColor:'rgba(217,119,6,.75)', stack:'s' },
                ]
            },
            options:{ ...CHART_OPTS, scales:{ x:{stacked:true,ticks:{font:{size:9}},grid:{display:false}}, y:{stacked:true,ticks:{font:{size:9}},title:{display:true,text:'₹ Lakhs',font:{size:9}},grid:{color:'rgba(0,0,0,.04)'}} } }
        };
    }

    /* ═══════════════════════════════════════════════════════════════════════
       INIT
    ═══════════════════════════════════════════════════════════════════════ */
    window.addEventListener('DOMContentLoaded', () => {
        // Guard: must be logged in
        if (!getToken()) { window.location.replace('/login'); return; }

        const stored = localStorage.getItem('mis_user');
        if (stored) try { updateUserUI(JSON.parse(stored)); } catch(_) {}

        // Pre-select branch/date passed from upload page
        const lastBranch = sessionStorage.getItem('mis_last_branch');
        const lastDate   = sessionStorage.getItem('mis_last_date');
        if (lastBranch) { sessionStorage.removeItem('mis_last_branch'); switchBranch(lastBranch); }
        if (lastDate && lastDate <= di.max) { sessionStorage.removeItem('mis_last_date'); di.value = lastDate; }

        loadReport();
    });
</script>
</body>
</html>
