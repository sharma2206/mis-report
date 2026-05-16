<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIS Upload - Hospital MIS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0f172a; --surface: #1e293b; --card: #1e293b; --border: #334155;
            --text: #f1f5f9; --muted: #94a3b8; --primary: #3b82f6; --primary-hover: #2563eb;
            --success: #10b981; --error: #ef4444; --warning: #f59e0b;
            --gradient: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
        .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
        .header h1 { font-size: 1.25rem; font-weight: 600; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header .badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(59,130,246,0.15); color: var(--primary); border: 1px solid rgba(59,130,246,0.3); }
        .container { max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; }
        .branch-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .branch-tab { flex: 1; padding: 1rem; border-radius: 12px; border: 2px solid var(--border); background: var(--surface); cursor: pointer; text-align: center; transition: all 0.3s; }
        .branch-tab:hover { border-color: var(--primary); }
        .branch-tab.active { border-color: var(--primary); background: rgba(59,130,246,0.1); box-shadow: 0 0 20px rgba(59,130,246,0.15); }
        .branch-tab .name { font-weight: 600; font-size: 1.1rem; }
        .branch-tab .info { font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem; }
        .branch-tab .info span { color: var(--primary); font-weight: 600; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .card-title { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .form-row.single { grid-template-columns: 1fr; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.8rem; font-weight: 500; color: var(--muted); }
        .form-group label .req { color: var(--error); }
        .form-group input, .form-group select { padding: 0.6rem 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.85rem; font-family: inherit; transition: border-color 0.2s; }
        .form-group input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .form-group input[type="file"]::file-selector-button { background: var(--gradient); color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-right: 0.5rem; font-family: inherit; }
        .form-group .help { font-size: 0.7rem; color: var(--muted); }
        .form-group .calc-value { font-size: 1rem; color: var(--success); font-weight: 700; min-height: 1.4em; padding: 0.5rem 0; }
        .package-section { transition: all 0.3s; overflow: hidden; }
        .package-section.hidden { max-height: 0; opacity: 0; margin: 0; padding: 0; pointer-events: none; }
        .package-section.visible { max-height: 200px; opacity: 1; }
        .submit-row { display: flex; gap: 1rem; margin-top: 0.5rem; }
        .btn { padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-primary { background: var(--gradient); color: #fff; flex: 1; justify-content: center; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(59,130,246,0.3); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-reset { background: transparent; color: var(--muted); border: 1px solid var(--border); }
        .btn-reset:hover { border-color: var(--error); color: var(--error); }
        .alert { padding: 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.85rem; display: none; align-items: flex-start; gap: 0.75rem; }
        .alert.show { display: flex; }
        .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: var(--success); }
        .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--error); }
        .alert .msg { flex: 1; }
        .alert .close-btn { cursor: pointer; opacity: 0.7; font-size: 1.1rem; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .response-card { display: none; }
        .response-card.show { display: block; }
        .response-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
        .stat-box { background: var(--bg); border-radius: 10px; padding: 0.75rem; text-align: center; }
        .stat-box .stat-label { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-box .stat-value { font-size: 1.1rem; font-weight: 700; margin-top: 0.25rem; color: var(--primary); }
        @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } .branch-tabs { flex-direction: column; } }
    </style>
</head>
<body>
<div class="header" style="justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:.75rem;">
        <h1>🏥 Hospital MIS Reporting</h1>
        <span class="badge">v1.0</span>
    </div>
    <div style="display:flex;gap:.5rem;">
        <a href="/dashboard" style="padding:.4rem .8rem;border-radius:8px;font-size:.8rem;font-weight:500;color:var(--muted);text-decoration:none;border:1px solid var(--border);transition:all .2s;" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--text)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">📊 Dashboard</a>
        <a href="/" style="padding:.4rem .8rem;border-radius:8px;font-size:.8rem;font-weight:500;color:var(--text);text-decoration:none;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);">📁 Upload</a>
    </div>
