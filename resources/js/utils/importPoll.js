import { misApi } from '../services/api';

/**
 * Poll import status until every uploaded type has left the processing state.
 * Used when the API queues the import instead of finishing inside the request.
 */
export async function waitForImport(branch, typeKeys, { intervalMs = 2000, timeoutMs = 120000 } = {}) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
        const { data } = await misApi.importStatus(branch);
        const rows = typeKeys.map((key) => data?.data?.[key]).filter(Boolean);
        const settled = rows.length === typeKeys.length
            && rows.every((row) => row.status && row.status !== 'processing' && row.status !== 'pending');

        if (settled) {
            return data;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const error = new Error('Import is still processing. It will finish in the background.');
    error.code = 'IMPORT_TIMEOUT';
    throw error;
}
