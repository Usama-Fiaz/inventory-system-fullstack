# Dashboard UI Testing Playbook — Full Spec (demo-dashboard)

This document is intentionally **long** and **specific**. It is a test-spec you can hand to yourself (or another dev) later and implement step-by-step.

It is written to paste cleanly into Google Docs / Word:
- Headings use a consistent `## / ### / ####` structure
- Every test is written as a checklist item with **Steps** and **Expected results**
- Test IDs (e.g. `FS-U-03`) make it easy to track progress

Your product domain is **security hardening diffs**. Most regressions come from:
- wrong normalization of backend payloads
- wrong status classification (`new / improved / regressed / mixed / deleted / review / unresolved`)
- wrong filter predicates (chips/search) and pagination resets
- wiring issues (drawer/Offcanvas not opening, view mode not switching)

---

## Reality check (what exists today)

- **Stack**: Vite + React + React Router + Redux Toolkit
- **Dashboard routes** (`src/routes/index.jsx`):
  - `/dashboard` (**Analytics / System Hardening**)
  - `/dashboard/filesystems`
  - `/dashboard/kernel-configs`
  - `/dashboard/vulnerabilities`
  - `/dashboard/binary-hardening`
- **Auth guard** (`src/routes/router.jsx`):
  - Not authenticated → redirect to `/dashboard/signIn`
  - “Authenticated” means localStorage has `__COREFENSE_AUTH__`
- **JWT behavior** (`src/lib/jwt.js`):
  - If localStorage `__COREFENSE_JWT__` exists and is **expired**, app redirects to sign-in
  - No signature verification; only checks payload `exp`
- **Report data**: `src/store/slices/reportSlice.js` (APIs: `/api/signIn`, `/api/readScan?job_id=...`)

---

## Table of Contents

- **1. Test strategy and rules**
  - 1.1 What “unit vs integration vs E2E” means here
  - 1.2 How to write fixtures for this dashboard
  - 1.3 Selector rules (stable tests)
- **2. Shared harness specs (so tests don’t fight the app)**
  - 2.1 `renderWithProviders` spec (RTL)
  - 2.2 E2E auth bypass spec (Playwright)
  - 2.3 API interception spec for E2E (`/api/readScan`, `/api/signIn`)
- **3. Page test specs**
  - 3.1 Analytics (`/dashboard`) — System Hardening overview
  - 3.2 Filesystems (`/dashboard/filesystems`)
  - 3.3 Kernel Configs (`/dashboard/kernel-configs`)
  - 3.4 Binary Hardening (`/dashboard/binary-hardening`)
  - 3.5 Vulnerabilities (`/dashboard/vulnerabilities`)
- **4. Shared store/auth tests**
  - 4.1 `reportSlice` deterministic flip + caching behavior
  - 4.2 Auth guard + JWT expiry behavior

## 1. Test strategy and rules

### 1.1 Definitions (what “unit vs integration vs E2E” means in this repo)

#### Unit tests (Vitest)
Unit tests exist to lock down the **domain semantics**. They should test:
- **Normalization**: backend shape variability → stable UI row model
- **Classification**: status buckets → exactly the expected bucket
- **Formatting**: label mappings shown to the user
- **Counting**: summary card numbers and “debt” numbers

Unit tests must be:
- deterministic (no timers, no random, no timezone fragility)
- independent (no Redux store, no router, no DOM)

#### UI integration tests (React Testing Library + Vitest)
Integration tests exist to lock down:
- the **wiring** between UI controls and state
- the **filter/search/pagination** behavior users rely on
- the **mode toggles** (Delta vs Full Scan / Full Report)
- “drawer/Offcanvas opens and closes” behavior

Integration tests should render the page with **preloaded Redux state** (no API).

#### Browser E2E tests (Playwright)
E2E exists to catch issues that jsdom won’t:
- broken navigation
- focus/keyboard regressions
- overlays, tooltips, responsive layout
- “works like a user” confidence

E2E should **not** depend on a real backend. Instead, intercept `/api/readScan` and return fixtures.

### 1.2 Fixture rules (how to write fixtures for this dashboard)

Your UI consumes two main objects:
- **`report`**: current scan results (full report)
- **`reportDiffs` / `report_diffs`**: baseline vs current delta information

Fixture rules that keep tests maintainable:
- **Small**: minimum fields necessary for the page being tested
- **Intentional**: every field exists to trigger one behavior (not “realistic giant dump”)
- **Named**: a fixture file name should tell the story (e.g. `filesystems.delta.mixed.json`)
- **Cover edge combos**: added-only, removed-only, added+removed, missing keys, alternate key names
- **No time fragility**: avoid “now”; use fixed timestamps

### 1.3 Selector rules (stable tests)

Prefer selectors in this order:
1. `getByRole(...)` with accessible names (buttons, combobox/select, headings)
2. `getByLabelText(...)` and `getByPlaceholderText(...)`
3. `getByText(...)` for stable UI copy (“Delta Overview”, “No CVE entries match…”)

Only use `data-testid` if:
- the element has no stable role/text/label, AND
- it is truly important to test.

---

## 2. Shared harness specs (so tests don’t fight the app)

### 2.1 Dependencies to install (when you implement)

Command (run in repo root):
npm install -D vitest jsdom @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test