</div>
<div class="container">
    <div id="alertSuccess" class="alert alert-success"><span class="msg"></span><span class="close-btn" onclick="this.parentElement.classList.remove('show')">&times;</span></div>
    <div id="alertError" class="alert alert-error"><span class="msg"></span><span class="close-btn" onclick="this.parentElement.classList.remove('show')">&times;</span></div>

    <div class="branch-tabs">
        <div class="branch-tab active" data-branch="chromepet" onclick="selectBranch('chromepet')">
            <div class="name">🏥 Chromepet</div>
            <div class="info">Beds: <span>74</span> · 3 files required</div>
        </div>
        <div class="branch-tab" data-branch="oragadam" onclick="selectBranch('oragadam')">
            <div class="name">🏥 Oragadam</div>
            <div class="info">Beds: <span>14</span> · 2 files required</div>
        </div>
    </div>

    <form id="uploadForm" enctype="multipart/form-data">
        <div class="card">
            <div class="card-title">📅 Report Date</div>
            <div class="form-row single">
                <div class="form-group">
                    <label>Date <span class="req">*</span></label>
                    <input type="date" name="date" id="dateInput" required>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📁 CSV / Excel Files</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bill Item File <span class="req">*</span></label>
                    <input type="file" name="bill_file" accept=".csv,.txt,.xlsx,.xls" required>
                    <span class="help">Bill Item Wise report</span>
                </div>
                <div class="form-group">
                    <label>Cashier Collection File <span class="req">*</span></label>
                    <input type="file" name="cashier_file" accept=".csv,.txt,.xlsx,.xls" required>
                    <span class="help">Cashier Collection report</span>
                </div>
            </div>
            <div class="package-section visible" id="packageSection">
                <div class="form-row single">
                    <div class="form-group">
                        <label>Package Consumption File <span class="req" id="pkgReqStar">*</span></label>
                        <input type="file" name="package_file" id="packageFileInput" accept=".csv,.txt,.xlsx,.xls">
                        <span class="help">Package Consumption report (Chromepet only)</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📊 Volume Indicators (FTD)</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Occupancy (Beds Occupied)</label>
                    <input type="number" name="occupancy" id="occupancyInput" min="0" placeholder="e.g. 52" oninput="calcOccupancyPct()">
                </div>
                <div class="form-group">
                    <label>Occupancy %</label>
                    <div class="calc-value" id="occupancyPctDisplay">—</div>
                    <input type="hidden" name="occupancy_pct" id="occupancyPctInput">
                    <span class="help">Auto: (Occupancy ÷ <span id="bedCountLabel">74</span>) × 100</span>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Admission</label>
                    <input type="number" name="admission" min="0" placeholder="0">
                </div>
                <div class="form-group">
                    <label>Discharge</label>
                    <input type="number" name="discharge" min="0" placeholder="0">
                </div>
            </div>
            <div class="form-row single">
                <div class="form-group">
                    <label>Total OP</label>
                    <input type="number" name="total_op" min="0" placeholder="0">
                </div>
            </div>
        </div>

        <div class="submit-row">
            <button type="submit" class="btn btn-primary" id="submitBtn">
                <span id="submitText">Upload & Generate MIS</span>
                <div class="spinner" id="submitSpinner"></div>
            </button>
            <button type="button" class="btn btn-reset" onclick="resetForm()">Reset</button>
        </div>
    </form>

    <div class="card response-card" id="responseCard">
        <div class="card-title">✅ Import Summary</div>
        <div class="response-grid" id="importStats"></div>
        <div style="margin-top:1rem">
            <a id="exportLink" class="btn btn-primary" style="text-decoration:none;display:inline-flex;font-size:0.8rem;padding:0.5rem 1rem;">📥 Download Excel</a>
        </div>
    </div>
</div>

<script>
const BED_COUNTS = { chromepet: 74, oragadam: 14 };
let currentBranch = 'chromepet';
document.getElementById('dateInput').max = new Date().toISOString().split('T')[0];

