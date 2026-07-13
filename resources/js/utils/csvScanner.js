// ── Primary date column(s) per KareXpert report type ──────────────────────
// Checked in priority order against normalized CSV headers; first match wins.
// Keys match FILE_FIELD_MAP typeKey values in fileDetect.js.
const DATE_COLS_BY_TYPE = {
    bill_items: ['Bill Date Time',                'Bill Date'],
    cashier:    ['Receipt/Refund Date Time',       'Receipt Date Time',      'Collection Date'],
    er:         ['Admission Date Time',             'Admission Date'],
    ip:         ['Admission Date Time',             'Admission Date'],
    surgery:    ['Surgery Booking Date and Time',   'Surgery Start Date and Time', 'Surgery Scheduled Date Time'],
    package:    ['Bill Date Time',                  'Consumption Date Time',  'Order Date Time'],
};

// Fallback regex patterns for unrecognised file types, checked in order.
const FALLBACK_DATE_PATTERNS = [
    /^bill\s+date/i,
    /^receipt[^a-z]*date/i,
    /^admission\s+date/i,
    /^surgery[^a-z]+date/i,
    /^collection\s+date/i,
    /\bdate\b/i,
];

// Normalize a header string so "Bill Date Time", "bill date time", "Bill  Date  Time"
// all compare equal.
const normalizeHeader = s => s.replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

// KareXpert date format: "01/06/2026, 09:30 am" or "01/06/2026" or "2026-06-01"
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

/**
 * Scan an entire CSV file for the earliest and latest business dates.
 *
 * Uses file-type-specific column selection so the correct business date is
 * always targeted (e.g. "Receipt/Refund Date Time" for cashier, not whatever
 * date column happens to appear first in the headers).
 *
 * The entire file is read — no byte cap, no row cap — so a 30-day CSV
 * spanning June 1–30 is guaranteed to detect June 1 as the minimum.
 *
 * @param {File}         file    Browser File object
 * @param {string|null}  typeKey Report type key from FILE_FIELD_MAP
 *                               ('bill_items' | 'cashier' | 'er' | 'ip' | 'surgery' | 'package')
 * @returns {Promise<{min: number|null, max: number|null, col: string|null}>}
 */
export function scanCsvFile(file, typeKey = null) {
    return new Promise((resolve) => {
        const reader  = new FileReader();
        reader.onload = (e) => {
            try {
                const text    = e.target.result;
                const lines   = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) return resolve({ min: null, max: null, col: null });

                // Parse headers; keep original casing for display, normalise for matching.
                const rawHeaders  = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const normHeaders = rawHeaders.map(normalizeHeader);

                let colIdx  = -1;
                let colName = null;

                // 1. Try file-type-specific columns in declared priority order.
                for (const target of (DATE_COLS_BY_TYPE[typeKey] ?? [])) {
                    const normTarget = normalizeHeader(target);
                    const idx = normHeaders.findIndex(h => h === normTarget);
                    if (idx !== -1) { colIdx = idx; colName = rawHeaders[idx]; break; }
                }

                // 2. If still not found, fall back to generic regex patterns.
                if (colIdx === -1) {
                    for (const pat of FALLBACK_DATE_PATTERNS) {
                        const idx = rawHeaders.findIndex(h => pat.test(h));
                        if (idx !== -1) { colIdx = idx; colName = rawHeaders[idx]; break; }
                    }
                }

                if (colIdx === -1) return resolve({ min: null, max: null, col: null });

                // 3. Scan ALL data rows — no row cap or byte cap.
                let minTs = Infinity, maxTs = -Infinity;
                for (let i = 1; i < lines.length; i++) {
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
        reader.readAsText(file);  // Read the complete file — no byte slice.
    });
}