Notes:
- You already have **`axios-mock-adapter`** in dependencies; use it for thunk tests (slice-level).
- MSW is optional; Playwright route interception is enough for browser tests.

### 2.2 Required scripts (recommended)

Add these scripts to `package.json`:

- test: vitest run
- test:watch: vitest
- test:coverage: vitest run --coverage
- test:e2e: playwright test
- test:e2e:ui: playwright test --ui

### 2.3 `renderWithProviders` spec (RTL)

Your real app wraps everything in `AppProvidersWrapper`, which includes `DashboardBootstrap` that triggers API calls.
For tests, **do not render the full app shell**. Instead, render the page component with:
- a Redux store created for the test
- preloaded `report` slice state
- `LayoutProvider` so `useLayoutContext()` works

**Preloaded `report` slice baseline:**
- `status`: `'succeeded'` for normal tests, `'loading'` for loading tests, `'failed'` for error tests
- `data`: the `report` fixture (or `null`)
- `reportDiffs`: the `reportDiffs` fixture (or `null`)
- `error`: string for failed tests
- `reportTimestamp`: fixed timestamp string if needed

**Explicit integration-test rule:** filters/search must reset pagination exactly like the page code does (many handlers call `setPage(0)` or `setPage(1)`).

### 2.4 E2E auth bypass spec (Playwright)

Your route guard considers the user authenticated if localStorage contains `__COREFENSE_AUTH__`.
Your JWT interceptor may redirect if `__COREFENSE_JWT__` exists and is expired.

So the stable E2E “logged-in” state is:
- localStorage `__COREFENSE_AUTH__` set to any JSON string
- localStorage `__COREFENSE_JWT__` set to a fake JWT with future `exp`

**Fake JWT format (works because you only parse payload `exp`):**
- header JSON: `{ "alg": "none", "typ": "JWT" }`
- payload JSON: `{ "exp": 4102444800 }` (example: far future)
- token string: `base64url(header) + "." + base64url(payload) + "."`

### 2.5 API interception spec (Playwright)

Intercept these endpoints:
- `GET /api/readScan` (with or without `job_id`)
- `POST /api/signIn` (optional, if any flow hits it)

Return fixtures that match the slices/pages:
- payload should include `report` and optionally `report_diffs` + `timestamp`
- if your UI expects `reportDiffs` in Redux, ensure the fixture includes `report_diffs` (or set Redux directly in integration tests)

---

## 3. Page test specs (full and specific)

General note for all pages:
- Every page reads from Redux selectors:
  - `selectReport`
  - `selectReportDiffs`
  - `selectReportStatus`
  - `selectReportError`
  - `selectReportTimestamp`
- For integration tests, set the preloaded state so the page is not blocked in loading/error unless that’s the test.

---

## 3.1 Analytics (`/dashboard`) — System Hardening overview

### Feature inventory (what users see and rely on)

#### Hero header content
- Eyebrow label: **“Delta Overview”**
- Main title (H1): **“System Hardening”**
- Baseline + Current build identifiers:
  - Baseline ID from `reportDiffs.last_build_id` (fallback `'—'`)
  - Current ID from `report.build_id` (fallback `'—'`)
- Baseline time from `reportDiffs.last_build_time`
- Current time from `report.timestamp` or `selectReportTimestamp`

#### Trend summary bar
- “Overall Security Posture” label
- Delta badge showing:
  - arrow up/down icon based on sign
  - delta numeric with `+` sign when improved
  - unit “pts”
- Current score value (e.g. `xx.x / 100`)
- “Categories Improved” and “Categories Regressed” counters (derived from insight cards)

#### Compare section
- Radar chart panel (`SecurityPostureRadar`) showing axes
- Side insights panel (`SecurityInsightsPanel`) showing cards
- Hover interactions:
  - hovering a card highlights axes
  - hovering an axis highlights related cards (implementation-dependent)

### Unit test targets (specific functions actually used)
These are in `src/app/(admin)/dashboard/analytics/components/securityOverviewData`:
- `buildSecurityOverviewAxes({ report, reportDiffs })`
- `buildSecuritySideInsights({ report, reportDiffs, axes })`
- `getOverviewComposite(axes)`

### Unit test cases (specific)

- [ ] **AN-U-01: `getOverviewComposite` computes totals and delta correctly**
  - **Setup**: axes fixture with at least 3 axes (one improved, one regressed, one unchanged).
  - **Expected**:
    - `currentScore` equals sum/average per implementation (assert exact expected value for the fixture)
    - `delta` sign matches net change

- [ ] **AN-U-02: missing `reportDiffs` does not crash and produces stable axes**
  - **Setup**: `reportDiffs = null`, minimal `report` fixture.
  - **Expected**:
    - `buildSecurityOverviewAxes` returns an array
    - every axis has required identity fields (id/label) and safe numeric defaults (no `NaN`)

- [ ] **AN-U-03: `buildSecuritySideInsights` returns cards with numeric deltas**
  - **Setup**: axes fixture, report/diffs fixture.
  - **Expected**:
    - every card has a numeric `delta` (or coerces to 0)
    - cards include axis ids they relate to (so hover mapping is stable)

### UI integration test cases (specific UI copy and behavior)

- [ ] **AN-I-01: renders title and eyebrow**
  - **Steps**:
    - Render Analytics page with `report.status = 'succeeded'` and minimal report fixture.
  - **Expected**:
    - text “Delta Overview” is visible
    - H1 “System Hardening” is visible

