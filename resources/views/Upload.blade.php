<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Data — Hospital MIS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

        :root {
            --sidebar-w: 220px;
            --sidebar-collapsed: 60px;
            --header-h: 54px;
            --bg: #f0f2f7;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --text: #0f172a;
            --text-2: #334155;
            --muted: #64748b;
            --primary: #1d4ed8;
            --primary-light: #dbeafe;
            --primary-soft: #eff6ff;
            --accent: #7c3aed;
            --success: #059669;
            --success-light: #d1fae5;
            --danger: #dc2626;
            --danger-light: #fee2e2;
            --shadow-sm: 0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
            --radius: 12px;
            --radius-sm: 8px;
            --grad: linear-gradient(135deg,#1d4ed8,#7c3aed);
        }

        html, body { height: 100%; overflow: hidden }
        body { font-family:'Inter',system-ui,sans-serif; background:var(--bg); color:var(--text); display:flex; -webkit-font-smoothing:antialiased }

        /* ── Sidebar ── */
        #sidebar {
            position:fixed; left:0; top:0; bottom:0; width:var(--sidebar-w);
            background:#0f172a; display:flex; flex-direction:column;
            z-index:200; transition:width .25s ease; overflow:hidden; flex-shrink:0;
        }
        #sidebar.collapsed { width:var(--sidebar-collapsed) }

        .sb-brand { display:flex; align-items:center; gap:.6rem; padding:.85rem .8rem; border-bottom:1px solid rgba(255,255,255,.08); min-height:var(--header-h); flex-shrink:0 }
        .sb-logo { width:30px; height:30px; border-radius:8px; background:var(--grad); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 10px rgba(29,78,216,.35) }
        .sb-logo .material-icons-round { color:#fff; font-size:17px }
        .sb-title { font-size:.84rem; font-weight:700; color:#fff; white-space:nowrap; opacity:1; transition:opacity .2s }
        #sidebar.collapsed .sb-title { opacity:0; pointer-events:none }
        .sb-badge { font-size:.55rem; padding:.08rem .3rem; border-radius:4px; background:rgba(255,255,255,.1); color:rgba(255,255,255,.45); font-weight:600; white-space:nowrap }
        #sidebar.collapsed .sb-badge { display:none }
        .sb-toggle { width:22px; height:22px; border-radius:5px; background:rgba(255,255,255,.07); border:none; cursor:pointer; color:rgba(255,255,255,.5); display:flex; align-items:center; justify-content:center; margin-left:auto; flex-shrink:0; transition:background .15s }
        .sb-toggle:hover { background:rgba(255,255,255,.15) }
        .sb-toggle .material-icons-round { font-size:16px; transition:transform .25s }
        #sidebar.collapsed .sb-toggle .material-icons-round { transform:rotate(180deg) }
        #sidebar.collapsed .sb-toggle { margin:0 auto }

        .sb-nav { flex:1; padding:.4rem 0; overflow-y:auto; overflow-x:hidden }
        .sb-section { padding:.3rem .5rem }
        .sb-label { font-size:.57rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:rgba(255,255,255,.25); padding:.35rem .5rem; white-space:nowrap; transition:opacity .2s }
        #sidebar.collapsed .sb-label { opacity:0 }

        .nav-item { display:flex; align-items:center; gap:.65rem; padding:.5rem .7rem; border-radius:8px; cursor:pointer; border:none; background:transparent; color:rgba(255,255,255,.55); font-size:.79rem; font-weight:500; font-family:inherit; width:100%; text-align:left; text-decoration:none; white-space:nowrap; transition:background .15s, color .15s; margin-bottom:.12rem }
        .nav-item .material-icons-round { font-size:18px; flex-shrink:0 }
        .nav-item:hover { background:rgba(255,255,255,.07); color:#fff }
        .nav-item.active { background:rgba(29,78,216,.35); color:#93c5fd }
        .nav-item.active .material-icons-round { color:#60a5fa }
        .nav-item .ni-label { transition:opacity .2s }
        #sidebar.collapsed .nav-item .ni-label { opacity:0; width:0; overflow:hidden }

        .sb-divider { height:1px; background:rgba(255,255,255,.07); margin:.35rem .5rem }

        .sb-user { padding:.65rem .8rem; border-top:1px solid rgba(255,255,255,.08); flex-shrink:0 }
        .sb-user-info { display:flex; align-items:center; gap:.55rem }
        .sb-avatar { width:28px; height:28px; border-radius:50%; background:var(--grad); display:flex; align-items:center; justify-content:center; color:#fff; font-size:.7rem; font-weight:700; flex-shrink:0 }
        .sb-user-name { font-size:.72rem; font-weight:600; color:rgba(255,255,255,.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:opacity .2s }
        .sb-user-role { font-size:.62rem; color:rgba(255,255,255,.35); white-space:nowrap; transition:opacity .2s }
        #sidebar.collapsed .sb-user-name, #sidebar.collapsed .sb-user-role { opacity:0; width:0 }

        /* ── Main ── */
        .main-wrapper { margin-left:var(--sidebar-w); flex:1; display:flex; flex-direction:column; height:100vh; transition:margin-left .25s ease; overflow:hidden }
        .main-wrapper.expanded { margin-left:var(--sidebar-collapsed) }

        /* ── Topbar ── */
        .topbar { height:var(--header-h); background:#fff; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:.75rem; padding:0 1.25rem; flex-shrink:0; box-shadow:var(--shadow-sm) }
        .topbar-title { font-size:.9rem; font-weight:700; color:var(--text) }
        .topbar-actions { display:flex; gap:.4rem; margin-left:auto; align-items:center }
        .btn-sm { display:inline-flex; align-items:center; gap:.25rem; padding:.35rem .75rem; border-radius:7px; font-size:.75rem; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:#fff; color:var(--text-2); font-family:inherit; transition:all .15s; text-decoration:none; white-space:nowrap }
        .btn-sm .material-icons-round { font-size:15px }
        .btn-sm:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-soft) }
        .btn-sm.danger:hover { border-color:var(--danger); color:var(--danger); background:var(--danger-light) }

        /* ── Alert bar ── */
        .alert-bar { display:none; align-items:center; gap:.65rem; padding:.55rem 1.25rem; font-size:.8rem; font-weight:500; border-bottom:2px solid transparent; flex-shrink:0 }
        .alert-bar.show { display:flex }
        .alert-bar.success { background:var(--success-light); border-bottom-color:rgba(5,150,105,.2); color:var(--success) }
        .alert-bar.error   { background:var(--danger-light);  border-bottom-color:rgba(220,38,38,.2);  color:var(--danger) }
        .alert-bar .material-icons-round { font-size:16px; flex-shrink:0 }
        .alert-bar .ab-close { margin-left:auto; cursor:pointer; opacity:.6 }
        .alert-bar .ab-close:hover { opacity:1 }

        /* ── Content fills remaining height ── */
        .content-area { flex:1; overflow:hidden; display:flex; flex-direction:column }

        /* ── Branch strip ── */
        .branch-strip { display:flex; gap:.6rem; padding:.6rem 1.25rem; background:#fff; border-bottom:1px solid var(--border); flex-shrink:0; align-items:center }
        .branch-strip-label { font-size:.72rem; font-weight:600; color:var(--muted) }
        .branch-pill { display:flex; align-items:center; gap:.5rem; padding:.38rem .85rem; border:2px solid var(--border); border-radius:9999px; cursor:pointer; transition:all .18s; background:#fff; font-size:.78rem; font-weight:600; color:var(--text-2) }
        .branch-pill .material-icons-round { font-size:15px; color:var(--muted) }
        .branch-pill:hover { border-color:var(--primary-light); color:var(--primary) }
        .branch-pill.active { border-color:var(--primary); background:var(--primary-soft); color:var(--primary) }
        .branch-pill.active .material-icons-round { color:var(--primary) }
        .bp-beds { font-size:.67rem; font-weight:500; color:var(--muted); margin-left:.05rem }
        .branch-pill.active .bp-beds { color:rgba(29,78,216,.55) }

        /* ── Two-col body ── */
        .upload-body { flex:1; display:grid; grid-template-columns:1fr 300px; overflow:hidden }

        .left-col  { overflow-y:auto; padding:.85rem .85rem .85rem 1.25rem; display:flex; flex-direction:column; gap:.65rem }
        .right-col { overflow-y:auto; padding:.85rem 1.25rem .85rem .85rem; border-left:1px solid var(--border); display:flex; flex-direction:column; gap:.65rem; background:#fafbfd }

        /* ── Cards ── */
        .card { background:#fff; border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow-sm); overflow:hidden }
        .card-head { display:flex; align-items:center; gap:.4rem; padding:.55rem .85rem; border-bottom:1px solid var(--border-light) }
        .card-head .material-icons-round { font-size:15px; color:var(--primary) }
        .ch-title { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted) }
        .ch-opt   { font-size:.66rem; color:var(--muted); opacity:.7; margin-left:.1rem; font-weight:500 }
        .card-body { padding:.75rem .85rem }

        /* ── Files grid ── */
        .files-grid { display:grid; grid-template-columns:1fr 1fr; gap:.55rem }

        /* ── Compact file zone ── */
        .fzone {
            position:relative; border:1.5px dashed var(--border); border-radius:var(--radius-sm);
            padding:.55rem .7rem; background:var(--border-light); cursor:pointer;
            transition:all .18s; display:flex; align-items:center; gap:.55rem; overflow:hidden;
        }
        .fzone:hover { background:var(--primary-soft); border-color:var(--primary-light) }
        .fzone input[type="file"] { position:absolute; inset:0; opacity:0; cursor:pointer; z-index:5 }
        .fzone.selected { border-color:var(--success); border-style:solid; background:rgba(5,150,105,.04) }
        .fzone-icon { width:30px; height:30px; border-radius:7px; background:rgba(100,116,139,.1); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .18s }
        .fzone-icon .material-icons-round { font-size:16px; color:var(--muted); transition:color .18s }
        .fzone:hover .fzone-icon { background:rgba(29,78,216,.1) }
        .fzone:hover .fzone-icon .material-icons-round { color:var(--primary) }
        .fzone.selected .fzone-icon { background:rgba(5,150,105,.1) }
        .fzone.selected .fzone-icon .material-icons-round { color:var(--success) }
        .fzone-text { overflow:hidden; flex:1; min-width:0 }
        .ft-main { font-size:.74rem; font-weight:600; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .ft-sub  { font-size:.62rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .fzone.selected .ft-sub { color:var(--success); font-weight:500 }
        .fzone-req { position:absolute; top:3px; right:5px; font-size:.58rem; color:var(--danger); font-weight:700 }

        /* Package section collapse */
        .pkg-wrap { overflow:hidden; transition:max-height .28s ease, opacity .28s ease, margin-top .28s ease; max-height:80px; opacity:1; margin-top:.55rem }
        .pkg-wrap.hidden { max-height:0; opacity:0; pointer-events:none; margin-top:0 }

        /* ── Right col form ── */
        .fg { display:flex; flex-direction:column; gap:.25rem }
        .fg label { font-size:.71rem; font-weight:600; color:var(--text-2); display:flex; align-items:center; gap:.3rem; flex-wrap:wrap }
        .fg .req { color:var(--danger) }
        .fg input[type="date"], .fg input[type="number"] {
            padding:.5rem .7rem; background:#fff; border:1.5px solid var(--border);
            border-radius:var(--radius-sm); color:var(--text); font-size:.8rem;
            font-family:inherit; transition:border .15s, box-shadow .15s; outline:none; width:100%;
        }
        .fg input:hover { border-color:#cbd5e1 }
        .fg input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(29,78,216,.1) }
        .fg .help { font-size:.63rem; color:var(--muted) }
        .auto-tag { font-size:.6rem; background:var(--success-light); color:var(--success); padding:.06rem .32rem; border-radius:9999px; font-weight:600; border:1px solid rgba(5,150,105,.2) }

        .form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:.55rem }

        /* Occupancy display */
        .occ-val { font-size:1.3rem; font-weight:800; color:var(--success); letter-spacing:-.02em; line-height:1; padding:.35rem 0 }

        /* Auto hint chips */
        .info-strip { display:flex; flex-direction:column; gap:.3rem; margin-top:.4rem }
        .info-chip { display:flex; align-items:center; gap:.3rem; font-size:.67rem; font-weight:500; color:var(--muted); padding:.25rem .5rem; border:1px solid var(--border); border-radius:6px; background:#fff }
        .info-chip .material-icons-round { font-size:12px; color:var(--primary) }

        /* ── Submit ── */
        .btn-submit {
            width:100%; padding:.72rem; background:var(--grad); color:#fff; border:none;
            border-radius:var(--radius-sm); font-size:.84rem; font-weight:700; cursor:pointer;
            font-family:inherit; display:flex; align-items:center; justify-content:center;
            gap:.4rem; transition:opacity .15s, box-shadow .15s, transform .1s;
            box-shadow:0 4px 14px rgba(29,78,216,.28);
        }
        .btn-submit:hover { opacity:.92; box-shadow:0 6px 18px rgba(29,78,216,.38); transform:translateY(-1px) }
        .btn-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none }
        .btn-submit .material-icons-round { font-size:17px }
        .btn-reset-sm { width:100%; padding:.5rem; background:#fff; color:var(--muted); border:1.5px solid var(--border); border-radius:var(--radius-sm); font-size:.76rem; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; margin-top:.4rem }
        .btn-reset-sm:hover { border-color:var(--danger); color:var(--danger) }

        .spin { width:15px; height:15px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:rotate .6s linear infinite; display:none; flex-shrink:0 }
        @keyframes rotate { to { transform:rotate(360deg) } }

        /* ── Result card ── */
        .result-card { background:#fff; border:1px solid rgba(5,150,105,.2); border-radius:var(--radius); box-shadow:0 4px 16px rgba(5,150,105,.08); display:none; animation:slideUp .3s ease; overflow:hidden }
        .result-card.show { display:block }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .result-head { display:flex; align-items:center; gap:.4rem; padding:.55rem .85rem; border-bottom:1px solid rgba(5,150,105,.1); background:rgba(5,150,105,.04) }
        .result-head .material-icons-round { font-size:15px; color:var(--success) }
        .result-head .rh-title { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--success) }
        .result-redir { font-size:.66rem; color:var(--primary); font-weight:600; margin-left:auto; display:flex; align-items:center; gap:.2rem }
        .result-redir .material-icons-round { font-size:13px }
        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.45rem; padding:.65rem .85rem }
        .stat-box { background:var(--border-light); border:1px solid var(--border); border-radius:7px; padding:.5rem .55rem; text-align:center }
        .stat-box .sl { font-size:.57rem; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; font-weight:700; margin-bottom:.15rem }
        .stat-box .sv { font-size:.9rem; font-weight:800; color:var(--primary) }
        .stat-box.auto .sv { color:var(--success) }
        .result-exports { display:flex; gap:.45rem; padding:0 .85rem .65rem; flex-wrap:wrap }
        .btn-exp { display:inline-flex; align-items:center; gap:.28rem; padding:.35rem .75rem; border-radius:7px; font-size:.71rem; font-weight:600; text-decoration:none; transition:all .15s }
        .btn-exp.excel { background:var(--success-light); color:var(--success); border:1px solid rgba(5,150,105,.2) }
        .btn-exp.excel:hover { background:var(--success); color:#fff }
        .btn-exp.pdf { background:var(--danger-light); color:var(--danger); border:1px solid rgba(220,38,38,.2) }
        .btn-exp.pdf:hover { background:var(--danger); color:#fff }

        /* Date field on left col */
        .date-row { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; align-items:end }

        /* ── Responsive ── */
        @media(max-width:900px) {
            #sidebar { width:var(--sidebar-collapsed) }
            .main-wrapper { margin-left:var(--sidebar-collapsed) }
            .sb-title,.sb-badge,.ni-label,.sb-user-name,.sb-user-role,.sb-label { opacity:0; width:0; overflow:hidden }
            .sb-toggle { margin:0 auto }
        }
        @media(max-width:720px) {
            html, body { overflow:auto }
            .content-area, .upload-body { overflow:visible }
            .upload-body { grid-template-columns:1fr }
            .left-col, .right-col { overflow:visible }
            .right-col { border-left:none; border-top:1px solid var(--border) }
        }
        @media(max-width:500px) {
            .files-grid { grid-template-columns:1fr }
            .form-row2 { grid-template-columns:1fr }
            .date-row { grid-template-columns:1fr }
        }
    </style>
</head>
<body>

<!-- ══ SIDEBAR ══════════════════════════════════════════════════════════ -->
<aside id="sidebar">
    <div class="sb-brand">
        <div class="sb-logo"><span class="material-icons-round">local_hospital</span></div>
        <span class="sb-title">Hospital MIS</span>
        <span class="sb-badge">v2.0</span>
        <button class="sb-toggle" onclick="toggleSidebar()"><span class="material-icons-round">chevron_left</span></button>
    </div>
    <nav class="sb-nav">
        <div class="sb-section">
            <div class="sb-label">Reports</div>
            <a href="/dashboard" class="nav-item"><span class="material-icons-round">dashboard</span><span class="ni-label">Overview</span></a>
            <a href="/dashboard" class="nav-item"><span class="material-icons-round">payments</span><span class="ni-label">Revenue</span></a>
            <a href="/dashboard" class="nav-item"><span class="material-icons-round">trending_up</span><span class="ni-label">Volume &amp; MRI</span></a>
            <a href="/dashboard" class="nav-item"><span class="material-icons-round">bar_chart</span><span class="ni-label">Analytics</span></a>
        </div>
        <div class="sb-divider"></div>
        <div class="sb-section">
            <div class="sb-label">Actions</div>
            <a href="/upload" class="nav-item active"><span class="material-icons-round">upload_file</span><span class="ni-label">Upload Data</span></a>
            <button class="nav-item" onclick="doLogout()" style="color:rgba(252,165,165,.7)"><span class="material-icons-round">logout</span><span class="ni-label">Sign Out</span></button>
        </div>
    </nav>
    <div class="sb-user">
        <div class="sb-user-info">
            <div class="sb-avatar" id="sbAvatar">A</div>
            <div style="overflow:hidden;min-width:0">
                <div class="sb-user-name" id="sbUserName">—</div>
                <div class="sb-user-role" id="sbUserRole">Hospital MIS</div>
            </div>
        </div>
    </div>
</aside>

<!-- ══ MAIN ══════════════════════════════════════════════════════════════ -->
<div class="main-wrapper" id="mainWrapper">

    <header class="topbar">
        <span class="material-icons-round" style="color:var(--primary);font-size:18px">upload_file</span>
        <span class="topbar-title">Upload MIS Data</span>
        <div class="topbar-actions">
            <a href="/dashboard" class="btn-sm"><span class="material-icons-round">dashboard</span>Dashboard</a>
            <button class="btn-sm danger" onclick="doLogout()"><span class="material-icons-round">logout</span>Sign Out</button>
        </div>
    </header>

    <div class="alert-bar" id="alertBar">
        <span class="material-icons-round" id="alertIcon">info</span>
        <span id="alertMsg">—</span>
        <span class="ab-close material-icons-round" onclick="hideAlert()">close</span>
    </div>

    <div class="content-area">

        <!-- Branch strip -->
        <div class="branch-strip">
            <span class="branch-strip-label">Branch:</span>
            <div class="branch-pill active" data-branch="chromepet" onclick="selectBranch('chromepet')">
                <span class="material-icons-round">local_hospital</span>
                Chromepet <span class="bp-beds">74 beds</span>
            </div>
            <div class="branch-pill" data-branch="oragadam" onclick="selectBranch('oragadam')">
                <span class="material-icons-round">domain</span>
                Oragadam <span class="bp-beds">14 beds</span>
            </div>
        </div>

        <form id="uploadForm" enctype="multipart/form-data">
        <div class="upload-body">

            <!-- ── LEFT: Files ── -->
            <div class="left-col">

                <!-- Date + (result slot) -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">calendar_today</span>
                        <span class="ch-title">Report Date</span>
                    </div>
                    <div class="card-body">
                        <div class="fg">
                            <label>Date <span class="req">*</span></label>
                            <input type="date" name="date" id="dateInput" required>
                        </div>
                    </div>
                </div>

                <!-- Core files -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">folder_open</span>
                        <span class="ch-title">Core Files</span>
                    </div>
                    <div class="card-body">
                        <div class="files-grid">
                            <div class="fg">
                                <label>Bill Item File <span class="req">*</span></label>
                                <div class="fzone" id="zone_bill_file">
                                    <span class="fzone-req">*</span>
                                    <div class="fzone-icon"><span class="material-icons-round">description</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_bill_file">Bill Item Report</div>
                                        <div class="ft-sub">.csv / .xlsx</div>
                                    </div>
                                    <input type="file" name="bill_file" accept=".csv,.txt,.xlsx,.xls" required onchange="onFile(this)">
                                </div>
                            </div>
                            <div class="fg">
                                <label>Cashier Collection <span class="req">*</span></label>
                                <div class="fzone" id="zone_cashier_file">
                                    <span class="fzone-req">*</span>
                                    <div class="fzone-icon"><span class="material-icons-round">payments</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_cashier_file">Cashier Collection</div>
                                        <div class="ft-sub">.csv / .xlsx</div>
                                    </div>
                                    <input type="file" name="cashier_file" accept=".csv,.txt,.xlsx,.xls" required onchange="onFile(this)">
                                </div>
                            </div>
                        </div>
                        <div class="pkg-wrap" id="packageSection">
                            <div class="fg">
                                <label>Package Consumption <span class="req" id="pkgReqStar">*</span> <span style="font-size:.63rem;color:var(--primary);font-weight:600">Chromepet only</span></label>
                                <div class="fzone" id="zone_package_file">
                                    <span class="fzone-req" id="pkgZoneReq">*</span>
                                    <div class="fzone-icon"><span class="material-icons-round">card_membership</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_package_file">Package Consumption</div>
                                        <div class="ft-sub">.csv / .xlsx</div>
                                    </div>
                                    <input type="file" name="package_file" id="packageFileInput" accept=".csv,.txt,.xlsx,.xls" onchange="onFile(this)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Optional files -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">medical_services</span>
                        <span class="ch-title">Additional Files</span>
                        <span class="ch-opt">— Optional</span>
                    </div>
                    <div class="card-body">
                        <div class="files-grid">
                            <div class="fg">
                                <label>ER Admission File</label>
                                <div class="fzone" id="zone_er_file">
                                    <div class="fzone-icon"><span class="material-icons-round">emergency</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_er_file">ER Admission</div>
                                        <div class="ft-sub">Auto-derives ER count</div>
                                    </div>
                                    <input type="file" name="er_file" accept=".csv,.txt,.xlsx,.xls" onchange="onFile(this)">
                                </div>
                            </div>
                            <div class="fg">
                                <label>IP Admission File</label>
                                <div class="fzone" id="zone_ip_file">
                                    <div class="fzone-icon"><span class="material-icons-round">hotel</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_ip_file">IP Admission</div>
                                        <div class="ft-sub">Auto-derives adm &amp; disc</div>
                                    </div>
                                    <input type="file" name="ip_file" accept=".csv,.txt,.xlsx,.xls" onchange="onFile(this)">
                                </div>
                            </div>
                            <div class="fg">
                                <label>Surgery Detail File</label>
                                <div class="fzone" id="zone_surgery_file">
                                    <div class="fzone-icon"><span class="material-icons-round">vaccines</span></div>
                                    <div class="fzone-text">
                                        <div class="ft-main" id="ft_surgery_file">Surgery Detail</div>
                                        <div class="ft-sub">OT &amp; surgeon analytics</div>
                                    </div>
                                    <input type="file" name="surgery_file" accept=".csv,.txt,.xlsx,.xls" onchange="onFile(this)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Result card -->
                <div class="result-card" id="responseCard">
                    <div class="result-head">
                        <span class="material-icons-round">assignment_turned_in</span>
                        <span class="rh-title">Import Summary</span>
                        <div class="result-redir"><span class="material-icons-round">schedule</span>Redirecting…</div>
                    </div>
                    <div class="stats-grid" id="importStats"></div>
                    <div class="result-exports">
                        <a id="exportLink" class="btn-exp excel" href="#" target="_blank"><span class="material-icons-round" style="font-size:14px">table_view</span>Excel</a>
                        <a id="exportPdfLink" class="btn-exp pdf" href="#" target="_blank"><span class="material-icons-round" style="font-size:14px">picture_as_pdf</span>PDF</a>
                    </div>
                </div>

            </div><!-- /left-col -->

            <!-- ── RIGHT: Metrics + Submit ── -->
            <div class="right-col">

                <!-- Occupancy -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">bed</span>
                        <span class="ch-title">Bed Occupancy</span>
                    </div>
                    <div class="card-body">
                        <div class="form-row2">
                            <div class="fg">
                                <label>Beds Occupied</label>
                                <input type="number" name="occupancy" id="occupancyInput" min="0" placeholder="e.g. 52" oninput="calcOccupancyPct()">
                                <span class="help">of <span id="bedCountLabel">74</span> beds</span>
                            </div>
                            <div class="fg">
                                <label>Occupancy %</label>
                                <div class="occ-val" id="occupancyPctDisplay">—</div>
                                <input type="hidden" name="occupancy_pct" id="occupancyPctInput">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Volume -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">leaderboard</span>
                        <span class="ch-title">Volume (FTD)</span>
                    </div>
                    <div class="card-body">
                        <div class="form-row2">
                            <div class="fg">
                                <label>Admission <span class="auto-tag" id="admissionAutoTag" style="display:none">Auto</span></label>
                                <input type="number" name="admission" id="admissionInput" min="0" placeholder="0">
                            </div>
                            <div class="fg">
                                <label>Discharge <span class="auto-tag" id="dischargeAutoTag" style="display:none">Auto</span></label>
                                <input type="number" name="discharge" id="dischargeInput" min="0" placeholder="0">
                            </div>
                        </div>
                        <div id="erCountSection" style="display:none;margin-top:.55rem">
                            <div class="fg">
                                <label>ER Count <span class="req" id="erCountReq">*</span> <span class="auto-tag" id="erCountAutoTag" style="display:none">Auto</span></label>
                                <input type="number" name="er_count" id="erCountInput" min="0" placeholder="0">
                            </div>
                        </div>
                        <div class="info-strip" id="autoInfoStrip">
                            <div class="info-chip" id="ipAutoInfo" style="display:none"><span class="material-icons-round">hotel</span>Adm/Disc derived from IP file</div>
                            <div class="info-chip" id="erAutoInfo" style="display:none"><span class="material-icons-round">emergency</span>ER count derived from ER file</div>
                        </div>
                    </div>
                </div>

                <!-- Submit -->
                <div class="card">
                    <div class="card-head">
                        <span class="material-icons-round">cloud_upload</span>
                        <span class="ch-title">Generate Report</span>
                    </div>
                    <div class="card-body">
                        <button type="submit" class="btn-submit" id="submitBtn">
                            <span class="material-icons-round">upload_file</span>
                            <span id="submitText">Upload &amp; Generate MIS</span>
                            <div class="spin" id="submitSpinner"></div>
                        </button>
                        <button type="button" class="btn-reset-sm" onclick="resetForm()">Reset Form</button>
                    </div>
                </div>

            </div><!-- /right-col -->

        </div><!-- /upload-body -->
        </form>

    </div><!-- /content-area -->
</div><!-- /main-wrapper -->

<script>
    if (!localStorage.getItem('mis_token')) { window.location.replace('/login'); }

    function getToken() { return localStorage.getItem('mis_token') || ''; }

    function doLogout() {
        fetch('/api/auth/logout', { method:'POST', headers:{ 'Authorization':'Bearer '+getToken(), 'Accept':'application/json' } })
            .finally(() => { localStorage.removeItem('mis_token'); localStorage.removeItem('mis_user'); window.location.replace('/login'); });
    }

    let sidebarCollapsed = false;
    function toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed;
        document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
        document.getElementById('mainWrapper').classList.toggle('expanded', sidebarCollapsed);
    }

    (function() {
        const s = localStorage.getItem('mis_user');
        if (!s) return;
        try {
            const u = JSON.parse(s);
            const name = u.name || u.email || 'User';
            const role = u.role || 'viewer';
            const av = document.getElementById('sbAvatar');   if(av) av.textContent = name.charAt(0).toUpperCase();
            const nm = document.getElementById('sbUserName'); if(nm) nm.textContent = name;
            const ro = document.getElementById('sbUserRole'); if(ro) ro.textContent = role.charAt(0).toUpperCase()+role.slice(1);
        } catch(_){}
    })();

    function showAlert(type, msg) {
        const bar = document.getElementById('alertBar');
        document.getElementById('alertMsg').textContent = msg;
        bar.className = 'alert-bar show ' + (type === 'success' ? 'success' : 'error');
        document.getElementById('alertIcon').textContent = type === 'success' ? 'check_circle' : 'error_outline';
    }
    function hideAlert() { document.getElementById('alertBar').classList.remove('show'); }

    const BED_COUNTS = { chromepet:74, oragadam:14 };
    let currentBranch = 'chromepet';
    document.getElementById('dateInput').max = new Date().toISOString().split('T')[0];

    const FILE_LABELS = {
        bill_file:'Bill Item Report', cashier_file:'Cashier Collection',
        package_file:'Package Consumption', er_file:'ER Admission',
        ip_file:'IP Admission', surgery_file:'Surgery Detail'
    };

    function onFile(inp) {
        const zone = inp.closest('.fzone');
        const nameEl = document.getElementById('ft_' + inp.name);
        const hasFile = inp.files && inp.files.length;
        zone.classList.toggle('selected', !!hasFile);
        if (nameEl) nameEl.textContent = hasFile ? inp.files[0].name : (FILE_LABELS[inp.name] || inp.name);

        if (inp.name === 'ip_file') {
            const show = !!hasFile;
            document.getElementById('admissionAutoTag').style.display = show ? 'inline' : 'none';
            document.getElementById('dischargeAutoTag').style.display = show ? 'inline' : 'none';
            document.getElementById('ipAutoInfo').style.display = show ? 'flex' : 'none';
            ['admissionInput','dischargeInput'].forEach(id => {
                const el = document.getElementById(id);
                el.placeholder = show ? 'Auto' : '0';
                el.style.background = show ? '#f0fdf4' : '';
            });
        }
        if (inp.name === 'er_file') {
            const show = !!hasFile;
            document.getElementById('erCountAutoTag').style.display = show ? 'inline' : 'none';
            document.getElementById('erCountReq').style.display = show ? 'none' : 'inline';
            document.getElementById('erAutoInfo').style.display = show ? 'flex' : 'none';
            const erInput = document.getElementById('erCountInput');
            erInput.required = !show;
            erInput.placeholder = show ? 'Auto' : '0';
            erInput.style.background = show ? '#f0fdf4' : '';
        }
    }

    function selectBranch(branch) {
        currentBranch = branch;
        document.querySelectorAll('.branch-pill').forEach(p => p.classList.toggle('active', p.dataset.branch === branch));

        const pkg  = document.getElementById('packageSection');
        const inp  = document.getElementById('packageFileInput');
        const star = document.getElementById('pkgReqStar');
        const zreq = document.getElementById('pkgZoneReq');
        if (branch === 'chromepet') {
            pkg.classList.remove('hidden'); inp.required = true;
            if(star) star.style.display = 'inline'; if(zreq) zreq.style.display = 'inline';
        } else {
            pkg.classList.add('hidden'); inp.required = false; inp.value = '';
            document.getElementById('zone_package_file').classList.remove('selected');
            document.getElementById('ft_package_file').textContent = FILE_LABELS.package_file;
            if(star) star.style.display = 'none'; if(zreq) zreq.style.display = 'none';
        }

        const erSection = document.getElementById('erCountSection');
        const erInput   = document.getElementById('erCountInput');
        const erFile    = document.querySelector('input[name="er_file"]');
        if (branch === 'oragadam') {
            erSection.style.display = 'block';
            erInput.required = !(erFile && erFile.files && erFile.files.length);
        } else {
            erSection.style.display = 'none';
            erInput.required = false; erInput.value = '';
        }

        document.getElementById('bedCountLabel').textContent = BED_COUNTS[branch];
        calcOccupancyPct();
    }

    function calcOccupancyPct() {
        const occ  = parseInt(document.getElementById('occupancyInput').value) || 0;
        const beds = BED_COUNTS[currentBranch];
        const pct  = beds > 0 ? ((occ/beds)*100).toFixed(2) : 0;
        document.getElementById('occupancyPctDisplay').textContent = occ > 0 ? pct+'%' : '—';
        document.getElementById('occupancyPctInput').value = pct;
    }

    function resetForm() {
        document.getElementById('uploadForm').reset();
        document.getElementById('occupancyPctDisplay').textContent = '—';
        document.getElementById('responseCard').classList.remove('show');
        document.querySelectorAll('.fzone').forEach(z => z.classList.remove('selected'));
        Object.keys(FILE_LABELS).forEach(n => { const el = document.getElementById('ft_'+n); if(el) el.textContent = FILE_LABELS[n]; });
        ['admissionAutoTag','dischargeAutoTag','erCountAutoTag'].forEach(id => document.getElementById(id).style.display='none');
        ['ipAutoInfo','erAutoInfo'].forEach(id => document.getElementById(id).style.display='none');
        ['admissionInput','dischargeInput','erCountInput'].forEach(id => { const el = document.getElementById(id); if(el){ el.placeholder='0'; el.style.background=''; } });
        hideAlert();
        selectBranch('chromepet');
    }

    document.getElementById('uploadForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        hideAlert();
        const btn     = document.getElementById('submitBtn');
        const spinner = document.getElementById('submitSpinner');
        const text    = document.getElementById('submitText');
        btn.disabled = true; spinner.style.display = 'block'; text.textContent = 'Processing…';

        const fd = new FormData(this);
        fd.append('branch', currentBranch);
        if (currentBranch !== 'chromepet') fd.delete('package_file');

        try {
            const r = await fetch('/api/mis/'+currentBranch+'/upload', {
                method:'POST',
                headers:{ 'Authorization':'Bearer '+getToken(), 'Accept':'application/json' },
                body:fd,
            });
            if (r.status === 401) {
                localStorage.removeItem('mis_token'); localStorage.removeItem('mis_user');
                showAlert('error','Session expired. Redirecting to login…');
                setTimeout(()=>window.location.replace('/login'),1200); return;
            }
            const j = await r.json();
            if (j.success) {
                const date = document.getElementById('dateInput').value;
                sessionStorage.setItem('mis_last_branch', currentBranch);
                sessionStorage.setItem('mis_last_date',   date);
                showAlert('success',(j.message||'Upload successful!')+' Redirecting to dashboard…');
                showResponse(j);
                setTimeout(()=>window.location.href='/dashboard',1800);
            } else {
                showAlert('error', j.message||(j.errors?Object.values(j.errors).flat().join(', '):'Upload failed.'));
            }
        } catch(err) {
            showAlert('error','Network error: '+err.message);
        } finally {
            btn.disabled = false; spinner.style.display = 'none'; text.textContent = 'Upload & Generate MIS';
        }
    });

    function showResponse(j) {
        const imp = j.imported || {};
        let h = '';
        h += sb('Bill Items',   (imp.bill_items||0).toLocaleString());
        h += sb('Collections',  (imp.cashier_collections||0).toLocaleString());
        if (currentBranch==='chromepet') h += sb('Packages', (imp.package_consumptions||0).toLocaleString());
        if (imp.er_admissions>0) h += sb('ER Adm',    imp.er_admissions.toLocaleString());
        if (imp.ip_admissions>0) h += sb('IP Adm',    imp.ip_admissions.toLocaleString());
        if (imp.surgeries>0)     h += sb('Surgeries',  imp.surgeries.toLocaleString());
        const ftd = (j.data?.sales?.ftd)||{};
        const tot = ((ftd.op||0)+(ftd.ip||0)+(ftd.er||0)+(ftd.ph||0)).toFixed(2);
        h += sb('FTD Sales','₹'+Number(tot).toLocaleString());
        const d = j.derived||{};
        if (d.admission!=null) h += sb('Adm',    d.admission, true);
        if (d.discharge!=null) h += sb('Disc',   d.discharge, true);
        if (d.er_count!=null)  h += sb('ER Cnt', d.er_count,  true);
        document.getElementById('importStats').innerHTML = h;
        document.getElementById('responseCard').classList.add('show');
        const date = document.getElementById('dateInput').value;
        document.getElementById('exportLink').href    = '/api/mis/'+currentBranch+'/'+date+'/export';
        document.getElementById('exportPdfLink').href = '/api/mis/'+currentBranch+'/'+date+'/export-pdf';
    }

    function sb(label, value, isAuto=false) {
        return `<div class="stat-box${isAuto?' auto':''}"><div class="sl">${label}</div><div class="sv">${value}</div></div>`;
    }
</script>
</body>
</html>
