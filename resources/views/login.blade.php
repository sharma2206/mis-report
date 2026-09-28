<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — Hospital MIS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

        :root {
            --primary: #1d4ed8;
            --primary-dark: #1e3a8a;
            --accent: #7c3aed;
            --success: #059669;
            --danger: #dc2626;
            --danger-light: #fee2e2;
            --border: #e2e8f0;
            --text: #0f172a;
            --text-2: #334155;
            --muted: #64748b;
            --grad: linear-gradient(135deg, #1d4ed8, #7c3aed);
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            min-height: 100vh;
            display: grid;
            grid-template-columns: 1fr 1fr;
            -webkit-font-smoothing: antialiased;
        }

        /* ── Left panel ── */
        .panel-left {
            background: #0f172a;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 2.5rem;
            position: relative;
            overflow: hidden;
        }

        .panel-left::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 20% 50%, rgba(29,78,216,.35) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(124,58,237,.25) 0%, transparent 55%);
        }

        .panel-left > * { position: relative; z-index: 1 }

        .brand {
            display: flex;
            align-items: center;
            gap: .75rem;
        }

        .brand-logo {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: var(--grad);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 20px rgba(29,78,216,.35);
        }

        .brand-logo .material-icons-round { color: #fff; font-size: 22px }

        .brand-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: #fff;
        }

        .brand-tag {
            font-size: .6rem;
            padding: .1rem .45rem;
            border-radius: 4px;
            background: rgba(255,255,255,.1);
            color: rgba(255,255,255,.5);
            font-weight: 600;
            letter-spacing: .05em;
        }

        .hero {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem 0;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: .4rem;
            padding: .35rem .75rem;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.06);
            font-size: .72rem;
            font-weight: 600;
            color: rgba(255,255,255,.6);
            margin-bottom: 1.5rem;
            width: fit-content;
        }

        .hero-badge .material-icons-round { font-size: 14px; color: #60a5fa }

        .hero h1 {
            font-size: 2.4rem;
            font-weight: 800;
            color: #fff;
            line-height: 1.15;
            letter-spacing: -.04em;
            margin-bottom: .85rem;
        }

        .hero h1 span {
            background: var(--grad);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero p {
            font-size: .9rem;
            color: rgba(255,255,255,.5);
            line-height: 1.65;
            max-width: 360px;
        }

        .feature-list {
            display: flex;
            flex-direction: column;
            gap: .65rem;
            margin-top: 2rem;
        }

        .feature-item {
            display: flex;
            align-items: center;
            gap: .65rem;
            font-size: .82rem;
            color: rgba(255,255,255,.55);
        }

        .feature-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #60a5fa;
            flex-shrink: 0;
        }

        .panel-footer {
            font-size: .72rem;
            color: rgba(255,255,255,.25);
        }

        /* ── Right panel ── */
        .panel-right {
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .login-card {
            width: 100%;
            max-width: 400px;
        }

        .login-header {
            margin-bottom: 2rem;
        }

        .login-header h2 {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--text);
            letter-spacing: -.03em;
            margin-bottom: .35rem;
        }

        .login-header p {
            font-size: .85rem;
            color: var(--muted);
        }

        /* Error banner */
        .err-banner {
            display: none;
            align-items: center;
            gap: .55rem;
            background: var(--danger-light);
            border: 1px solid rgba(220,38,38,.2);
            color: var(--danger);
            border-radius: 10px;
            padding: .75rem 1rem;
            font-size: .83rem;
            font-weight: 500;
            margin-bottom: 1.25rem;
            animation: slideDown .2s ease;
        }

        .err-banner.show { display: flex }
        .err-banner .material-icons-round { font-size: 18px; flex-shrink: 0 }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-6px) }
            to   { opacity: 1; transform: translateY(0) }
        }

        /* Form fields */
        .field {
            margin-bottom: 1.1rem;
        }

        .field label {
            display: block;
            font-size: .78rem;
            font-weight: 600;
            color: var(--text-2);
            margin-bottom: .4rem;
        }

        .field-wrap {
            position: relative;
        }

        .field-icon {
            position: absolute;
            left: .85rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--muted);
            font-size: 19px;
            pointer-events: none;
            transition: color .15s;
        }

        .field input {
            width: 100%;
            padding: .78rem 1rem .78rem 2.75rem;
            border: 1.5px solid var(--border);
            border-radius: 10px;
            font-size: .88rem;
            font-family: inherit;
            color: var(--text);
            background: #fff;
            outline: none;
            transition: border .15s, box-shadow .15s;
        }

        .field input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(29,78,216,.1);
        }

        .field input:focus + .field-icon,
        .field-wrap:focus-within .field-icon {
            color: var(--primary);
        }

        .field input.err { border-color: var(--danger) }

        .pw-toggle {
            position: absolute;
            right: .85rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--muted);
            display: flex;
            align-items: center;
            padding: 0;
            transition: color .15s;
        }

        .pw-toggle:hover { color: var(--text) }
        .pw-toggle .material-icons-round { font-size: 19px }

        /* Submit */
        .btn-submit {
            width: 100%;
            padding: .85rem;
            background: var(--grad);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: .92rem;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .5rem;
            transition: opacity .15s, transform .1s, box-shadow .15s;
            box-shadow: 0 4px 14px rgba(29,78,216,.3);
            margin-top: 1.5rem;
        }

        .btn-submit:hover { opacity: .93; box-shadow: 0 6px 20px rgba(29,78,216,.4); transform: translateY(-1px) }
        .btn-submit:active { transform: translateY(0) }
        .btn-submit:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none }

        .spinner {
            width: 17px;
            height: 17px;
            border: 2.5px solid rgba(255,255,255,.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin .6s linear infinite;
            display: none;
        }

        @keyframes spin { to { transform: rotate(360deg) } }

        .login-footer {
            margin-top: 1.75rem;
            text-align: center;
            font-size: .75rem;
            color: var(--muted);
        }

        /* Responsive */
        @media (max-width: 768px) {
            body { grid-template-columns: 1fr }
            .panel-left { display: none }
            .panel-right { padding: 2rem 1.5rem; align-items: flex-start; padding-top: 3rem }
        }
    </style>
</head>
<body>

<!-- ── Left branding panel ── -->
<div class="panel-left">
    <div class="brand">
        <div class="brand-logo"><span class="material-icons-round">local_hospital</span></div>
        <span class="brand-name">Hospital MIS</span>
        <span class="brand-tag">v2.0</span>
    </div>

    <div class="hero">
        <div class="hero-badge">
            <span class="material-icons-round">verified</span>
            Management Information System
        </div>
        <h1>Your daily<br><span>hospital intelligence</span><br>at a glance.</h1>
        <p>Real-time revenue, collections, occupancy, and patient analytics — across all branches, all in one place.</p>
        <div class="feature-list">
            <div class="feature-item"><div class="feature-dot"></div>FTD & MTD revenue breakdown by category</div>
            <div class="feature-item"><div class="feature-dot"></div>Bed occupancy, admissions & discharge tracking</div>
            <div class="feature-item"><div class="feature-dot"></div>Payer mix, pharmacy, and package analytics</div>
            <div class="feature-item"><div class="feature-dot"></div>Automated daily, weekly & monthly email reports</div>
        </div>
    </div>

    <div class="panel-footer">© {{ date('Y') }} Hospital MIS · Chromepet & Oragadam</div>
</div>

<!-- ── Right login panel ── -->
<div class="panel-right">
    <div class="login-card">
        <div class="login-header">
            <h2>Welcome back</h2>
            <p>Sign in with your MIS credentials to continue</p>
        </div>

        <div class="err-banner" id="errBanner">
            <span class="material-icons-round">error_outline</span>
            <span id="errMsg">Invalid email or password.</span>
        </div>

        <form onsubmit="doLogin(event)" autocomplete="on" novalidate>
            <div class="field">
                <label for="email">Email address</label>
                <div class="field-wrap">
                    <input type="email" id="email" name="email" placeholder="you@hospital.com"
                        autocomplete="username" required>
                    <span class="material-icons-round field-icon">alternate_email</span>
                </div>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <div class="field-wrap">
                    <input type="password" id="password" name="password" placeholder="••••••••"
                        autocomplete="current-password" required>
                    <span class="material-icons-round field-icon">lock_outline</span>
                    <button type="button" class="pw-toggle" onclick="togglePw()" tabindex="-1" title="Show/hide password">
                        <span class="material-icons-round" id="pwIcon">visibility_off</span>
                    </button>
                </div>
            </div>

            <button type="submit" class="btn-submit" id="submitBtn">
                <span id="btnText">Sign In</span>
                <div class="spinner" id="spinner"></div>
                <span class="material-icons-round" id="btnArrow" style="font-size:19px">arrow_forward</span>
            </button>
        </form>

        <div class="login-footer">
            Hospital MIS · Internal use only
        </div>
    </div>
</div>

<script>
    // Already logged in → go to upload
    if (localStorage.getItem('mis_token')) {
        window.location.replace('/upload');
    }

    function togglePw() {
        const inp  = document.getElementById('password');
        const icon = document.getElementById('pwIcon');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.textContent = 'visibility';
        } else {
            inp.type = 'password';
            icon.textContent = 'visibility_off';
        }
    }

    function showErr(msg) {
        document.getElementById('errMsg').textContent = msg;
        document.getElementById('errBanner').classList.add('show');
    }

    function hideErr() {
        document.getElementById('errBanner').classList.remove('show');
    }

    async function doLogin(e) {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn      = document.getElementById('submitBtn');
        const spinner  = document.getElementById('spinner');
        const btnText  = document.getElementById('btnText');
        const btnArrow = document.getElementById('btnArrow');

        hideErr();

        if (!email || !password) {
            showErr('Please enter your email and password.');
            return;
        }

        btn.disabled = true;
        spinner.style.display = 'block';
        btnText.textContent = 'Signing in…';
        btnArrow.style.display = 'none';

        try {
            const res = await fetch('/api/auth/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body:    JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.success && data.token) {
                localStorage.setItem('mis_token', data.token);
                localStorage.setItem('mis_user',  JSON.stringify(data.user));
                window.location.replace('/upload');
            } else {
                const msg = data.errors?.email?.[0] || data.message || 'Invalid credentials. Please try again.';
                showErr(msg);
                document.getElementById('email').classList.add('err');
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        } catch (err) {
            showErr('Network error — please check your connection and try again.');
        } finally {
            btn.disabled = false;
            spinner.style.display = 'none';
            btnText.textContent = 'Sign In';
            btnArrow.style.display = '';
        }
    }

    // Clear error state when user starts typing
    document.getElementById('email').addEventListener('input', function() {
        this.classList.remove('err');
        hideErr();
    });
    document.getElementById('password').addEventListener('input', hideErr);
</script>
</body>
</html>
