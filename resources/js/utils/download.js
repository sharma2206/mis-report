/**
 * Fetch a blob via fetchFn, then trigger a browser download.
 * fetchFn must return an axios response (response.data is the raw bytes).
 * Optional onStart/onEnd callbacks are called before / after the fetch.
 */
export const triggerDownload = async (fetchFn, filename, onStart, onEnd) => {
    onStart?.();
    try {
        const res = await fetchFn();
        const url = URL.createObjectURL(new Blob([res.data]));
        const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch {
        alert('Download failed — please try again.');
    } finally {
        onEnd?.();
    }
};