- [ ] **AN-I-02: baseline/current IDs fall back safely**
  - **Steps**:
    - Render with `reportDiffs.last_build_id = null` and `report.build_id = null`.
  - **Expected**:
    - Baseline and Current IDs display `'—'` (no crash, no empty UI)

- [ ] **AN-I-03: category counters reflect insight card deltas**
  - **Steps**:
    - Render with a fixture that creates at least one positive-delta card and one negative-delta card.
  - **Expected**:
    - “Categories Improved” count increments for `delta > 0`
    - “Categories Regressed” count increments for `delta < 0`

### E2E test cases (specific)

- [ ] **AN-E2E-01: dashboard smoke load**
  - **Setup**: inject auth localStorage + intercept `/api/readScan` to return report fixture with analytics fields
  - **Steps**:
    - Navigate to `/dashboard`
  - **Expected**:
    - H1 “System Hardening” is visible
    - the page does not show an endless spinner or blank state

---

---

## 3.2 Filesystems (`/dashboard/filesystems`)

### Feature inventory (what exists in the page code)

#### Page header
- Eyebrow: **“Delta Overview”**
- H1 title: **“Filesystem Security”**
- Subtitle: “Mount flag and filesystem integrity drifts”

#### “Security Debt” call-to-action
- Label: **Security Debt**
- Sub-label: **Unresolved Gaps**
- Clicking it triggers `openUnresolvedView` (switches the page into a “show unresolved gaps” full view)

#### Drift Analysis cards (delta summary)
The page computes counts from delta rows:
- `newC`, `improvedC`, `regressedC`, `mixedC`, `deletedC`

User-visible behavior:
- Clicking a card calls `openDeltaView(<status>)` to:
  - set `viewMode = 'delta'`
  - set `activeFilter = <status>`
  - open the delta filter UI (`deltaFilterOpen = true` unless `all`)

#### Table controls (CardHeader)
- Search input:
  - placeholder: **“Search mount or filesystem”**
  - updates `searchQuery` and resets pagination (`setPage(0)`)
- Delta status filter:
  - button label: **“Status”**
  - when opened, shows filter buttons: `all`, `new`, `improved`, `regressed`, `mixed`, `deleted`
- View mode toggle (segmented control):
  - options: **Delta** and **Full Scan**
  - sets `viewMode` and resets pagination (`setPage(0)`)

#### Table columns (must be stable)
- Always: **Mount path**, **Filesystem**
- Delta mode columns:
  - **Status**
  - **Flag Changes** (uses `BuildChangeCell`)
  - **Remaining gaps** (uses `FilesystemFlagPills` with `emptyLabel="Clear"`)
- Full mode column:
  - **Missing flags** (uses `FilesystemFlagPills` with `emptyLabel="No missing flags"`)

### Unit test targets (real functions in `filesystems/page.jsx`)
- `formatFilesystemStatusLabel(status)`:
  - `new → "NEW"`
  - `deleted → "REMOVED"`
  - `mixed → "REVIEW"`
  - `improved → "IMPROVED"`
  - (default) → `"REGRESSED"`
- `classifyMountPathDeltaStatus(flagsAdded, flagsRemoved)`:
  - both > 0 → `mixed`
  - added = 0, removed > 0 → `regressed`
  - added > 0, removed = 0 → `improved`
  - (neither) → `review`
- `normalizeDeltaRow(raw, fallbackStatus)`:
  - normalizes `added/removed/gaps` arrays into uppercase arrays
  - fills safe defaults: `filesystem` fallback `'N/A'`, etc.
- `filesystemsDiffsHasKeys(fsd)`
- `buildRowsFromFilesystemsDiffs(fsd)`
- `rowsFromReportDiffs(reportDiffs)`:
  - accepts multiple shapes (mount_path_delta/mounts_delta, mounts_added/mounts_removed, or block forms)

### Unit test cases (full and concrete)

- [ ] **FS-U-01: `formatFilesystemStatusLabel` exact label mapping**
  - **Inputs / Expected**:
    - `new` → `NEW`
    - `deleted` → `REMOVED`
    - `mixed` → `REVIEW`
    - `improved` → `IMPROVED`
    - `regressed` → `REGRESSED`
    - `undefined/null` → `REGRESSED` (default)

- [ ] **FS-U-02: `classifyMountPathDeltaStatus` covers all combos**
  - **Inputs / Expected**:
    - `(['RO'], [])` → `improved`
    - `([], ['RO'])` → `regressed`
    - `(['RO'], ['NOEXEC'])` → `mixed`
    - `(null, null)` → `review`

- [ ] **FS-U-03: `normalizeDeltaRow` uppercases and stabilizes arrays**
  - **Setup**:
    - raw includes `added: ['ro', 'nosuid']`, `removed: ['nodev']`, `gaps: ['hidepid']`
  - **Expected**:
    - `buildChangeAdded = ['RO','NOSUID']`
    - `buildChangeRemoved = ['NODEV']`
    - `remainingGaps = ['HIDEPID']`

