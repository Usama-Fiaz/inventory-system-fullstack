import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import reportReducer from './slices/reportSlice';

/**
 * Global Redux store for the dashboard.
 *
 * - **session**: clientId/jobId parsed from the URL query string
 * - **report**: readScan response JSON (stored in memory, not on disk)
 */
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    report: reportReducer,
  },
});

// Helpful types (JS project, but keeps tooling happy if needed)
export const selectRootState = (state) => state;
