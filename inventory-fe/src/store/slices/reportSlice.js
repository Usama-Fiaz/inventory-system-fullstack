import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

/**
 * Report slice
 * Fetches the report JSON from the backend readScan API and stores it in Redux.
 *
 * IMPORTANT:
 * - The frontend UI does NOT read/import `src/report.json`.
 * - Redux is the single source of truth for the UI.
 * - In DEV, the Vite server writes a snapshot to `src/report.json` when `/api/readScan` is called.
 */

// Report cache: job-specific + "latest" (no job_id). On refresh, use cache if fetch fails.
const REPORT_CACHE_KEY = '__COREFENSE_REPORT_CACHE__';
const CACHE_LATEST = '__latest__';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000);

const FLIP_PATCHED_PERCENT = 0.1;

/** Simple seeded RNG: same seed → same sequence. Used so same job_id always yields same flips. */
function createSeededRng(seedStr) {
  let h = 0;
  const s = String(seedStr ?? 'latest');
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(h) || 1;
  return function next() {
    const x = Math.sin(seed * (h + 1)) * 10000;
    h = (h + 1) | 0;
    return x - Math.floor(x);
  };
}

/**
 * Flips ~10% of Patched issues to Unpatched. Severity and all other fields are preserved.
 * Uses a seeded RNG from jobId so same job_id always produces the same flips (deterministic, persistent).
 * Returns a new report object (does not mutate input).
 */
function flipSomePatchedToUnpatched(report, jobId) {
  if (!report?.cve?.package || !Array.isArray(report.cve.package)) return report;
  const seed =
    jobId ??
    report?.report?.job_id ??
    report?.job_id ??
    'latest';
  const rng = createSeededRng(String(seed));
  const cloned = JSON.parse(JSON.stringify(report));
  const packages = cloned.cve.package;

  const patchedRefs = [];
  for (let i = 0; i < packages.length; i++) {
    const issues = packages[i].issue;
    if (!Array.isArray(issues)) continue;
    for (let j = 0; j < issues.length; j++) {
      if (issues[j]?.status === 'Patched') {
        patchedRefs.push({ pkgIndex: i, issueIndex: j });
      }
    }
  }

  if (patchedRefs.length === 0) return cloned;
  const toFlip = Math.max(1, Math.floor(patchedRefs.length * FLIP_PATCHED_PERCENT));
  for (let k = 0; k < toFlip; k++) {
    const idx = k + Math.floor(rng() * (patchedRefs.length - k));
    [patchedRefs[k], patchedRefs[idx]] = [patchedRefs[idx], patchedRefs[k]];
  }
  for (let k = 0; k < toFlip; k++) {
    const { pkgIndex, issueIndex } = patchedRefs[k];
    cloned.cve.package[pkgIndex].issue[issueIndex].status = 'Unpatched';
  }
  return cloned;
}

/** Decode JWT payload (base64) and extract client_id. No verification. */
function parseClientIdFromJwt(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const parts = tokenString.replace(/^Bearer\s+/i, '').trim().split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload?.client_id ?? null;
  } catch {
    return null;
  }
}