- [ ] **FS-U-04: `rowsFromReportDiffs` supports mount_path_delta**
  - **Setup**:
    - `reportDiffs.filesystems.mount_path_delta = [{ mount_path:'/var', filesystem:'ext4', added:['ro'], removed:[] }]`
  - **Expected**:
    - one row classified as `improved` (added-only)
    - row has mountPath `/var` and filesystem `ext4`

- [ ] **FS-U-05: `rowsFromReportDiffs` supports mounts_added/mounts_removed**
  - **Setup**:
    - `reportDiffs.filesystems.mounts_added = [{ mount_path:'/tmp', filesystem:'tmpfs', flags:['nodev'] }]`
    - `reportDiffs.filesystems.mounts_removed = [{ mount_path:'/legacy', filesystem:'ext4', flags:['nosuid'] }]`
  - **Expected**:
    - `/tmp` row status is `new`
    - `/legacy` row status is `deleted`

- [ ] **FS-U-06: `rowsFromReportDiffs` supports block shapes**
  - **Setup**:
    - `reportDiffs.mount_diffs = [{ delta: [{ mount_path:'/home', filesystem:'xfs', status:'regressed', removed:['ro'] }] }]`
  - **Expected**:
    - one row, status `regressed`, removed contains `RO`

### UI integration test cases (specific, using real labels)

- [ ] **FS-I-01: page renders header copy**
  - **Expected**:
    - “Delta Overview” visible
    - H1 “Filesystem Security” visible

- [ ] **FS-I-02: search filters rows and resets page**
  - **Steps**:
    - Preload state with enough rows to paginate.
    - Type into search input (placeholder “Search mount or filesystem”).
  - **Expected**:
    - visible rows match mount path or filesystem substring
    - pagination resets to page 0 (assert “Showing …” or page index if present)

- [ ] **FS-I-03: open Status filter and choose `regressed`**
  - **Steps**:
    - Ensure `viewMode` is Delta (default).
    - Click “Status” button to open filters.
    - Click `regressed`.
  - **Expected**:
    - only rows with status badge = `REGRESSED` are visible

- [ ] **FS-I-04: switch to Full Scan changes columns**
  - **Steps**:
    - Click view toggle “Full Scan”.
  - **Expected**:
    - “Missing flags” column is present
    - Delta-only columns (“Flag Changes”, “Remaining gaps”) are not present

- [ ] **FS-I-05: BuildChangeCell renders + and −**
  - **Setup**: at least one row has `buildChangeAdded=['RO']` and `buildChangeRemoved=['NODEV']`
  - **Expected**:
    - plus sign and `RO` visible
    - minus sign and `NODEV` visible

- [ ] **FS-I-06: “Security Debt → Unresolved Gaps” click forces unresolved view**
  - **Steps**:
    - Click the Security Debt UI (label “Unresolved Gaps”).
  - **Expected**:
    - view switches to Full Scan
    - unresolved-only dataset is used (rows derived from `reportDiffs.filesystems.unresolved`)

### E2E test cases (fixture-driven)

- [ ] **FS-E2E-01: delta smoke**
  - **Steps**:
    - Navigate to `/dashboard/filesystems`
  - **Expected**:
    - H1 “Filesystem Security” visible
    - table shows at least 1 row from the delta fixture

- [ ] **FS-E2E-02: regressions filter flow**
  - **Steps**:
    - Click “Status” → click “regressed”
  - **Expected**:
    - only regressed rows remain

- [ ] **FS-E2E-03: switch to Full Scan and verify missing flags**
  - **Steps**:
    - Click “Full Scan”
  - **Expected**:
    - “Missing flags” column visible
    - rows render without console errors

---

---

## 3.3 Kernel Configs (`/dashboard/kernel-configs`)

### Feature inventory (exact labels and controls)

#### Top-level modes
- View mode buttons:
  - **“Delta View”** (`viewMode = 'delta'`)
  - **“Full Report”** (`viewMode = 'full'`)

#### Delta type tabs (applies to both delta and full)
- Tabs:
  - **“Kernel Config”** (`deltaType = 'config'`)
  - **“Kernel Modules”** (`deltaType = 'module'`)

Switching tabs resets:
- selected row (Offcanvas)
- search input
- delta filters and full filters
- module integrity/state filters
- pagination

#### Search (placeholder changes based on mode and type)
Search input placeholder is dynamically chosen:
- Delta + config: **“Search kernel configs…”**
- Delta + module: **“Search kernel modules…”**
- Full + config: **“Search config names…”**
- Full + module: **“Search module names…”**

#### Delta filters (Status group)
When `viewMode === 'delta'` and filter is open:
- Options shown (always):
  - `All`, `Improved`, `New`, `Deleted`, `Regressed`, `Review`
- Conditional option (only when count > 0):
  - `⚠ New Risks` (id `new_risk`)

Important behavior:
- For config delta: selection updates `activeFilter`
- For module delta: selection updates `moduleDeltaFilter`
- Changing filters resets `deltaPage` to 0 (via effect)

#### Full Report filters (Config Risk group)
When `viewMode === 'full'` and `deltaType === 'config'`:
- Filter label changes to **“Risk”**
- Options:
  - `All`
  - `Gaps` (id `gaps`) → shows unresolved config rows instead of full rows
  - `Low` (id `secure`)
  - `High` (id `insecure`)
  - `Medium` (id `review`)