function selectBranch(branch) {
    currentBranch = branch;
    document.querySelectorAll('.branch-tab').forEach(t => t.classList.toggle('active', t.dataset.branch === branch));
    const pkg = document.getElementById('packageSection'), inp = document.getElementById('packageFileInput'), star = document.getElementById('pkgReqStar');
    if (branch === 'chromepet') { pkg.classList.remove('hidden'); pkg.classList.add('visible'); inp.required = true; star.style.display = 'inline'; }
    else { pkg.classList.add('hidden'); pkg.classList.remove('visible'); inp.required = false; inp.value = ''; star.style.display = 'none'; }
    document.getElementById('bedCountLabel').textContent = BED_COUNTS[branch];
    calcOccupancyPct();
}

function calcOccupancyPct() {
    const occ = parseInt(document.getElementById('occupancyInput').value) || 0;
    const beds = BED_COUNTS[currentBranch];
    const pct = beds > 0 ? ((occ / beds) * 100).toFixed(2) : 0;
    document.getElementById('occupancyPctDisplay').textContent = occ > 0 ? pct + '%' : '—';
    document.getElementById('occupancyPctInput').value = pct;
}

function resetForm() {
    document.getElementById('uploadForm').reset();
    document.getElementById('occupancyPctDisplay').textContent = '—';
    document.getElementById('responseCard').classList.remove('show');
    hideAlerts(); selectBranch('chromepet');
}

function hideAlerts() { document.getElementById('alertSuccess').classList.remove('show'); document.getElementById('alertError').classList.remove('show'); }
function showAlert(type, msg) { hideAlerts(); const el = document.getElementById(type === 'success' ? 'alertSuccess' : 'alertError'); el.querySelector('.msg').textContent = msg; el.classList.add('show'); }

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault(); hideAlerts();
    const btn = document.getElementById('submitBtn'), spinner = document.getElementById('submitSpinner'), text = document.getElementById('submitText');
    btn.disabled = true; spinner.style.display = 'block'; text.textContent = 'Processing...';
    const fd = new FormData(this); fd.append('branch', currentBranch);
    if (currentBranch !== 'chromepet') fd.delete('package_file');
    try {
        const r = await fetch('/api/mis/' + currentBranch + '/upload', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) { showAlert('success', j.message || 'Done!'); showResponse(j); }
        else { showAlert('error', j.message || (j.errors ? Object.values(j.errors).flat().join(', ') : 'Failed.')); }
    } catch(err) { showAlert('error', 'Network error: ' + err.message); }
    finally { btn.disabled = false; spinner.style.display = 'none'; text.textContent = 'Upload & Generate MIS'; }
});

function showResponse(j) {
    const card = document.getElementById('responseCard'), stats = document.getElementById('importStats'), imp = j.imported || {};
    let h = '<div class="stat-box"><div class="stat-label">Bill Items</div><div class="stat-value">' + (imp.bill_items||0).toLocaleString() + '</div></div>';
    h += '<div class="stat-box"><div class="stat-label">Collections</div><div class="stat-value">' + (imp.cashier_collections||0).toLocaleString() + '</div></div>';
    if (currentBranch === 'chromepet') h += '<div class="stat-box"><div class="stat-label">Packages</div><div class="stat-value">' + (imp.package_consumptions||0).toLocaleString() + '</div></div>';
    const d = j.data||{}, s = d.sales||{}, ftd = s.ftd||{};
    const tot = ((ftd.op||0)+(ftd.ip||0)+(ftd.er||0)+(ftd.ph||0)).toFixed(2);
    h += '<div class="stat-box"><div class="stat-label">FTD Sales</div><div class="stat-value">₹' + Number(tot).toLocaleString() + '</div></div>';
    stats.innerHTML = h; card.classList.add('show');
    document.getElementById('exportLink').href = '/api/mis/' + currentBranch + '/' + document.getElementById('dateInput').value + '/export';
}
</script>
</body>
</html>
