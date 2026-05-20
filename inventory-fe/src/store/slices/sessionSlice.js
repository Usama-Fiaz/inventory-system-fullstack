import { createSlice } from '@reduxjs/toolkit';

/**
 * Session slice
 * Stores the `clientId` and `jobId` extracted from the dashboard URL:
 *   /dashboard?clientid=123&jobid=abc123
 */
const sessionSlice = createSlice({
  name: 'session',
  initialState: {
    clientId: null,
    jobId: null,
  },
  reducers: {
    /**
     * Set session identifiers coming from URL query params.
     */
    setSessionFromUrl(state, action) {
      state.clientId = action.payload?.clientId ?? null;
      state.jobId = action.payload?.jobId ?? null;
    },
    clearSession(state) {
      state.clientId = null;
      state.jobId = null;
    },
  },
});

export const { setSessionFromUrl, clearSession } = sessionSlice.actions;

// Selectors
export const selectClientId = (state) => state.session.clientId;
export const selectJobId = (state) => state.session.jobId;
export const selectSession = (state) => state.session;

export default sessionSlice.reducer;