#### Full Report filters (Modules Integrity/State)
When `viewMode === 'full'` and `deltaType === 'module'`:
- module-specific filters exist:
  - integrity: `signed / unsigned / all`
  - state: `loaded / inactive / all`
- unresolved module rows are shown when both:
  - integrity filter is `unsigned`
  - state filter is `loaded`

#### New Risks cards (page summary area)
When new risk count exists:
- Card label: **“New Risks”**
- Clicking applies the delta filter `new_risk` for that section

### Unit test targets (real functions inside `kernel-configs/page.jsx`)

#### Normalization / parsing
- `normalizeKernelStateLabel(value, fallback = 'UNKNOWN')`
- `normalizeConfigCompliance(value, fallback = 'review')`
- `normalizeDiffEntry(item)` (name + reason extraction)
- `mapToNamedEntries(bucket, nameKey)` (object/array normalization)
- `classifyModulePreviewState(raw)`
- `parseModuleSigned(value)`

#### UI metadata helpers (must return stable keys)
- `configComplianceMeta(value, isDark)` → `{ key, label, tone, icon?, color }`
- `kernelConfigStateMeta(value, isDark)` → `{ key, label, color, border }`
- `formatKernelDeltaStatusLabel(status)`

### Unit test cases (specific)

- [ ] **KC-U-01: `normalizeKernelStateLabel` handles common synonyms**
  - **Inputs / Expected**:
    - `M` → `LOADABLE`
    - `module` → `LOADABLE`
    - `loadable` → `LOADABLE`
    - `enable`/`enabled` → `ENABLED`
    - `disable`/`disabled` → `DISABLED`
    - empty string → fallback (`UNKNOWN`)

- [ ] **KC-U-02: `normalizeConfigCompliance` maps to secure/insecure/review**
  - **Inputs / Expected**:
    - `secure` → `secure`
    - `insecure` → `insecure`
    - `unknown` / `review` → `review`
    - empty → fallback

- [ ] **KC-U-03: `configComplianceMeta` returns stable meta**
  - **Expected**:
    - `secure` → key `secure`, label `Secure`
    - `insecure` → key `insecure`, label `Insecure`
    - other → key `review`, label `Review`

- [ ] **KC-U-04: `mapToNamedEntries` supports object buckets**
  - **Setup**:
    - input: `{ "CONFIG_A": { description: "x" }, "CONFIG_B": {} }`
  - **Expected**:
    - array with objects having `{ config: "CONFIG_A" }`, `{ config: "CONFIG_B" }`

- [ ] **KC-U-05: delta row mapping respects new/deleted baselines**
  - **Setup**:
    - config delta input marked as `new` produces baseline `'—'`
    - config delta input marked as `deleted` produces target `'REMOVED'`
  - **Expected**:
    - mapped row fields match the logic (baseline/target/currentState)

### UI integration test cases (precise)

- [ ] **KC-I-01: default view is Delta View**
  - **Expected**:
    - “Delta View” button appears active
    - delta status filter group is available

- [ ] **KC-I-02: switch to Full Report resets filters**
  - **Steps**:
    - open delta filters, pick `regressed`
    - switch to “Full Report”
  - **Expected**:
    - delta filter open state closes
    - filter state resets (risk filter defaults to `all`)
    - pagination resets to page 0 for full view

- [ ] **KC-I-03: delta type tabs switch search placeholder**
  - **Steps**:
    - in Delta View, click “Kernel Modules”
  - **Expected**:
    - search placeholder becomes “Search kernel modules…”

- [ ] **KC-I-04: delta filter includes New Risks when count > 0**
  - **Setup**:
    - fixture where `configStats.newRisksCount > 0`
  - **Steps**:
    - open delta filter group
  - **Expected**:
    - button “⚠ New Risks” exists
    - clicking it applies filter id `new_risk` and updates visible rows

- [ ] **KC-I-05: full config Risk filters change dataset**
  - **Steps**:
    - switch to Full Report with deltaType config
    - open filter group and select “Gaps”
  - **Expected**:
    - table uses unresolved config rows (derived from `unresolvedConfigList`)

- [ ] **KC-I-06: clicking a delta row opens Offcanvas**
  - **Steps**:
    - in Delta View with at least one row visible, click a row
  - **Expected**:
    - Offcanvas opens with details for the selected row
    - closing Offcanvas clears selection

### E2E test cases

- [ ] **KC-E2E-01: smoke load + switch tabs**
  - **Steps**:
    - open `/dashboard/kernel-configs`
    - switch “Kernel Config” ↔ “Kernel Modules”
  - **Expected**:
    - page does not crash; search placeholder updates accordingly

- [ ] **KC-E2E-02: full report gaps filter**
  - **Steps**:
    - switch to “Full Report”
    - set risk filter to “Gaps”
  - **Expected**:
    - unresolved rows appear (fixture-driven)

---

---

## 3.4 Binary Hardening (`/dashboard/binary-hardening`)

### Feature inventory (exact labels and behaviors)

#### View modes
- Segmented toggle labels:
  - **Delta**
  - **Full Scan**

Switching modes uses helper functions:
- `openDeltaView(filter = 'all', shouldScroll = false)`
- `openFullScanView()`

#### Search
- Search input placeholder: **“Search binaries...”**
- On change:
  - updates `search`
  - resets both delta and full pagination (`setDeltaPage(0)` and `setFullPage(0)`)

