import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuthContext } from '@/context/useAuthContext';
import { setSessionFromUrl, selectSession } from '@/store/slices/sessionSlice';
import {
  selectReport,
  selectReportStatus,
  selectLastFetchedJobId,
  fetchReportForSession,
} from '@/store/slices/reportSlice';
import { saveJobId, getValidJobId } from '@/lib/jobIdCache';

// clientId survives refresh; job_id uses sessionStorage (clears on tab close)
const SESSION_STORAGE_KEY = '__COREFENSE_SESSION__';

function safeLoadClientIdFromStorage() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.clientId ? String(parsed.clientId) : null;
  } catch {
    return null;
  }
}

function safeSaveClientIdToStorage(clientId) {
  try {
    if (clientId) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ clientId }));
    }
  } catch {
    // ignore
  }
}

/**
 * DashboardBootstrap
 *
 * Flow:
 * 1) URL has job_id → always fetch that job, cache it (sessionStorage + TTL)
 * 2) No job_id in URL → use valid cached job_id (for nav/refresh within same tab)
 * 3) No valid cache (expired or tab closed) → fetch latest
 * 4) sessionStorage clears on tab close → returning user gets latest
 */
export default function DashboardBootstrap() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuthContext();

  const session = useSelector(selectSession);
  const reportStatus = useSelector(selectReportStatus);
  const report = useSelector(selectReport);
  const lastFetchedJobId = useSelector(selectLastFetchedJobId);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdFromUrl =
      params.get('jobid') ?? params.get('jobId') ?? params.get('job_id') ?? null;

    // Priority 1: URL has job_id → use it, save to cache (sessionStorage + TTL)
    if (jobIdFromUrl) {
      saveJobId(jobIdFromUrl);
      const clientId = session?.clientId ?? safeLoadClientIdFromStorage();
      safeSaveClientIdToStorage(clientId);
      dispatch(setSessionFromUrl({ clientId, jobId: jobIdFromUrl }));
      if (import.meta.env.DEV) console.log('[Bootstrap] job_id from URL:', jobIdFromUrl);
      return;
    }

    // Priority 2: No job_id in URL → use valid cached job_id or null (latest)
    const cachedJobId = getValidJobId();
    const clientId = session?.clientId ?? safeLoadClientIdFromStorage();
    if (clientId) safeSaveClientIdToStorage(clientId);
    dispatch(
      setSessionFromUrl({
        clientId: clientId ?? session?.clientId ?? null,
        jobId: cachedJobId,
      })
    );
    if (import.meta.env.DEV) {
      console.log('[Bootstrap] No job_id in URL, effective:', cachedJobId ?? 'latest');
    }
  }, [location.search, dispatch, session?.clientId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (reportStatus === 'loading') return;
    if (reportStatus === 'failed') return;

    const params = new URLSearchParams(location.search);
    const jobIdFromUrl =
      params.get('jobid') ?? params.get('jobId') ?? params.get('job_id') ?? null;

    // Effective job: URL first, then valid cache, else null (latest)
    const effectiveJobId = jobIdFromUrl ?? getValidJobId();

    const needFetch = !report || lastFetchedJobId !== effectiveJobId;
    if (!needFetch) return;

    dispatch(fetchReportForSession(effectiveJobId));
  }, [isAuthenticated, report, reportStatus, lastFetchedJobId, location.search, dispatch]);

  return null;
}

