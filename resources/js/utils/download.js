/**
 * Fetch a blob via fetchFn, then trigger a browser download.
 * fetchFn must return an axios response (response.data is the raw bytes).
 * Optional callbacks:
 *   onStart  — called before the fetch begins
 *   onEnd    — called in finally (success or failure)
 *   onError  — called with the error on failure; if omitted falls back to alert()
 */
export const triggerDownload = async (fetchFn, filename, onStart, onEnd, onError) => {
    onStart?.();
    try {
        const res = await fetchFn();
        const url = URL.createObjectURL(new Blob([res.data]));
        const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch (err) {
        if (onError) {
            onError(err);
        } else {
            alert('Download failed — please try again.');
        }
    } finally {
        onEnd?.();
    }
};