#### Delta filters (Status)
- Button label: **“Status”**
- When opened, shows buttons from `binaryFilterButtons`:
  - `All`
  - `New`
  - `Improved`
  - `Regressed`
  - `Mixed`
  - `Deleted`

Filtering rule used by the page:
- a delta row matches if `activeFilter === 'all'` OR `row.status === activeFilter`
- search applies simultaneously (query match)

#### Delta table (core UI)
- Column headers:
  - **Binary Name**
  - **Status**
- Empty state text (delta):
  - **“No binary deltas found”**
- Row click behavior:
  - Clicking a row opens details **only if** `row.status !== 'deleted'`

#### Full Scan filters (Privileges)
- Button label: **“Privileges”**
- Options:
  - `All`
  - `Root`
  - `Capabilities`

Filter semantics:
- Root: keeps only rows where `file_permissions.uid_root` is truthy
- Capabilities: keeps only rows where capabilities array length > 0

#### Full Scan sorting (capability sort toggle)
- Sorting can toggle by capability count:
  - `capSortDir` cycles: `null → desc → asc → null`
- When enabled, full rows are sorted by number of capabilities (asc/desc)

#### Offcanvas panels (details)
The page has multiple Offcanvas overlays:
- Capabilities overlay (“Open X capabilities” / “No capabilities present”)
- Delta row details Offcanvas (only in delta mode)
- Full report Offcanvas (“Full Report” title)

### Unit test targets (real functions in `binary-hardening/page.jsx`)

#### Primitive helpers
- `truthy(v)` (accepts `true`, `1`, `"true"`)
- `countListLike(value)` (array length or numeric coercion)

#### Delta interpretation
- `statusFromBranches(isNew, hasImp, hasReg)`
- `parseBranch(side, branch)` (extract compiler/filePerm/caps diffs)
- `binaryPath(entry)` and `binarySha(entry)` (shape-safe extraction)
- `buildDeltaRows(binaryDiff)` (main delta row builder)
- `buildDeltaCategorySignals(row)` (badge/signal computation)

### Unit test cases (specific)

- [ ] **BH-U-01: `truthy` accepts only true-like values**
  - **Inputs / Expected**:
    - `true` → true
    - `1` → true
    - `"true"` → true
    - `"false"` → false
    - `0` → false
    - `null/undefined` → false

- [ ] **BH-U-02: `statusFromBranches` precedence**
  - **Inputs / Expected**:
    - `isNew=true` always → `new`
    - `hasImp=true, hasReg=true` → `mixed`
    - only improved → `improved`
    - only regressed → `regressed`
    - neither → `unchanged`

- [ ] **BH-U-03: `buildDeltaRows` handles added/removed/delta lists**
  - **Setup fixture**:
    - `binaries_added` contains `/usr/bin/newbin`
    - `binaries_removed` contains `/usr/bin/oldbin`
    - `delta` contains `/usr/bin/changedbin` with improvements/regressions
  - **Expected**:
    - newbin row status `new`
    - oldbin row status `deleted`
    - changedbin row status matches branches (`improved/regressed/mixed`)

- [ ] **BH-U-04: `binarySha` reads multiple SHA keys**
  - **Setup**:
    - entry has `binary_violations.sha256` or fallback fields
  - **Expected**:
    - sha is extracted correctly and stable

- [ ] **BH-U-05: `parseBranch` ignores non-enabled branches**
  - **Setup**:
    - branch missing `improved=true` or `regressed=true` gate
  - **Expected**:
    - returns `null` (no renderable data)

### UI integration test cases (precise labels)

- [ ] **BH-I-01: default mode is Delta**
  - **Expected**:
    - Delta table headers “Binary Name” and “Status” visible

- [ ] **BH-I-02: open Status filter and select Mixed**
  - **Steps**:
    - Click “Status”
    - Click “Mixed”
  - **Expected**:
    - only rows with `row.status === 'mixed'` are visible

- [ ] **BH-I-03: deleted row does not open details**
  - **Setup**:
    - fixture with at least one `deleted` row
  - **Steps**:
    - click deleted row
  - **Expected**:
    - delta details Offcanvas does not open

- [ ] **BH-I-04: non-deleted row opens details Offcanvas**
  - **Steps**:
    - click an improved/regressed/mixed/new row
  - **Expected**:
    - Offcanvas title shows the selected binary name

- [ ] **BH-I-05: switch to Full Scan enables Privileges filter**
  - **Steps**:
    - click “Full Scan”
    - click “Privileges” → choose “Root”
  - **Expected**:
    - only root-owned rows remain (fixture-driven)

- [ ] **BH-I-06: empty delta shows correct empty message**
  - **Setup**: fixture with no delta rows after filtering
  - **Expected**:
    - “No binary deltas found” visible

### E2E test cases (fixture-driven)

- [ ] **BH-E2E-01: delta smoke + open details**
  - **Steps**:
    - navigate `/dashboard/binary-hardening`
    - click a non-deleted delta row
  - **Expected**:
    - Offcanvas opens and is closable

- [ ] **BH-E2E-02: full scan privilege filter**
  - **Steps**:
    - switch to “Full Scan”
    - set Privileges → Capabilities
  - **Expected**:
    - every visible row has at least one capability (fixture-driven)

---

---

## 3.5 Vulnerabilities (`/dashboard/vulnerabilities`)

