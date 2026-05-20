import { useEffect, useMemo, useRef, useState } from 'react';
import PageMetaData from '@/components/PageTitle';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus, selectReportDiffs, selectReportTimestamp } from '@/store/slices/reportSlice';
import { Card, CardBody, Col, Row, Form, Button, Table, OverlayTrigger, Tooltip, CardHeader, Offcanvas } from 'react-bootstrap';
import { useLayoutContext } from '@/context/useLayoutContext';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import BuildCompareBoxes from '@/components/dashboard/BuildCompareBoxes';
import { getBinaryExposureMetrics, hasNamedCapability } from '@/lib/binaryExposureMetrics';
import { getStatusIcon } from './statusIcons';
import {
  BH_CARD_RADIUS_PX,
  BH_CARD_SHADOW,
  BH_THEME_EASE,
  BH_INTERACTIVE_TRANSITION,
  BH_THEME_TRANSITION,
  getBinaryHardeningTheme,
} from './binaryHardeningTheme';
 

/** Shared pill base used by filters and toggles (kept consistent with kernel page) */
const FILTER_PILL_BASE = {
  borderRadius: 8,
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.2,
  minHeight: 32,
  cursor: 'pointer',
  transition: BH_INTERACTIVE_TRANSITION,
};

const FILTER_ACTIVE_ALL = {
  ...FILTER_PILL_BASE,
  background: '#1e293b',
  border: '1px solid #1e293b',
  color: '#ffffff',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

const FILTER_ACTIVE_NEW = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_IMPROVED = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_REGRESSED = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_MIXED = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_DELETED = FILTER_ACTIVE_ALL;
const BINARY_COMPILER_LEGEND_ITEMS = [
  { title: 'NX',           description: 'Marks stack non-executable',       icon: 'mdi:shield-off-outline',    severity: 'CRITICAL' },
  { title: 'PIE',          description: 'Randomizes load address to resist jump-oriented attacks.',       icon: 'mdi:shield-half-full',      severity: 'CRITICAL' },
  { title: 'CFI',          description: 'Control-flow integrity stops ROP/JOP code-reuse attacks.',     icon: 'mdi:vector-polyline',       severity: 'MED'      },
  { title: 'Debug',        description: 'Stripped in production to prevent reverse engineering.',        icon: 'mdi:bug-outline',           severity: 'CRITICAL' },
  { title: 'Relro',        description: 'Hardens GOT/PLT against write-after-use memory exploits.',      icon: 'mdi:lock-outline',          severity: 'HIGH'     },
  { title: 'Stack Canary', description: 'Detects stack overflow before return address is corrupted.',    icon: 'mdi:shield-check-outline',  severity: 'CRITICAL' },
];
const BINARY_PERMISSION_LEGEND_ITEMS = [
  { title: 'SetUID/SETGID',   description: 'Runs with elevated user/group privileges.',       icon: 'mdi:account-key',            severity: 'CRITICAL' },
  { title: 'ROOT',            description: 'Owned by UID 0 and runs as root',                 icon: 'mdi:account-cowboy-hat',      severity: 'CRITICAL' },
  { title: 'World executable',description: 'Executable by any user',                          icon: 'mdi:folder-key',             severity: 'HIGH' },
  { title: 'CAP_SYS_ADMIN',   description: 'Full administrative capabilities for system access.',icon: 'mdi:shield-account',         severity: 'CRITICAL' },
];
const ALLCAPS_TERMS = new Set(['pie', 'nx', 'cfi', 'aslr', 'dep', 'relro', 'canary', 'ssp', 'got', 'plt', 'rpath', 'runpath']);
const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';
const BINARY_STATUS_BADGE_BASE = {
  borderRadius: 999,
  fontFamily: UI_FONT_STACK,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '4px 12px',
  lineHeight: 1,
  letterSpacing: '0.04em',
};

function titleize(name) {
  const key = String(name ?? '').toLowerCase().replace(/\s+/g, '_');
  if (ALLCAPS_TERMS.has(key)) return key.replace(/_/g, ' ').toUpperCase();
  return String(name ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function filePermLabel(name) {
  const n = String(name ?? '').toLowerCase().trim();
  if (n === 'uid_root' || n === 'root_uid') return 'Root';
  if (n === 'world_exec') return 'World Exec';
  if (n === 'group_exec') return 'Group Exec';
  return n; // all others: keep raw lowercase (setuid, setgid, etc.)
}

function truthy(v) {
  return v === true || v === 1 || String(v).toLowerCase() === 'true';
}

function countListLike(value) {
  if (Array.isArray(value)) return value.length;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

function formatBuildMetaId(id) {
  const s = String(id ?? '');
  if (s.length > 8 && /^[0-9a-f]+$/i.test(s)) return s.substring(0, 8).toUpperCase();
  return s.toUpperCase();
}

function hasCapSysAdmin(capabilities) {
  return hasNamedCapability(capabilities, 'cap_sys_admin');
}

function parseBranch(side, branch) {
  const gateKey = side === 'improved' ? 'improved' : 'regressed';
  if (!branch || !truthy(branch?.[gateKey])) {
    return null;
  }
  const totals = branch.total_changes ?? {};
  const compilerTotal = Number(totals.compiler_flags ?? 0);
  const filePermTotal = Number(totals.file_perms ?? 0);
  const capTotal = Number(totals.capabilities ?? 0);
  const capModeTotal = Number(totals.cap_mode_diffs ?? 0);
  const parseCompiler = compilerTotal > 0;
  const parseFilePerms = filePermTotal > 0;
  const parseCaps = capTotal > 0 || capModeTotal > 0;

  const compilerChanges = parseCompiler
    ? (Array.isArray(branch?.compiler_flags?.compiler_flags)
      ? branch.compiler_flags.compiler_flags
      : [])
        .map((f) => ({
          name: String(f?.name ?? f?.flag_name ?? '').trim(),
          previous_value: f?.previous_value,
          current_value: f?.current_value,
        }))
        .filter((f) => f.name)
    : [];

  const filePermChanges = parseFilePerms
    ? (Array.isArray(branch?.file_perms?.file_perms) ? branch.file_perms.file_perms : [])
        .map((p) => ({
          name: String(p?.name ?? '').trim(),
          previous_value: p?.previous_value,
          current_value: p?.current_value,
        }))
        .filter((p) => p.name)
    : [];

  const capAdded = parseCaps
    ? (Array.isArray(branch?.capabilities?.cap_added)
      ? branch.capabilities.cap_added
      : [])
        .map((c) => String(c?.name ?? c).trim())
        .filter(Boolean)
    : [];
  const capRemoved = parseCaps
    ? (Array.isArray(branch?.capabilities?.cap_removed)
      ? branch.capabilities.cap_removed
      : [])
        .map((c) => String(c?.name ?? c).trim())
        .filter(Boolean)
    : [];
  const capModeDiffs = parseCaps
    ? (Array.isArray(branch?.capabilities?.cap_mode_diffs)
      ? branch.capabilities.cap_mode_diffs
      : [])
        .map((c) => ({
          capability: String(c?.capability ?? '').trim(),
          previous_mode: c?.previous_mode,
          current_mode: c?.current_mode,
          impact: c?.impact ?? null,
        }))
        .filter((c) => c.capability)
    : [];

  const parsedChanges =
    compilerChanges.length +
    filePermChanges.length +
    capAdded.length +
    capRemoved.length +
    capModeDiffs.length;

  return {
    side,
    compilerChanges,
    filePermChanges,
    capAdded,
    capRemoved,
    capModeDiffs,
    compilerState: branch?.compiler_flags?.current_state ?? {},
    filePermState: branch?.file_perms?.current_state ?? {},
    parsedChanges,
    hasRenderableData: parsedChanges > 0,
  };
}

function statusFromBranches(isNew, hasImp, hasReg) {
  if (isNew) return 'new';
  if (hasImp && hasReg) return 'mixed';
  if (hasImp) return 'improved';
  if (hasReg) return 'regressed';
  return 'unchanged';
}

function relroStateBadge(relro, partialRelro, isDark, options = {}) {
  if (truthy(partialRelro) && !truthy(relro)) {
    return fullReportCompilerTonePill('PARTIAL RELRO', 'warning', isDark, options);
  }
  if (!truthy(partialRelro) && truthy(relro)) {
    return fullReportCompilerTonePill('FULL RELRO', 'success', isDark, options);
  }
  return fullReportCompilerTonePill('NO RELRO', 'muted', isDark, options);
}

function compilerStateValue(compilerState, ...keys) {
  if (!compilerState || typeof compilerState !== 'object') return undefined;
  for (const key of keys) {
    if (compilerState[key] !== undefined) return compilerState[key];
  }
  const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = new Set(keys.map(normalize));
  for (const [key, value] of Object.entries(compilerState)) {
    if (wanted.has(normalize(key))) return value;
  }
  return undefined;
}

function compilerStateBadges(compilerState, isDark) {
  return fullReportCompilerBadges(compilerState, isDark);
}

function filePermStateBadges(filePermState, isDark) {
  return fullReportPermissionBadges(filePermState, isDark);
}

function fullReportPill(label, tone, isDark, withDot = true, options = {}) {
  const compact = options?.compact === true;
  const tones = {
    success: {
      text: isDark ? '#dbe5ec' : '#334155',
      bg: isDark ? 'transparent' : '#ffffff',
      border: isDark ? 'rgba(148,163,184,0.06)' : '#e6eaf0',
      dot: isDark ? '#4ade80' : '#16a34a',
    },
    danger: {
      text: isDark ? '#dbe5ec' : '#334155',
      bg: isDark ? 'transparent' : '#ffffff',
      border: isDark ? 'rgba(148,163,184,0.06)' : '#e6eaf0',
      dot: isDark ? '#f87171' : '#dc2626',
    },
    muted: {
      text: isDark ? '#cbd5e1' : '#64748b',
      bg: isDark ? 'transparent' : '#ffffff',
      border: isDark ? 'rgba(148,163,184,0.06)' : '#e6eaf0',
      dot: isDark ? '#94a3b8' : '#94a3b8',
    },
  };
  const c = tones[tone] ?? tones.muted;
  return (
    <span
      key={`${label}-${tone}`}
      className="d-inline-flex align-items-center rounded-pill"
      style={{
        fontFamily: MONO_FONT_STACK,
        fontSize: compact ? 9 : 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        padding: compact ? '3px 7px' : '4px 10px',
        marginRight: compact ? 0 : 6,
        marginBottom: compact ? 0 : 6,
        whiteSpace: 'nowrap',
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: 'none',
      }}
    >
      {withDot ? (
        <span
          style={{
            width: compact ? 6 : 7,
            height: compact ? 6 : 7,
            borderRadius: '50%',
            background: c.dot,
            marginRight: compact ? 6 : 8,
            flex: '0 0 auto',
          }}
        />
      ) : null}
      {label}
    </span>
  );
}

function renderCompilerBadgeGrid(badges, maxWidth = '100%') {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 6,
        width: '100%',
        maxWidth,
      }}
    >
      {badges}
    </div>
  );
}

function fullReportCompilerTonePill(label, tone, isDark, options = {}) {
  const compactGrid = options?.compactGrid === true;
  const tones = {
    success: {
      text: isDark ? '#6ee7b7' : '#15803d',
      bg: isDark ? 'rgba(52, 211, 153, 0.05)' : '#f0fdf4',
      border: isDark ? 'rgba(52, 211, 153, 0.1)' : '#bbf7d0',
    },
    danger: {
      text: isDark ? '#fca5a5' : '#b91c1c',
      bg: isDark ? 'rgba(239,68,68,0.05)' : '#fef2f2',
      border: isDark ? 'rgba(239,68,68,0.1)' : '#fecaca',
    },
    warning: {
      text: isDark ? '#fcd34d' : '#854d0e',
      bg: isDark ? 'rgba(245,158,11,0.05)' : '#fffbeb',
      border: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7',
    },
    muted: {
      text: isDark ? '#94a3b8' : '#64748b',
      bg: isDark ? 'rgba(148,163,184,0.05)' : '#f8fafc',
      border: isDark ? 'rgba(148,163,184,0.1)' : '#e2e8f0',
    },
  };
  const c = tones[tone] ?? tones.muted;
  return (
    <span
      key={`${label}-${tone}`}
      className="d-inline-flex align-items-center justify-content-center"
      style={{
        borderRadius: compactGrid ? 4 : 6,
        minHeight: compactGrid ? 22 : 26,
        padding: compactGrid ? '2px 6px' : '3px 8px',
        marginRight: compactGrid ? 0 : 6,
        marginBottom: compactGrid ? 0 : 6,
        fontFamily: MONO_FONT_STACK,
        fontSize: compactGrid ? 9 : 10,
        fontWeight: 600,
        letterSpacing: '0.01em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        width: compactGrid ? '100%' : 'auto',
        whiteSpace: compactGrid ? 'normal' : 'nowrap',
        overflowWrap: compactGrid ? 'anywhere' : 'normal',
        textAlign: 'center',
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {label}
    </span>
  );
}

function fullReportPermissionBadges(filePerms, isDark) {
  const items = [
    { key: 'uid_root', on: 'ROOT', off: 'NOT ROOT' },
    { key: 'setuid', on: 'SETUID', off: 'NO SETUID' },
    { key: 'setgid', on: 'SETGID', off: 'NO SETGID' },
    { key: 'gid_root', on: 'GID ROOT', off: 'NO GID ROOT' },
    { key: 'group_exec', on: 'GROUP-EXEC', off: 'NO GROUP-EXEC' },
    { key: 'world_exec', on: 'WORLD-EXEC', off: 'NO WORLD-EXEC' },
  ];
  return items
    .filter((item) => filePerms?.[item.key] !== undefined)
    .map((item) =>
      truthy(filePerms?.[item.key])
        ? fullReportPill(item.on, 'danger', isDark)
        : fullReportPill(item.off, 'success', isDark),
    );
}

function fullReportPermissionBadgeGrid(filePerms, isDark, maxWidth = 320) {
  const items = [
    { key: 'uid_root', on: 'ROOT', off: 'NOT ROOT' },
    { key: 'setuid', on: 'SETUID', off: 'NO SETUID' },
    { key: 'setgid', on: 'SETGID', off: 'NO SETGID' },
    { key: 'gid_root', on: 'GID ROOT', off: 'NO GID ROOT' },
    { key: 'group_exec', on: 'GROUP-EXEC', off: 'NO GROUP-EXEC' },
    { key: 'world_exec', on: 'WORLD-EXEC', off: 'NO WORLD-EXEC' },
  ];
  const sortedBadges = items
    .filter((item) => filePerms?.[item.key] !== undefined)
    .map((item) => {
      const enabled = truthy(filePerms?.[item.key]);
      return {
        node: fullReportPill(enabled ? item.on : item.off, enabled ? 'danger' : 'success', isDark, true, { compact: true }),
        sortOrder: enabled ? 0 : 1,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => (
      <div key={`perm-grid-${index}`} style={{ minWidth: 0 }}>
        {item.node}
      </div>
    ));

  if (!sortedBadges.length) {
    return <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>None</span>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 6,
        width: '100%',
        maxWidth,
      }}
    >
      {sortedBadges}
    </div>
  );
}

function fullReportCompilerBadges(compiler, isDark, options = {}) {
  const out = [];
  const pushTone = (label, tone) => out.push(fullReportCompilerTonePill(label, tone, isDark, options));

  const debug = compilerStateValue(compiler, 'debug');
  pushTone(truthy(debug) ? 'DEBUG' : 'NO DEBUG', truthy(debug) ? 'danger' : 'success');

  const nx = compilerStateValue(compiler, 'nx', 'NX');
  pushTone('NX', truthy(nx) ? 'success' : 'muted');

  const canary = compilerStateValue(compiler, 'canary');
  pushTone('CANARY', truthy(canary) ? 'success' : 'muted');

  const relro = compilerStateValue(compiler, 'full_relro', 'relro');
  const partialRelro = compilerStateValue(compiler, 'partial_relro', 'partialRelro');
  out.push(relroStateBadge(relro, partialRelro, isDark, options));

  const cfi = compilerStateValue(compiler, 'cfi', 'cfi_active', 'CFI', 'CFIActive', 'control_flow_integrity');
  pushTone('CFI', truthy(cfi) ? 'success' : 'muted');

  const pie = compilerStateValue(compiler, 'pie');
  pushTone('PIE', truthy(pie) ? 'success' : 'muted');

  return out;
}

function fullReportCapabilitiesCell(capabilities, isDark, key, onOpenCapabilities) {
  const helperTextColor = isDark ? '#9fb0c0' : '#4b5563';
  const items = (Array.isArray(capabilities) ? capabilities : [])
    .map((cap) => ({
      name: String(cap?.name ?? 'unknown'),
      mode: String(cap?.mode_string ?? cap?.mode ?? ''),
      impact: String(cap?.impact ?? ''),
      description: String(cap?.description ?? ''),
    }))
    .filter((cap) => cap.name);
  const count = items.length;
  const sysAdmin = items.find((item) => String(item.name).toLowerCase() === 'cap_sys_admin');
  const pickRandomIndex = () => {
    if (count <= 1) return 0;
    const seed = String(key ?? '')
      .split('')
      .reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0, 7);
    return seed % count;
  };
  const displayName = sysAdmin?.name ?? items[pickRandomIndex()]?.name ?? 'unknown';
  const moreCount = Math.max(0, count - 1);
  const badgeText = count > 1 ? `${displayName} + ${moreCount} more` : displayName;
  if (count === 0) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span
          className="d-inline-flex align-items-center"
          style={{
            borderRadius: 8,
            padding: '6px 10px',
            fontFamily: MONO_FONT_STACK,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.02em',
            color: isDark ? '#9fb0c0' : '#475569',
            background: isDark ? 'transparent' : '#fafafa',
            border: `1px solid ${isDark ? 'rgba(148,163,184,0.08)' : '#e6eaf0'}`,
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          No capabilities
        </span>
        <div style={{ marginTop: 4, fontSize: 9, color: helperTextColor, fontStyle: 'italic', fontWeight: 600 }}>No capabilities</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        onClick={() => onOpenCapabilities?.(items, key)}
        className="p-0"
        style={{ border: 'none', background: 'transparent' }}
        aria-label={`Open ${count} capabilities`}
      >
        <span
          className="d-inline-flex align-items-center"
          style={{
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.01em',
            color: isDark ? '#cbd5e1' : '#334155',
            background: isDark ? 'transparent' : '#ffffff',
            border: isDark ? '1px solid rgba(148,163,184,0.06)' : '1px solid #e6eaf0',
            boxShadow: 'none',
            cursor: 'pointer',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            maxWidth: 220,
          }}
        >
          <span style={{ display: 'inline-block', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal', color: 'inherit', fontFamily: MONO_FONT_STACK, fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{badgeText}</span>
          <OverlayTrigger overlay={<Tooltip id={`cap-tooltip-${String(key)}`}>View capabilities</Tooltip>}>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8, color: helperTextColor }}>
              <IconifyIcon icon="mdi:open-in-new" style={{ fontSize: 12 }} />
            </span>
          </OverlayTrigger>
        </span>
      </button>
    </div>
  );
}

function statusPill(status, isDark) {
  const map = {
    new:       { bg: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(29, 78, 216, 0.06)', color: isDark ? '#93c5fd' : '#1d4ed8', label: 'NEW' },
    improved:  { bg: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)', color: isDark ? '#6ee7b7' : '#059669', label: 'IMPROVED' },
    regressed: { bg: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(185, 28, 28, 0.06)', color: isDark ? '#f87171' : '#b91c1c', label: 'REVIEW' },
    mixed:     { bg: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(180, 83, 9, 0.06)', color: isDark ? '#fcd34d' : '#b45309', label: 'MIXED' },
    deleted:   { bg: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.06)', color: isDark ? '#cbd5e1' : '#475569', label: 'REMOVED' },
    unchanged: { bg: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.06)', color: isDark ? '#cbd5e1' : '#475569', label: 'UNCHANGED' },
  };
  const s = map[status] ?? map.unchanged;
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center"
      style={{
        ...BINARY_STATUS_BADGE_BASE,
        color: s.color,
        background: s.bg,
        border: '1px solid transparent',
        transition: BH_THEME_TRANSITION,
        lineHeight: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function collectCategoryValues(branch) {
  const compiler = (branch?.compilerChanges ?? [])
    .map((change) => String(change?.name ?? '').toLowerCase().trim())
    .filter(Boolean);
  const filePerm = (branch?.filePermChanges ?? [])
    .map((change) => filePermLabel(change?.name))
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  const capabilities = [
    ...(branch?.capAdded ?? []).map((cap) => String(cap ?? '').trim()),
    ...(branch?.capRemoved ?? []).map((cap) => String(cap ?? '').trim()),
    ...(branch?.capModeDiffs ?? []).map((cap) => String(cap?.capability ?? '').trim()),
  ].filter(Boolean);
  return { compiler, filePerm, capabilities };
}

function buildDeltaCategorySignals(row) {
  if (!row) return [];
  const status = row.status;
  const improvements = collectCategoryValues(row.improvements);
  const regressions = collectCategoryValues(row.regressions);
  const categoryConfig = [
    { key: 'compiler', label: 'Compiler Flags' },
    { key: 'filePerm', label: 'Permissions' },
    { key: 'capabilities', label: 'Caps' },
  ];
  return categoryConfig
    .map(({ key, label }) => {
      const improvedCount = improvements[key]?.length ?? 0;
      const regressedCount = regressions[key]?.length ?? 0;
      if (improvedCount + regressedCount === 0) return null;
      let tone = status;
      if (status === 'mixed') {
        if (improvedCount > 0 && regressedCount > 0) tone = 'mixed';
        else if (improvedCount > 0) tone = 'improved';
        else tone = 'regressed';
      } else if (status !== 'improved' && status !== 'regressed') {
        tone = improvedCount > 0 && regressedCount > 0
          ? 'mixed'
          : improvedCount > 0
            ? 'improved'
            : 'regressed';
      }
      return { label, tone };
    })
    .filter(Boolean);
}

function binaryPath(entry) {
  return String(entry?.name ?? '').trim();
}

function binarySha(entry) {
  const raw =
    entry?.sha256 ??
    entry?.hash ??
    entry?.binary_violations?.sha256 ??
    entry?.binary_violations?.hash ??
    null;
  const s = String(raw ?? '').trim();
  return s || null;
}

function buildDeltaRows(binaryDiff) {
  const added = Array.isArray(binaryDiff?.binaries_added) ? binaryDiff.binaries_added : [];
  const removed = Array.isArray(binaryDiff?.binaries_removed) ? binaryDiff.binaries_removed : [];
  const delta = Array.isArray(binaryDiff?.delta)
    ? binaryDiff.delta
    : (Array.isArray(binaryDiff?.binaries_delta) ? binaryDiff.binaries_delta : []);
  const removedNames = removed
    .map((b) => String(b?.name ?? b?.binary_violations?.name ?? '').trim())
    .filter(Boolean);
  const rows = delta
    .map((entry) => {
      const name = binaryPath(entry);
      if (!name) return null;
      const imp = parseBranch('improved', entry?.improvements);
      const reg = parseBranch('regressed', entry?.regressions);
      const hasImp = truthy(entry?.improvements?.improved);
      const hasReg = truthy(entry?.regressions?.regressed);
      const status = statusFromBranches(false, hasImp, hasReg);
      const compilerState = { ...(imp?.compilerState ?? {}), ...(reg?.compilerState ?? {}) };
      const filePermState = { ...(imp?.filePermState ?? {}), ...(reg?.filePermState ?? {}) };
      const summary = entry?.summary ?? entry?.binary_violations?.summary ?? null;
      return {
        key: `delta-${name}`,
        name,
        sha256: binarySha(entry),
        status,
        improvements: imp,
        regressions: reg,
        summary,
        compilerState,
        filePermState,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const b of added) {
    const name = String(b?.name ?? b?.binary_violations?.filename ?? b?.binary_violations?.name ?? '').trim();
    if (!name || rows.some((r) => r.name === name)) continue;
    rows.push({
      key: `added-${name}`,
      name,
      sha256: binarySha(b),
      status: 'new',
      improvements: null,
      regressions: null,
      summary: b?.summary ?? b?.binary_violations?.summary ?? null,
      compilerState: b?.binary_violations?.compiler_flags ?? {},
      filePermState: b?.binary_violations?.file_permissions ?? {},
    });
  }
  for (const name of removedNames) {
    rows.push({
      key: `removed-${name}`,
      name,
      sha256: null,
      status: 'deleted',
      improvements: null,
      regressions: null,
      compilerState: {},
      filePermState: {},
    });
  }
  return rows;
}

export default function BinaryHardeningPage() {
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const t = getBinaryHardeningTheme(isDark);
  const tableRowSeparator = isDark ? 'rgba(148,163,184,0.12)' : t.lineStrong;
  const tableRowTransition = `${BH_THEME_TRANSITION}, background-color 180ms ease, box-shadow 180ms ease`;
  const FONT = {
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 18,
    xl: 26,
  };
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const reportDiffs = useSelector(selectReportDiffs);
  const reportTimestamp = useSelector(selectReportTimestamp);
  const loading = status === 'idle' || status === 'loading';
  const reportViolations = useMemo(() => report?.binary_violations ?? [], [report]);
  const binaryExposureMetrics = useMemo(() => getBinaryExposureMetrics(report), [report]);
  const binaryDiff = reportDiffs?.binary ?? reportDiffs?.binary_diffs ?? null;
  const rows = useMemo(() => buildDeltaRows(binaryDiff), [binaryDiff]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('delta');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedDeltaRow, setSelectedDeltaRow] = useState(null);
  const [hoveredCategoryCard, setHoveredCategoryCard] = useState(null);
  const [hoveredDeltaRowKey, setHoveredDeltaRowKey] = useState(null);
  const [hoveredFullRowKey, setHoveredFullRowKey] = useState(null);
  const [capabilitiesOverlay, setCapabilitiesOverlay] = useState({
    show: false,
    binaryName: '',
    items: [],
  });
  const [fullSummaryOverlay, setFullSummaryOverlay] = useState({
    show: false,
    row: null,
  });
  const [fullPage, setFullPage] = useState(0);
  const [deltaPage, setDeltaPage] = useState(0);
  const [deltaFilterOpen, setDeltaFilterOpen] = useState(false);
  const [fullPrivFilter, setFullPrivFilter] = useState('all'); // 'all' | 'root' | 'capabilities'
  const [fullPrivFilterOpen, setFullPrivFilterOpen] = useState(false);
  const [capSortDir, setCapSortDir] = useState('desc'); // null | 'asc' | 'desc'
  const [deltaPageSize, setDeltaPageSize] = useState(10);
  const [fullPageSize, setFullPageSize] = useState(10);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const insightsCardRef = useRef(null);
  const detailsRef = useRef(null);

  const privilegeDelta = -2; // dummy: 2 fewer privileged binaries
  const hardeningDelta = 5;  // dummy: 5 more binaries with compiler hardening

  const scrollDetailsIntoView = () => {
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  useEffect(() => {
    const pageContent = document.querySelector('.page-content');
    const containerFluid = document.querySelector('.container-fluid');

    if (pageContent) {
      pageContent.style.padding = '0';
      pageContent.style.marginTop = '0';
    }
    if (containerFluid) {
      containerFluid.style.padding = '0';
      containerFluid.style.maxWidth = 'none';
    }

    return () => {
      if (pageContent) {
        pageContent.style.padding = '';
        pageContent.style.marginTop = '';
      }
      if (containerFluid) {
        containerFluid.style.padding = '';
        containerFluid.style.maxWidth = '';
      }
    };
  }, []);

  const reportViolationsByName = useMemo(() => {
    const map = new Map();
    for (const violation of reportViolations) {
      const key = String(violation?.filename ?? violation?.name ?? '').trim();
      if (key) map.set(key, violation);
    }
    return map;
  }, [reportViolations]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const filterMatch = activeFilter === 'all' || row.status === activeFilter;
      const queryMatch = !q || row.name.toLowerCase().includes(q);
      return filterMatch && queryMatch;
    });
  }, [rows, activeFilter, search]);

  const totalFilteredRows = filteredRows.length;
  const displayedRows = filteredRows.slice(deltaPage * deltaPageSize, (deltaPage + 1) * deltaPageSize);

  // Keep the sidebar card sized to its own content.
  useEffect(() => {
    const sideEl = insightsCardRef.current;
    if (!sideEl) return;
    sideEl.style.minHeight = '0px';
    return () => {
      if (sideEl) sideEl.style.minHeight = '0px';
    };
  }, [rows.length, search, fullPage, deltaPage, selectedDeltaRow, reportTimestamp, loading]);

  const fullRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reportViolations
      .filter((v) => {
        const name = String(v?.filename ?? v?.name ?? '').toLowerCase();
        return !q || name.includes(q);
      });

    // Sorting: by capabilities count if capSortDir set, otherwise by filename
    if (capSortDir === 'asc' || capSortDir === 'desc') {
      return list.sort((a, b) => {
        const ca = Array.isArray(a?.capabilities) ? a.capabilities.length : 0;
        const cb = Array.isArray(b?.capabilities) ? b.capabilities.length : 0;
        return capSortDir === 'asc' ? ca - cb : cb - ca;
      });
    }

    return list.sort((a, b) =>
      String(a?.filename ?? a?.name ?? '').localeCompare(String(b?.filename ?? b?.name ?? '')),
    );
  }, [reportViolations, search, capSortDir]);

  const displayedFullRows = useMemo(() => {
    if (fullPrivFilter === 'root') {
      return fullRows.filter((v) => {
        const p = v?.file_permissions ?? {};
        return truthy(p.uid_root);
      });
    }
    if (fullPrivFilter === 'capabilities') {
      return fullRows.filter((v) => Array.isArray(v?.capabilities) && v.capabilities.length > 0);
    }
    return fullRows;
  }, [fullPrivFilter, fullRows]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(displayedFullRows.length / fullPageSize));
    setFullPage((prev) => Math.min(prev, pages - 1));
  }, [displayedFullRows.length, fullPageSize]);

  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 1200);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const improvedBinaries = useMemo(() => {
    const improved = rows.filter((r) => r.status === 'improved');
    return {
      total: improved.length,
      compiler: improved.filter((r) => (r.improvements?.compilerChanges?.length ?? 0) > 0).length,
      capabilities: improved.filter((r) =>
        (r.improvements?.capAdded?.length ?? 0) +
        (r.improvements?.capRemoved?.length ?? 0) +
        (r.improvements?.capModeDiffs?.length ?? 0) > 0
      ).length,
      filePerms: improved.filter((r) => (r.improvements?.filePermChanges?.length ?? 0) > 0).length,
    };
  }, [rows]);

  const regressedBinaries = useMemo(() => {
    const regressed = rows.filter((r) => r.status === 'regressed');
    return {
      total: regressed.length,
      compiler: regressed.filter((r) => (r.regressions?.compilerChanges?.length ?? 0) > 0).length,
      capabilities: regressed.filter((r) =>
        (r.regressions?.capAdded?.length ?? 0) +
        (r.regressions?.capRemoved?.length ?? 0) +
        (r.regressions?.capModeDiffs?.length ?? 0) > 0
      ).length,
      filePerms: regressed.filter((r) => (r.regressions?.filePermChanges?.length ?? 0) > 0).length,
    };
  }, [rows]);
  const mixedBinaries = useMemo(() => {
    const mixed = rows.filter((r) => r.status === 'mixed');
    return {
      total: mixed.length,
      compiler: mixed.filter((r) =>
        (r.improvements?.compilerChanges?.length ?? 0) > 0 ||
        (r.regressions?.compilerChanges?.length ?? 0) > 0
      ).length,
      capabilities: mixed.filter((r) =>
        (r.improvements?.capAdded?.length ?? 0) + (r.improvements?.capRemoved?.length ?? 0) + (r.improvements?.capModeDiffs?.length ?? 0) > 0 ||
        (r.regressions?.capAdded?.length ?? 0) + (r.regressions?.capRemoved?.length ?? 0) + (r.regressions?.capModeDiffs?.length ?? 0) > 0
      ).length,
      filePerms: mixed.filter((r) =>
        (r.improvements?.filePermChanges?.length ?? 0) > 0 ||
        (r.regressions?.filePermChanges?.length ?? 0) > 0
      ).length,
    };
  }, [rows]);

  const deltaBreakdown = useMemo(() => {
    const imp = binaryDiff?.improvements ?? {};
    const reg = binaryDiff?.regressions ?? {};
    const mix = binaryDiff?.mixed ?? {};
    const CATS = [
      { key: 'compiler',     label: 'Compiler Flags', icon: 'mdi:shield-check-outline',   impField: 'stats_compiler_flags',  regField: 'stats_compiler_flags_regressed' },
      { key: 'permissions',  label: 'File Permissions', icon: 'mdi:lock-outline',            impField: 'stats_permissions',     regField: 'stats_permissions_regressed' },
      { key: 'capabilities', label: 'Capabilities',   icon: 'mdi:shield-key-outline',      impField: 'stats_capabilities',    regField: 'stats_cap_regressed' },
    ];
    const maxOf = (arr) => arr.reduce((m, c) => c.value > m.value ? c : m, arr[0] ?? { value: 0, label: '—', key: '' });
    const impCats    = CATS.map((c) => ({ ...c, value: imp[c.impField] ?? 0 }));
    const regCats    = CATS.map((c) => ({ ...c, value: reg[c.impField] ?? 0 }));
    const mixImpCats = CATS.map((c) => ({ ...c, value: mix[c.impField] ?? 0 }));
    const mixRegCats = CATS.map((c) => ({ ...c, value: mix[c.regField] ?? 0 }));
    return {
      impCats, regCats, mixImpCats, mixRegCats,
      impLeader:    maxOf(impCats),
      regLeader:    maxOf(regCats),
      mixImpLeader: maxOf(mixImpCats),
      mixRegLeader: maxOf(mixRegCats),
      hasImpData:   impCats.some((c) => c.value > 0),
      hasRegData:   regCats.some((c) => c.value > 0),
      hasMixData:   mixImpCats.some((c) => c.value > 0) || mixRegCats.some((c) => c.value > 0),
    };
  }, [binaryDiff]);

  const addedRaw =
    binaryDiff?.binaries_added ??
    reportDiffs?.binary?.binaries_added ??
    reportDiffs?.binary_diffs?.binaries_added ??
    binaryDiff?.added ??
    reportDiffs?.binary?.added ??
    reportDiffs?.binary_diffs?.added ??
    0;
  const newCount = Math.max(rows.filter((r) => r.status === 'new').length, countListLike(addedRaw));
  const deletedCount = rows.filter((r) => r.status === 'deleted').length;
  const totalMonitored = reportViolations.length;
  const baselineId = reportDiffs?.last_build_id ?? '—';
  const targetId = report?.build_id ?? '—';
  const THEME_TRANSITION = BH_THEME_TRANSITION;

  const deltaStats = useMemo(() => {
    const nImp = rows.filter((r) => r.status === 'improved').length;
    const nReg = rows.filter((r) => r.status === 'regressed').length;
    const nMix = rows.filter((r) => r.status === 'mixed').length;

    const unchangedRaw =
      binaryDiff?.binaries_unchanged ??
      reportDiffs?.binary?.binaries_unchanged ??
      reportDiffs?.binary_diffs?.binaries_unchanged ??
      binaryDiff?.unchanged ??
      reportDiffs?.binary?.unchanged ??
      reportDiffs?.binary_diffs?.unchanged ??
      0;
    const nUnchanged = countListLike(unchangedRaw);
    const total = nImp + nReg + nMix + nUnchanged + newCount;
    const nRegressions = nReg + nMix;
    return { total, nImp, nReg, nMix, nUnchanged, nRegressions };
  }, [rows, binaryDiff, reportDiffs, newCount]);

  const criticalStats = useMemo(() => {
    const rootCount = binaryExposureMetrics.rootCount;
    const setuidCount = binaryExposureMetrics.setuidCount;
    const capSysAdminCount = binaryExposureMetrics.capSysAdminCount;
    let noNxCount = 0, noCanaryCount = 0, noRelroCount = 0, noPieCount = 0, noCfiCount = 0;

    for (const v of reportViolations) {
      const c = v?.compiler_flags ?? {};

      if (!truthy(c.nx)) noNxCount++;
      if (!truthy(c.canary)) noCanaryCount++;
      if (!truthy(c.full_relro ?? c.relro)) noRelroCount++;
      if (!truthy(c.pie)) noPieCount++;
      if (!truthy(c.cfi)) noCfiCount++;
    }
    return { rootCount, setuidCount, capSysAdminCount, noNxCount, noCanaryCount, noRelroCount, noPieCount, noCfiCount };
  }, [binaryExposureMetrics, reportViolations]);

  const totalPrivileged = criticalStats.rootCount + criticalStats.setuidCount + criticalStats.capSysAdminCount;
  const totalHardened = useMemo(() => {
    const tot = totalMonitored || 1;
    const flags = [
      { missing: criticalStats.noNxCount },
      { missing: criticalStats.noCanaryCount },
      { missing: criticalStats.noPieCount },
      { missing: criticalStats.noRelroCount },
      { missing: criticalStats.noCfiCount },
    ];
    // We'll define "total hardened" as the sum of all protection flags present across all binaries
    // divided by number of flags to get an average binary-equivalent count.
    // Or more simply, let's just use the average count of binaries that have these flags.
    return Math.round(flags.reduce((acc, f) => acc + Math.max(0, tot - f.missing), 0) / flags.length);
  }, [totalMonitored, criticalStats]);

  const criticalGapTotal =
    criticalStats.noNxCount +
    criticalStats.noCanaryCount +
    criticalStats.noRelroCount +
    criticalStats.noPieCount;

  const openDeltaView = (filter = 'all', shouldScroll = false) => {
    setActiveFilter(filter);
    setViewMode('delta');
    setDeltaFilterOpen(filter !== 'all');
    setFullPrivFilter('all');
    setFullPrivFilterOpen(false);
    setDeltaPage(0);
    if (shouldScroll) {
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  };

  const openFullScanView = () => {
    setViewMode('full');
    setActiveFilter('all');
    setDeltaFilterOpen(false);
    setFullPrivFilter('all');
    setFullPrivFilterOpen(false);
    setFullPage(0);
  };

  const handleCategoryClick = (filter) => {
    openDeltaView(filter, true);
  };

  const deltaHeaderBg = isDark ? 'rgba(15,23,42,0.92)' : t.headerBg;
  const deltaHeaderBorder = isDark ? '#243244' : t.divider;
  const deltaHeaderBorderStrong = isDark ? '#314256' : t.borderStrong;
  const deltaHeaderText = isDark ? '#cbd5e1' : '#475569';
  const deltaHeaderSubText = isDark ? '#94a3b8' : '#64748b';
  const deltaSubHeaderBg = isDark ? 'rgba(15,23,42,0.78)' : t.subheaderBg;
  const fullHeaderBg = isDark ? 'rgba(15,23,42,0.92)' : t.headerBg;
  const fullHeaderBorder = isDark ? '#243244' : t.divider;
  const fullHeaderText = isDark ? '#cbd5e1' : '#475569';
  const headerCellStyle = {
    background: deltaHeaderBg,
    borderBottom: `1px solid ${deltaHeaderBorder}`,
    borderRight: `1px solid ${deltaHeaderBorder}`,
    color: deltaHeaderText,
    fontFamily: UI_FONT_STACK,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    verticalAlign: 'middle',
    padding: '14px 16px',
    whiteSpace: 'nowrap',
    transition: THEME_TRANSITION,
  };
  const fullHeaderCellStyle = {
    ...headerCellStyle,
    background: fullHeaderBg,
    borderBottom: `1px solid ${fullHeaderBorder}`,
    borderRight: `1px solid ${fullHeaderBorder}`,
    color: fullHeaderText,
    padding: '14px 16px',
  };
  const headerGroupStyle = {
    ...headerCellStyle,
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 10,
  };
  const headerSubCellStyle = {
    ...headerCellStyle,
    background: deltaSubHeaderBg,
    color: deltaHeaderSubText,
    fontSize: FONT.base,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    borderBottom: `1px solid ${deltaHeaderBorder}`,
  };
  const deltaCellStyle = {
    padding: '14px 16px',
    verticalAlign: 'top',
    fontSize: 13,
    transition: THEME_TRANSITION,
  };
  const deltaNoChangeStyle = {
    color: t.muted,
    fontSize: FONT.sm,
    display: 'inline-block',
    width: '100%',
    textAlign: 'center',
  };
  const filterInactivePill = {
    ...FILTER_PILL_BASE,
    background: isDark ? 'rgba(30,41,59,0.9)' : t.surfaceRaised,
    border: isDark ? '1px solid rgba(148,163,184,0.26)' : `1px solid ${t.borderStrong}`,
    color: isDark ? t.title : '#1e293b',
    boxShadow: isDark ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.06)',
  };
  const binaryFilterButtons = [
    { id: 'all', label: 'All', activeStyle: FILTER_ACTIVE_ALL },
    { id: 'new', label: 'New', activeStyle: FILTER_ACTIVE_NEW },
    { id: 'improved', label: 'Improved', activeStyle: FILTER_ACTIVE_IMPROVED },
    { id: 'regressed', label: 'Regressed', activeStyle: FILTER_ACTIVE_REGRESSED },
    { id: 'mixed', label: 'Mixed', activeStyle: FILTER_ACTIVE_MIXED },
    { id: 'deleted', label: 'Deleted', activeStyle: FILTER_ACTIVE_DELETED },
  ];
  const searchFieldShellStyle = {
    borderRadius: 10,
    border: `1px solid ${
      searchFocused
        ? isDark
          ? '#60a5fa'
          : '#93c5fd'
        : isDark
          ? '#475569'
          : t.borderStrong
    }`,
    background: isDark ? 'rgba(15,23,42,0.82)' : t.cardBg,
    height: 38,
    flex: '1 1 200px',
    maxWidth: 320,
    minWidth: 180,
    boxShadow: searchFocused
      ? isDark
        ? '0 0 0 3px rgba(96, 165, 250, 0.22)'
        : '0 0 0 3px rgba(59, 130, 246, 0.18)'
      : isDark
        ? 'none'
        : '0 1px 2px rgba(15, 23, 42, 0.05)',
    transition: BH_INTERACTIVE_TRANSITION,
  };
  const SEV_COLORS = {
    CRITICAL: { color: '#f87171', bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.38)'   },
    HIGH:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.38)'  },
    MED:      { color: '#22d3ee', bg: 'rgba(6,182,212,0.16)',   border: 'rgba(6,182,212,0.32)'   },
  };
  const legendCardStyle = {
    borderRadius: 12,
    background: isDark ? '#111827' : t.surfaceRaised,
    border: `1px solid ${isDark ? '#1f2937' : t.borderStrong}`,
    boxShadow: isDark ? 'none' : '0 6px 16px rgba(15,23,42,0.06)',
    overflow: 'hidden',
    transition: THEME_TRANSITION,
  };
  const legendSectionStyle = {
    flex: 'none',
    width: '100%',
    minWidth: 0,
    padding: '14px 16px',
  };
  const legendSectionHeaderStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 900,
    color: isDark ? '#94a3b8' : '#64748b',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8,
  };
  const legendSectionDividerStyle = {
    width: 1,
    background: isDark ? 'rgba(148,163,184,0.12)' : t.lineStrong,
    alignSelf: 'stretch',
    flexShrink: 0,
  };
  const legendItemGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: '8px 12px',
  };
  const legendPermissionGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: '6px',
  };
      const renderLegendItem = (item) => {
    const sev = SEV_COLORS[item.severity] ?? SEV_COLORS.MED;
    return (
      <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: sev.color, display: 'inline-block', flexShrink: 0, border: `1px solid ${sev.border}`, marginTop: 5 }} aria-hidden />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#e2e8f0' : '#0f172a', lineHeight: 1.08, letterSpacing: '-0.01em', wordBreak: 'break-word' }}>{item.title}</span>
          </div>
          <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.36 }}>{item.description}</div>
        </div>
      </div>
    );
  };
  const renderLegendHeaderTip = (tooltipId, title, items) => (
    <OverlayTrigger
      placement="bottom"
      overlay={(
        <Tooltip id={tooltipId} style={{ maxWidth: 360 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: FONT.sm, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item) => {
                const sev = SEV_COLORS[item.severity] ?? SEV_COLORS.MED;
                return (
                  <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sev.color, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: FONT.sm, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: FONT.sm, opacity: 0.92, lineHeight: 1.35 }}>{item.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Tooltip>
      )}
    >
      <span
        className="d-inline-flex align-items-center justify-content-center"
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `1px solid ${isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.24)'}`,
          color: isDark ? '#94a3b8' : '#64748b',
          cursor: 'help',
          flexShrink: 0,
        }}
      >
        <IconifyIcon icon="mdi:information-variant" style={{ fontSize: 11 }} />
      </span>
    </OverlayTrigger>
  );
  const selectedBranches = [selectedDeltaRow?.improvements, selectedDeltaRow?.regressions].filter(Boolean);
  const selectedCurrentBinary = selectedDeltaRow ? reportViolationsByName.get(selectedDeltaRow.name) ?? null : null;
  const selectedPermissionChanges = selectedBranches.flatMap((branch) =>
    (branch?.filePermChanges ?? []).map((change) => ({ ...change, side: branch.side })),
  );
  const selectedCompilerChanges = selectedBranches.flatMap((branch) =>
    (branch?.compilerChanges ?? []).map((change) => ({ ...change, side: branch.side })),
  );
  const selectedCapabilityAdded = selectedBranches.flatMap((branch) =>
    (branch?.capAdded ?? []).map((capability) => ({ label: capability, side: branch.side, kind: 'added' })),
  );
  const selectedCapabilityRemoved = selectedBranches.flatMap((branch) =>
    (branch?.capRemoved ?? []).map((capability) => ({ label: capability, side: branch.side, kind: 'removed' })),
  );
  const selectedCapabilityModeChanges = selectedBranches.flatMap((branch) =>
    (branch?.capModeDiffs ?? []).map((capability) => ({
      capability: capability.capability,
      previous_mode: capability.previous_mode,
      current_mode: capability.current_mode,
      impact: capability.impact ?? null,
      side: branch.side,
      kind: 'mode',
    })),
  );
  const selectedCurrentPermissionBadges = filePermStateBadges(
    selectedCurrentBinary?.file_permissions ?? selectedDeltaRow?.filePermState,
    isDark,
  );
  const selectedCurrentCompilerBadges = compilerStateBadges(
    selectedCurrentBinary?.compiler_flags ?? selectedDeltaRow?.compilerState,
    isDark,
  );
  const selectedCurrentCapabilities = Array.isArray(selectedCurrentBinary?.capabilities)
    ? selectedCurrentBinary.capabilities.filter((c) => c?.name)
    : [];

  const drawerTone = useMemo(() => {
    switch (selectedDeltaRow?.status) {
      case 'new':
        return {
          bg: isDark ? 'rgba(124,58,237,0.22)' : '#ede9fe',
          color: isDark ? '#c4b5fd' : '#5b21b6',
          border: isDark ? '#8b5cf6' : '#c4b5fd',
          softBg: isDark ? 'rgba(124,58,237,0.14)' : '#f5f3ff',
          accent: '#7c3aed',
          icon: getStatusIcon('new'),
        };
      case 'improved':
        return {
          bg: '#dcfce7',
          color: '#166534',
          border: '#bbf7d0',
          softBg: isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4',
          accent: '#15803d',
          icon: getStatusIcon('improved'),
        };
      case 'mixed':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a',
          softBg: isDark ? 'rgba(245,158,11,0.14)' : '#fffbeb',
          accent: '#d97706',
          icon: getStatusIcon('mixed'),
        };
      case 'deleted':
        return {
          bg: '#e2e8f0',
          color: '#475569',
          border: '#cbd5e1',
          softBg: isDark ? 'rgba(148,163,184,0.14)' : '#f8fafc',
          accent: '#475569',
          icon: getStatusIcon('deleted'),
        };
      case 'regressed':
      default:
        return {
          bg: '#fee2e2',
          color: '#991b1b',
          border: '#fecaca',
          softBg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
          accent: '#dc2626',
          icon: getStatusIcon('regressed'),
        };
    }
  }, [selectedDeltaRow?.status, isDark]);

  const drawerPanelStyle = {
    background: isDark ? '#0f172a' : '#f8fafc',
    color: t.title,
    borderLeft: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    width: 'min(560px, 100vw)',
  };

  const capabilitiesPanelStyle = {
    background: isDark ? '#0f172a' : '#f8fafc',
    color: t.title,
    borderLeft: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    width: 'min(520px, 100vw)',
  };



  const buildBinaryNarrative = (row) => {
    if (!row) return '';
    if (row.status === 'new') {
      return 'A new binary was introduced in the current build and should be reviewed for hardening posture before release.';
    }
    if (row.status === 'deleted') {
      return 'This binary existed in the baseline but is no longer present in the current build.';
    }
    if (row.status === 'mixed') {
      return 'This binary contains both hardening improvements and regressions, so the effective risk posture changed in both directions.';
    }
    if (row.status === 'improved') {
      return 'Hardening controls improved for this binary compared with the previous build.';
    }
    return 'This binary regressed relative to the previous build and requires follow-up before release.';
  };

  const buildBinaryAction = (row, currentBinary = null) => {
    if (!row) return '';
    const rowSummary = typeof (row?.summary ?? row?.binary_violations?.summary) === 'string'
      ? String(row?.summary ?? row?.binary_violations?.summary ?? '').trim()
      : '';
    const currentSummary = typeof (currentBinary?.summary ?? currentBinary?.binary_violations?.summary) === 'string'
      ? String(currentBinary?.summary ?? currentBinary?.binary_violations?.summary ?? '').trim()
      : '';
    if (rowSummary) return rowSummary;
    if (currentSummary) return currentSummary;
    if (row.status === 'new') {
      return 'Recommended follow-up: confirm required hardening flags, file permissions, and capabilities before promoting this new binary.';
    }
    if (row.status === 'deleted') {
      return 'Recommended follow-up: verify the removal is expected and does not impact package completeness or runtime dependencies.';
    }
    if (row.status === 'improved') {
      return 'No immediate action required — preserve these hardening gains in subsequent builds.';
    }
    if (row.status === 'mixed') {
      return 'Recommended follow-up: keep the improvements and remediate the regressed controls to restore a clean posture.';
    }
    return 'Recommended follow-up: restore the missing hardening controls and re-check this binary against the baseline.';
  };

  const extractBinarySummary = (row, currentBinary = null) => {
    const parseCtaActions = (source) => {
      if (!Array.isArray(source)) return [];
      return source
        .map((a) => {
          const category = String(a?.category ?? '').trim();
          let actions = [];
          if (Array.isArray(a?.actions)) {
            // New schema: actions is []{ value, action }
            actions = a.actions
              .map((d) => ({ value: String(d?.value ?? '').trim(), action: String(d?.action ?? '').trim() }))
              .filter((d) => d.value || d.action);
          } else if (a?.action && typeof a.action === 'object') {
            // Intermediate schema: single action object { value, action }
            const v = String(a.action?.value ?? '').trim();
            const act = String(a.action?.action ?? '').trim();
            if (v || act) actions = [{ value: v, action: act }];
          } else {
            // Legacy schema: values[] array + action string
            const legacyValues = Array.isArray(a?.values)
              ? a.values.map((v) => String(v ?? '').trim()).filter(Boolean)
              : (typeof a?.values === 'string' ? [String(a.values).trim()].filter(Boolean) : []);
            const legacyAction = String(a?.action ?? '').trim();
            // Flatten: one detail row per value, sharing the same action text
            if (legacyValues.length > 0) {
              actions = legacyValues.map((v) => ({ value: v, action: legacyAction }));
            } else if (legacyAction) {
              actions = [{ value: '', action: legacyAction }];
            }
          }
          return { category, actions };
        })
        .filter((a) => a.category || a.actions.length);
    };

    const candidates = [
      row?.summary,
      row?.binary_violations?.summary,
      currentBinary?.summary,
      currentBinary?.binary_violations?.summary,
    ];
 
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;

      // NEW schema: { categories: [{ name, risks: [{value, description}], secure }], cta: { actions: [{category, values, action}] } }
      if (Array.isArray(candidate.categories)) {
        const categories = candidate.categories.map((cat) => {
          const name = String(cat?.name ?? '').trim();
          const secure = typeof cat?.secure === 'string' ? cat.secure.trim() : '';
          const risks = Array.isArray(cat?.risks)
            ? cat.risks.map((r) => ({ value: String(r?.value ?? '').trim(), description: String(r?.description ?? '').trim() })).filter((r) => r.value || r.description)
            : [];
          return { name, secure, risks };
        }).filter((c) => c.name || c.risks.length || c.secure);

        // New schema: cta is a top-level array; old schema: cta is { actions: [] }
        const rawCta = candidate.cta;
        const cta = {
          actions: Array.isArray(rawCta)
            ? parseCtaActions(rawCta)
            : parseCtaActions(rawCta?.actions),
        };

        if (categories.length > 0 || cta.actions.length > 0) {
          return { categories, cta };
        }
      }

      // Backward-compatible / legacy schema support: { risk[], secure, cta }
      const risk = Array.isArray(candidate?.risk)
        ? candidate.risk.map((item) => String(item ?? '').trim()).filter(Boolean)
        : (typeof candidate?.risk === 'string' && candidate.risk.trim() ? [candidate.risk.trim()] : []);
      const secure = typeof candidate?.secure === 'string' ? candidate.secure.trim() : '';
      const cta = typeof candidate?.cta === 'string' ? candidate.cta.trim() : '';
      const ctaActions = typeof candidate?.cta === 'object' ? parseCtaActions(candidate?.cta?.actions) : [];
      if (risk.length > 0 || secure || cta || ctaActions.length > 0) {
        return { risk, secure, cta, ctaActions };
      }
    }

    return null;
  };

  const renderBinaryActionSummary = (row, currentBinary = null) => {
    const objectSummary = extractBinarySummary(row, currentBinary);
    if (!objectSummary) {
      const actionText = String(buildBinaryAction(row, currentBinary) ?? '').trim();
      if (!actionText) return null;
      const lines = actionText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      return (
        <div className="d-flex flex-column" style={{ gap: 4 }}>
          {lines.map((line, idx) => {
            const match = line.match(/^([^:\n]{2,64}):\s*(.+)$/);
            if (!match) return <div key={idx} style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.5 }}>{line}</div>;
            return (
              <div key={idx} style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>
                <span style={{ fontWeight: 700, color: isDark ? '#f5f3ff' : '#312e81' }}>{String(match[1]).trim()}:</span>{' '}
                {String(match[2]).trim()}
              </div>
            );
          })}
        </div>
      );
    }

    // ── NEW schema: { categories[], cta } ──────────────────────────────────
    if (Array.isArray(objectSummary.categories)) {
      const hasAnyRisk = objectSummary.categories.some((c) => c.risks && c.risks.length > 0);
      const hasAnySecure = objectSummary.categories.some((c) => c.secure);
      const hasCta = objectSummary.cta && Array.isArray(objectSummary.cta.actions) && objectSummary.cta.actions.length > 0;

      return (
        <div className="d-flex flex-column" style={{ gap: 12 }}>

          {/* ── Risk section: per-category findings ── */}
          {hasAnyRisk ? (
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${isDark ? 'rgba(251,113,133,0.28)' : '#fecaca'}`,
                overflow: 'hidden',
                boxShadow: isDark ? '0 4px 14px rgba(239,68,68,0.10)' : '0 4px 10px rgba(239,68,68,0.07)',
              }}
            >
              {/* header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: isDark ? 'rgba(239,68,68,0.16)' : 'rgba(254,226,226,0.7)',
                  borderBottom: `1px solid ${isDark ? 'rgba(251,113,133,0.18)' : '#fecaca'}`,
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(239,68,68,0.20)' : '#fee2e2', border: `1px solid ${isDark ? 'rgba(251,113,133,0.35)' : '#fecaca'}` }}>
                  <IconifyIcon icon="mdi:alert-outline" style={{ fontSize: 12, color: isDark ? '#fb7185' : '#b91c1c', flexShrink: 0, display: 'flex' }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#fda4af' : '#9f1239', lineHeight: 1 }}>At Risk</span>
              </div>
              {/* rows */}
              <div style={{ background: isDark ? 'rgba(239,68,68,0.05)' : '#fffafa' }}>
                {objectSummary.categories.filter((c) => c.risks && c.risks.length > 0).map((cat, cIdx, arr) => (
                  <div
                    key={`rcat-${cIdx}`}
                    style={{
                      borderBottom: cIdx < arr.length - 1 ? `1px solid ${isDark ? 'rgba(251,113,133,0.10)' : '#fee2e2'}` : 'none',
                    }}
                  >
                    {/* category label row */}
                    <div
                      style={{
                        padding: '8px 12px 5px',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isDark ? '#9ca3af' : '#64748b',
                      }}
                    >
                      {cat.name !== 'compiler flags' ? `${cat.name} Enabled` : `${cat.name} Disabled`}
                    </div>
                    {/* risk items */}
                    {cat.risks.map((r, rIdx) => (
                      <div
                        key={`ritem-${cIdx}-${rIdx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '4px 12px 6px 16px',
                        }}
                      >
                        {/* monospace value chip — pinned to top so single-line chips align with first line of wrapped descriptions */}
                        <span
                          style={{
                            fontFamily: MONO_FONT_STACK,
                            fontSize: 10,
                            fontWeight: 700,
                            color: isDark ? '#fca5a5' : '#991b1b',
                            background: isDark ? 'rgba(239,68,68,0.18)' : '#fee2e2',
                            border: `1px solid ${isDark ? 'rgba(239,68,68,0.32)' : '#fecaca'}`,
                            borderRadius: 4,
                            padding: '2px 7px',
                            flexShrink: 0,
                            lineHeight: 1.5,
                            marginTop: 1,
                          }}
                        >
                          {r.value}
                        </span>
                        {/* description — fills remaining width, wraps gracefully */}
                        {r.description ? (
                          <span
                            style={{
                              fontFamily: UI_FONT_STACK,
                              fontSize: 11,
                              color: isDark ? '#b6c3d1' : '#475569',
                              lineHeight: 1.55,
                              fontWeight: 500,
                              flex: '1 1 0',
                              minWidth: 0,
                            }}
                          >
                            {r.description}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Secure section: per-category green summary ── */}
          {hasAnySecure ? (
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${isDark ? 'rgba(74,222,128,0.22)' : '#bbf7d0'}`,
                overflow: 'hidden',
                boxShadow: isDark ? '0 4px 14px rgba(34,197,94,0.10)' : '0 4px 10px rgba(34,197,94,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 12px',
                  background: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(220,252,231,0.7)',
                  borderBottom: `1px solid ${isDark ? 'rgba(74,222,128,0.14)' : '#bbf7d0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(34,197,94,0.20)' : '#dcfce7', border: `1px solid ${isDark ? 'rgba(74,222,128,0.30)' : '#bbf7d0'}` }}>
                    <IconifyIcon icon="mdi:check-circle-outline" style={{ fontSize: 12, color: isDark ? '#4ade80' : '#15803d', flexShrink: 0, display: 'flex' }} />
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#86efac' : '#166534', lineHeight: 1 }}>Looks Good</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#4ade80' : '#15803d', opacity: 0.72, cursor: 'default' }}>Details</span>
              </div>
              <div style={{ background: isDark ? 'rgba(34,197,94,0.04)' : '#f0fdf4', padding: '8px 12px' }}>
                {objectSummary.categories.filter((c) => c.secure).map((cat, cIdx, arr) => (
                  <div
                    key={`scat-${cIdx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 10,
                      padding: cIdx === 0 ? '0 0 8px' : '8px 0',
                      borderBottom: cIdx < arr.length - 1 ? `1px solid ${isDark ? 'rgba(74,222,128,0.08)' : '#dcfce7'}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: isDark ? '#86efac' : '#166534',
                        }}
                      >
                        {cat.name}
                      </span>
                      <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.45, fontWeight: 500 }}>
                        {cat.secure}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── CTA section ── */}
          {hasCta ? (
            <div style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(96,165,250,0.3)' : '#bfdbfe'}`, overflow: 'hidden' }}>
              {/* card header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(219,234,254,0.7)', borderBottom: `1px solid ${isDark ? 'rgba(96,165,250,0.18)' : '#bfdbfe'}` }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(59,130,246,0.22)' : '#dbeafe', border: `1px solid ${isDark ? 'rgba(96,165,250,0.35)' : '#bfdbfe'}` }}>
                  <IconifyIcon icon="mdi:auto-fix" style={{ fontSize: 11, color: isDark ? '#60a5fa' : '#2563eb', flexShrink: 0, display: 'flex' }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#93c5fd' : '#1d4ed8', lineHeight: 1 }}>Next Steps</span>
              </div>
              {/* card body */}
              <div style={{ background: isDark ? 'rgba(59,130,246,0.04)' : '#f0f6ff', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* one group per CTA item — category label once, detail cards below */}
              {objectSummary.cta.actions.map((act, aIdx) => (
                <div key={`ctacat-${aIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* category label — shown once, always blue */}
                  {act.category ? (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#93c5fd' : '#2563eb' }}>
                      {act.category}
                    </span>
                  ) : null}

                  {/* detail cards for this category */}
                  {Array.isArray(act.actions) && act.actions.length > 0 ? (
                    act.actions.map((detail, dIdx) => (
                      <div
                        key={`ctadetail-${aIdx}-${dIdx}`}
                        style={{
                          display: 'flex',
                          borderRadius: 8,
                          border: `1px solid ${isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)'}`,
                          background: isDark ? 'rgba(15,23,42,0.55)' : '#ffffff',
                          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(15,23,42,0.06)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* left accent bar — blue for first category, slate for rest */}
                        <div style={{ width: 3, flexShrink: 0, background: aIdx === 0 ? (isDark ? '#3b82f6' : '#2563eb') : (isDark ? '#475569' : '#94a3b8'), borderRadius: '8px 0 0 8px' }} />

                        <div style={{ flex: 1, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {/* value — prominent monospace title */}
                          {detail.value ? (
                            <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.25, fontFamily: MONO_FONT_STACK, letterSpacing: '0.01em' }}>
                              {detail.value}
                            </span>
                          ) : null}
                          {/* action description */}
                          {detail.action ? (
                            <span style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.5, marginTop: detail.value ? 1 : 0 }}>
                              {detail.action}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : null}
                </div>
              ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    // ── Legacy schema: { risk[], secure, cta | cta.actions } ───────────────
    if (Array.isArray(objectSummary.risk) || objectSummary.secure || objectSummary.cta || (Array.isArray(objectSummary.ctaActions) && objectSummary.ctaActions.length > 0)) {
      const legacy = objectSummary;
      const hasLegacyCta = Boolean(legacy.cta) || (Array.isArray(legacy.ctaActions) && legacy.ctaActions.length > 0);
      return (
        <div className="d-flex flex-column" style={{ gap: 8 }}>
          {Array.isArray(legacy.risk) && legacy.risk.length > 0 ? (
            <div style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(251,113,133,0.28)' : '#fecaca'}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isDark ? 'rgba(239,68,68,0.16)' : 'rgba(254,226,226,0.7)', borderBottom: `1px solid ${isDark ? 'rgba(251,113,133,0.18)' : '#fecaca'}` }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(239,68,68,0.20)' : '#fee2e2', border: `1px solid ${isDark ? 'rgba(251,113,133,0.35)' : '#fecaca'}` }}>
                  <IconifyIcon icon="mdi:alert-outline" style={{ fontSize: 12, color: isDark ? '#fb7185' : '#b91c1c', flexShrink: 0, display: 'flex' }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#fda4af' : '#9f1239', lineHeight: 1 }}>At Risk</span>
              </div>
              <div style={{ background: isDark ? 'rgba(239,68,68,0.05)' : '#fffafa', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {legacy.risk.map((riskItem, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 7, flexShrink: 0, background: isDark ? '#fb7185' : '#e11d48' }} />
                    <span style={{ fontFamily: UI_FONT_STACK, fontSize: 11, color: isDark ? '#b6c3d1' : '#475569', lineHeight: 1.45, fontWeight: 500 }}>{riskItem}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {legacy.secure ? (
            <div style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(74,222,128,0.22)' : '#bbf7d0'}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(220,252,231,0.7)', borderBottom: `1px solid ${isDark ? 'rgba(74,222,128,0.14)' : '#bbf7d0'}` }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(34,197,94,0.20)' : '#dcfce7', border: `1px solid ${isDark ? 'rgba(74,222,128,0.30)' : '#bbf7d0'}` }}>
                  <IconifyIcon icon="mdi:check-circle-outline" style={{ fontSize: 12, color: isDark ? '#4ade80' : '#15803d', flexShrink: 0, display: 'flex' }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#86efac' : '#166534', lineHeight: 1 }}>Looks Good</span>
              </div>
              <div style={{ background: isDark ? 'rgba(34,197,94,0.04)' : '#f0fdf4', padding: '8px 12px' }}>
                <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.45, fontWeight: 500 }}>{legacy.secure}</span>
              </div>
            </div>
          ) : null}
          {hasLegacyCta ? (
            <div style={{ borderRadius: 10, border: `1px solid ${isDark ? 'rgba(96,165,250,0.3)' : '#bfdbfe'}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(219,234,254,0.7)', borderBottom: `1px solid ${isDark ? 'rgba(96,165,250,0.18)' : '#bfdbfe'}` }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(59,130,246,0.22)' : '#dbeafe', border: `1px solid ${isDark ? 'rgba(96,165,250,0.35)' : '#bfdbfe'}` }}>
                  <IconifyIcon icon="solar:alt-arrow-right-bold" style={{ fontSize: 12, color: isDark ? '#60a5fa' : '#2563eb', flexShrink: 0, display: 'flex' }} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: isDark ? '#93c5fd' : '#1d4ed8', lineHeight: 1 }}>Next Steps</span>
              </div>
              <div style={{ background: isDark ? 'rgba(59,130,246,0.04)' : '#f0f6ff', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.isArray(legacy.ctaActions) && legacy.ctaActions.length > 0 ? (
                  legacy.ctaActions.map((act, idx) => (
                    <div key={`lact-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {act.category ? (
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#a5b4fc' : '#475569' }}>{act.category}</span>
                      ) : null}
                      {act.values && act.values.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {act.values.map((v, vIdx) => (
                            <span
                              key={`lval-${idx}-${vIdx}`}
                              style={{
                                fontFamily: MONO_FONT_STACK,
                                fontSize: 10,
                                fontWeight: 700,
                                color: isDark ? '#93c5fd' : '#1d4ed8',
                                background: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe',
                                border: `1px solid ${isDark ? 'rgba(96,165,250,0.35)' : '#93c5fd'}`,
                                borderRadius: 4,
                                padding: '1px 6px',
                                lineHeight: 1.45,
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {act.action ? (
                        <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.45, fontWeight: 500 }}>{act.action}</span>
                      ) : null}
                    </div>
                  ))
                ) : null}
                {legacy.cta ? (
                  <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.45, fontWeight: 500 }}>{legacy.cta}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return null;
  };

  const changeTokenStyle = (side) => ({
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.02em',
    fontFamily: MONO_FONT_STACK,
    color: side === 'improved' ? (isDark ? '#6ee7b7' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
    background: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
    border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0'}`,
  });

  if (loading) {
    return (
      <>
        <PageMetaData title="Binary Hardening" />
        <div className="text-center py-5 text-muted" style={{ fontFamily: UI_FONT_STACK, fontSize: FONT.base }}>Loading report...</div>
      </>
    );
  }
  if (status === 'failed') {
    return (
      <>
        <PageMetaData title="Binary Hardening" />
        <div className="text-center py-5 text-danger" style={{ fontFamily: UI_FONT_STACK, fontSize: FONT.base }}>Failed to load report</div>
      </>
    );
  }

  return (
    <>
      <PageMetaData title="Binary Hardening" />

      <div
        style={{
          background: isDark
            ? 'linear-gradient(165deg, #0f172a 0%, #020617 100%)'
            : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 32,
          border: `1px solid ${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}`,
          boxShadow: isDark ? '0 20px 50px -20px rgba(0,0,0,0.5)' : '0 15px 35px -15px rgba(15,23,42,0.1)',
          position: 'relative',
          overflow: 'hidden',
          margin: isNarrowViewport ? '12px' : '20px',
          fontFamily: UI_FONT_STACK, 
          fontSize: FONT.base, 
          lineHeight: 1.5
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: isDark
              ? 'radial-gradient(circle at 0% 0%, rgba(56,189,248,0.08), transparent 40%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.08), transparent 40%)'
              : 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.03), transparent 35%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, padding: isNarrowViewport ? '24px 20px 24px' : '36px 40px 48px' }}>
              <Row className="g-4 mb-4 align-items-center position-relative">
                <Col xl={3} lg={4} className="mb-3 mb-xl-0" style={{ minWidth: 0 }}>
                  <div className="d-flex flex-column h-100" style={{ minWidth: 0 }}>
                    <div className="mb-auto" style={{ marginBottom: 'auto' }}>
                      <div className="d-inline-flex align-items-center mb-2" style={{ gap: 12, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: UI_FONT_STACK,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: isDark ? '#93c5fd' : '#1d4ed8',
                          }}
                        >
                          Delta Overview
                        </span>
                        
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: '5px 12px',
                            borderRadius: 10,
                            background: isDark ? 'linear-gradient(180deg, rgba(30,41,59,0.72) 0%, rgba(15,23,42,0.76) 100%)' : '#f1f5f9',
                            border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : '#cbd5e1'}`,
                          }}
                        >
                          <div className="d-flex align-items-center" style={{ gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b' }} />
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: isDark ? '#94a3b8' : '#64748b',
                                fontFamily: MONO_FONT_STACK,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {formatBuildMetaId(baselineId)}
                            </span>
                          </div>
                          <div style={{ width: 1, height: 12, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                          <div className="d-flex align-items-center" style={{ gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }} />
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: isDark ? '#e2e8f0' : '#0f172a',
                                fontFamily: MONO_FONT_STACK,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {formatBuildMetaId(targetId)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 4 }}>
                        <h1
                          style={{
                            fontSize: 34,
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.1,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            margin: 0,
                          }}
                        >
                          Binary Hardening
                        </h1>
                        <p
                          style={{
                            fontSize: 13,
                            lineHeight: 1.4,
                            color: isDark ? '#64748b' : '#64748b',
                            fontFamily: UI_FONT_STACK,
                            margin: 0,
                            marginTop: 4,
                            maxWidth: 500,
                          }}
                        >
                          Exploit mitigation and privilege exposure drifts
                        </p>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* ── Middle: Unified Rich Infograph ── */}
                <Col xl={6} lg={5} className="mb-3 mb-lg-0 border-start border-end" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1) !important' : 'rgba(0,0,0,0.08) !important' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '100%', padding: '0 20px' }}>
                    
                    {/* Item: Privilege */}
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id="privilege-tooltip" style={{ maxWidth: 260 }}>
                          <div style={{ 
                            padding: '14px',
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: 16,
                            boxShadow: isDark ? '0 12px 30px -5px rgba(0,0,0,0.5)' : '0 15px 35px -5px rgba(0,0,0,0.12)',
                            color: isDark ? '#f8fafc' : '#0f172a'
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#cbd5e1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, textAlign: 'left' }}>
                              Exposure Breakdown
                            </div>
                            <div style={{ 
                              height: 8, 
                              width: '100%',
                              background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)', 
                              borderRadius: 10, 
                              display: 'flex', 
                              overflow: 'hidden',
                              marginBottom: 16,
                            }}>
                              {[
                                { label: 'Root', value: criticalStats.rootCount, pct: (criticalStats.rootCount / (totalMonitored || 1)) * 100, color: isDark ? '#f87171' : '#dc2626' },
                                { label: 'SUID', value: criticalStats.setuidCount, pct: (criticalStats.setuidCount / (totalMonitored || 1)) * 100, color: isDark ? '#fb923c' : '#ea580c' },
                                { label: 'cap_sys_admin', value: criticalStats.capSysAdminCount, pct: (criticalStats.capSysAdminCount / (totalMonitored || 1)) * 100, color: isDark ? '#facc15' : '#d97706' },
                              ].map(item => (
                                <div 
                                  key={item.label} 
                                  style={{ 
                                    width: item.value > 0 ? `${Math.max(4, item.pct)}%` : '0%', 
                                    background: item.color,
                                    borderRight: item.value > 0 ? `1px solid ${isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff'}` : 'none'
                                  }} 
                                />
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '12px 8px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                              {[
                                { label: 'Root', value: criticalStats.rootCount, color: isDark ? '#f87171' : '#dc2626' },
                                { label: 'SUID', value: criticalStats.setuidCount, color: isDark ? '#fb923c' : '#ea580c' },
                                { label: 'cap_sys_admin', value: criticalStats.capSysAdminCount, color: isDark ? '#facc15' : '#d97706' },
                              ].map(item => (
                                <div key={item.label} className="d-flex align-items-center" style={{ gap: 4 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                                  <div className="d-flex align-items-baseline" style={{ gap: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'inherit', fontFamily: MONO_FONT_STACK, lineHeight: 1 }}>{item.value}</span>
                                    <span style={{ fontSize: 8, fontWeight: 800, color: isDark ? '#cbd5e1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: MONO_FONT_STACK, whiteSpace: 'nowrap' }}>{item.label === 'cap_sys_admin' ? 'CAP_SYS_ADMIN' : item.label}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <style>
                            {`
                              #privilege-tooltip .tooltip-inner {
                                background: transparent !important;
                                padding: 0 !important;
                                max-width: none !important;
                                box-shadow: none !important;
                              }
                              #privilege-tooltip .tooltip-arrow::before {
                                border-top-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'} !important;
                              }
                            `}
                          </style>
                        </Tooltip>
                      }
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'help', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Privileged Binaries
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: 12 }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: t.title, fontFamily: MONO_FONT_STACK, lineHeight: 1 }}>
                            {totalPrivileged}
                          </div>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            padding: '4px 8px', 
                            borderRadius: 6, 
                            background: privilegeDelta < 0 ? (isDark ? 'rgba(74, 222, 128, 0.12)' : '#f0fdf4') : (isDark ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2'),
                            color: privilegeDelta < 0 ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f43f5e' : '#e11d48'),
                            fontSize: 11,
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            <IconifyIcon icon={privilegeDelta < 0 ? 'solar:alt-arrow-down-bold-duotone' : 'solar:alt-arrow-up-bold-duotone'} style={{ fontSize: 14 }} />
                            {Math.abs(privilegeDelta)} {privilegeDelta < 0 ? 'less' : 'more'}
                          </div>
                        </div>
                      </div>
                    </OverlayTrigger>

                    {/* Item: Hardening */}
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id="memory-tooltip" style={{ maxWidth: 320 }}>
                          <div style={{ 
                            padding: '16px 18px',
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.08)',
                            borderRadius: 16,
                            boxShadow: isDark ? '0 12px 30px -5px rgba(0,0,0,0.5)' : '0 15px 35px -5px rgba(0,0,0,0.12)',
                            color: isDark ? '#f8fafc' : '#0f172a'
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#cbd5e1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, textAlign: 'left' }}>
                              Hardening Coverage
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                              {(() => {
                                const tot = totalMonitored || 1;
                                const flags = [
                                  { label: 'NX/DEP', missing: criticalStats.noNxCount },
                                  { label: 'CANARY', missing: criticalStats.noCanaryCount },
                                  { label: 'PIE',    missing: criticalStats.noPieCount },
                                  { label: 'RELRO',  missing: criticalStats.noRelroCount },
                                  { label: 'CFI',    missing: criticalStats.noCfiCount },
                                ];

                                return flags.map(flag => {
                                  const count = Math.max(0, tot - flag.missing);
                                  const pct = Math.round((count / tot) * 100);
                                  const fillColor = pct === 100 ? '#22c55e' : pct > 0 ? '#f59e0b' : (isDark ? '#475569' : '#94a3b8');
                                  
                                  return (
                                    <div key={flag.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: 'inherit', fontFamily: MONO_FONT_STACK }}>
                                        {count}
                                      </span>
                                      <div style={{ 
                                        height: 30, 
                                        width: 8, 
                                        background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)', 
                                        borderRadius: 4, 
                                        position: 'relative', 
                                        overflow: 'hidden',
                                      }}>
                                        <div style={{ 
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          height: `${pct}%`, 
                                          background: fillColor,
                                          borderRadius: 4,
                                        }} />
                                      </div>
                                      <span style={{ 
                                        fontSize: 7, 
                                        fontWeight: 800, 
                                        color: isDark ? '#94a3b8' : '#64748b', 
                                        textTransform: 'uppercase', 
                                        fontFamily: MONO_FONT_STACK, 
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {flag.label}
                                      </span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                          <style>
                            {`
                              #memory-tooltip .tooltip-inner {
                                background: transparent !important;
                                padding: 0 !important;
                                max-width: none !important;
                                box-shadow: none !important;
                              }
                              #memory-tooltip .tooltip-arrow::before {
                                border-top-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'} !important;
                              }
                            `}
                          </style>
                        </Tooltip>
                      }
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'help', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Compiler Hardened
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: 12 }}>
                          <div style={{ fontSize: 28, fontWeight: 900, color: t.title, fontFamily: MONO_FONT_STACK, lineHeight: 1 }}>
                            {totalHardened}
                          </div>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            padding: '4px 8px', 
                            borderRadius: 6, 
                            background: hardeningDelta > 0 ? (isDark ? 'rgba(74, 222, 128, 0.12)' : '#f0fdf4') : (isDark ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2'),
                            color: hardeningDelta > 0 ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f43f5e' : '#e11d48'),
                            fontSize: 11,
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            <IconifyIcon icon={hardeningDelta > 0 ? 'solar:alt-arrow-up-bold-duotone' : 'solar:alt-arrow-down-bold-duotone'} style={{ fontSize: 14 }} />
                            {Math.abs(hardeningDelta)} {hardeningDelta > 0 ? 'more' : 'less'}
                          </div>
                        </div>
                      </div>
                    </OverlayTrigger>

                  </div>
                </Col>

                <Col xl={3} lg={3} className="d-flex justify-content-lg-end">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveFilter('all')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveFilter('all'); } }}
                    className="bh-security-debt-link"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '8px 0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="text-lg-end">
                      <div className="d-flex align-items-center justify-content-end" style={{ gap: 5, marginBottom: 4 }}>
                        <div style={{ width: 5, height: 5, background: '#f43f5e', borderRadius: '50%', boxShadow: '0 0 8px rgba(244,63,94,0.5)', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#f43f5e' : '#be123c', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: UI_FONT_STACK }}>
                          Security Debt
                        </span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: UI_FONT_STACK }}>
                        Unresolved Gaps
                      </div>
                    </div>
                    <div className="d-flex align-items-center" style={{ gap: 8 }}>
                      <span
                        style={{
                          fontSize: 42,
                          fontWeight: 900,
                          lineHeight: 1,
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontFamily: MONO_FONT_STACK,
                          letterSpacing: '-0.05em',
                        }}
                      >
                        {criticalGapTotal}
                      </span>
                      <IconifyIcon icon="solar:arrow-right-up-outline" className="bh-security-debt-arrow" style={{ fontSize: 20, color: t.muted, transition: 'all 0.2s ease' }} />
                    </div>
                  </div>
                  <style>
                    {`
                      .bh-security-debt-link:hover .bh-security-debt-arrow {
                        color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
                        opacity: 1 !important;
                        transform: translate(2px, -2px);
                      }
                    `}
                  </style>
                </Col>
              </Row>

              <div style={{ height: 24 }} />
              
              <div ref={insightsCardRef}>
                <Row className="g-3 mb-0" style={{ marginTop: 0}}>
                    <Col lg={12}>
                      <div
                        className="w-100"
                        style={{
                          borderRadius: 14,
                          background: isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.88)',
                          border: `1px solid ${isDark ? 'rgba(148,163,184,0.10)' : '#e2e8f0'}`,
                          boxShadow: 'none',
                          padding: '16px 18px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transition: THEME_TRANSITION,
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-1">
                          <h2
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: t.title,
                              fontFamily: UI_FONT_STACK,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}
                          >
                            Drift Analysis
                          </h2>

                          <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
                            <div
                              className="d-inline-flex align-items-center"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleCategoryClick('new')}
                              style={{
                                gap: 8,
                                padding: '5px 12px',
                                borderRadius: 10,
                                background: isDark ? 'rgba(139,92,246,0.18)' : '#f5f0ff',
                                border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#e9dcff'}`,
                                color: isDark ? '#ecd9ff' : '#5b21b6',
                                cursor: 'pointer',
                              }}
                            >
                              <IconifyIcon icon="solar:add-circle-bold" style={{ fontSize: 13, opacity: 0.9 }} />
                              <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                                <span style={{ fontSize: 13, fontFamily: MONO_FONT_STACK, fontWeight: 800 }}>{formatNumber(newCount)}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>Added</span>
                              </div>
                            </div>
                            <div
                              className="d-inline-flex align-items-center"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleCategoryClick('deleted')}
                              style={{
                                gap: 8,
                                padding: '5px 12px',
                                borderRadius: 10,
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                color: isDark ? '#e2e8f0' : '#475569',
                                cursor: 'pointer',
                              }}
                            >
                              <IconifyIcon icon="solar:minus-circle-bold" style={{ fontSize: 13, opacity: 0.9 }} />
                              <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                                <span style={{ fontSize: 13, fontFamily: MONO_FONT_STACK, fontWeight: 800 }}>{formatNumber(deletedCount)}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>Deleted</span>
                              </div>
                            </div>
                            <div className="ms-md-2 ps-md-3" style={{ borderLeft: isNarrowViewport ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}` }}>
                              <div className="d-flex align-items-baseline" style={{ gap: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: isDark ? t.title : '#0f172a', fontFamily: MONO_FONT_STACK }}>
                                  {formatNumber(totalMonitored)}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Analyzed
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {(() => {
                                const total = Math.max(1, deltaStats.total || 0);
                                const impCatsSorted    = [...deltaBreakdown.impCats].sort((a, b) => b.value - a.value);
                                const regCatsSorted    = [...deltaBreakdown.regCats].sort((a, b) => b.value - a.value);
                                const mixImpSorted     = [...deltaBreakdown.mixImpCats].sort((a, b) => b.value - a.value);
                                const mixRegSorted     = [...deltaBreakdown.mixRegCats].sort((a, b) => b.value - a.value);

                                const impTotal    = impCatsSorted.reduce((s, c) => s + (c.value || 0), 0);
                                const regTotal    = regCatsSorted.reduce((s, c) => s + (c.value || 0), 0);
                                const mixImpTotal = mixImpSorted.reduce((s, c) => s + (c.value || 0), 0);
                                const mixRegTotal = mixRegSorted.reduce((s, c) => s + (c.value || 0), 0);

                                const impShare  = Math.round((improvedBinaries.total  / total) * 100);
                                const regShare  = Math.round((regressedBinaries.total / total) * 100);
                                const mixShare  = Math.round((mixedBinaries.total     / total) * 100);

                                const netMixBalance = mixImpTotal - mixRegTotal;

                                const renderDriverLine = (drv, di, cardIcon) => {
                                    const drvColor = drv._kind === 'reg' ? (isDark ? '#f87171' : '#dc2626') : drv._kind === 'imp' ? (isDark ? '#4ade80' : '#059669') : (isDark ? '#60a5fa' : '#2563eb');
                                    const drvIcon  = drv._kind === 'reg' ? 'mdi:trending-down' : drv._kind === 'imp' ? 'solar:fire-bold-duotone' : cardIcon;
                                    const drvBg    = drv._kind === 'reg' ? (isDark ? 'rgba(248,113,113,0.1)' : '#fef2f2') : drv._kind === 'imp' ? (isDark ? 'rgba(74,222,128,0.1)' : '#f0fdf4') : (isDark ? 'rgba(96,165,250,0.1)' : '#eff6ff');
                                    return (
                                      <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: 4, background: drvBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconifyIcon icon={drvIcon} style={{ fontSize: 11, color: drvColor, opacity: 1 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: t.title, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drv.label}</span>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: drvColor, marginLeft: 'auto', background: `${drvColor}12`, padding: '1px 5px', borderRadius: 4 }}>
                                            {drv.value > 0 ? `+${drv.value}` : drv.value}
                                        </span>
                                      </div>
                                    );
                                };

                                return (
                                  <div className="d-flex flex-column" style={{ gap: 16 }}>
                                    <Row className="g-3">
                                      <Col lg={7}>
                                        <div className="d-flex flex-column h-100" style={{ gap: 12 }}>
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleCategoryClick('regressed')}
                                            onMouseEnter={() => setHoveredCategoryCard('regressed')}
                                            onMouseLeave={() => setHoveredCategoryCard(null)}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              padding: '20px',
                                              flex: 1,
                                              borderRadius: 20,
                                              background: isDark
                                                ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(30, 41, 59, 0.4) 100%)'
                                                : 'linear-gradient(135deg, #fff1f2 0%, #fffefe 100%)',
                                              border: `1px solid ${hoveredCategoryCard === 'regressed' ? '#f43f5e' : (isDark ? 'rgba(244, 63, 94, 0.2)' : '#e2e8f0')}`,
                                              cursor: 'pointer',
                                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                              transform: hoveredCategoryCard === 'regressed' ? 'translateY(-2px)' : 'none',
                                              overflow: 'hidden',
                                              boxShadow: hoveredCategoryCard === 'regressed' && isDark ? '0 8px 24px -8px rgba(244, 63, 94, 0.4)' : (isDark ? '0 4px 20px -8px rgba(0,0,0,0.5)' : 'none'),
                                            }}
                                          >
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                              <div className="d-flex align-items-center" style={{ gap: 10 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.4)' }} />
                                                <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#f43f5e' : '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                  Critical Regression
                                                </span>
                                              </div>
                                            </div>

                                            <div className="d-flex align-items-end" style={{ gap: 16 }}>
                                              <h2 style={{ fontSize: 54, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, fontFamily: MONO_FONT_STACK, letterSpacing: '-0.07em', lineHeight: 0.9 }}>
                                                {formatNumber(regressedBinaries.total)}
                                              </h2>
                                              <div style={{ paddingBottom: 3 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.2 }}>binaries lost protection</div>
                                              </div>
                                            </div>

                                            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                                                <div className="d-flex align-items-center gap-1" style={{ fontSize: 10, fontWeight: 600, color: t.muted }}>
                                                  <IconifyIcon icon="mdi:arrow-down" style={{ fontSize: 12, color: '#f43f5e' }} />
                                                  <span>
                                                    {regCatsSorted[0] && regTotal > 0 
                                                      ? `Mostly driven by ${regCatsSorted[0].label} (${Math.round((regCatsSorted[0].value / regTotal) * 100)}%)`
                                                      : 'No major drivers identified'}
                                                  </span>
                                                </div>
                                            </div>
                                          </div>

                                          {newCount > 0 && (
                                              <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); handleCategoryClick('new'); }}
                                                onMouseEnter={() => setHoveredCategoryCard('new-risk')}
                                                onMouseLeave={() => setHoveredCategoryCard(null)}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  padding: '10px 16px',
                                                  borderRadius: 14,
                                                  cursor: 'pointer',
                                                  background: isDark
                                                    ? (hoveredCategoryCard === 'new-risk' ? 'rgba(251,113,133,0.12)' : 'rgba(255,255,255,0.02)')
                                                    : (hoveredCategoryCard === 'new-risk' ? '#fff1f2' : '#f8fafc'),
                                                  border: `1px solid ${hoveredCategoryCard === 'new-risk' ? '#f43f5e' : (isDark ? 'rgba(244, 63, 94, 0.4)' : '#fecdd3')}`,
                                                  transition: 'all 0.2s ease',
                                                  boxShadow: hoveredCategoryCard === 'new-risk' ? (isDark ? '0 4px 14px -4px rgba(244,63,94,0.4)' : '0 4px 12px rgba(15,23,42,0.05)') : 'none',
                                                }}
                                              >
                                                <div className="d-flex align-items-center" style={{ gap: 10 }}>
                                                  <IconifyIcon icon="solar:danger-triangle-bold" style={{ fontSize: 14, color: isDark ? '#fb7185' : '#e11d48' }} />
                                                  <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#fda4af' : '#be123c', letterSpacing: '0.01em' }}>
                                                    New Risks
                                                  </span>
                                                </div>
                                                <div className="d-flex align-items-center" style={{ gap: 6 }}>
                                                  <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontFamily: MONO_FONT_STACK }}>{newCount}</span>
                                                  <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 14, color: t.muted }} />
                                                </div>
                                              </div>
                                          )}
                                        </div>
                                      </Col>

                                      <Col lg={5}>
                                        <div className="d-flex flex-column h-100" style={{ gap: 12 }}>
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleCategoryClick('improved')}
                                            onMouseEnter={() => setHoveredCategoryCard('improved')}
                                            onMouseLeave={() => setHoveredCategoryCard(null)}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              padding: '18px 20px',
                                              borderRadius: 20,
                                              flex: 1,
                                              background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                                              border: `1px solid ${hoveredCategoryCard === 'improved' ? '#10b981' : (isDark ? 'transparent' : '#e2e8f0')}`,
                                              cursor: 'pointer',
                                              transition: 'all 0.3s ease',
                                              transform: hoveredCategoryCard === 'improved' ? 'translateY(-2px)' : 'none',
                                              boxShadow: hoveredCategoryCard === 'improved' && isDark ? '0 8px 20px -6px #10b98160' : (isDark ? '0 4px 12px -4px rgba(0,0,0,0.3)' : 'none'),
                                            }}
                                          >
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                                <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Improved Hardening</span>
                                              </div>
                                              <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                                <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 16, color: '#10b981' }} />
                                              </div>
                                            </div>
                                            <div className="d-flex align-items-end" style={{ gap: 10 }}>
                                              <h2 style={{ fontSize: 38, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, fontFamily: MONO_FONT_STACK, letterSpacing: '-0.05em', lineHeight: 1 }}>
                                                {formatNumber(improvedBinaries.total)}
                                              </h2>
                                              <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', paddingBottom: 3 }}>binaries improved</span>
                                            </div>
                                            <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                                                <div className="d-flex align-items-center gap-1" style={{ fontSize: 10, fontWeight: 600, color: t.muted }}>
                                                  <IconifyIcon icon="mdi:arrow-up" style={{ fontSize: 12, color: '#10b981' }} />
                                                  <span>
                                                    {impCatsSorted[0] && impTotal > 0 
                                                      ? `Mostly driven by ${impCatsSorted[0].label} (${Math.round((impCatsSorted[0].value / impTotal) * 100)}%)`
                                                      : 'No major improvements identified'}
                                                  </span>
                                                </div>
                                            </div>
                                          </div>

                                          <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleCategoryClick('mixed')}
                                            onMouseEnter={() => setHoveredCategoryCard('mixed')}
                                            onMouseLeave={() => setHoveredCategoryCard(null)}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              padding: '18px 20px',
                                              borderRadius: 20,
                                              flex: 1,
                                              background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                                              border: `1px solid ${hoveredCategoryCard === 'mixed' ? '#f59e0b' : (isDark ? 'transparent' : '#e2e8f0')}`,
                                              cursor: 'pointer',
                                              transition: 'all 0.3s ease',
                                              transform: hoveredCategoryCard === 'mixed' ? 'translateY(-2px)' : 'none',
                                              boxShadow: hoveredCategoryCard === 'mixed' && isDark ? '0 8px 20px -6px #f59e0b60' : (isDark ? '0 4px 12px -4px rgba(0,0,0,0.3)' : 'none'),
                                            }}
                                          >
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                                <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mixed Shifts</span>
                                              </div>
                                              <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                                <IconifyIcon icon="solar:transfer-horizontal-bold-duotone" style={{ fontSize: 16, color: '#f59e0b' }} />
                                              </div>
                                            </div>
                                            <div className="d-flex align-items-end" style={{ gap: 10 }}>
                                              <h2 style={{ fontSize: 38, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, fontFamily: MONO_FONT_STACK, letterSpacing: '-0.05em', lineHeight: 1 }}>
                                                {formatNumber(mixedBinaries.total)}
                                              </h2>
                                              <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', paddingBottom: 3 }}>binaries with mixed drift</span>
                                            </div>
                                          </div>
                                        </div>
                                      </Col>
                                    </Row>
                                  </div>
                                );
                        })()}
                      </div>
                    </Col>
                </Row>
              </div>

              <div style={{ height: 48 }} />

              <div className="w-100">
                <Card
                  className="w-100"
                  style={{
                    borderRadius: 24,
                    background: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0'}`,
                    boxShadow: isDark ? '0 10px 30px -12px rgba(0,0,0,0.5)' : '0 8px 30px rgba(15,23,42,0.04)',
                    overflow: 'hidden',
                    transition: BH_THEME_TRANSITION,
                  }}
                >
                  <CardHeader
                    style={{
                      background: isDark ? 'rgba(15,23,42,0.5)' : '#f8fafc',
                      borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : '#e2e8f0'}`,
                      padding: '12px 24px',
                    }}
                  >
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      {/* Search box */}
                      <div className="d-flex align-items-center px-2" style={{
                        borderRadius: 8,
                        border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                        background: isDark ? '#0f172a' : '#f9fafb',
                        height: 34,
                        flex: '1 1 200px',
                        maxWidth: 300,
                        minWidth: 160,
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}>
                        <IconifyIcon icon="solar:magnifer-linear" style={{ fontSize: 14, color: isDark ? '#64748b' : '#94a3b8' }} />
                        <Form.Control
                          type="text"
                          placeholder="Search binaries..."
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); setDeltaPage(0); setFullPage(0); }}
                          className="border-0 shadow-none bg-transparent"
                          style={{ color: t.title, fontSize: 12, height: 30 }}
                        />
                      </div>

                      {/* Filter label and button */}
                      <div className="d-flex align-items-center gap-2">
                        {viewMode === 'delta' ? (
                          <div className="d-flex align-items-center gap-2">
                            <Button
                              variant="light"
                              onClick={() => setDeltaFilterOpen((s) => !s)}
                              style={deltaFilterOpen
                                ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#111827' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                                : { ...filterInactivePill, gap: 6, height: 34, display: 'flex', alignItems: 'center' }}
                            >
                              <IconifyIcon icon="mdi:filter-variant" style={{ fontSize: 14 }} />
                              <span>Status</span>
                            </Button>
                            {deltaFilterOpen && (
                              <div className="d-flex align-items-center gap-1">
                                {binaryFilterButtons.map((f) => (
                                  <Button
                                    key={f.id}
                                    variant="light"
                                    size="sm"
                                    onClick={() => { setActiveFilter(f.id); setDeltaPage(0); }}
                                    style={activeFilter === f.id ? f.activeStyle : filterInactivePill}
                                  >
                                    <span>{f.label}</span>
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <Button
                              variant="light"
                              onClick={() => setFullPrivFilterOpen((s) => !s)}
                              style={fullPrivFilterOpen || fullPrivFilter !== 'all'
                                ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                                : { ...filterInactivePill, gap: 6, height: 34, display: 'flex', alignItems: 'center' }}
                            >
                              <IconifyIcon icon="mdi:filter-variant" style={{ fontSize: 14 }} />
                              <span>Privileges</span>
                            </Button>
                            {fullPrivFilterOpen && (
                              <div className="d-flex align-items-center gap-1">
                                {[
                                  { id: 'all',          label: 'All' },
                                  { id: 'root',         label: 'Root'         },
                                  { id: 'capabilities', label: 'Capabilities' },
                                ].map((f) => (
                                  <Button
                                    key={f.id}
                                    variant="light"
                                    size="sm"
                                    onClick={() => { setFullPrivFilter(f.id); setFullPage(0); }}
                                    style={fullPrivFilter === f.id
                                      ? { ...FILTER_PILL_BASE, background: isDark ? '#1e293b' : '#e2e8f0', border: `1px solid ${isDark ? '#334155' : '#94a3b8'}`, color: isDark ? '#f8fafc' : '#0f172a' }
                                      : filterInactivePill}
                                  >
                                    <span>{f.label}</span>
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* View toggle pushed to the right */}
                      <div className="ms-auto d-flex p-1" style={{
                        borderRadius: 99,
                        background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                        backdropFilter: 'blur(4px)',
                      }}>
                        {['delta', 'full'].map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              if (m === 'delta') {
                                openDeltaView('all');
                              } else {
                                openFullScanView();
                              }
                            }}
                            style={{
                              border: 'none',
                              borderRadius: 99,
                              padding: '6px 16px',
                              fontSize: 10.5,
                              fontWeight: 700,
                              fontFamily: UI_FONT_STACK,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              color: viewMode === m ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'),
                              background: viewMode === m ? (isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff') : 'transparent',
                              boxShadow: viewMode === m ? (isDark ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.06)') : 'none',
                            }}
                          >
                            {m === 'delta' ? 'Delta' : 'Full Scan'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="pt-3 px-4 pb-4">
                    {viewMode === 'delta' ? (
                      <>
                      <div className="table-responsive" ref={detailsRef}>
                        <Table
                          className="mb-0 align-middle"
                          style={{
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            overflow: 'hidden',
                            tableLayout: 'fixed',
                            width: '100%',
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  ...headerCellStyle,
                                  width: '60%',
                                  textAlign: 'left',
                                  borderLeft: `1px solid ${deltaHeaderBorder}`,
                                  borderRight: 'none',
                                  borderTopLeftRadius: 14,
                                  whiteSpace: 'normal',
                                }}
                              >
                                Binary Name
                              </th>
                              <th
                                style={{
                                  ...headerCellStyle,
                                  width: '40%',
                                  textAlign: 'left',
                                  paddingLeft: 8,
                                  borderLeft: 'none',
                                  borderTopRightRadius: 14,
                                }}
                              >
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedRows.length === 0 ? (
                              <tr>
                                <td colSpan={2} className="text-center py-4" style={{ color: t.muted }}>
                                  No binary deltas found
                                </td>
                              </tr>
                            ) : displayedRows.map((row, idx) => (
                              <tr
                                key={row.key}
                                onClick={() => { if (row.status !== 'deleted') setSelectedDeltaRow(row); }}
                                onMouseEnter={() => { if (row.status !== 'deleted') setHoveredDeltaRowKey(row.key); }}
                                onMouseLeave={() => setHoveredDeltaRowKey((prev) => (prev === row.key ? null : prev))}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedDeltaRow(row);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Open findings for ${row.name}`}
                                style={{
                                  cursor: row.status === 'deleted' ? 'default' : 'pointer',
                                  background: selectedDeltaRow?.key === row.key
                                    ? t.selectedSurface
                                    : (hoveredDeltaRowKey === row.key && row.status !== 'deleted')
                                      ? t.hoverSurface
                                      : (idx % 2 ? t.tableStripe : 'transparent'),
                                  boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                                  transition: tableRowTransition,
                                }}
                              >
                                <td style={{ ...deltaCellStyle, color: t.title, borderRight: 'none' }}>
                                  <div className="d-flex align-items-center gap-2">
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        className="fw-semibold"
                                        style={{
                                          color: t.title,
                                          fontWeight: 600,
                                          fontSize: 14,
                                          fontFamily: MONO_FONT_STACK,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {row.name}
                                      </div>
                                      {row.sha256 ? (
                                        <div style={{ fontFamily: MONO_FONT_STACK, color: t.muted, fontSize: 11, wordBreak: 'break-all' }}>
                                          {row.sha256.slice(0, 24)}...
                                        </div>
                                      ) : null}
                                    </div>
                                    {row.status !== 'deleted' && (
                                      <span
                                        className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                        style={{
                                          width: 20,
                                          height: 20,
                                          background: isDark ? '#172554' : '#eff6ff',
                                          color: isDark ? '#93c5fd' : '#2563eb',
                                          marginLeft: 'auto',
                                        }}
                                        aria-hidden
                                      >
                                        <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 11 }} />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ ...deltaCellStyle, paddingLeft: 8, borderLeft: 'none' }}>
                                  <div className="d-flex flex-nowrap align-items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                                    {statusPill(row.status, isDark)}
                                    {buildDeltaCategorySignals(row).map((signal, signalIdx) => (
                                      <span
                                        key={`${row.key}-signal-${signalIdx}`}
                                        className="d-inline-flex align-items-center"
                                        style={{
                                          gap: '6px',
                                          padding: '2px 0',
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: signal.tone === 'mixed'
                                              ? '#f59e0b'
                                              : signal.tone === 'improved'
                                                ? '#22c55e'
                                                : '#ef4444',
                                            boxShadow: `0 0 0 2.5px ${
                                              signal.tone === 'mixed' 
                                                ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)') 
                                                : signal.tone === 'improved' 
                                                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)') 
                                                  : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                                            }`,
                                            flexShrink: 0,
                                          }}
                                          aria-hidden
                                        />
                                        <span 
                                          style={{ 
                                            fontSize: 10.5,
                                            fontWeight: 600,
                                            color: isDark ? '#94a3b8' : '#64748b',
                                            letterSpacing: '0.02em',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                            opacity: 0.9
                                          }}
                                        >
                                          {signal.label}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-4">
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                          Showing {Math.min(displayedRows.length, deltaPageSize)} of {totalFilteredRows} binaries
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            disabled={deltaPage === 0}
                            onClick={() => { setDeltaPage(0); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                              cursor: deltaPage === 0 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: deltaPage === 0 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >«</button>
                          <button
                            disabled={deltaPage === 0}
                            onClick={() => { setDeltaPage(p => p - 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                              cursor: deltaPage === 0 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: deltaPage === 0 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >Prev</button>
                          <div className="d-flex align-items-center px-3" style={{ fontSize: 12, fontWeight: 800, color: t.title, background: isDark ? 'rgba(56,189,248,0.08)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}` }}>
                            {deltaPage + 1} / {Math.ceil(totalFilteredRows / deltaPageSize) || 1}
                          </div>
                          <button
                            disabled={deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1}
                            onClick={() => { setDeltaPage(p => p + 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                              cursor: deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >Next</button>
                          <button
                            disabled={deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1}
                            onClick={() => { setDeltaPage(Math.ceil(totalFilteredRows / deltaPageSize) - 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                              cursor: deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: deltaPage >= Math.ceil(totalFilteredRows / deltaPageSize) - 1 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >»</button>
                        </div>
                      </div>
                      </>
                    ) : (
                      <>
                      <div className="table-responsive" ref={detailsRef}>
                        <Table
                          className="mb-0 align-middle"
                          style={{
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            overflow: 'hidden',
                            tableLayout: 'fixed',
                            width: '100%',
                          }}
                        >
                          <thead>
                            <tr>
                              <th style={{ ...fullHeaderCellStyle, minWidth: 430, borderTopLeftRadius: 14 }}>Binary Name</th>
                              <th style={{ ...fullHeaderCellStyle, minWidth: 320 }}>
                                <div className="d-inline-flex align-items-center gap-2"><span>File Permissions</span></div>
                              </th>
                              <th style={{ ...fullHeaderCellStyle, minWidth: 150, textAlign: 'center' }}>
                                <div className="d-inline-flex align-items-center gap-2">
                                  <div className="d-inline-flex align-items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => {
                                    setCapSortDir((d) => (d === null ? 'desc' : d === 'desc' ? 'asc' : null));
                                  }}>
                                    <span>Capabilities</span>
                                    <IconifyIcon icon={capSortDir === 'asc' ? 'mdi:arrow-up' : capSortDir === 'desc' ? 'mdi:arrow-down' : 'mdi:sort'} style={{ fontSize: 14, color: fullHeaderText }} />
                                  </div>
                                </div>
                              </th>
                              <th style={{ ...fullHeaderCellStyle, minWidth: 280, borderTopRightRadius: 14 }}>
                                <div className="d-inline-flex align-items-center gap-2"><span>Compiler Flags</span></div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedFullRows.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-4" style={{ color: t.muted }}>
                                  No binaries found
                                </td>
                              </tr>
                            ) : displayedFullRows.slice(fullPage * fullPageSize, (fullPage + 1) * fullPageSize).map((v, idx) => {
                              const caps = Array.isArray(v?.capabilities) ? v.capabilities : [];
                              const perms = v?.file_permissions ?? {};
                              const compiler = v?.compiler_flags ?? v ?? {};
                              const compilerBadges = fullReportCompilerBadges(compiler, isDark, { compactGrid: true });
                              const structuredSummary = extractBinarySummary(v, v);
                              const textSummary = typeof (v?.summary ?? v?.binary_violations?.summary) === 'string'
                                ? String(v?.summary ?? v?.binary_violations?.summary ?? '').trim()
                                : '';
                              const hasSummary = Boolean(structuredSummary || textSummary);
                              const rowKey = `full-${v?.filename ?? v?.name}-${idx}`;
                              return (
                                <tr
                                  key={rowKey}
                                  onMouseEnter={() => setHoveredFullRowKey(rowKey)}
                                  onMouseLeave={() => setHoveredFullRowKey((prev) => (prev === rowKey ? null : prev))}
                                  style={{
                                    background: hoveredFullRowKey === rowKey ? t.hoverSurface : (idx % 2 ? t.tableStripe : 'transparent'),
                                    boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                                    transition: tableRowTransition,
                                  }}
                                >
                                  <td style={{ ...deltaCellStyle, color: t.title }}>
                                    <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                                        <div className="fw-semibold" style={{ color: t.title, fontWeight: 600, fontSize: 14, fontFamily: MONO_FONT_STACK, wordBreak: 'break-word' }}>
                                          {v?.filename ?? v?.name}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(event) => { event.stopPropagation(); if (!hasSummary) return; setFullSummaryOverlay({ show: true, row: v }); }}
                                        title={hasSummary ? 'Open AI-assisted summary' : 'No AI summary available for this binary'}
                                        aria-label={hasSummary ? 'Open AI-assisted summary' : 'No AI summary available'}
                                        disabled={!hasSummary}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
                                          borderRadius: 999, border: `1px solid ${isDark ? 'rgba(139,92,246,0.45)' : '#c4b5fd'}`,
                                          background: isDark ? 'rgba(139,92,246,0.18)' : '#f5f3ff', color: isDark ? '#c4b5fd' : '#6d28d9',
                                          fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                                          padding: '5px 9px', boxShadow: 'none',
                                          opacity: hasSummary ? 1 : 0.45, cursor: hasSummary ? 'pointer' : 'not-allowed', flexShrink: 0,
                                        }}
                                      >
                                        <IconifyIcon icon="mdi:sparkles" style={{ fontSize: 12 }} />
                                        <span>AI</span>
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ maxWidth: 320 }}>
                                      {fullReportPermissionBadgeGrid(perms, isDark, 320)}
                                    </div>
                                  </td>
                                  <td>
                                    {fullReportCapabilitiesCell(caps, isDark, rowKey, (items) => {
                                      setCapabilitiesOverlay({ show: true, binaryName: String(v?.filename ?? v?.name ?? 'Unknown Binary'), items });
                                    })}
                                  </td>
                                  <td>
                                    <div style={{ maxWidth: 240 }}>
                                      {compilerBadges.length
                                        ? renderCompilerBadgeGrid(compilerBadges, 240)
                                        : <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 9, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.1, letterSpacing: '0.02em' }}>None</span>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-4">
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                          Showing {Math.min(displayedFullRows.length, (fullPage + 1) * fullPageSize)} of {displayedFullRows.length} binaries
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            disabled={fullPage === 0}
                            onClick={() => { setFullPage(0); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                              cursor: fullPage === 0 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: fullPage === 0 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >«</button>
                          <button
                            disabled={fullPage === 0}
                            onClick={() => { setFullPage(p => p - 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                              cursor: fullPage === 0 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: fullPage === 0 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >Prev</button>
                          <div className="d-flex align-items-center px-3" style={{ fontSize: 12, fontWeight: 800, color: t.title, background: isDark ? 'rgba(56,189,248,0.08)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}` }}>
                            {fullPage + 1} / {Math.ceil(displayedFullRows.length / fullPageSize) || 1}
                          </div>
                          <button
                            disabled={fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1}
                            onClick={() => { setFullPage(p => p + 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                              cursor: fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >Next</button>
                          <button
                            disabled={fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1}
                            onClick={() => { setFullPage(Math.ceil(displayedFullRows.length / fullPageSize) - 1); scrollDetailsIntoView(); }}
                            style={{
                              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                              cursor: fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1 ? 'not-allowed' : 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                              opacity: fullPage >= Math.ceil(displayedFullRows.length / fullPageSize) - 1 ? 0.45 : 1,
                              transition: 'all 140ms ease',
                            }}
                          >»</button>
                        </div>
                      </div>
                      </>
                    )}
                  </CardBody>
                  {/* Legend Section */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: '16px 24px',
                      background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241,245,249,0.6)',
                      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                      transition: THEME_TRANSITION,
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)', border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)'}` }}>
                        <IconifyIcon icon="solar:info-circle-linear" style={{ fontSize: 13, color: isDark ? '#38bdf8' : '#2563eb' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#93c5fd' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardening Legend</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 4 }}>
                      {/* High Privileges Section */}
                      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>High Privileges</span>
                          <div style={{ height: 1, flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column', gap: '12px 24px' }}>
                          {BINARY_PERMISSION_LEGEND_ITEMS.map((item) => (
                            <div key={item.title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? '#ef4444' : '#dc2626', marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.title, letterSpacing: '0.03em', marginBottom: 1 }}>{item.title}</div>
                                <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3 }}>{item.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compiler Hardening Section */}
                      <div style={{ flex: '1.8 1 450px', minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Compiler Hardening</span>
                          <div style={{ height: 1, flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
                          {BINARY_COMPILER_LEGEND_ITEMS.map((item) => (
                            <div key={item.title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? '#475569' : '#94a3b8', marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.title, letterSpacing: '0.03em', marginBottom: 1 }}>{item.title}</div>
                                <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3 }}>{item.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
        </div>
      </div>

      <Offcanvas
        show={capabilitiesOverlay.show}
        onHide={() => setCapabilitiesOverlay({ show: false, binaryName: '', items: [] })}
        placement="end"
        backdrop
        scroll={false}
        style={capabilitiesPanelStyle}
      >
        <Offcanvas.Header closeButton style={{ background: isDark ? '#020617' : '#ffffff', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
          <div className="d-flex flex-column gap-1 pe-4">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
              Capabilities
            </span>
            <Offcanvas.Title as="h6" style={{ margin: 0, color: t.title, fontWeight: 700, fontSize: 18 }}>
              {capabilitiesOverlay.binaryName}
            </Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-3">
          {capabilitiesOverlay.items.length === 0 ? (
            <div className="text-center py-4" style={{ color: t.muted }}>No capabilities present</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {capabilitiesOverlay.items.map((item, idx) => {
                const modeKey = String(item.mode ?? '').toLowerCase().trim();
                const isHighSeverity = modeKey === 'eip' || modeKey === 'ep';
                const impactBg = isHighSeverity
                  ? (isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2')
                  : (isDark ? 'rgba(245,158,11,0.13)' : '#fffbeb');
                const impactBorder = isHighSeverity
                  ? (isDark ? 'rgba(239,68,68,0.28)' : '#fecaca')
                  : (isDark ? 'rgba(245,158,11,0.3)' : '#fde68a');
                const impactColor = isHighSeverity
                  ? (isDark ? '#fca5a5' : '#dc2626')
                  : (isDark ? '#fde68a' : '#b45309');
                const impactIcon = isHighSeverity ? 'mdi:alert' : 'mdi:alert-outline';
                const cleanedImpact = String(item.impact ?? '').replace(/^impact\s*:\s*/i, '').trim();
                return (
                  <div
                    key={`${item.name}-${idx}`}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isDark ? '#1e2d40' : '#e2e8f0'}`,
                      background: isDark ? '#0b1628' : '#ffffff',
                      padding: '10px 12px',
                      boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(15,23,42,0.06)',
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 700, fontSize: 12, color: t.title, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {item.mode ? (
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, color: isDark ? '#fde68a' : '#92400e', background: isDark ? 'rgba(245,158,11,0.15)' : '#fff7ed', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fed7aa'}` }}>
                          {item.mode}
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <div style={{ marginTop: 6, fontSize: 11, color: isDark ? '#8baabb' : '#5a6a7a', lineHeight: 1.5 }}>
                        {item.description}
                      </div>
                    ) : null}
                    {cleanedImpact ? (
                      <div className="d-inline-flex align-items-center gap-1" style={{ marginTop: 8, padding: '3px 8px', borderRadius: 5, background: impactBg, border: `1px solid ${impactBorder}` }}>
                        <IconifyIcon icon={impactIcon} style={{ fontSize: 12, color: impactColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: impactColor }}>{cleanedImpact}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas
        show={Boolean(selectedDeltaRow) && viewMode === 'delta'}
        onHide={() => setSelectedDeltaRow(null)}
        placement="end"
        backdrop
        scroll={false}
        style={drawerPanelStyle}
      >
        <Offcanvas.Header closeButton style={{ background: isDark ? '#020617' : '#ffffff', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
          <div className="d-flex flex-column gap-2 pe-4">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
              Binary Name
            </span>
            <Offcanvas.Title as="h5" style={{ margin: 0, color: t.title, fontWeight: 700, fontSize: 20 }}>
              {selectedDeltaRow?.name}
            </Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          {selectedDeltaRow ? (
            <div className="p-3 p-md-4 d-flex flex-column gap-3">
              <div
                className="rounded-4 p-3"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                  boxShadow: isDark ? 'none' : '0 20px 40px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div className="d-flex flex-column gap-2">
                  <span
                    className="d-inline-flex align-items-center gap-2 align-self-start"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: drawerTone.bg,
                      color: drawerTone.color,
                    }}
                  >
                    <IconifyIcon icon={drawerTone.icon} style={{ fontSize: 13 }} />
                    <span>{selectedDeltaRow.status}</span>
                  </span>
                  <div style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    {buildBinaryNarrative(selectedDeltaRow)}
                  </div>
                  {selectedDeltaRow.sha256 ? (
                    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', color: t.muted, fontSize: 12, wordBreak: 'break-all' }}>
                      {selectedDeltaRow.sha256}
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedDeltaRow?.status === 'new' ? (
                <div
                  className="rounded-4 d-flex align-items-center gap-3 px-3 py-3"
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    border: `1px solid ${isDark ? '#2e1f4a' : '#e9d5ff'}`,
                    color: drawerTone.color,
                  }}
                >
                  <span
                    className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(124,58,237,0.18)' : '#f5f3ff', border: `1px solid ${isDark ? '#8b5cf6' : '#c4b5fd'}` }}
                  >
                    <IconifyIcon icon="mdi:delta" style={{ fontSize: 17, color: '#7c3aed' }} />
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#c4b5fd' : '#5b21b6', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>No Changes</div>
                    <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.55 }}>
                      This binary is new in the current build, so there is no baseline delta to compare yet.
                    </div>
                  </div>
                </div>
              ) : (
              <div
                className="rounded-4"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="d-flex align-items-start gap-2 px-3 py-3"
                  style={{
                    background: drawerTone.softBg,
                    borderBottom: `1px solid ${drawerTone.border}`,
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(220,38,38,0.06)' : 'rgba(220,38,38,0.06)', border: `1px solid ${isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.08)'}`, flexShrink: 0 }}>
                    <IconifyIcon icon="mdi:delta" style={{ fontSize: 13, color: drawerTone.accent }} />
                  </span>
                  <div className="d-flex flex-column gap-1">
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.01em', color: drawerTone.accent, lineHeight: 1 }}>
                      Changes
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 }}>
                      Security controls that improved or regressed
                    </span>
                  </div>
                </div>

                <div className="d-flex flex-column gap-0">
                  <div className="px-3 py-3" style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}` }}>
                    <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                      File Permissions
                    </div>
                    <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3, marginBottom: 4 }}>
                      Adding weakens defense, removing tightens security
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {selectedPermissionChanges.length > 0 ? selectedPermissionChanges.map((change, index) => {
                        const hasPrevCurr = change.previous_value !== undefined && change.current_value !== undefined;
                        if (hasPrevCurr) {
                          const isReg = change.side === 'regressed';
                          const prevPill = isReg
                            ? { color: isDark ? '#86efac' : '#166534', bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.32)' : '#bbf7d0' }
                            : { color: isDark ? '#fca5a5' : '#991b1b', bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', border: isDark ? 'rgba(239,68,68,0.32)' : '#fecaca' };
                          const currPill = isReg
                            ? { color: isDark ? '#fca5a5' : '#991b1b', bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', border: isDark ? 'rgba(239,68,68,0.32)' : '#fecaca' }
                            : { color: isDark ? '#86efac' : '#166534', bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.32)' : '#bbf7d0' };
                          const isRelroFlag = ['relro', 'full_relro'].includes(String(change.name).toLowerCase());
                          return (
                            <span key={`${change.name}-${index}`} className="d-inline-flex align-items-center gap-1" style={{ flexWrap: 'nowrap' }}>
                              {!isRelroFlag && <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 700, color: isDark ? '#e2e8f0' : '#334155' }}>{filePermLabel(change.name)}</span>}
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: prevPill.color, background: prevPill.bg, border: `1px solid ${prevPill.border}` }}>{String(change.previous_value)}</span>
                              <IconifyIcon icon="mdi:arrow-right-bold" style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: currPill.color, background: currPill.bg, border: `1px solid ${currPill.border}` }}>{String(change.current_value)}</span>
                            </span>
                          );
                        }
                        const prefix = change.side === 'regressed' ? '+' : '-';
                        return (
                          <span key={`${change.name}-${index}`} style={changeTokenStyle(change.side)}>
                            {prefix}<span style={{ fontFamily: MONO_FONT_STACK, letterSpacing: '0.04em' }}>{filePermLabel(change.name)}</span>
                          </span>
                        );
                      }) : (
                        <span className="small" style={{ color: t.muted }}>No permission deltas</span>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-3" style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}` }}>
                    <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Compiler Flags
                    </div>
                    <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3, marginBottom: 4 }}>
                      Adding strengthens defense, removing weakens security
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {selectedCompilerChanges.length > 0 ? selectedCompilerChanges.map((change, index) => {
                        const hasPrevCurr = change.previous_value !== undefined && change.current_value !== undefined;
                        if (hasPrevCurr) {
                          const isReg = change.side === 'regressed';
                          const prevPill = isReg
                            ? { color: isDark ? '#86efac' : '#166534', bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.32)' : '#bbf7d0' }
                            : { color: isDark ? '#fca5a5' : '#991b1b', bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', border: isDark ? 'rgba(239,68,68,0.32)' : '#fecaca' };
                          const currPill = isReg
                            ? { color: isDark ? '#fca5a5' : '#991b1b', bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', border: isDark ? 'rgba(239,68,68,0.32)' : '#fecaca' }
                            : { color: isDark ? '#86efac' : '#166534', bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', border: isDark ? 'rgba(16,185,129,0.32)' : '#bbf7d0' };
                          const isRelroFlag = ['relro', 'full_relro'].includes(String(change.name).toLowerCase());
                          return (
                            <span key={`${change.name}-${index}`} className="d-inline-flex align-items-center gap-1" style={{ flexWrap: 'nowrap' }}>
                              {!isRelroFlag && <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 700, color: isDark ? '#e2e8f0' : '#334155' }}>{titleize(change.name)}</span>}
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: prevPill.color, background: prevPill.bg, border: `1px solid ${prevPill.border}` }}>{String(change.previous_value)}</span>
                              <IconifyIcon icon="mdi:arrow-right-bold" style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: currPill.color, background: currPill.bg, border: `1px solid ${currPill.border}` }}>{String(change.current_value)}</span>
                            </span>
                          );
                        }
                        const prefix = change.side === 'improved' ? '+' : '-';
                        return (
                          <span key={`${change.name}-${index}`} style={changeTokenStyle(change.side)}>
                            {prefix}<span style={{ fontFamily: MONO_FONT_STACK, letterSpacing: '0.04em' }}>{titleize(change.name)}</span>
                          </span>
                        );
                      }) : (
                        <span className="small" style={{ color: t.muted }}>No compiler deltas</span>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-3">
                    <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Capabilities
                    </div>
                    <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3, marginBottom: 4 }}>
                      Adding increases risk of privilege escalation, removing reduces risks
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {[...selectedCapabilityAdded, ...selectedCapabilityRemoved, ...selectedCapabilityModeChanges].length > 0 ? (
                        [...selectedCapabilityAdded, ...selectedCapabilityRemoved, ...selectedCapabilityModeChanges].map((change, index) => {
                          if (change.kind === 'mode') {
                            const cleanImpact = String(change.impact ?? '').replace(/^impact\s*:\s*/i, '').trim();
                            const isHighSeverity = String(change.current_mode ?? '').toLowerCase().trim() === 'eip' || String(change.current_mode ?? '').toLowerCase().trim() === 'ep';
                            const impactColor = isHighSeverity ? (isDark ? '#fca5a5' : '#dc2626') : (isDark ? '#fde68a' : '#b45309');
                            const impactBg = isHighSeverity ? (isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2') : (isDark ? 'rgba(245,158,11,0.13)' : '#fffbeb');
                            const impactBorder = isHighSeverity ? (isDark ? 'rgba(239,68,68,0.28)' : '#fecaca') : (isDark ? 'rgba(245,158,11,0.3)' : '#fde68a');
                            const impactIcon = isHighSeverity ? 'mdi:alert' : 'mdi:alert-outline';
                            const modeColor = isDark ? '#fde68a' : '#92400e';
                            const modeBg = isDark ? 'rgba(245,158,11,0.15)' : '#fff7ed';
                            const modeBorder = isDark ? 'rgba(245,158,11,0.3)' : '#fed7aa';
                            return (
                              <div
                                key={`mode-${change.capability}-${index}`}
                                className="d-inline-flex align-items-center gap-1 flex-wrap"
                                style={{
                                  borderRadius: 8,
                                  padding: '5px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isDark ? 'rgba(245,158,11,0.10)' : '#fffbeb',
                                  border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#fde68a'}`,
                                }}
                              >
                                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 700 }}>
                                  ~{change.capability}
                                </span>
                                {change.previous_mode && (
                                  <>
                                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, color: modeColor, background: modeBg, border: `1px solid ${modeBorder}` }}>
                                      {change.previous_mode}
                                    </span>
                                    <IconifyIcon icon="solar:arrow-right-linear" style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', flexShrink: 0 }} />
                                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, color: isHighSeverity ? (isDark ? '#fca5a5' : '#991b1b') : modeColor, background: isHighSeverity ? (isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2') : modeBg, border: `1px solid ${isHighSeverity ? (isDark ? 'rgba(239,68,68,0.3)' : '#fecaca') : modeBorder}` }}>
                                      {change.current_mode}
                                    </span>
                                  </>
                                )}
                                {cleanImpact && (
                                  <span
                                    className="d-inline-flex align-items-center gap-1"
                                    style={{ marginLeft: 2, padding: '2px 7px', borderRadius: 5, background: impactBg, border: `1px solid ${impactBorder}` }}
                                  >
                                    <IconifyIcon icon={impactIcon} style={{ fontSize: 11, color: impactColor, flexShrink: 0 }} />
                                    <span style={{ fontSize: 10, fontWeight: 600, color: impactColor }}>{cleanImpact}</span>
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span key={`${change.kind}-${change.label ?? change.capability}-${index}`} style={changeTokenStyle(change.side)}>
                              {`${change.kind === 'added' ? '+' : '-'}${change.label}`}
                            </span>
                          );
                        })
                      ) : (
                        <span className="small" style={{ color: t.muted }}>No capability deltas</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

              <div
                className="rounded-4"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="d-flex align-items-start gap-2 px-3 py-3"
                  style={{
                    background: isDark
                      ? 'linear-gradient(90deg, rgba(148,163,184,0.06), rgba(148,163,184,0.02))'
                      : 'linear-gradient(90deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))',
                    borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0'}`,
                    boxShadow: isDark ? 'inset 0 -2px 8px rgba(148,163,184,0.03)' : 'inset 0 -2px 8px rgba(59,130,246,0.03)',
                    borderRadius: 8,
                    margin: '0 8px',
                    padding: '10px 14px',
                  }}
                >
                  <IconifyIcon icon="mdi:shield-check" style={{ fontSize: 16, color: isDark ? '#7f8b97' : '#2b4260', marginTop: 1, flexShrink: 0 }} />
                  <div className="d-flex flex-column gap-1">
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.01em', color: isDark ? '#f1f5f9' : '#334155', lineHeight: 1 }}>
                      Current Posture
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.3 }}>
                      Active defenses and violations as per the latest scan
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <Row className="g-3">
                      <Col xs={12}>
                        <div className="rounded-4 p-3" style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                          <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                            File Permissions
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {selectedCurrentPermissionBadges.length > 0 ? selectedCurrentPermissionBadges : <span className="small" style={{ color: t.muted }}>No file permission state available</span>}
                          </div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="rounded-4 p-3" style={{ background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                          <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                            Compiler Flags
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {selectedCurrentCompilerBadges.length > 0 ? selectedCurrentCompilerBadges : <span className="small" style={{ color: t.muted }}>No compiler state available</span>}
                          </div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="rounded-4 p-3" style={{ background: isDark ? '#0b1628' : '#ffffff', border: `1px solid ${isDark ? '#1e2d40' : '#e2e8f0'}` }}>
                          <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                            Capabilities
                          </div>
                          <div className="d-flex flex-column gap-1">
                            {selectedCurrentCapabilities.length > 0 ? (
                              selectedCurrentCapabilities.map((cap) => {
                                const name = String(cap?.name ?? 'unknown');
                                const modeStr = String(cap?.mode_string ?? cap?.mode ?? '');
                                const impact = String(cap?.impact ?? '').replace(/^impact\s*:\s*/i, '').trim();
                                const description = String(cap?.description ?? '').trim();
                                const modeKey = modeStr.toLowerCase().trim();
                                const isHighSeverity = modeKey === 'eip' || modeKey === 'ep';
                                const impactBg = isHighSeverity ? (isDark ? 'rgba(239,68,68,0.13)' : '#fef2f2') : (isDark ? 'rgba(245,158,11,0.13)' : '#fffbeb');
                                const impactBorder = isHighSeverity ? (isDark ? 'rgba(239,68,68,0.28)' : '#fecaca') : (isDark ? 'rgba(245,158,11,0.3)' : '#fde68a');
                                const impactColor = isHighSeverity ? (isDark ? '#fca5a5' : '#dc2626') : (isDark ? '#fde68a' : '#b45309');
                                const impactIcon = isHighSeverity ? 'mdi:alert' : 'mdi:alert-outline';
                                return (
                                  <div
                                    key={name}
                                    style={{
                                      borderRadius: 8,
                                      border: `1px solid ${isDark ? '#1e2d40' : '#e2e8f0'}`,
                                      background: isDark ? '#0b1628' : '#ffffff',
                                      padding: '9px 11px',
                                      boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(15,23,42,0.06)',
                                    }}
                                  >
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 700, fontSize: 12, color: t.title, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {name}
                                      </span>
                                      {modeStr ? (
                                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, color: isDark ? '#fde68a' : '#92400e', background: isDark ? 'rgba(245,158,11,0.15)' : '#fff7ed', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fed7aa'}` }}>
                                          {modeStr}
                                        </span>
                                      ) : null}
                                    </div>
                                    {description ? (
                                      <div style={{ marginTop: 5, fontSize: 11, color: isDark ? '#8baabb' : '#5a6a7a', lineHeight: 1.5 }}>
                                        {description}
                                      </div>
                                    ) : null}
                                    {impact ? (
                                      <div
                                        className="d-inline-flex align-items-center gap-1"
                                        style={{ marginTop: 7, padding: '3px 8px', borderRadius: 5, background: impactBg, border: `1px solid ${impactBorder}` }}
                                      >
                                        <IconifyIcon icon={impactIcon} style={{ fontSize: 12, color: impactColor, flexShrink: 0 }} />
                                        <span style={{ fontSize: 11, fontWeight: 500, color: impactColor }}>{impact}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="small" style={{ color: t.muted }}>No capabilities present</span>
                            )}
                          </div>
                        </div>
                      </Col>
                  </Row>
                </div>
              </div>

              <div
                className="rounded-4 p-3"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                  boxShadow: isDark ? 'none' : '0 10px 22px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div className="d-flex align-items-start gap-2" style={{ marginBottom: 10, padding: 6, borderRadius: 8, background: isDark ? 'rgba(139,92,246,0.03)' : 'rgba(233,213,255,0.35)', boxShadow: isDark ? '0 6px 18px rgba(139,92,246,0.06)' : '0 6px 18px rgba(124,58,237,0.06)' }}>
                  <span style={{ position: 'relative', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconifyIcon icon="mdi:star-four-points" style={{ fontSize: 15, color: isDark ? '#8b76e6' : '#6d28d9' }} />
                    <IconifyIcon
                      icon="mdi:star-four-points"
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        fontSize: 8,
                        color: isDark ? '#8b76e6' : '#7c3aed',
                        opacity: 0.9,
                      }}
                    />
                    <IconifyIcon
                      icon="mdi:star-four-points"
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        left: -3,
                        fontSize: 7,
                        color: isDark ? '#8b76e6' : '#7c3aed',
                        opacity: 0.75,
                      }}
                    />
                  </span>
                  <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: '0.01em',
                        color: isDark ? '#f1f5f9' : '#334155',
                        lineHeight: 1,
                      }}
                    >
                      AI-assisted Summary
                    </span>
                    <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, marginTop: 2 }}>Prioritized remediation & actionable next steps</span>
                  </div>
                </div>
                <div style={{ padding: '10px', borderRadius: 12, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                  {renderBinaryActionSummary(selectedDeltaRow, selectedCurrentBinary)}
                </div>
              </div>
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas
        show={fullSummaryOverlay.show}
        onHide={() => setFullSummaryOverlay({ show: false, row: null })}
        placement="end"
        backdrop
        scroll={false}
        style={drawerPanelStyle}
      >
        <Offcanvas.Header closeButton style={{ background: isDark ? '#020617' : '#ffffff', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
          <div className="d-flex flex-column gap-1 pe-4">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
              Full Report
            </span>
            <Offcanvas.Title as="h6" style={{ margin: 0, color: t.title, fontWeight: 700, fontSize: 18 }}>
              {String(fullSummaryOverlay.row?.filename ?? fullSummaryOverlay.row?.name ?? 'Binary Summary')}
            </Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          {fullSummaryOverlay.row ? (
            <div className="p-3 p-md-4 d-flex flex-column gap-3">
              <div
                className="rounded-4 p-3"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                  boxShadow: isDark ? 'none' : '0 10px 22px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div className="d-flex align-items-start gap-2" style={{ marginBottom: 10, padding: 6, borderRadius: 8, background: isDark ? 'rgba(139,92,246,0.03)' : 'rgba(233,213,255,0.35)', boxShadow: isDark ? '0 6px 18px rgba(139,92,246,0.06)' : '0 6px 18px rgba(124,58,237,0.06)' }}>
                  <span style={{ position: 'relative', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconifyIcon icon="mdi:star-four-points" style={{ fontSize: 15, color: isDark ? '#8b76e6' : '#6d28d9' }} />
                    <IconifyIcon
                      icon="mdi:star-four-points"
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        fontSize: 8,
                        color: isDark ? '#8b76e6' : '#7c3aed',
                        opacity: 0.9,
                      }}
                    />
                    <IconifyIcon
                      icon="mdi:star-four-points"
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        left: -3,
                        fontSize: 7,
                        color: isDark ? '#8b76e6' : '#7c3aed',
                        opacity: 0.75,
                      }}
                    />
                  </span>
                  <div className="d-flex flex-column gap-1" style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: '0.01em',
                        color: isDark ? '#f1f5f9' : '#334155',
                        lineHeight: 1,
                      }}
                    >
                      AI-assisted Summary
                    </span>
                    <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, marginTop: 2 }}>Prioritized remediation & actionable next steps</span>
                  </div>
                </div>
                <div style={{ padding: '10px', borderRadius: 12, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                  {renderBinaryActionSummary(fullSummaryOverlay.row, fullSummaryOverlay.row)}
                </div>
              </div>
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>

    </>
  );
}
