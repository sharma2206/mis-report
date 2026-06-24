<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIS Dashboard - Hospital MIS</title>
    <meta name="description" content="Branch-wise MIS reporting dashboard with FTD and MTD analytics">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0
        }

        :root {
            --bg: #f0f4f8;
            --surface: #ffffff;
            --card: #ffffff;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --text: #1e293b;
            --text-secondary: #475569;
            --muted: #64748b;
            --primary: #2563eb;
            --primary-light: #dbeafe;
            --primary-soft: #eff6ff;
            --accent: #7c3aed;
            --accent-light: #ede9fe;
            --success: #059669;
            --success-light: #d1fae5;
            --error: #dc2626;
            --error-light: #fee2e2;
            --warning: #d97706;
            --warning-light: #fef3c7;
            --info: #0891b2;
            --info-light: #cffafe;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);
            --shadow: 0 1px 3px rgba(0, 0, 0, .08), 0 1px 2px rgba(0, 0, 0, .04);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, .07), 0 2px 4px -2px rgba(0, 0, 0, .05);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, .07), 0 4px 6px -4px rgba(0, 0, 0, .05);
            --radius: 12px;
            --radius-sm: 8px;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        /* ─── Navbar ─── */
        .nav {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            padding: 0 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 56px;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: .6rem
        }

        .nav-brand .logo {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 18px;
        }

        .nav-brand h1 {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text)
        }

        .nav-badge {
            font-size: .6rem;
            padding: .15rem .5rem;
            border-radius: 6px;
            background: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
        }

        .nav-links {
            display: flex;
            gap: .35rem
        }

        .nav-link {
            padding: .4rem .85rem;
            border-radius: var(--radius-sm);
            font-size: .8rem;
            font-weight: 500;
            color: var(--muted);
            text-decoration: none;
            transition: all .2s;
            border: 1px solid transparent;
            display: flex;
            align-items: center;
            gap: .35rem;
        }

        .nav-link .material-icons-round {
            font-size: 16px
        }

        .nav-link:hover {
            color: var(--primary);
            background: var(--primary-soft)
        }

        .nav-link.active {
            color: var(--primary);
            background: var(--primary-light);
            border-color: rgba(37, 99, 235, .15);
            font-weight: 600;
        }

        /* ─── Main ─── */
        .main { width: 100%; padding: 1.25rem 2rem }

        /* ─── Controls ─── */
        .controls {
            display: flex;
            align-items: center;
            gap: .75rem;
            margin-bottom: 1.25rem;
            flex-wrap: wrap;
        }

        .branch-pills {
            display: flex;
            gap: 4px;
            background: var(--bg);
            border-radius: 10px;
            padding: 3px;
            border: 1px solid var(--border);
        }

        .branch-pill {
            padding: .45rem 1.1rem;
            border-radius: var(--radius-sm);
            font-size: .78rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--muted);
            transition: all .2s;
            font-family: inherit;
        }

        .branch-pill.active {
            background: var(--primary);
            color: #fff;
            box-shadow: 0 2px 8px rgba(37, 99, 235, .3);
        }

        .branch-pill:hover:not(.active) {
            color: var(--text);
            background: var(--surface)
        }

        .date-control {
            display: flex;
            align-items: center;
            gap: .4rem;
            margin-left: auto
        }

        .date-nav {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: .85rem;
            transition: all .15s;
        }

        .date-nav:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: var(--primary-soft)
        }

        .date-input {
            padding: .4rem .7rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text);
            font-family: inherit;
            font-size: .8rem;
            font-weight: 500;
        }

        .date-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .1)
        }

        .btn-load {
            padding: .45rem 1.1rem;
            border-radius: var(--radius-sm);
            background: var(--primary);
            color: #fff;
            border: none;
            font-weight: 600;
            font-size: .8rem;
            cursor: pointer;
            font-family: inherit;
            transition: all .2s;
            display: flex;
            align-items: center;
            gap: .35rem;
        }

        .btn-load:hover {
            background: #1d4ed8;
            box-shadow: 0 4px 12px rgba(37, 99, 235, .25)
        }

        .btn-load:disabled {
            opacity: .5;
            cursor: not-allowed;
            box-shadow: none
        }

        /* ─── Summary Cards ─── */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: .75rem;
            margin-bottom: 1.25rem;
        }

        .summary-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.1rem 1.15rem;
            position: relative;
            overflow: hidden;
            transition: all .25s;
            box-shadow: var(--shadow-sm);
        }

        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
        }

        .summary-card.sales::before {
            background: linear-gradient(90deg, #2563eb, #0891b2)
        }

        .summary-card.collection::before {
            background: linear-gradient(90deg, #059669, #10b981)
        }

        .summary-card.discount::before {
            background: linear-gradient(90deg, #d97706, #f59e0b)
        }

        .summary-card.refund::before {
            background: linear-gradient(90deg, #7c3aed, #a78bfa)
        }

        .summary-card:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px)
        }

        .sc-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            margin-bottom: .7rem;
        }

        .summary-card.sales .sc-icon {
            background: var(--primary-light);
            color: var(--primary)
        }

        .summary-card.collection .sc-icon {
            background: var(--success-light);
            color: var(--success)
        }

        .summary-card.discount .sc-icon {
            background: var(--warning-light);
            color: var(--warning)
        }

        .summary-card.refund .sc-icon {
            background: var(--accent-light);
            color: var(--accent)
        }

        .sc-label {
            font-size: .68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--muted);
            margin-bottom: .6rem;
        }

        .sc-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end
        }

        .sc-block {
            text-align: left
        }

        .sc-block:last-child {
            text-align: right
        }

        .sc-period {
            font-size: .58rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .04em;
            margin-bottom: .1rem;
            font-weight: 600;
        }

        .sc-value {
            font-size: 1.25rem;
            font-weight: 800;
            line-height: 1.1
        }

        .sc-value.ftd {
            color: var(--primary)
        }

        .sc-value.mtd {
            color: var(--accent)
        }

        .sc-unit {
            font-size: .58rem;
            color: var(--muted);
            margin-top: .1rem
        }

        /* ─── Sections ─── */
        .section {
            margin-bottom: 1.25rem
        }

        .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: .6rem;
        }

        .section-title {
            font-size: .8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: .4rem;
        }

        .section-title .material-icons-round {
            font-size: 18px;
            color: var(--primary)
        }

        .section-title .sub {
            font-size: .65rem;
            color: var(--muted);
            font-weight: 500;
            text-transform: none;
            letter-spacing: 0
        }

        .export-btns {
            display: flex;
            gap: .35rem
        }

        .btn-export {
            padding: .3rem .7rem;
            border-radius: 6px;
            font-size: .68rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--muted);
            font-family: inherit;
            transition: all .15s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: .25rem;
        }

        .btn-export:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: var(--primary-soft)
        }

        .btn-export.pdf:hover {
            border-color: var(--error);
            color: var(--error);
            background: var(--error-light)
        }

        /* ─── Table ─── */
        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .tbl {
            width: 100%;
            border-collapse: collapse;
            font-size: .78rem
        }

        .tbl thead th {
            background: #f8fafc;
            padding: .55rem .65rem;
            font-weight: 600;
            font-size: .67rem;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--muted);
            text-align: center;
            border-bottom: 1px solid var(--border);
        }

        .tbl thead th:first-child {
            text-align: left
        }

        .tbl thead .super-header th {
            font-size: .7rem;
            color: var(--text-secondary);
            padding: .45rem .5rem;
        }

        .tbl thead .super-header .ftd-h {
            background: var(--primary-soft);
            color: var(--primary);
            font-weight: 700;
        }

        .tbl thead .super-header .mtd-h {
            background: var(--accent-light);
            color: var(--accent);
            font-weight: 700;
        }

        .tbl tbody td {
            padding: .5rem .65rem;
            text-align: right;
            border-bottom: 1px solid var(--border-light);
            transition: background .12s;
            color: var(--text-secondary);
        }

        .tbl tbody td:first-child {
            text-align: left;
            font-weight: 600;
            color: var(--text);
        }

        .tbl tbody tr:hover td {
            background: #f8fafc
        }

        .tbl .total-col {
            font-weight: 700;
            color: var(--text)
        }

        .tbl .ftd-total {
            background: rgba(37, 99, 235, .04)
        }

        .tbl .mtd-total {
            background: rgba(124, 58, 237, .04)
        }

        .tbl tbody tr:last-child td {
            border-bottom: none
        }

        /* ─── Volume Grid ─── */
        .vol-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: .65rem
        }

        .vol-card.wide {
            grid-column: span 2;
            min-width: 0
        }

        .vol-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: .9rem;
            text-align: center;
            transition: all .2s;
            box-shadow: var(--shadow-sm);
        }

        .vol-card:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px)
        }

        .vol-label {
            font-size: .62rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--muted);
            margin-bottom: .5rem;
        }

        .vol-values {
            display: flex;
            justify-content: center;
            gap: 1.5rem
        }

        .vol-item {
            min-width: 0
        }

        .vol-item .vol-period {
            font-size: .52rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .04em;
            font-weight: 600;
        }

        .vol-item .vol-num {
            font-size: 1.2rem;
            font-weight: 800;
            margin-top: .08rem;
            white-space: nowrap
        }

        .vol-item .vol-num.sm {
            font-size: .95rem
        }

        .vol-item .vol-num.ftd {
            color: var(--primary)
        }

        .vol-item .vol-num.mtd {
            color: var(--accent)
        }

        /* ─── Package Alert ─── */
        .pkg-alert {
            background: var(--warning-light);
            border: 1px solid rgba(217, 119, 6, .2);
            border-radius: var(--radius);
            padding: .65rem 1rem;
            display: flex;
            align-items: center;
            gap: .65rem;
            font-size: .78rem;
            color: var(--warning);
            margin-bottom: 1rem;
        }

        .pkg-alert .material-icons-round {
            font-size: 20px
        }

        .pkg-alert .pkg-vals {
            display: flex;
            gap: 1.25rem;
            margin-left: auto;
            font-weight: 700;
            font-size: .8rem;
        }

        /* ─── Loading ─── */
        .loading-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(255, 255, 255, .7);
            backdrop-filter: blur(4px);
            z-index: 200;
            align-items: center;
            justify-content: center;
        }

        .loading-overlay.show {
            display: flex
        }

        .loader {
            width: 38px;
            height: 38px;
            border: 3px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin .65s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg)
            }
        }

        /* ─── No Data ─── */
        .no-data {
            text-align: center;
            padding: 3.5rem 1.5rem;
            color: var(--muted)
        }

        .no-data .nd-icon {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: var(--primary-light);
            color: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto .9rem;
            font-size: 28px;
        }

        .no-data p {
            font-size: .88rem;
            color: var(--text-secondary)
        }

        .no-data .sub {
            font-size: .75rem;
            margin-top: .3rem;
            color: var(--muted)
        }

        /* ─── Alert ─── */
        .alert {
            padding: .65rem .9rem;
            border-radius: var(--radius-sm);
            margin-bottom: .75rem;
            font-size: .78rem;
            display: none;
            align-items: center;
            gap: .5rem;
        }

        .alert.show {
            display: flex
        }

        .alert-error {
            background: var(--error-light);
            border: 1px solid rgba(220, 38, 38, .2);
            color: var(--error)
        }

        .alert .close-a {
            cursor: pointer;
            margin-left: auto;
            opacity: .7;
            font-size: 1rem
        }

        /* ─── Responsive ─── */
        @media(max-width:1024px) {
            .summary-grid {
                grid-template-columns: repeat(2, 1fr)
            }
        }

        @media(max-width:768px) {
            .controls {
                flex-direction: column;
                align-items: stretch
            }

            .date-control {
                margin-left: 0;
                flex-wrap: wrap
            }

            .summary-grid {
                grid-template-columns: repeat(2, 1fr)
            }

            .vol-grid {
                grid-template-columns: repeat(2, 1fr)
            }

            .main {
                padding: 1rem
            }

            .nav {
                padding: 0 1rem
            }

            .tbl {
                font-size: .72rem
            }
        }

        @media(max-width:480px) {
            .summary-grid {
                grid-template-columns: 1fr
            }

            .vol-grid {
                grid-template-columns: 1fr 1fr
            }

            .branch-pills {
                width: 100%
            }

            .branch-pill {
                flex: 1;
                text-align: center
            }
        }

        /* ─── KPI Cards ─── */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: .65rem;
            margin-bottom: 1.25rem;
        }

        .kpi-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: .9rem 1rem;
            box-shadow: var(--shadow-sm);
            transition: all .2s;
            position: relative;
            overflow: hidden;
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
        }

        .kpi-card.c1::before { background: #2563eb }
        .kpi-card.c2::before { background: #059669 }
        .kpi-card.c3::before { background: #7c3aed }
        .kpi-card.c4::before { background: #0891b2 }
        .kpi-card.c5::before { background: #d97706 }
        .kpi-card.c6::before { background: #dc2626 }
        .kpi-card.c7::before { background: #0f766e }
        .kpi-card.c8::before { background: #9333ea }
        .kpi-card.c9::before { background: #ea580c }
        .kpi-card.c10::before { background: #0284c7 }

        .kpi-card:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
        }

        .kpi-label {
            font-size: .62rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--muted);
            margin-bottom: .35rem;
        }

        .kpi-value {
            font-size: 1.35rem;
            font-weight: 800;
            color: var(--text);
            line-height: 1.1;
        }

        .kpi-unit {
            font-size: .6rem;
            color: var(--muted);
            font-weight: 500;
            margin-top: .15rem;
        }

        /* ─── Charts Grid ─── */
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.25rem;
        }

        .chart-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1rem;
            box-shadow: var(--shadow-sm);
        }

        .chart-title {
            font-size: .72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--text-secondary);
            margin-bottom: .85rem;
            display: flex;
            align-items: center;
            gap: .35rem;
        }

        .chart-title .material-icons-round {
            font-size: 16px;
            color: var(--primary);
        }

        .chart-wrap {
            position: relative;
            height: 200px;
        }

        .chart-wrap.tall {
            height: 260px;
        }

        .chart-wrap canvas {
            width: 100% !important;
        }

        .charts-grid .wide {
            grid-column: span 2;
        }

        @media(max-width:900px) {
            .kpi-grid { grid-template-columns: repeat(3, 1fr) }
            .charts-grid { grid-template-columns: 1fr }
            .charts-grid .wide { grid-column: span 1 }
        }

        @media(max-width:600px) {
            .kpi-grid { grid-template-columns: repeat(2, 1fr) }
        }

        /* Date presets */
        .date-presets { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:6px; }
        .preset-btn {
            padding: 4px 10px; font-size: 11px; border: 1px solid #cbd5e1;
            border-radius: 20px; background: #fff; color: #475569; cursor: pointer;
            transition: all .15s;
        }
        .preset-btn:hover  { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
        .preset-btn.active { background: #2563eb; border-color: #2563eb; color: #fff; }

        /* Print button */
        .btn-print {
            display:flex; align-items:center; padding:6px 10px;
            background:#f0f4fa; border:1px solid #cbd5e1; border-radius:6px;
            cursor:pointer; color:#475569; transition:.15s;
        }
        .btn-print:hover { background:#e2e8f0; color:#1e3a5f; }
    </style>
</head>

<body>
    <div class="nav">
        <div class="nav-brand">
            <div class="logo"><span class="material-icons-round">local_hospital</span></div>
            <h1>Hospital MIS</h1>
            <span class="nav-badge">Dashboard</span>
        </div>
        <div class="nav-links">
            <a href="/dashboard" class="nav-link active">
                <span class="material-icons-round">bar_chart</span> Dashboard
            </a>
            <a href="/" class="nav-link">
                <span class="material-icons-round">upload_file</span> Upload
            </a>
            <span id="userBadge" style="padding:.4rem .8rem;font-size:.78rem;font-weight:600;color:var(--text-secondary);background:var(--border-light);border-radius:6px;border:1px solid var(--border);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
            <button onclick="doLogout()" style="padding:.4rem .75rem;font-size:.78rem;font-weight:600;background:#fff;border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--error);display:flex;align-items:center;gap:.3rem;font-family:inherit;transition:background .15s" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fff'">
                <span class="material-icons-round" style="font-size:16px">logout</span> Sign out
            </button>
        </div>
    </div>

    <div class="main">
        <div id="alertBox" class="alert alert-error">
            <span class="material-icons-round" style="font-size:18px">error_outline</span>
            <span id="alertMsg"></span>
            <span class="close-a" onclick="this.parentElement.classList.remove('show')">&times;</span>
        </div>

        <div class="controls">
            <div class="branch-pills">
                <button class="branch-pill active" data-branch="chromepet"
                    onclick="switchBranch('chromepet')">Chromepet</button>
                <button class="branch-pill" data-branch="oragadam" onclick="switchBranch('oragadam')">Oragadam</button>
            </div>
            <div class="date-control">
                <div class="date-presets">
                    <button class="preset-btn" onclick="setPreset('today')">Today</button>
                    <button class="preset-btn" onclick="setPreset('yesterday')">Yesterday</button>
                    <button class="preset-btn" onclick="setPreset('week')">This Week</button>
                    <button class="preset-btn" onclick="setPreset('mtd')">MTD</button>
                    <button class="preset-btn" onclick="setPreset('last_month')">Last Month</button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <button class="date-nav" onclick="shiftDate(-1)" title="Previous day">
                        <span class="material-icons-round" style="font-size:16px">chevron_left</span>
                    </button>
                    <input type="date" class="date-input" id="reportDate">
                    <button class="date-nav" onclick="shiftDate(1)" title="Next day">
                        <span class="material-icons-round" style="font-size:16px">chevron_right</span>
                    </button>
                    <button class="btn-load" id="loadBtn" onclick="loadReport()">
                        <span class="material-icons-round" style="font-size:16px">refresh</span>
                        <span id="loadText">Load Report</span>
                    </button>
                    <button class="btn-print" onclick="openPrint()" title="Print preview">
                        <span class="material-icons-round" style="font-size:16px">print</span>
                    </button>
                </div>
            </div>
        </div>

        <div id="content">
            <div class="no-data" id="noData">
                <div class="nd-icon"><span class="material-icons-round">analytics</span></div>
                <p>Select a branch and date to view MIS report</p>
                <p class="sub">Upload CSV files first if no data exists for the selected date</p>
            </div>
        </div>
    </div>

    <div class="loading-overlay" id="loadingOverlay">
        <div class="loader"></div>
    </div>

    <!-- Login Modal -->
    <div id="loginOverlay" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;width:100%;max-width:380px;box-shadow:0 25px 50px rgba(0,0,0,.18);position:relative;">
            <div style="text-align:center;margin-bottom:1.75rem;">
                <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;margin:0 auto .9rem;box-shadow:0 8px 20px rgba(37,99,235,.25)">
                    <span class="material-icons-round" style="color:#fff;font-size:26px">local_hospital</span>
                </div>
                <h2 style="font-size:1.3rem;font-weight:800;color:#0f172a;margin-bottom:.3rem">Hospital MIS</h2>
                <p style="font-size:.82rem;color:#64748b">Sign in to access reports</p>
            </div>
            <div id="loginError" style="display:none;background:#fee2e2;border:1px solid rgba(220,38,38,.2);color:#dc2626;border-radius:8px;padding:.65rem .9rem;font-size:.83rem;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem">
                <span class="material-icons-round" style="font-size:17px">error</span>
                <span id="loginErrorMsg">Invalid credentials</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:.9rem">
                <div>
                    <label style="font-size:.78rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem">Email</label>
                    <input id="loginEmail" type="email" placeholder="admin@mis.local" autocomplete="username"
                        style="width:100%;padding:.7rem .9rem;border:1px solid #e2e8f0;border-radius:9px;font-size:.88rem;font-family:inherit;outline:none;transition:border .2s"
                        onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 3px rgba(37,99,235,.12)'"
                        onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'">
                </div>
                <div>
                    <label style="font-size:.78rem;font-weight:600;color:#475569;display:block;margin-bottom:.35rem">Password</label>
                    <input id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password"
                        style="width:100%;padding:.7rem .9rem;border:1px solid #e2e8f0;border-radius:9px;font-size:.88rem;font-family:inherit;outline:none;transition:border .2s"
                        onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 3px rgba(37,99,235,.12)'"
                        onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'"
                        onkeydown="if(event.key==='Enter')doLogin()">
                </div>
                <button onclick="doLogin()" id="loginBtn"
                    style="width:100%;padding:.8rem;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:9px;font-size:.9rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:opacity .2s">
                    <span id="loginBtnText">Sign In</span>
                    <div id="loginSpinner" style="display:none;width:16px;height:16px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite"></div>
                </button>
            </div>
        </div>
    </div>

    <script>
        const BED = { chromepet: 74, oragadam: 14 };
        let branch = 'chromepet', reportData = null;
        let chartInstances = {};

        // ── Auth ─────────────────────────────────────────────────────────────────
        function getToken()    { return localStorage.getItem('mis_token') || ''; }
        function setToken(t)   { localStorage.setItem('mis_token', t); }
        function clearToken()  { localStorage.removeItem('mis_token'); localStorage.removeItem('mis_user'); }
        function authHeaders() { const t = getToken(); return t ? { 'Authorization': 'Bearer ' + t, 'Accept': 'application/json' } : { 'Accept': 'application/json' }; }

        async function apiFetch(url) {
            const r = await fetch(url, { headers: authHeaders() });
            if (r.status === 401) { showLoginModal(); throw new Error('Unauthenticated'); }
            return r;
        }

        function showLoginModal() {
            document.getElementById('loginOverlay').style.display = 'flex';
            setTimeout(() => document.getElementById('loginEmail').focus(), 100);
        }

        function hideLoginModal() {
            document.getElementById('loginOverlay').style.display = 'none';
        }

        async function doLogin() {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errEl = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');
            const spinner = document.getElementById('loginSpinner');
            const btnText = document.getElementById('loginBtnText');

            if (!email || !password) {
                errEl.style.display = 'flex';
                document.getElementById('loginErrorMsg').textContent = 'Please enter email and password.';
                return;
            }
            errEl.style.display = 'none';
            btn.disabled = true; spinner.style.display = 'block'; btnText.textContent = 'Signing in…';

            try {
                const r = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const j = await r.json();
                if (j.success && j.token) {
                    setToken(j.token);
                    localStorage.setItem('mis_user', JSON.stringify(j.user));
                    updateUserBadge(j.user);
                    hideLoginModal();
                    loadReport();
                } else {
                    errEl.style.display = 'flex';
                    const msg = j.errors?.email?.[0] || j.message || 'Login failed.';
                    document.getElementById('loginErrorMsg').textContent = msg;
                }
            } catch (e) {
                errEl.style.display = 'flex';
                document.getElementById('loginErrorMsg').textContent = 'Network error. Please try again.';
            } finally {
                btn.disabled = false; spinner.style.display = 'none'; btnText.textContent = 'Sign In';
            }
        }

        function doLogout() {
            fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).finally(() => {
                clearToken();
                showLoginModal();
                document.getElementById('content').innerHTML = '';
            });
        }

        function updateUserBadge(user) {
            const el = document.getElementById('userBadge');
            if (el && user) el.textContent = user.name || user.email;
        }

        // On page load: check token
        window.addEventListener('DOMContentLoaded', () => {
            const user = localStorage.getItem('mis_user');
            if (getToken()) {
                hideLoginModal();
                if (user) try { updateUserBadge(JSON.parse(user)); } catch(_) {}
                loadReport();
            } else {
                showLoginModal();
            }
        });

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

        function setPreset(p) {
            const today = new Date();
            const fmt   = d => d.toISOString().split('T')[0];
            let target;
            if (p === 'today')      { target = fmt(today); }
            else if (p === 'yesterday') { const d = new Date(today); d.setDate(d.getDate()-1); target = fmt(d); }
            else if (p === 'week')  { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); target = fmt(d); }
            else if (p === 'mtd')   { target = fmt(today); }   // uses MTD from today's date
            else if (p === 'last_month') {
                const d = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); // last day of prev month
                target = fmt(d);
            }
            if (target && target <= di.max) {
                di.value = target;
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                event.currentTarget.classList.add('active');
                loadReport();
            }
        }

        function openPrint() {
            if (!di.value) return;
            window.open(`/print/${branch}/${di.value}`, '_blank');
        }

        async function loadReport() {
            const date = di.value;
            if (!date) return;
            const btn = document.getElementById('loadBtn'), lt = document.getElementById('loadText'), lo = document.getElementById('loadingOverlay');
            btn.disabled = true; lt.textContent = 'Loading...'; lo.classList.add('show');
            document.getElementById('alertBox').classList.remove('show');
            try {
                const [misResp, kpiResp, trendResp, payerResp, mixResp] = await Promise.all([
                    apiFetch(`/api/mis/${branch}/${date}`),
                    apiFetch(`/api/analytics/kpi/${branch}/${date}`),
                    apiFetch(`/api/analytics/charts/daily-trend?branch=${branch}&from=${monthStart(date)}&to=${date}`),
                    apiFetch(`/api/analytics/charts/payer-mix?branch=${branch}&date=${date}`),
                    apiFetch(`/api/analytics/charts/patient-mix?branch=${branch}&from=${monthStart(date)}&to=${date}`),
                ]);
                const [mis, kpi, trend, payer, mix] = await Promise.all([misResp.json(), kpiResp.json(), trendResp.json(), payerResp.json(), mixResp.json()]);

                if (mis.success) {
                    reportData = mis.data;
                    renderReport(mis.data, date);
                    if (kpi.success) renderKPI(kpi.data, date);
                    if (trend.success) renderDailyTrendChart(trend.data);
                    if (payer.success) renderPayerMixChart(payer.data);
                    if (mix.success) renderPatientMixChart(mix.data);
                } else {
                    showError(mis.message || 'No data found');
                    document.getElementById('content').innerHTML = `<div class="no-data"><div class="nd-icon"><span class="material-icons-round">warning</span></div><p>${mis.message || 'No data for this date'}</p><p class="sub">Try uploading CSV files for this date first</p></div>`;
                }
            } catch (e) {
                if (e.message !== 'Unauthenticated') showError('Network error: ' + e.message);
            } finally {
                btn.disabled = false; lt.textContent = 'Load Report'; lo.classList.remove('show');
            }
        }

        function monthStart(date) {
            return date.substring(0, 8) + '01';
        }

        function showError(m) {
            document.getElementById('alertMsg').textContent = m;
            document.getElementById('alertBox').classList.add('show');
        }

        function lk(v) { return ((v || 0) / 100000).toFixed(2); }
        function fmtRupee(v) { return '₹' + Math.round(Number(v || 0)).toLocaleString(); }
        function fmtL(v) { return '₹' + ((v || 0) / 100000).toFixed(2) + 'L'; }

        function destroyChart(id) {
            if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
        }

        function renderKPI(kpi, date) {
            const cards = [
                { cls:'c1', label:'Total Revenue',           val: fmtL(kpi.total_revenue),           unit:'FTD net sales' },
                { cls:'c2', label:'Net Collection',          val: fmtL(kpi.net_collection),          unit:'Cash collected' },
                { cls:'c3', label:'Total Patients',          val: (kpi.total_patients||0).toLocaleString(), unit:'Unique patients' },
                { cls:'c4', label:'OP Patients',             val: (kpi.op_count||0).toLocaleString(),       unit:'Outpatient' },
                { cls:'c5', label:'IP Admissions',           val: (kpi.ip_count||0).toLocaleString(),       unit:'Inpatient' },
                { cls:'c6', label:'ER Visits',               val: (kpi.er_count||0).toLocaleString(),       unit:'Emergency' },
                { cls:'c7', label:'Discount Given',          val: fmtL(kpi.discount_amount),         unit:'Total discount' },
                { cls:'c8', label:'Pharmacy Sales',          val: fmtL(kpi.pharmacy_sales),          unit:'Pharmacy revenue' },
                { cls:'c9', label:'Bed Occupancy',           val: (kpi.bed_occupancy_pct||0).toFixed(1)+'%', unit:`${kpi.bed_occupancy||0} / ${kpi.bed_count||0} beds` },
                { cls:'c10',label:'Avg Revenue/Patient',     val: fmtRupee(kpi.avg_revenue_per_patient), unit:'Per patient' },
            ];

            // Surgery card (only if data exists)
            if (kpi.surgery_count > 0) {
                cards.splice(5, 0, { cls:'c3', label:'Surgeries', val: kpi.surgery_count, unit:`${kpi.major_surgeries||0} Major` });
                cards.pop();
            }

            const el = document.getElementById('kpiGrid');
            if (el) el.innerHTML = cards.map(c =>
                `<div class="kpi-card ${c.cls}"><div class="kpi-label">${c.label}</div><div class="kpi-value">${c.val}</div><div class="kpi-unit">${c.unit}</div></div>`
            ).join('');
        }

        function renderDailyTrendChart(rows) {
            destroyChart('dailyTrend');
            const el = document.getElementById('chartDailyTrend');
            if (!el || !rows.length) return;
            const labels = rows.map(r => r.day.substring(5));
            chartInstances['dailyTrend'] = new Chart(el, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Total', data: rows.map(r => +(r.revenue/100000).toFixed(2)), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.08)', fill:true, tension:.3, pointRadius:3 },
                        { label: 'OP',    data: rows.map(r => +(r.op_revenue/100000).toFixed(2)), borderColor:'#059669', fill:false, tension:.3, pointRadius:2 },
                        { label: 'IP',    data: rows.map(r => +(r.ip_revenue/100000).toFixed(2)), borderColor:'#7c3aed', fill:false, tension:.3, pointRadius:2 },
                        { label: 'PH',    data: rows.map(r => +(r.ph_revenue/100000).toFixed(2)), borderColor:'#d97706', fill:false, tension:.3, pointRadius:2 },
                    ]
                },
                options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{ size:10 } } } }, scales:{ y:{ ticks:{ font:{size:9} }, title:{ display:true, text:'₹ Lakhs', font:{size:9} } }, x:{ ticks:{ font:{size:9} } } } }
            });
        }

        function renderPayerMixChart(rows) {
            destroyChart('payerMix');
            const el = document.getElementById('chartPayerMix');
            if (!el || !rows.length) return;
            const colors = ['#2563eb','#059669','#7c3aed','#d97706','#dc2626','#0891b2'];
            chartInstances['payerMix'] = new Chart(el, {
                type: 'doughnut',
                data: {
                    labels: rows.map(r => (r.payer_type || 'Unknown').toUpperCase()),
                    datasets: [{ data: rows.map(r => +(r.amount/100000).toFixed(2)), backgroundColor: colors, borderWidth:2 }]
                },
                options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } }, tooltip:{ callbacks:{ label: ctx => `₹${ctx.parsed.toFixed(2)}L` } } } }
            });
        }

        function renderPatientMixChart(rows) {
            destroyChart('patientMix');
            const el = document.getElementById('chartPatientMix');
            if (!el || !rows.length) return;
            chartInstances['patientMix'] = new Chart(el, {
                type: 'bar',
                data: {
                    labels: rows.map(r => r.day.substring(5)),
                    datasets: [
                        { label:'OP', data: rows.map(r => +(r.op/100000).toFixed(2)), backgroundColor:'rgba(37,99,235,.7)', stack:'s' },
                        { label:'IP', data: rows.map(r => +(r.ip/100000).toFixed(2)), backgroundColor:'rgba(124,58,237,.7)', stack:'s' },
                        { label:'ER', data: rows.map(r => +(r.er/100000).toFixed(2)), backgroundColor:'rgba(220,38,38,.7)', stack:'s' },
                        { label:'PH', data: rows.map(r => +(r.pharmacy/100000).toFixed(2)), backgroundColor:'rgba(217,119,6,.7)', stack:'s' },
                    ]
                },
                options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } } }, scales:{ x:{ stacked:true, ticks:{font:{size:9}} }, y:{ stacked:true, ticks:{font:{size:9}}, title:{ display:true, text:'₹ Lakhs', font:{size:9} } } } }
            });
        }

        function renderReport(d, date) {
            const s = d.sales || {}, c = d.collection || {}, dc = d.discount || {}, r = d.refund || {},
                  v = d.volume || {}, m = d.mri || {}, t = d.totals || {},
                  pkg = d.pkg_adjustment || { ftd:0, mtd:0 };
            date = date || d.date || di.value;

            let html = `
    <div id="kpiGrid" class="kpi-grid">
        <div class="kpi-card c1"><div class="kpi-label">Total Revenue</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c2"><div class="kpi-label">Net Collection</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c3"><div class="kpi-label">Total Patients</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c4"><div class="kpi-label">OP Patients</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c5"><div class="kpi-label">Bed Occupancy</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c6"><div class="kpi-label">Discount Given</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c7"><div class="kpi-label">Pharmacy Sales</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c8"><div class="kpi-label">IP Admissions</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c9"><div class="kpi-label">ER Visits</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
        <div class="kpi-card c10"><div class="kpi-label">Avg Rev/Patient</div><div class="kpi-value">—</div><div class="kpi-unit">Loading...</div></div>
    </div>`;

            // Summary cards (existing)
            html += `
    <div class="summary-grid">
        <div class="summary-card sales">
            <div class="sc-icon"><span class="material-icons-round">payments</span></div>
            <div class="sc-label">Total Sales</div>
            <div class="sc-row">
                <div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">₹${lk(t.sales_ftd)}</div><div class="sc-unit">Lakhs</div></div>
                <div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">₹${lk(t.sales_mtd)}</div><div class="sc-unit">Lakhs</div></div>
            </div>
        </div>
        <div class="summary-card collection">
            <div class="sc-icon"><span class="material-icons-round">account_balance</span></div>
            <div class="sc-label">Collection</div>
            <div class="sc-row">
                <div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">₹${lk(t.collection_ftd)}</div><div class="sc-unit">Lakhs</div></div>
                <div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">₹${lk(t.collection_mtd)}</div><div class="sc-unit">Lakhs</div></div>
            </div>
        </div>
        <div class="summary-card discount">
            <div class="sc-icon"><span class="material-icons-round">hotel</span></div>
            <div class="sc-label">Occupancy</div>
            <div class="sc-row">
                <div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">${v.ftd?.occupancy||0}</div><div class="sc-unit">of ${BED[branch]} beds</div></div>
                <div class="sc-block"><div class="sc-period">FTD %</div><div class="sc-value mtd">${Number(v.ftd?.occupancy_pct||0).toFixed(1)}%</div><div class="sc-unit">Occupancy</div></div>
            </div>
        </div>
        <div class="summary-card refund">
            <div class="sc-icon"><span class="material-icons-round">person_add</span></div>
            <div class="sc-label">Admissions</div>
            <div class="sc-row">
                <div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">${v.ftd?.admission||0}</div><div class="sc-unit">Admitted</div></div>
                <div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">${v.mtd?.admission||0}</div><div class="sc-unit">Total</div></div>
            </div>
        </div>
    </div>`;

            if ((pkg.ftd||0)>0||(pkg.mtd||0)>0) {
                html += `<div class="pkg-alert"><span class="material-icons-round">inventory_2</span><span>Package Adjustment (Chromepet): Added to Pharmacy, subtracted from IP</span><div class="pkg-vals"><span>FTD: ₹${lk(pkg.ftd)} L</span><span>MTD: ₹${lk(pkg.mtd)} L</span></div></div>`;
            }

            // Charts row
            html += `
    <div class="charts-grid">
        <div class="chart-card wide">
            <div class="chart-title"><span class="material-icons-round">show_chart</span> Daily Revenue Trend (MTD — ₹ Lakhs)</div>
            <div class="chart-wrap tall"><canvas id="chartDailyTrend"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-title"><span class="material-icons-round">donut_large</span> Payer Mix (Collection)</div>
            <div class="chart-wrap"><canvas id="chartPayerMix"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-title"><span class="material-icons-round">stacked_bar_chart</span> Patient Mix by Type (MTD)</div>
            <div class="chart-wrap"><canvas id="chartPatientMix"></canvas></div>
        </div>
    </div>`;

            // Revenue table (existing — untouched)
            const isChromepet = branch === 'chromepet';
            const isOragadam  = branch === 'oragadam';
            const revCols = ['op', 'ip', 'er', 'ph'];
            const colSpan = revCols.length + 1;

            html += `<div class="section"><div class="section-head"><div class="section-title"><span class="material-icons-round">table_chart</span> Revenue Breakdown <span class="sub">(₹ in Lakhs)</span></div><div class="export-btns"><a class="btn-export" href="/api/mis/${branch}/${date}/export" target="_blank"><span class="material-icons-round" style="font-size:14px">download</span> Excel</a><a class="btn-export pdf" href="/api/mis/${branch}/${date}/export-pdf" target="_blank"><span class="material-icons-round" style="font-size:14px">picture_as_pdf</span> PDF</a></div></div>`;
            html += `<div class="card"><table class="tbl"><thead><tr class="super-header"><th></th><th colspan="${colSpan}" class="ftd-h">FTD (${date})</th><th colspan="${colSpan}" class="mtd-h">MTD</th></tr><tr><th>Category</th>`;
            revCols.forEach(k => html += `<th>${k.toUpperCase()}</th>`);
            html += `<th>Total</th>`;
            revCols.forEach(k => html += `<th>${k.toUpperCase()}</th>`);
            html += `<th>Total</th></tr></thead><tbody>`;

            [{label:'Sales',d:s,k:revCols},{label:'Collection',d:c,k:revCols}].forEach(rw => {
                const ft = rw.d.ftd||{}, mt = rw.d.mtd||{};
                const ftT = rw.k.reduce((a,k)=>a+(ft[k]||0),0);
                const mtT = rw.k.reduce((a,k)=>a+(mt[k]||0),0);
                html += `<tr><td>${rw.label}</td>`;
                rw.k.forEach(k => html += `<td>${lk(ft[k])}</td>`);
                html += `<td class="total-col ftd-total">${lk(ftT)}</td>`;
                rw.k.forEach(k => html += `<td>${lk(mt[k])}</td>`);
                html += `<td class="total-col mtd-total">${lk(mtT)}</td></tr>`;
            });

            const dp=dc.ftd?.partial||{},dpm=dc.mtd?.partial||{};
            html += `<tr><td>Discount 99%</td>`;
            revCols.forEach(k=>html+=`<td>${lk(dp[k])}</td>`);
            html += `<td class="total-col ftd-total">${lk(revCols.reduce((a,k)=>a+(dp[k]||0),0))}</td>`;
            revCols.forEach(k=>html+=`<td>${lk(dpm[k])}</td>`);
            html += `<td class="total-col mtd-total">${lk(revCols.reduce((a,k)=>a+(dpm[k]||0),0))}</td></tr>`;

            const df=dc.ftd?.full||{},dfm=dc.mtd?.full||{};
            html += `<tr><td>Discount 100%</td>`;
            revCols.forEach(k=>html+=`<td>${lk(df[k])}</td>`);
            html += `<td class="total-col ftd-total">${lk(revCols.reduce((a,k)=>a+(df[k]||0),0))}</td>`;
            revCols.forEach(k=>html+=`<td>${lk(dfm[k])}</td>`);
            html += `<td class="total-col mtd-total">${lk(revCols.reduce((a,k)=>a+(dfm[k]||0),0))}</td></tr>`;

            const rf=r.ftd||{},rm=r.mtd||{};
            html += `<tr><td>Refund</td>`;
            revCols.forEach(k=>html+=`<td>${lk(rf[k])}</td>`);
            html += `<td class="total-col ftd-total">${lk(revCols.reduce((a,k)=>a+(rf[k]||0),0))}</td>`;
            revCols.forEach(k=>html+=`<td>${lk(rm[k])}</td>`);
            html += `<td class="total-col mtd-total">${lk(revCols.reduce((a,k)=>a+(rm[k]||0),0))}</td></tr>`;

            html += `</tbody></table></div></div>`;

            // Volume section (existing — untouched)
            html += `<div class="section"><div class="section-head"><div class="section-title"><span class="material-icons-round">trending_up</span> ${isChromepet?'Volume Indicators & MRI':'Volume Indicators'}</div></div><div class="vol-grid">`;

            const vols = [
                {label:'Occupancy',    ftd:v.ftd?.occupancy||0, mtd:v.mtd?.occupancy||0},
                {label:'Occupancy %',  ftd:(v.ftd?.occupancy_pct||0)+'%', mtd:(v.mtd?.occupancy_pct||0)+'%'},
                {label:'Admission',    ftd:v.ftd?.admission||0, mtd:v.mtd?.admission||0},
                {label:'Discharge',    ftd:v.ftd?.discharge||0, mtd:v.mtd?.discharge||0},
                {label:'Total OP',     ftd:v.ftd?.total_op||0,  mtd:v.mtd?.total_op||0},
            ];
            if (isOragadam) vols.push({label:'Total ER', ftd:v.ftd?.er_count||0, mtd:v.mtd?.er_count||0});
            if (isChromepet) vols.push(
                {label:'MRI OP (Count)', ftd:m.ftd?.op?.count||0, mtd:m.mtd?.op?.count||0},
                {label:'MRI IP (Count)', ftd:m.ftd?.ip?.count||0, mtd:m.mtd?.ip?.count||0},
                {label:'MRI OP Revenue', ftd:fmtRupee(m.ftd?.op?.revenue), mtd:fmtRupee(m.mtd?.op?.revenue), wide:true},
                {label:'MRI IP Revenue', ftd:fmtRupee(m.ftd?.ip?.revenue), mtd:fmtRupee(m.mtd?.ip?.revenue), wide:true},
            );
            vols.forEach(vi => {
                html += `<div class="vol-card${vi.wide?' wide':''}"><div class="vol-label">${vi.label}</div><div class="vol-values"><div class="vol-item"><div class="vol-period">FTD</div><div class="vol-num ftd${vi.wide?' sm':''}">${vi.ftd}</div></div><div class="vol-item"><div class="vol-period">MTD</div><div class="vol-num mtd${vi.wide?' sm':''}">${vi.mtd}</div></div></div></div>`;
            });
            html += `</div></div>`;

            document.getElementById('content').innerHTML = html;
        }
    </script>
</body>

</html>