### Feature inventory (exact copy + behavior)

#### Page title and legend
- Card header title: **“CVE Findings”**
- Severity legend icons/labels in header:
  - Patched
  - Ignored
  - Unpatched

#### Filters
Two dropdown filters exist (they are always visible):
- Severity (`SEVERITY_OPTIONS`):
  - All Severities
  - Critical / High / Medium / Low / N/A
- Status (`STATUS_OPTIONS`):
  - All
  - Patched
  - Unpatched
  - Ignored

Filter semantics:
- Status filter “Unpatched” means “anything that is not Patched or Ignored” (per code)
- Severity filter matches exact normalized severity string

#### Table columns
- CVE-ID
- Severity (pill with optional metrics divider, e.g. “CVSS 3.1”)
- Package Name
- Version
- Layer
- Status (icon only, tooltip/title indicates status)

#### Expand row details (“AI-assisted summary”)
- Each row has a chevron icon to expand/collapse
- Expand triggers a simulated async load:
  - shows “Generating summary...” for ~1200ms
  - then shows summary text

Important behavior for tests:
- Expand uses a composite key: `${row.id}::${row.packageName}::${row.version}`
  - so same CVE id across multiple packages expands independently

#### Pagination and page size
- Page size options: 10, 25, 50, 100
- “Showing X–Y of Z” label must match filtered row count
- Changing filters resets page to 1 (explicit in handlers)

#### Empty states
- Loading state (when Redux status is idle/loading):
  - text: **“Loading report...”**
- Failed state:
  - text: **“Failed to load report”**
- Empty filter result:
  - text: **“No CVE entries match the current filters.”**

### Unit test targets (real functions in `vulnerabilities/page.jsx`)
- `displayStatus(status)`:
  - if `status` is `Patched` or `Ignored`, return as-is
  - otherwise return `Unpatched`
- `buildCveRows(report)`:
  - flattens `report.cve.package[].issue[]` into table rows
  - normalizes severity (case-insensitive, else `N/A`)
  - normalizes metrics string (trimmed or null)

### Unit test cases (specific)

- [ ] **VU-U-01: `displayStatus` maps unknowns to Unpatched**
  - **Inputs / Expected**:
    - `Patched` → `Patched`
    - `Ignored` → `Ignored`
    - `Unpatched` → `Unpatched`
    - `Open` / `Fix Available` / `''` / `null` → `Unpatched`

- [ ] **VU-U-02: `buildCveRows` handles missing data safely**
  - **Setup**: `report = null` or `report.cve.package = undefined`
  - **Expected**: returns `[]`

- [ ] **VU-U-03: `buildCveRows` normalizes severity and metrics**
  - **Setup**: one issue with `severity: 'CRITICAL'` and `metrics: ' CVSS 3.1 '`
  - **Expected**:
    - severity is `Critical`
    - metrics is `CVSS 3.1`

- [ ] **VU-U-04: same CVE id in two packages yields two distinct rows**
  - **Setup**: two packages, same issue id `CVE-2024-0001`
  - **Expected**: output rows length = 2 with different `packageName`

### UI integration test cases (precise)

- [ ] **VU-I-01: renders header title**
  - **Expected**: “CVE Findings” visible

- [ ] **VU-I-02: severity filter narrows rows**
  - **Steps**:
    - set severity to “High”
  - **Expected**:
    - every visible row has severity pill “High”
    - “Showing X–Y of Z” updates to the filtered count

- [ ] **VU-I-03: status filter “Unpatched” excludes Patched and Ignored**
  - **Steps**:
    - set status to “Unpatched”
  - **Expected**:
    - rows whose raw status is Patched or Ignored are not visible

- [ ] **VU-I-04: expand row shows loading then summary**
  - **Steps**:
    - click chevron icon for first row
  - **Expected**:
    - “Generating summary...” appears
    - after timer, summary text appears

- [ ] **VU-I-05: page size change resets to page 1**
  - **Steps**:
    - move to page 2
    - change page size
  - **Expected**:
    - displayed page becomes “Page 1 of …”

- [ ] **VU-I-06: empty filter result shows correct empty state**
  - **Steps**:
    - choose a severity that returns 0 rows (fixture-driven)
  - **Expected**:
    - “No CVE entries match the current filters.” visible

### E2E test cases

- [ ] **VU-E2E-01: smoke load**
  - **Steps**:
    - navigate `/dashboard/vulnerabilities`
  - **Expected**:
    - “CVE Findings” visible

- [ ] **VU-E2E-02: filter + expand flow**
  - **Steps**:
    - set severity to “Medium”
    - expand first row
  - **Expected**:
    - summary panel appears without layout breaking

---

---

## 4. Shared store + auth test specs

This section is not “nice-to-have”. In your app, store/auth bugs create the worst UX:
- endless loading
- “Failed to load report” even when cached data exists
- redirect loops on sign-in
- pages rendering with stale `reportDiffs`

---

## 4.1 `reportSlice` tests (`src/store/slices/reportSlice.js`)

### Unit targets (pure helpers inside the slice)

#### Deterministic RNG + flipping behavior
- `createSeededRng(seedStr)`
- `flipSomePatchedToUnpatched(report, jobId)`

