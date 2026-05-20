/**
 * job_id cache using sessionStorage.
 * - Persists across page navigation and refresh within the same tab.
 * - Clears when tab/window closes (sessionStorage behavior).
 * - Supports TTL so cached job_id expires after a while.
 */

const CACHE_KEY = '__INVENTORY_JOB_ID_CACHE__';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Save job_id to sessionStorage with TTL.
 * @param {string | null} jobId - job_id to cache (null clears)
 * @param {number} [ttlMs] - time-to-live in ms (default 1 hour)
 */
export function saveJobId(jobId, ttlMs = DEFAULT_TTL_MS) {
  try {
    if (!jobId) {
      sessionStorage.removeItem(CACHE_KEY);
      return;
    }
    const expiresAt = Date.now() + ttlMs;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ jobId: String(jobId), expiresAt }));
  } catch {
    // ignore (private mode / disabled storage)
  }
}

/**
 * Get job_id from cache if not expired.
 * @returns {string | null} - cached job_id or null if expired/missing
 */
export function getValidJobId() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { jobId, expiresAt } = JSON.parse(raw);
    if (!jobId || !expiresAt) return null;
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return jobId;
  } catch {
    return null;
  }
}

/**
 * Clear the job_id cache (e.g. on logout).
 */
export function clearJobIdCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
