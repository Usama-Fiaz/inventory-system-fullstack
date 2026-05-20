import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

// Backend origin (Vite dev server will call this; browser will call /api/*).
// Prefer setting COREFENSE_BACKEND_ORIGIN in .env/.env.local.
// Fallback points to backend host used in your environment.
const DEFAULT_BACKEND_ORIGIN = 'http://10.0.0.3:8082';

// Backend path for "get report with session cookie". Auth doc proposes validateSession.
// Use readScan if that's what your backend has. Override: COREFENSE_READSCAN_PATH=validateSession
const READSCAN_BACKEND_PATH =
  (process.env.COREFENSE_READSCAN_PATH || '').trim() || 'readScan';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SRC_REPORT_PATH = join(__dirname, '..', 'src', 'report.json');

function getBackendOrigin() {
  const configured = (process.env.COREFENSE_BACKEND_ORIGIN || '').trim();
  if (!configured) {
    console.warn(
      `[vite-proxy] COREFENSE_BACKEND_ORIGIN is not set; using default ${DEFAULT_BACKEND_ORIGIN}`
    );
  }
  return configured || DEFAULT_BACKEND_ORIGIN;
}

function forwardSetCookie(axiosResponse, res) {
  const setCookie = axiosResponse?.headers?.['set-cookie'];
  const out = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  if (out.length) res.setHeader('set-cookie', out);
}

/**
 * Vite plugin that adds /api endpoints (dev only).
 *
 * Current flow:
 * - Frontend calls `/api/signIn` (POST) or `/api/validateSession` (GET)
 * - Vite server calls backend
 * - Vite server writes the latest report snapshot to `src/report.json`
 * - Vite server returns the report JSON to the frontend (Redux stores it)
 *
 * IMPORTANT:
 * - Frontend does NOT read/import `src/report.json`.
 * - This write is for keeping a local snapshot only.
 */
export default function reportFetchPlugin() {
  return {
    name: 'report-fetch',
    configureServer(server) {
      const signInProxyHandler = async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const jobId = url.searchParams.get('job_id');

          const backendUrl = new URL('/signIn', getBackendOrigin());
          if (jobId) backendUrl.searchParams.set('job_id', jobId);

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              console.log('[vite-proxy] signIn ->', backendUrl.toString());

              const response = await axios.post(backendUrl.toString(), body || '{}', {
                headers: {
                  'content-type': req.headers['content-type'] || 'application/json',
                  cookie: req.headers.cookie || '',
                },
                maxRedirects: 0,
                validateStatus: () => true,
              });

              forwardSetCookie(response, res);
              const authHeader = response.headers?.['authorization'];
              if (authHeader) res.setHeader('Authorization', authHeader);

              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');

              if (response.status < 200 || response.status >= 300) {
                res.end(
                  typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data || { error: 'signIn failed' })
                );
                return;
              }

              const payload = response.data;
              const report = payload?.report ?? payload;

              writeFileSync(SRC_REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
              res.end(JSON.stringify(payload));
            } catch (proxyErr) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: String(proxyErr?.message || proxyErr) }));
            }
          });
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      };

      const readScanProxyHandler = async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const jobId = url.searchParams.get('job_id');

          const backendUrl = new URL(`/${READSCAN_BACKEND_PATH}`, getBackendOrigin());
          if (jobId) backendUrl.searchParams.set('job_id', jobId);

          console.log('[vite-proxy] readScan ->', backendUrl.toString());

          const response = await axios.get(backendUrl.toString(), {
            headers: {
              cookie: req.headers.cookie || '',
              authorization: req.headers.authorization || '',
            },
            maxRedirects: 0,
            validateStatus: () => true,
          });

          forwardSetCookie(response, res);
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');

          if (response.status < 200 || response.status >= 300) {
            res.end(
              typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data || { error: 'readScan failed' })
            );
            return;
          }

          const payload = response.data;
          const report = payload?.report ?? payload;

          writeFileSync(SRC_REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
          res.end(JSON.stringify(payload));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      };

      /**
       * /api/signIn
       *
       * DEV-only proxy to backend `POST /signIn`.
       * - Forwards request body (JSON)
       * - Forwards cookies to backend
       * - Forwards Set-Cookie from backend back to browser
       * - Writes the report snapshot to src/report.json
       *
       * Example:
       *   POST /api/signIn?job_id=abc123
       *   body: { "client_id": "tenantA", "password": "passA" }
       */
      server.middlewares.use('/api/signIn', signInProxyHandler);
      server.middlewares.use('/api/signin', signInProxyHandler);

      /**
       * /api/readScan
       *
       * Proxies to backend "get report with session" API.
       * Per auth doc: validateSession(cookie, job_id?) - validates token, returns report or 401.
       * If your backend uses /readScan instead, run: COREFENSE_READSCAN_PATH=readScan npm run dev
       *
       * Example: GET /api/readScan?job_id=abc123
       */
      server.middlewares.use('/api/readScan', readScanProxyHandler);
      server.middlewares.use('/api/readscan', readScanProxyHandler);
    },
  };
}
