<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIS Dashboard - Hospital MIS</title>
    <meta name="description" content="Branch-wise MIS reporting dashboard with FTD and MTD analytics">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">
    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0
        }

        :root {
            --bg: #0a0e1a;
            --surface: rgba(30, 41, 59, .65);
            --card: rgba(30, 41, 59, .55);
            --border: rgba(51, 65, 85, .5);
            --text: #f1f5f9;
            --muted: #94a3b8;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --accent: #8b5cf6;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #06b6d4;
            --gradient: linear-gradient(135deg, #3b82f6, #8b5cf6);
            --glass: rgba(255, 255, 255, .03);
            --glow: 0 0 40px rgba(59, 130, 246, .08);
            --radius: 14px;
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden
        }

        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at 20% 0%, rgba(59, 130, 246, .08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, .06) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0
        }

        /* Nav */
        .nav {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(10, 14, 26, .85);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 60px
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: .75rem
        }

        .nav-brand h1 {
            font-size: 1.15rem;
            font-weight: 700;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent
        }

        .nav-badge {
            font-size: .65rem;
            padding: .15rem .5rem;
            border-radius: 9999px;
            background: rgba(59, 130, 246, .12);
            color: var(--primary);
            border: 1px solid rgba(59, 130, 246, .25)
        }

        .nav-links {
            display: flex;
            gap: .5rem
        }

        .nav-link {
            padding: .45rem 1rem;
            border-radius: 8px;
            font-size: .8rem;
            font-weight: 500;
            color: var(--muted);
            text-decoration: none;
            transition: all .2s;
            border: 1px solid transparent
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--text);
            background: rgba(59, 130, 246, .1);
            border-color: rgba(59, 130, 246, .25)
        }

        .main {
            position: relative;
            z-index: 1;
            max-width: 1360px;
            margin: 0 auto;
            padding: 1.5rem 2rem
        }

        /* Controls */
        .controls {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap
        }

        .branch-pills {
            display: flex;
            gap: .4rem;
            background: rgba(15, 23, 42, .6);
            border-radius: 10px;
            padding: 4px;
            border: 1px solid var(--border)
        }

        .branch-pill {
            padding: .5rem 1.25rem;
            border-radius: 8px;
            font-size: .8rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--muted);
            transition: all .25s;
            font-family: inherit
        }

        .branch-pill.active {
            background: var(--gradient);
            color: #fff;
            box-shadow: 0 4px 15px rgba(59, 130, 246, .3)
        }

        .branch-pill:hover:not(.active) {
            color: var(--text);
            background: rgba(255, 255, 255, .05)
        }

        .date-control {
            display: flex;
            align-items: center;
            gap: .5rem;
            margin-left: auto
        }

        .date-nav {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            transition: all .2s
        }

        .date-nav:hover {
            border-color: var(--primary);
            color: var(--primary)
        }

        .date-input {
            padding: .45rem .75rem;
            background: rgba(15, 23, 42, .8);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            font-family: inherit;
            font-size: .8rem;
            font-weight: 500
        }

        .date-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, .15)
        }

        .btn-load {
            padding: .5rem 1.25rem;
            border-radius: 8px;
            background: var(--gradient);
            color: #fff;
            border: none;
            font-weight: 600;
            font-size: .8rem;
            cursor: pointer;
            font-family: inherit;
            transition: all .2s;
            display: flex;
            align-items: center;
            gap: .4rem
        }

        .btn-load:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, .3)
        }

        .btn-load:disabled {
            opacity: .5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none
        }

        /* Summary Cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem
        }

        .summary-card {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.25rem;
            position: relative;
            overflow: hidden;
            transition: all .3s
        }

        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            border-radius: var(--radius) var(--radius) 0 0
        }

        .summary-card.sales::before {
            background: linear-gradient(90deg, #3b82f6, #06b6d4)
        }

        .summary-card.collection::before {
            background: linear-gradient(90deg, #10b981, #34d399)
        }

        .summary-card.discount::before {
            background: linear-gradient(90deg, #f59e0b, #fbbf24)
        }

        .summary-card.refund::before {
            background: linear-gradient(90deg, #ef4444, #f87171)
        }

        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--glow)
        }

        .sc-label {
            font-size: .7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .06em;
            color: var(--muted);
            margin-bottom: .75rem
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
            font-size: .6rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .05em;
            margin-bottom: .15rem
        }

        .sc-value {
            font-size: 1.35rem;
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
            font-size: .6rem;
            color: var(--muted);
            margin-top: .15rem
        }

        /* Tables */
        .section {
            margin-bottom: 1.5rem
        }

        .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: .75rem
        }

        .section-title {
            font-size: .85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--muted);
            display: flex;
            align-items: center;
            gap: .5rem
        }

        .export-btns {
            display: flex;
            gap: .4rem
        }

        .btn-export {
            padding: .35rem .8rem;
            border-radius: 7px;
            font-size: .7rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--muted);
            font-family: inherit;
            transition: all .2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: .3rem
        }

        .btn-export:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: rgba(59, 130, 246, .08)
        }

        .card {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden
        }

        .tbl {
            width: 100%;
            border-collapse: collapse;
            font-size: .78rem
        }

        .tbl thead th {
            background: rgba(15, 23, 42, .6);
            padding: .6rem .7rem;
            font-weight: 600;
            font-size: .68rem;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--muted);
            text-align: center;
            border-bottom: 1px solid var(--border)
        }

        .tbl thead th:first-child {
            text-align: left
        }

        .tbl thead .super-header th {
            font-size: .72rem;
            color: var(--text);
            padding: .5rem
        }

        .tbl thead .super-header .ftd-h {
            background: rgba(59, 130, 246, .08);
            color: var(--primary)
        }

        .tbl thead .super-header .mtd-h {
            background: rgba(139, 92, 246, .08);
            color: var(--accent)
        }

        .tbl tbody td {
            padding: .55rem .7rem;
            text-align: right;
            border-bottom: 1px solid rgba(51, 65, 85, .3);
            transition: background .15s
        }

        .tbl tbody td:first-child {
            text-align: left;
            font-weight: 600;
            color: var(--text)
        }

        .tbl tbody tr:hover td {
            background: rgba(255, 255, 255, .02)
        }

        .tbl .total-col {
            font-weight: 700;
            color: var(--text)
        }

        .tbl .ftd-total {
            background: rgba(59, 130, 246, .05)
        }

        .tbl .mtd-total {
            background: rgba(139, 92, 246, .05)
        }

        .tbl tbody tr:last-child td {
            border-bottom: none
        }

        /* Volume Grid */
        .vol-grid {
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
        }

        .vol-card {
            flex: 1 1 160px;
            min-width: 160px;
            max-width: 280px;
        }

        .vol-card {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1rem;
            text-align: center;
            transition: all .3s
        }

        .vol-card:hover {
            transform: translateY(-2px);
            border-color: rgba(59, 130, 246, .3)
        }

        .vol-label {
            font-size: .65rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: var(--muted);
            margin-bottom: .6rem
        }

        .vol-values {
            display: flex;
            justify-content: center;
            gap: 1.5rem
        }

        .vol-item .vol-period {
            font-size: .55rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .04em
        }

        .vol-item .vol-num {
            font-size: 1.3rem;
            font-weight: 800;
            margin-top: .1rem
        }

        .vol-item .vol-num.ftd {
            color: var(--primary)
        }

        .vol-item .vol-num.mtd {
            color: var(--accent)
        }

        /* Package Alert */
        .pkg-alert {
            background: rgba(245, 158, 11, .06);
            border: 1px solid rgba(245, 158, 11, .2);
            border-radius: var(--radius);
            padding: .75rem 1rem;
            display: flex;
            align-items: center;
            gap: .75rem;
            font-size: .8rem;
            color: var(--warning);
            margin-bottom: 1.5rem
        }

        .pkg-alert .icon {
            font-size: 1.2rem
        }

        .pkg-alert .pkg-vals {
            display: flex;
            gap: 1.5rem;
            margin-left: auto;
            font-weight: 700;
            font-size: .85rem
        }

        /* Loading */
        .loading-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(10, 14, 26, .7);
            backdrop-filter: blur(4px);
            z-index: 200;
            align-items: center;
            justify-content: center
        }

        .loading-overlay.show {
            display: flex
        }

        .loader {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(59, 130, 246, .2);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin .7s linear infinite
        }

        @keyframes spin {
            to {
                transform: rotate(360deg)
            }
        }

        /* No data */
        .no-data {
            text-align: center;
            padding: 3rem;
            color: var(--muted)
        }

        .no-data .icon {
            font-size: 2.5rem;
            margin-bottom: .75rem
        }

        .no-data p {
            font-size: .9rem
        }

        .no-data .sub {
            font-size: .75rem;
            margin-top: .35rem;
            color: rgba(148, 163, 184, .6)
        }

        /* Alert */
        .alert {
            padding: .75rem 1rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            font-size: .8rem;
            display: none;
            align-items: center;
            gap: .6rem
        }

        .alert.show {
            display: flex
        }

        .alert-error {
            background: rgba(239, 68, 68, .1);
            border: 1px solid rgba(239, 68, 68, .25);
            color: var(--error)
        }

        .alert .close-a {
            cursor: pointer;
            margin-left: auto;
            opacity: .7;
            font-size: 1.1rem
        }

        @media(max-width:900px) {
            .summary-grid {
                grid-template-columns: repeat(2, 1fr)
            }

            .controls {
                flex-direction: column;
                align-items: stretch
            }

            .date-control {
                margin-left: 0
            }
        }

        @media(max-width:600px) {
            .summary-grid {
                grid-template-columns: 1fr
            }

            .main {
                padding: 1rem
            }

            .vol-grid {
                grid-template-columns: repeat(2, 1fr)
            }

            .nav {
                padding: 0 1rem
            }
        }
    </style>