#### Local cache behavior
- `safeCacheReport(jobId, report)` (writes to localStorage)
- `safeLoadCachedReport(jobId)` (reads from localStorage)

#### JWT parsing helper
- `parseClientIdFromJwt(tokenString)` (extracts `client_id` from JWT payload)

### Unit test cases (specific)

- [ ] **RS-U-01: `createSeededRng` is deterministic**
  - **Steps**:
    - create two RNGs with same seed string
    - call each 5 times
  - **Expected**:
    - both sequences match exactly

- [ ] **RS-U-02: `flipSomePatchedToUnpatched` does not mutate input**
  - **Setup**: report fixture with multiple patched issues
  - **Expected**:
    - input object remains unchanged (deep compare)
    - output is a new object

- [ ] **RS-U-03: `flipSomePatchedToUnpatched` is deterministic per jobId**
  - **Steps**:
    - run twice with same report + jobId
  - **Expected**:
    - the same issues flip both times

- [ ] **RS-U-04: `flipSomePatchedToUnpatched` preserves severity and fields**
  - **Expected**:
    - only `status` changes for flipped entries
    - `severity`, `metrics`, `id`, `description` remain identical

- [ ] **RS-U-05: cache helpers round-trip safely**
  - **Steps**:
    - call `safeCacheReport('job-1', reportFixture)`
    - load with `safeLoadCachedReport('job-1')`
  - **Expected**:
    - loaded report equals cached report
    - loading unknown key returns null

- [ ] **RS-U-06: `parseClientIdFromJwt` extracts client_id or returns null**
  - **Cases**:
    - valid JWT payload with `client_id` → returns that value
    - malformed token → returns null

### Thunk tests (integration, axios-mock-adapter)

Targets:
- `signInAndLoadReport({ identifier, password, jobId })`
- `fetchReportForSession(jobId)`

- [ ] **RS-T-01: sign-in success populates report + diffs and caches latest**
  - **Setup**:
    - mock `POST /api/signIn` response with `{ report, report_diffs, timestamp }`
  - **Expected**:
    - Redux state: `report.data` populated
    - `report.reportDiffs` populated
    - localStorage cache key `__COREFENSE_REPORT_CACHE__` has latest entry

- [ ] **RS-T-02: fetchReportForSession success caches job-specific report**
  - **Setup**:
    - mock `GET /api/readScan?job_id=abc` response
  - **Expected**:
    - cache contains entry for job_id key

- [ ] **RS-T-03: fetchReportForSession failure falls back to cached report**
  - **Setup**:
    - localStorage has cached report for requested jobId
    - API returns 500/timeout
  - **Expected**:
    - thunk resolves with cached report (no “Failed” state if data exists)

- [ ] **RS-T-04: 401 maps to Session expired**
  - **Setup**: API returns 401
  - **Expected**: thunk rejects with message “Session expired”

---

## 4.2 Auth guard + JWT expiry tests

### Targets
- Route guard in `src/routes/router.jsx`:
  - unauthenticated navigation to dashboard routes redirects to `/dashboard/signIn`
  - redirect includes `redirectTo=<original path + search>`
  - if URL had `job_id`/`jobId`, it is preserved as `job_id`
- JWT expiry redirect in `src/lib/jwt.js`:
  - expired JWT triggers redirect to `/dashboard/signIn?redirectTo=...`

### Test cases (specific)

- [ ] **AU-I-01: unauthenticated user is redirected to sign-in**
  - **Setup**: localStorage missing `__COREFENSE_AUTH__`
  - **Steps**: navigate to `/dashboard/filesystems?job_id=abc`
  - **Expected**:
    - redirected to `/dashboard/signIn`
    - query includes:
      - `redirectTo=/dashboard/filesystems?job_id=abc`
      - `job_id=abc`

- [ ] **AU-I-02: authenticated user does not redirect**
  - **Setup**: localStorage has `__COREFENSE_AUTH__`
  - **Expected**:
    - route renders `AdminLayout` with the page

- [ ] **AU-U-01: expired JWT triggers redirect even if auth exists**
  - **Setup**:
    - localStorage `__COREFENSE_AUTH__` present
    - localStorage `__COREFENSE_JWT__` has payload exp in past
  - **Expected**:
    - browser navigates to sign-in (no API call needed)

---

## 5. Definition of Done (practical, page-specific)

### Minimum suite you should implement first

#### E2E (Playwright)
- [ ] **E2E-SMOKE-01..05**: smoke test each route:
  - `/dashboard`
  - `/dashboard/filesystems`
  - `/dashboard/kernel-configs`
  - `/dashboard/binary-hardening`
  - `/dashboard/vulnerabilities`

#### Unit (Vitest)
- [ ] Filesystems: FS-U-01..06
- [ ] Kernel Configs: KC-U-01..05
- [ ] Binary Hardening: BH-U-01..05
- [ ] Vulnerabilities: VU-U-01..04
- [ ] reportSlice: RS-U-01..06

#### UI integration (RTL)
- [ ] Filesystems: FS-I-01..06
- [ ] Kernel Configs: KC-I-01..06
- [ ] Binary Hardening: BH-I-01..06
- [ ] Vulnerabilities: VU-I-01..06

If you implement this, you will reliably catch:
- wrong status mapping (most expensive bug class)
- broken filter/search behavior
- pagination reset regressions
- drawer/Offcanvas wiring regressions
