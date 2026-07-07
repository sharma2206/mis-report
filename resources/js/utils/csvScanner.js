// ── Date column patterns (KareXpert CSV headers) ─────────────────────────────
export const DATE_COL_PATTERNS = [
    /^bill\s*date/i,
    /^bill\s*date\s*time/i,
    /^admission\s*date/i,
    /^discharge\s*date/i,
    /^visit\s*date/i,
    /^surgery\s*date/i,
    /^collection\s*date/i,
    /^procedure\s*date/i,
    /^transaction\s*date/i,
    /^created\s*at/i,
    /\bdate\b/i,
];

// KareXpert CSV date format: "05/07/2026, 11:48 pm" or "05/07/2026"
export function parseKareDate(raw) {
    if (!raw) return null;
    const s = raw.trim().replace(/"/g, '');
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m1) {
        const [, d, mo, y] = m1;
        const ts = Date.UTC(+y, +mo - 1, +d);
        return isNaN(ts) ? null : ts;
    }
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const [, y, mo, d] = m2;
        const ts = Date.UTC(+y, +mo - 1, +d);
        return isNaN(ts) ? null : ts;
    }
    return null;
}

export function fmtDMY(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export function tsToYMD(ts) {
    const d   = new Date(ts);
    const y   = d.getUTCFullYear();
    const m   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Read first ~100 KB of a File, parse headers and date column range.
export function scanCsvFile(file, maxRows = 200) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text    = e.target.result;
                const lines   = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) return resolve({ min: null, max: null, col: null });

                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                let colIdx    = -1;
                let colName   = null;
                for (const pat of DATE_COL_PATTERNS) {
                    colIdx = headers.findIndex(h => pat.test(h));
                    if (colIdx !== -1) { colName = headers[colIdx]; break; }
                }
                if (colIdx === -1) return resolve({ min: null, max: null, col: null });

                let minTs = Infinity, maxTs = -Infinity;
                const limit = Math.min(lines.length, maxRows + 1);
                for (let i = 1; i < limit; i++) {
                    const cells = lines[i].split(',');
                    const ts    = parseKareDate(cells[colIdx]);
                    if (ts !== null) {
                        if (ts < minTs) minTs = ts;
                        if (ts > maxTs) maxTs = ts;
                    }
                }
                resolve({
                    min: minTs === Infinity  ? null : minTs,
                    max: maxTs === -Infinity ? null : maxTs,
                    col: colName,
                });
            } catch {
                resolve({ min: null, max: null, col: null });
            }
        };
        reader.onerror = () => resolve({ min: null, max: null, col: null });
        reader.readAsText(file.slice(0, 1024 * 100));
    });
}