</head>

<body>
    <div class="nav">
        <div class="nav-brand">
            <h1>🏥 Hospital MIS</h1>
            <span class="nav-badge">Dashboard</span>
        </div>
        <div class="nav-links">
            <a href="/dashboard" class="nav-link active">📊 Dashboard</a>
            <a href="/" class="nav-link">📁 Upload</a>
        </div>
    </div>

    <div class="main">
        <div id="alertBox" class="alert alert-error"><span id="alertMsg"></span><span class="close-a"
                onclick="this.parentElement.classList.remove('show')">&times;</span></div>

        <div class="controls">
            <div class="branch-pills">
                <button class="branch-pill active" data-branch="chromepet" onclick="switchBranch('chromepet')">🏥
                    Chromepet</button>
                <button class="branch-pill" data-branch="oragadam" onclick="switchBranch('oragadam')">🏥
                    Oragadam</button>
            </div>
            <div class="date-control">
                <button class="date-nav" onclick="shiftDate(-1)" title="Previous day">◀</button>
                <input type="date" class="date-input" id="reportDate">
                <button class="date-nav" onclick="shiftDate(1)" title="Next day">▶</button>
                <button class="btn-load" id="loadBtn" onclick="loadReport()">
                    <span id="loadText">Load Report</span>
                </button>
            </div>
        </div>

        <div id="content">
            <div class="no-data" id="noData">
                <div class="icon">📊</div>
                <p>Select a branch and date to view MIS report</p>
                <p class="sub">Upload CSV files first if no data exists for the selected date</p>
            </div>
        </div>
    </div>

    <div class="loading-overlay" id="loadingOverlay">
        <div class="loader"></div>
    </div>

    <script>
        const BED = {
            chromepet: 74,
            oragadam: 14
        };
        let branch = 'chromepet',
            reportData = null;

        // Init date
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
            if (s <= di.max) {
                di.value = s;
                loadReport();
            }
        }

        async function loadReport() {
            const date = di.value;
            if (!date) return;
            const btn = document.getElementById('loadBtn'),
                lt = document.getElementById('loadText');
            const lo = document.getElementById('loadingOverlay');
            btn.disabled = true;
            lt.textContent = 'Loading...';
            lo.classList.add('show');
            document.getElementById('alertBox').classList.remove('show');
            try {
                const r = await fetch(`/api/mis/${branch}/${date}`);
                const j = await r.json();
                if (j.success) {
                    reportData = j.data;
                    renderReport(j.data);
                } else {
                    showError(j.message || 'No data found');
                    document.getElementById('content').innerHTML =
                        '<div class="no-data"><div class="icon">⚠️</div><p>' + (j.message || 'No data for this date') +
                        '</p><p class="sub">Try uploading CSV files for this date first</p></div>';
                }
            } catch (e) {
                showError('Network error: ' + e.message);
            } finally {
                btn.disabled = false;
                lt.textContent = 'Load Report';
                lo.classList.remove('show');
            }
        }

        function showError(m) {
            const a = document.getElementById('alertBox');
            document.getElementById('alertMsg').textContent = m;
            a.classList.add('show');
        }

        function lk(v) {
            return ((v || 0) / 100000).toFixed(2);
        }

        function nm(v) {
            return Number(v || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function renderReport(d) {
            const s = d.sales || {},
                c = d.collection || {},
                dc = d.discount || {},
                r = d.refund || {},
                v = d.volume || {},
                m = d.mri || {},
                t = d.totals || {},
                pkg = d.pkg_adjustment || {
                    ftd: 0,
                    mtd: 0
                };
            const date = d.date || di.value;

            let html = `
    <div class="summary-grid">
        <div class="summary-card sales"><div class="sc-label">💰 Total Sales</div><div class="sc-row"><div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">₹${lk(t.sales_ftd)}</div><div class="sc-unit">Lakhs</div></div><div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">₹${lk(t.sales_mtd)}</div><div class="sc-unit">Lakhs</div></div></div></div>
        <div class="summary-card collection"><div class="sc-label">🏦 Collection</div><div class="sc-row"><div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">₹${lk(t.collection_ftd)}</div><div class="sc-unit">Lakhs</div></div><div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">₹${lk(t.collection_mtd)}</div><div class="sc-unit">Lakhs</div></div></div></div>
        <div class="summary-card discount"><div class="sc-label">🏷️ Occupancy</div><div class="sc-row"><div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">${v.ftd?.occupancy||0}</div><div class="sc-unit">of ${BED[branch]} beds</div></div><div class="sc-block"><div class="sc-period">FTD %</div><div class="sc-value mtd">${Number(v.ftd?.occupancy_pct||0).toFixed(1)}%</div><div class="sc-unit">Occupancy</div></div></div></div>
        <div class="summary-card refund"><div class="sc-label">📋 Admissions</div><div class="sc-row"><div class="sc-block"><div class="sc-period">FTD</div><div class="sc-value ftd">${v.ftd?.admission||0}</div><div class="sc-unit">Admitted</div></div><div class="sc-block"><div class="sc-period">MTD</div><div class="sc-value mtd">${v.mtd?.admission||0}</div><div class="sc-unit">Total</div></div></div></div>
    </div>`;

            // Package alert
            if ((pkg.ftd || 0) > 0 || (pkg.mtd || 0) > 0) {
                html +=
                    `<div class="pkg-alert"><span class="icon">📦</span><span>Package Consumption Adjustment (Chromepet): Added to Pharmacy, subtracted from IP</span><div class="pkg-vals"><span>FTD: ₹${lk(pkg.ftd)} L</span><span>MTD: ₹${lk(pkg.mtd)} L</span></div></div>`;
            }

            // Revenue table
            html +=
                `<div class="section"><div class="section-head"><div class="section-title">📊 Revenue Breakdown <span style="font-size:.65rem;color:rgba(148,163,184,.5)">(₹ in Lakhs)</span></div><div class="export-btns"><a class="btn-export" href="/api/mis/${branch}/${date}/export" target="_blank">📥 Excel</a><a class="btn-export" href="/api/mis/${branch}/${date}/export-pdf" target="_blank">📄 PDF</a></div></div>`;
            html +=
                `<div class="card"><table class="tbl"><thead><tr class="super-header"><th></th><th colspan="5" class="ftd-h">FTD (${date})</th><th colspan="5" class="mtd-h">MTD</th></tr><tr><th>Category</th><th>OP</th><th>IP</th><th>ER</th><th>PH</th><th>Total</th><th>OP</th><th>IP</th><th>ER</th><th>PH</th><th>Total</th></tr></thead><tbody>`;

            const rows = [{
                    label: 'Sales',
                    d: s,
                    k: ['op', 'ip', 'er', 'ph']
                },
                {
                    label: 'Collection',
                    d: c,
                    k: ['op', 'ip', 'er', 'ph']
                },
            ];
            rows.forEach(rw => {
                const ft = rw.d.ftd || {},
                    mt = rw.d.mtd || {};
                const ftT = rw.k.reduce((a, k) => a + (ft[k] || 0), 0);
                const mtT = rw.k.reduce((a, k) => a + (mt[k] || 0), 0);
                html += `<tr><td>${rw.label}</td>`;
                rw.k.forEach(k => html += `<td>${lk(ft[k])}</td>`);
                html += `<td class="total-col ftd-total">${lk(ftT)}</td>`;
                rw.k.forEach(k => html += `<td>${lk(mt[k])}</td>`);
                html += `<td class="total-col mtd-total">${lk(mtT)}</td></tr>`;
            });

            // Discount partial
            const dp = dc.ftd?.partial || {},
                dpm = dc.mtd?.partial || {};
            html +=
                `<tr><td>Discount 99%</td><td>${lk(dp.op)}</td><td>${lk(dp.ip)}</td><td>${lk(dp.er)}</td><td>${lk(dp.ph)}</td><td class="total-col ftd-total">${lk((dp.op||0)+(dp.ip||0)+(dp.er||0)+(dp.ph||0))}</td><td>${lk(dpm.op)}</td><td>${lk(dpm.ip)}</td><td>${lk(dpm.er)}</td><td>${lk(dpm.ph)}</td><td class="total-col mtd-total">${lk((dpm.op||0)+(dpm.ip||0)+(dpm.er||0)+(dpm.ph||0))}</td></tr>`;

            // Discount full
            const df = dc.ftd?.full || {},
                dfm = dc.mtd?.full || {};
            html +=
                `<tr><td>Discount 100%</td><td>${lk(df.op)}</td><td>${lk(df.ip)}</td><td>${lk(df.er)}</td><td>${lk(df.ph)}</td><td class="total-col ftd-total">${lk((df.op||0)+(df.ip||0)+(df.er||0)+(df.ph||0))}</td><td>${lk(dfm.op)}</td><td>${lk(dfm.ip)}</td><td>${lk(dfm.er)}</td><td>${lk(dfm.ph)}</td><td class="total-col mtd-total">${lk((dfm.op||0)+(dfm.ip||0)+(dfm.er||0)+(dfm.ph||0))}</td></tr>`;

            // Refund
            const rf = r.ftd || {},
                rm = r.mtd || {};
            html +=
                `<tr><td>Refund</td><td>${lk(rf.op)}</td><td>${lk(rf.ip)}</td><td>${lk(rf.er)}</td><td>${lk(rf.ph)}</td><td class="total-col ftd-total">${lk((rf.op||0)+(rf.ip||0)+(rf.er||0)+(rf.ph||0))}</td><td>${lk(rm.op)}</td><td>${lk(rm.ip)}</td><td>${lk(rm.er)}</td><td>${lk(rm.ph)}</td><td class="total-col mtd-total">${lk((rm.op||0)+(rm.ip||0)+(rm.er||0)+(rm.ph||0))}</td></tr>`;

            html += `</tbody></table></div></div>`;

            // Volume section
            html +=
                `<div class="section"><div class="section-head"><div class="section-title">📈 Volume Indicators & MRI</div></div><div class="vol-grid">`;
            const vols = [{
                    label: 'Occupancy',
                    ftd: v.ftd?.occupancy || 0,
                    mtd: v.mtd?.occupancy || 0
                },
                {
                    label: 'Occupancy %',
                    ftd: (v.ftd?.occupancy_pct || 0) + '%',
                    mtd: (v.mtd?.occupancy_pct || 0) + '%'
                },
                {
                    label: 'Admission',
                    ftd: v.ftd?.admission || 0,
                    mtd: v.mtd?.admission || 0
                },
                {
                    label: 'Discharge',
                    ftd: v.ftd?.discharge || 0,
                    mtd: v.mtd?.discharge || 0
                },
                {
                    label: 'Total OP',
                    ftd: v.ftd?.total_op || 0,
                    mtd: v.mtd?.total_op || 0
                },
                {
                    label: 'MRI OP (Count)',
                    ftd: m.ftd?.op?.count || 0,
                    mtd: m.mtd?.op?.count || 0
                },
                {
                    label: 'MRI IP (Count)',
                    ftd: m.ftd?.ip?.count || 0,
                    mtd: m.mtd?.ip?.count || 0
                },
                {
                    label: 'MRI OP Revenue',
                    ftd: '₹' + m.ftd?.op?.revenue,
                    mtd: '₹' + m.mtd?.op?.revenue
                },
                {
                    label: 'MRI IP Revenue',
                    ftd: '₹' + m.ftd?.ip?.revenue,
                    mtd: '₹' + m.mtd?.ip?.revenue
                },
            ];
            vols.forEach(vi => {
                html +=
                    `<div class="vol-card"><div class="vol-label">${vi.label}</div><div class="vol-values"><div class="vol-item"><div class="vol-period">FTD</div><div class="vol-num ftd">${vi.ftd}</div></div><div class="vol-item"><div class="vol-period">MTD</div><div class="vol-num mtd">${vi.mtd}</div></div></div></div>`;
            });
            html += `</div></div>`;

            document.getElementById('content').innerHTML = html;
        }
    </script>
</body>

</html>