function safeCacheReport(jobId, report) {
  try {
    if (!report) return;
    const key = jobId ? String(jobId) : CACHE_LATEST;
    const raw = localStorage.getItem(REPORT_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[key] = report;
    localStorage.setItem(REPORT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function safeLoadCachedReport(jobId) {
  try {
    const raw = localStorage.getItem(REPORT_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key = jobId ? String(jobId) : CACHE_LATEST;
    return cache[key] ?? null;
  } catch {
    return null;
  }
}

export const signInAndLoadReport = createAsyncThunk(
  'report/signInAndLoadReport',
  /**
   * @param {{identifier: string, password: string, jobId?: string | null}} args
   */
  async ({ identifier, password, jobId }, thunkApi) => {
    try {
      // Per requirement: never send job_id on sign-in. Sign-in only authenticates and returns latest report.
      // Job-specific report (if any) is fetched separately via readScan/validateSession after sign-in.
      const url = `/api/signIn`;

      if (import.meta.env.DEV) console.log('[Redux] Calling signIn:', { url, hasJobId: !!jobId });

      // Send only the credential type the user entered: email if it contains @, else client_id
      const isEmail = typeof identifier === 'string' && identifier.includes('@');
      const body = isEmail
        ? { email: identifier, password }
        : { client_id: identifier, password };

      const res = await axios.post(
        url,
        body,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          timeout: API_TIMEOUT_MS,
        }
      );

      const payload = res.data;
      const reportDiffs = payload?.report_diffs ?? null;
      const reportTimestamp =
        payload?.timestamp ?? payload?.report?.timestamp ?? null;
      let report = payload?.report ?? payload;
      if (report) {
        report = flipSomePatchedToUnpatched(report, jobId ?? report?.report?.job_id ?? report?.job_id ?? null);
        // Cache as "latest" because sign-in no longer fetches job-specific reports.
        safeCacheReport(null, report);
      }

      // Extract JWT and client_id from JWT payload (profile dropdown shows client_id whether user logged in with email or client_id)
      const token = res.headers?.['authorization'] ?? res.headers?.['Authorization'];
      const clientId = parseClientIdFromJwt(token);
      return { report, reportDiffs, reportTimestamp, token, clientId };
    } catch (err) {
      if (import.meta.env.DEV && axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          console.error(`[Redux] signIn timed out (${API_TIMEOUT_MS}ms)`);
        } else {
          console.error('[Redux] signIn error:', err);
        }
      }
      const status = err?.response?.status;
      const userMessage =
        err?.code === 'ECONNABORTED'
          ? 'Request timed out'
          : status === 401
            ? 'Invalid credentials'
            : err?.response?.data?.error || err?.message || 'Failed to sign in';
      return thunkApi.rejectWithValue(userMessage);
    }
  }
);

/**
 * Fetches report using existing session (cookies).
 * jobId: specific job, or null for latest. On failure, falls back to cached report.
 */
export const fetchReportForSession = createAsyncThunk(
  'report/fetchReportForSession',
  async (jobId, thunkApi) => {
    try {
      const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
      const url = `/api/readScan${qs}`;

      if (import.meta.env.DEV) console.log('[Redux] fetchReportForSession:', url);

      const res = await axios.get(url, {
        withCredentials: true,
        timeout: API_TIMEOUT_MS,
      });

      const payload = res.data;
      const reportDiffs = payload?.report_diffs ?? null;
      const reportTimestamp =
        payload?.timestamp ?? payload?.report?.timestamp ?? null;
      let report = payload?.report ?? payload;
      if (report) {
        report = flipSomePatchedToUnpatched(report, jobId ?? null);
        safeCacheReport(jobId ?? null, report);
      }
      return { report, reportDiffs, reportTimestamp, jobId: jobId ?? null };
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Redux] fetchReportForSession error:', err);
      // Fallback: use cached report so we never show "Failed to load report" when we have data
      const cached = safeLoadCachedReport(jobId ?? null);
      if (cached) {
        if (import.meta.env.DEV) console.log('[Redux] Using cached report');
        return {
          report: cached,
          reportDiffs: null,
          reportTimestamp: null,
          jobId: jobId ?? null,
        };
      }
      const status = err?.response?.status;
      const msg =
        status === 401
          ? 'Session expired'
          : err?.response?.data?.error || err?.message || 'Failed to fetch report';
      return thunkApi.rejectWithValue(msg);
    }
  }
);

const reportSlice = createSlice({
  name: 'report',
  initialState: {
    data: null,
    reportDiffs: null,
    /** Scan time for the current (target) report; API may send this at payload root as `timestamp`. */
    reportTimestamp: null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    lastFetchKey: null,
    /** jobId we last successfully fetched (null = latest). Used to refetch when URL job_id changes. */
    lastFetchedJobId: null,
  },
  reducers: {
    /**
     * Records the last (clientId, jobId) pair we attempted to fetch.
     * This is used to prevent calling the API again and again.
     */
    setLastFetchKey(state, action) {
      state.lastFetchKey = action.payload ?? null;
    },
    clearReport(state) {
      state.data = null;
      state.reportDiffs = null;
      state.reportTimestamp = null;
      state.status = 'idle';
      state.error = null;
      state.lastFetchKey = null;
      state.lastFetchedJobId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInAndLoadReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signInAndLoadReport.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { report, reportDiffs, reportTimestamp } = action.payload ?? {};
        state.data = report ?? null;
        // Some backend responses may omit report_diffs; do not clobber existing diffs with null.
        state.reportDiffs = reportDiffs ?? state.reportDiffs ?? null;
        if (reportTimestamp != null) {
          state.reportTimestamp = reportTimestamp;
        } else if (!report) {
          state.reportTimestamp = null;
        }
        state.lastFetchedJobId = null; // sign-in returns latest
      })
      .addCase(signInAndLoadReport.rejected, (state, action) => {
        if (!state.data) state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Failed';
      })
      .addCase(fetchReportForSession.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReportForSession.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { report, reportDiffs, reportTimestamp, jobId } =
          action.payload ?? {};
        state.data = report ?? null;
        // Keep previous diffs if this fetch did not include report_diffs.
        state.reportDiffs = reportDiffs ?? state.reportDiffs ?? null;
        if (reportTimestamp != null) {
          state.reportTimestamp = reportTimestamp;
        } else if (!report) {
          state.reportTimestamp = null;
        }
        state.lastFetchedJobId = jobId ?? null;
      })
      .addCase(fetchReportForSession.rejected, (state, action) => {
        if (!state.data) state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Failed';
      });
  },
});

export const { clearReport, setLastFetchKey } = reportSlice.actions;

// Selectors
export const selectReport = (state) => state.report.data;
export const selectReportDiffs = (state) => state.report.reportDiffs;
export const selectReportTimestamp = (state) => state.report.reportTimestamp;
export const selectReportStatus = (state) => state.report.status;
export const selectReportError = (state) => state.report.error;
export const selectLastFetchKey = (state) => state.report.lastFetchKey;
export const selectLastFetchedJobId = (state) => state.report.lastFetchedJobId;

export default reportSlice.reducer;
