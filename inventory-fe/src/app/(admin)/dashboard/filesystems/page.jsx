import { Col, Row, Card, CardBody, CardHeader, Table, Button, Form } from 'react-bootstrap';
import { useEffect, useMemo, useRef, useState } from 'react';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getStatusIcon } from '../statusIcons';
import { useSelector } from 'react-redux';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';
import {
  selectReport,
  selectReportStatus,
  selectReportDiffs,
  selectReportTimestamp,
} from '@/store/slices/reportSlice';
import {
  BH_CARD_RADIUS_PX,
  BH_CARD_SHADOW,
  BH_INTERACTIVE_TRANSITION,
  BH_THEME_TRANSITION,
  getBinaryHardeningTheme,
} from '../binary-hardening/binaryHardeningTheme';

const PAGE_SIZE = 8;
const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';

/** Stat summary cards — reference UI: white card, 5px left accent, Inter, soft radius & shadow. */
const FS_STAT_CARD_RADIUS = 10;
const FS_STAT_STRIPE_PX = 5;
const FS_STAT_TRACK_BG = '#f0f1f3';
const FS_STAT_SHADOW_LIGHT = '0 1px 3px rgba(45, 52, 54, 0.08)';
const FS_STAT_NUM_LIGHT = '#2D3436';
const FS_STAT_DESC_LIGHT = '#636E72';
/** Softer, lighter status palette shared by summary cards and table status pills. */
const FS_STAT_NEW = { leftBorder: '#3b82f6', pillBg: '#bfdbfe', pillText: '#1e3a8a', iconDisc: '#3b82f6' };
const FS_STAT_IMPROVED = { leftBorder: '#86d883', pillBg: '#95e492', pillText: '#065f46' };
const FS_STAT_REGRESSED = { leftBorder: '#f04444', pillBg: '#ff6b6d', pillText: '#111827' };
const FS_STAT_MIXED = { leftBorder: '#fcd34d', pillBg: '#fef3c7', pillText: '#92400e' };
const FS_STAT_DELETED = { leftBorder: '#94a3b8', pillBg: '#e2e8f0', pillText: '#334155' };

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatBuildMetaTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBuildMetaId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/A';
  return raw.length > 18 ? `${raw.slice(0, 18)}...` : raw;
}

/** Delta “Remaining gaps” and full-table “Missing flags” — identical neutral pill UI. */
function fsGapPillStyle(isDark, t) {
  return {
    background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
    color: isDark ? '#fca5a5' : '#991b1b',
    fontWeight: 700,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca'}`,
    padding: '3px 8px',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };
}

const POLICY_LEGEND = [
  { title: 'NOEXEC', description: 'Restricts direct execution of binaries on the mounted filesystem.' },
  { title: 'NOSUID', description: 'Disables set-user-identifier bits, preventing binary privilege escalation.' },
  { title: 'NODEV', description: 'Prevents the filesystem from interpreting character or block special devices.' },
  { title: 'RO', description: 'Read-only mount access to prevent tampering.' },
  { title: 'HIDEPID', description: 'Prevent reading /proc. Hides process info from users; value 2 provides max isolation.' },
];

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
  background: '#111827',
  border: '1px solid #111827',
  color: '#ffffff',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};

const FILTER_ACTIVE_NEW = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_GREEN = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_RED = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_AMBER = FILTER_ACTIVE_ALL;
const FILTER_ACTIVE_SLATE = FILTER_ACTIVE_ALL;

const VIEW_TOGGLE_OUTER_RADIUS = FILTER_PILL_BASE.borderRadius;
const VIEW_TOGGLE_TRACK_PADDING = 4;
const VIEW_TOGGLE_INNER_RADIUS = VIEW_TOGGLE_OUTER_RADIUS - VIEW_TOGGLE_TRACK_PADDING;

const STATUS_BADGE_BASE = {
  borderRadius: 999,
  fontFamily: UI_FONT_STACK,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.01em',
  textTransform: 'uppercase',
  padding: '4px 10px',
  lineHeight: 1.2,
};

const filesystemTableHeaderStyle = (isDark) => ({
  background: isDark ? 'rgba(30,41,59,0.5)' : '#f3f7fb',
  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#dbe5ef'}`,
  borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#dbe5ef'}`,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: isDark ? '#cbd5e1' : '#334155',
  padding: '14px 16px',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  fontFamily: UI_FONT_STACK,
  transition: BH_THEME_TRANSITION,
});

/** Reference UI: compact pill badge (uppercase, shared UI stack). */
function FsStatLabelBadge({ bg, color, children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        fontFamily: UI_FONT_STACK,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.01em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 999,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

/** Build change column: +/− outside pill; adds row then removes row when both exist (reference UI). */
function BuildChangeCell({ added, removed, isDark, emptyColor }) {
  const hasA = added?.length > 0;
  const hasR = removed?.length > 0;
  if (!hasA && !hasR) {
    return (
      <span className="small" style={{ color: emptyColor }}>
        —
      </span>
    );
  }

  const light = !isDark;
  const neutral = {
    pillBorder: light ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.15)',
    text: light ? '#475569' : '#94a3b8',
    sign: light ? '#64748b' : '#94a3b8',
  };

  const pillStyle = (isRemoved = false) => ({
    display: 'inline-block',
    borderRadius: 999,
    padding: '4px 10px',
    fontFamily: UI_FONT_STACK,
    fontSize: 10,
    fontWeight: isRemoved ? 600 : 700,
    textTransform: 'uppercase',
    lineHeight: 1.25,
    border: '1px solid',
    backgroundColor: 'transparent',
    borderColor: isRemoved ? (light ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)') : neutral.pillBorder,
    color: isRemoved ? (light ? '#64748b' : '#94a3b8') : neutral.text,
    textDecoration: 'none',
    opacity: isRemoved ? 0.75 : 1,
  });

  const signStyle = () => ({
    color: neutral.sign,
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1,
    flexShrink: 0,
    opacity: 0.8,
  });

  const dashStyle = signStyle();

  return (
    <div className="d-flex flex-wrap align-items-center" style={{ gap: 8 }}>
      {hasA
        ? added.map((f) => (
            <span key={`a-${f}`} className="d-inline-flex align-items-center" style={{ gap: 6 }}>
              <span style={signStyle()} aria-hidden>
                +
              </span>
              <span style={pillStyle(false)}>{f}</span>
            </span>
          ))
        : null}
      {hasA && hasR ? (
        <span aria-hidden style={{ width: 4, flexShrink: 0 }} />
      ) : null}
      {hasR
        ? removed.map((f) => (
            <span key={`r-${f}`} className="d-inline-flex align-items-center" style={{ gap: 6 }}>
              <span style={dashStyle} aria-hidden>
                −
              </span>
              <span style={pillStyle(true)}>{f}</span>
            </span>
          ))
        : null}
    </div>
  );
}

function filesystemDeltaStatusPillStyle(status, isDark) {
  const key = String(status ?? 'regressed').toLowerCase();
  const palette = key === 'improved'
    ? {
        bg: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)',
        border: 'transparent',
        text: isDark ? '#6ee7b7' : '#059669',
      }
    : key === 'mixed'
      ? {
          bg: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(180, 83, 9, 0.06)',
          border: 'transparent',
          text: isDark ? '#fcd34d' : '#b45309',
        }
      : key === 'new'
        ? {
            bg: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(29, 78, 216, 0.06)',
            border: 'transparent',
            text: isDark ? '#93c5fd' : '#1d4ed8',
          }
        : key === 'deleted'
          ? {
              bg: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.06)',
              border: 'transparent',
              text: isDark ? '#cbd5e1' : '#475569',
            }
          : {
              bg: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(185, 28, 28, 0.06)',
              border: 'transparent',
              text: isDark ? '#f87171' : '#b91c1c',
            };

  return {
    ...STATUS_BADGE_BASE,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    color: palette.text,
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    letterSpacing: '0.04em',
    fontSize: 10,
    fontWeight: 700,
    padding: '4px 12px',
    lineHeight: 1,
    minWidth: 0,
    whiteSpace: 'nowrap',
    transition: BH_THEME_TRANSITION,
  };
}

function formatFilesystemStatusLabel(status) {
  const key = String(status ?? 'regressed').toLowerCase();
  if (key === 'new') return 'NEW';
  if (key === 'deleted') return 'REMOVED';
  if (key === 'mixed') return 'REVIEW';
  if (key === 'improved') return 'IMPROVED';
  return 'REGRESSED';
}

function FilesystemStatusBadge({ status, isDark }) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center"
      style={filesystemDeltaStatusPillStyle(status, isDark)}
    >
      <span>{formatFilesystemStatusLabel(status)}</span>
    </span>
  );
}

function getFilesystemFlagPillStyle(kind, isDark, t) {
  switch (kind) {
    case 'added':
      return {
        background: isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4',
        border: `1px solid ${isDark ? 'rgba(34,197,94,0.35)' : '#bbf7d0'}`,
        color: isDark ? '#86efac' : '#14532d',
      };
    case 'removed':
      return {
        background: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
        border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : '#fecaca'}`,
        color: isDark ? '#fca5a5' : '#991b1b',
      };
    case 'gaps':
      return fsGapPillStyle(isDark, t);
    default:
      return {
        background: isDark ? 'rgba(148,163,184,0.14)' : '#f8fafc',
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.28)' : '#e2e8f0'}`,
        color: isDark ? '#cbd5e1' : '#64748b',
      };
  }
}

function FilesystemFlagPills({ flags, kind, isDark, t, emptyLabel, emptyIcon }) {
  const items = Array.isArray(flags) ? flags.filter(Boolean) : [];

  if (items.length === 0) {
    return (
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{
          ...getFilesystemFlagPillStyle('empty', isDark, t),
          display: 'inline-flex',
          fontSize: 10,
          fontWeight: 700,
          background: 'transparent',
          lineHeight: 1.2,
          padding: '4px 10px',
          borderRadius: 999,
        }}
      >
        {emptyIcon ? <IconifyIcon icon={emptyIcon} style={{ fontSize: 11 }} /> : null}
        <span>{emptyLabel}</span>
      </span>
    );
  }

  const pillStyle = getFilesystemFlagPillStyle(kind, isDark, t);

  return (
    <div className="d-flex flex-wrap gap-1">
      {items.map((flag) => (
        <span
          key={flag}
          style={{
            ...pillStyle,
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 10,
            fontWeight: 700,
            background: 'transparent',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            padding: '4px 10px',
            borderRadius: 999,
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          {flag}
        </span>
      ))}
    </div>
  );
}

/**
 * Reference: white card, 5px left accent strip, pill + icon row, large stat, description.
 * Stripe is a positioned layer (avoids border shorthand issues); content clears the bar via padding.
 */
function FsSummaryStatCard({
  t,
  isDark,
  leftBorderColor,
  badgeBg,
  badgeTextColor,
  label,
  description,
  valueDisplay,
  rightIcon,
  interactive = false,
  active = false,
  onClick,
}) {
  const statBorder = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(15, 23, 42, 0.08)';
  const cardBg = isDark
    ? 'linear-gradient(160deg, #0f172a 0%, #111827 100%)'
    : 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)';
  const numColor = isDark ? t.title : FS_STAT_NUM_LIGHT;
  const descColor = isDark ? t.muted : FS_STAT_DESC_LIGHT;
  const statShadow = isDark ? '0 12px 30px rgba(2, 6, 23, 0.45)' : '0 10px 24px rgba(15, 23, 42, 0.08)';
  const pl = FS_STAT_STRIPE_PX + 19;

  return (
    <Card
      className="border-0 h-100 w-100 flex-fill d-flex flex-column position-relative"
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        background: cardBg,
        borderRadius: FS_STAT_CARD_RADIUS,
        boxShadow: active
          ? (isDark ? '0 18px 36px -18px rgba(59, 130, 246, 0.45)' : '0 18px 36px -18px rgba(37, 99, 235, 0.24)')
          : statShadow,
        borderTop: `1px solid ${statBorder}`,
        borderRight: `1px solid ${statBorder}`,
        borderBottom: `1px solid ${statBorder}`,
        overflow: 'visible',
        cursor: interactive ? 'pointer' : 'default',
        transition: BH_INTERACTIVE_TRANSITION,
        transform: active ? 'translateY(-2px)' : 'none',
      }}
    >
      <div
        aria-hidden
        className="position-absolute top-0 bottom-0 start-0"
        style={{
          width: FS_STAT_STRIPE_PX,
          minWidth: FS_STAT_STRIPE_PX,
          backgroundColor: leftBorderColor,
          borderTopLeftRadius: FS_STAT_CARD_RADIUS,
          borderBottomLeftRadius: FS_STAT_CARD_RADIUS,
        }}
      />
      <CardBody
        className="d-flex flex-column flex-grow-1 position-relative"
        style={{ padding: `22px 24px 24px ${pl}px`, zIndex: 1 }}
      >
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-nowrap">
          <div className="min-w-0">
            <FsStatLabelBadge bg={badgeBg} color={badgeTextColor}>
              {label}
            </FsStatLabelBadge>
          </div>
          <div className="flex-shrink-0 d-flex align-items-center justify-content-center" style={{ minWidth: 32 }} aria-hidden>
            {rightIcon}
          </div>
        </div>
        <div
          className="mb-2"
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: numColor,
            lineHeight: 1.1,
            fontFamily: MONO_FONT_STACK,
          }}
        >
          {valueDisplay}
        </div>
        <div
          style={{
            fontFamily: UI_FONT_STACK,
            fontSize: 13,
            fontWeight: 400,
            color: descColor,
            lineHeight: 1.45,
            maxWidth: 280,
          }}
        >
          {description}
        </div>
      </CardBody>
    </Card>
  );
}

function upperFlag(f) {
  if (f == null || f === '') return '';
  return String(f).replace(/\s+/g, '').toUpperCase();
}

function normalizeDeltaRow(raw, fallbackStatus) {
  const filesystem = raw.filesystem || raw.fstype || 'N/A';
  const mountPath =
    raw.mountpath || raw.mount_path || raw.mountpoint || raw.path || raw.name || '/';
  const added =
    raw.added_flags ?? raw.added ?? raw.build_added ?? raw.flags_added ?? [];
  const removed =
    raw.removed_flags ?? raw.removed ?? raw.build_removed ?? raw.flags_removed ?? [];
  const gaps = raw.remaining_gaps ?? raw.flags ?? raw.missing_flags ?? [];
  const addedArr = Array.isArray(added) ? added.map(upperFlag).filter(Boolean) : [];
  const removedArr = Array.isArray(removed) ? removed.map(upperFlag).filter(Boolean) : [];
  const gapsArr = Array.isArray(gaps) ? gaps.map(upperFlag).filter(Boolean) : [];
  const status = (raw.status || fallbackStatus || 'regressed').toLowerCase();
  return {
    filesystem,
    mountPath,
    buildChangeAdded: addedArr,
    buildChangeRemoved: removedArr,
    remainingGaps: gapsArr,
    status,
  };
}

/**
 * Status for a mount_path_delta row from API rules:
 * Improved:  flags_added.length > 0 && flags_removed.length === 0
 * Regressed: flags_removed.length > 0 && flags_added.length === 0
 * Mixed:     flags_added.length > 0 && flags_removed.length > 0
 * Unchanged: both empty
 */
function classifyMountPathDeltaStatus(flagsAdded, flagsRemoved) {
  const a = Array.isArray(flagsAdded) ? flagsAdded.length : 0;
  const r = Array.isArray(flagsRemoved) ? flagsRemoved.length : 0;

  // If no flags were added or removed, treat as unchanged (skip showing in delta view)
  if (a === 0 && r === 0) return 'unchanged';
  if (a > 0 && r > 0) return 'mixed';
  if (a === 0 && r > 0) return 'regressed';
  if (a > 0 && r === 0) return 'improved';
  return 'unchanged';
}

function filesystemsDiffsHasKeys(fsd) {
  if (!fsd || typeof fsd !== 'object') return false;
  return (
    Array.isArray(fsd.mount_path_delta) ||
    Array.isArray(fsd.mounts_delta) ||
    Array.isArray(fsd.mounts_added) ||
    Array.isArray(fsd.mounts_removed)
  );
}

/** Build delta rows from `report_diffs.filesystems` (mounts_added / mounts_removed / mount_path_delta). */
function buildRowsFromFilesystemsDiffs(fsd) {
  const out = [];
  const pathDelta = fsd.mount_path_delta ?? fsd.mounts_delta ?? [];

  if (Array.isArray(pathDelta)) {
    pathDelta.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const added = Array.isArray(row.flags_added) ? row.flags_added : [];
      const removed = Array.isArray(row.flags_removed) ? row.flags_removed : [];
      const gaps = Array.isArray(row.remaining_gaps) ? row.remaining_gaps : [];
      const st = classifyMountPathDeltaStatus(added, removed);
      // Skip gap-only entries: unresolved mounts are already shown elsewhere.
      if (st === 'unchanged') return;
      out.push(
        normalizeDeltaRow(
          {
            mountpath: row.name ?? row.mountpath ?? row.path ?? '/',
            filesystem: row.filesystem ?? row.fstype ?? 'N/A',
            flags_added: added,
            flags_removed: removed,
            remaining_gaps: gaps,
            status: st,
          },
          st,
        ),
      );
    });
  }

  if (Array.isArray(fsd.mounts_added)) {
    fsd.mounts_added.forEach((item) => {
      if (typeof item === 'string') {
        out.push(
          normalizeDeltaRow(
            {
              mountpath: item,
              filesystem: 'N/A',
              added_flags: [],
              removed_flags: [],
              remaining_gaps: [],
              status: 'new',
            },
            'new',
          ),
        );
      } else if (item && typeof item === 'object') {
        const flags = item.flags ?? [];
        out.push(
          normalizeDeltaRow(
            {
              mountpath: item.mountpath ?? item.name ?? item.path ?? '/',
              filesystem: item.filesystem ?? item.fstype ?? 'N/A',
              added_flags: [],
              removed_flags: [],
              remaining_gaps: flags,
              status: 'new',
            },
            'new',
          ),
        );
      }
    });
  }

  if (Array.isArray(fsd.mounts_removed)) {
    fsd.mounts_removed.forEach((item) => {
      const path =
        typeof item === 'string' ? item : item?.mountpath ?? item?.name ?? item?.path ?? '';
      if (!path) return;
      out.push(
        normalizeDeltaRow(
          {
            mountpath: path,
            filesystem: typeof item === 'object' ? item.filesystem ?? item.fstype ?? '-' : '-',
            added_flags: [],
            removed_flags: [],
            remaining_gaps: [],
            status: 'deleted',
          },
          'deleted',
        ),
      );
    });
  }

  return out;
}

/**
 * Accept several possible `report_diffs` shapes; `null` means fall back to violations list.
 */
function rowsFromReportDiffs(reportDiffs) {
  const fsd = reportDiffs?.filesystems ?? reportDiffs?.filesystems_diffs;
  if (filesystemsDiffsHasKeys(fsd)) {
    return buildRowsFromFilesystemsDiffs(fsd);
  }

  const block =
    reportDiffs?.filesystem_mount_diffs ??
    reportDiffs?.mount_diffs ??
    reportDiffs?.mount_flag_diffs ??
    null;
  if (!block || typeof block !== 'object') return null;

  if (Array.isArray(block.delta) && block.delta.length) {
    return block.delta.map((r) => normalizeDeltaRow(r, r.status));
  }

  const out = [];
  const push = (arr, status) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (item && typeof item === 'object') out.push(normalizeDeltaRow(item, status));
    });
  };

  push(block.new_mounts ?? block.new, 'new');
  push(block.improved, 'improved');
  push(block.regressed, 'regressed');
  push(block.mixed, 'mixed');

  return out.length ? out : null;
}

export default function FilesystemsPage() {
  const { themeMode } = useLayoutContext();
  const { width } = useViewPort();
  const isDark = themeMode === 'dark';
  const isMobile = width < 992;
  const isVeryNarrow = width < 576;
  const t = getBinaryHardeningTheme(isDark);
  const tableSectionRef = useRef(null);
  const scrollTableIntoView = () => {
    setTimeout(() => tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const report = useSelector(selectReport);
  const reportDiffs = useSelector(selectReportDiffs);
  const reportTimestamp = useSelector(selectReportTimestamp);
  const status = useSelector(selectReportStatus);
  const loading = status === 'idle' || status === 'loading';

  const [viewMode, setViewMode] = useState('delta');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deltaFilterOpen, setDeltaFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(0);
  const [hoveredDriftCard, setHoveredDriftCard] = useState(null);
  const [unresolvedFilter, setUnresolvedFilter] = useState(false);
  const [hoveredNewRisk, setHoveredNewRisk] = useState(false);

  const filesystemViolations = report?.system_hardening?.mount_flag_violations ?? [];

  const deltaRows = useMemo(() => {
    const fromDiffs = rowsFromReportDiffs(reportDiffs);
    let rows = null;
    if (fromDiffs != null) {
      rows = fromDiffs;
    } else {
      rows = filesystemViolations.map((v) => {
        const flags = Array.isArray(v.flags) ? v.flags : v.flags ? [v.flags] : [];
        return normalizeDeltaRow(
          {
            filesystem: v.filesystem || v.fstype,
            mountpath: v.mountpath || v.mountpoint || v.path,
            remaining_gaps: flags,
            added_flags: [],
            removed_flags: [],
            status: 'regressed',
          },
          'regressed',
        );
      });
    }

    // Sort rows by status precedence (group similar statuses together), then mountPath and filesystem.
    // Precedence: improved -> regressed -> mixed -> new -> deleted
    const statusOrder = {
      improved: 0,
      regressed: 1,
      mixed: 2,
      new: 3,
      deleted: 4,
    };
    rows.sort((a, b) => {
      const sa = statusOrder[String(a.status ?? '').toLowerCase()] ?? 99;
      const sb = statusOrder[String(b.status ?? '').toLowerCase()] ?? 99;
      if (sa !== sb) return sa - sb;
      const ap = String(a.mountPath ?? '').toLowerCase();
      const bp = String(b.mountPath ?? '').toLowerCase();
      if (ap < bp) return -1;
      if (ap > bp) return 1;
      const af = String(a.filesystem ?? '').toLowerCase();
      const bf = String(b.filesystem ?? '').toLowerCase();
      if (af < bf) return -1;
      if (af > bf) return 1;
      return 0;
    });

    return rows;
  }, [reportDiffs, filesystemViolations]);

  const fullRows = useMemo(() => {
    return filesystemViolations.map((v) => {
      const flags = Array.isArray(v.flags) ? v.flags : v.flags ? [v.flags] : [];
      return {
        filesystem: v.filesystem || v.fstype || 'N/A',
        mountPath: v.mountpath || v.mountpoint || v.path || '/',
        missingFlags: flags.map(upperFlag).filter(Boolean),
      };
    });
  }, [filesystemViolations]);

  const summary = useMemo(() => {
    const newC = deltaRows.filter((r) => r.status === 'new').length;
    const improvedC = deltaRows.filter((r) => r.status === 'improved').length;
    const regressedC = deltaRows.filter((r) => r.status === 'regressed').length;
    const mixedC = deltaRows.filter((r) => r.status === 'mixed').length;
    const deletedC = deltaRows.filter((r) => r.status === 'deleted').length;
    return { newC, improvedC, regressedC, mixedC, deletedC };
  }, [deltaRows]);

  const filterInactivePill = useMemo(
    () => ({
      ...FILTER_PILL_BASE,
      background: isDark ? 'rgba(30,41,59,0.9)' : '#f8fafc',
      border: isDark ? '1px solid rgba(148,163,184,0.26)' : '1px solid #cbd5e1',
      color: isDark ? t.title : '#1e293b',
      boxShadow: isDark ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.06)',
    }),
    [isDark, t.title],
  );

  const searchFieldShellStyle = useMemo(
    () => ({
      borderRadius: 8,
      border: `1px solid ${
        searchFocused
          ? isDark
            ? '#60a5fa'
            : '#93c5fd'
          : isDark
            ? '#475569'
            : '#e5e7eb'
      }`,
      background: isDark ? '#0f172a' : '#f9fafb',
      height: 34,
      flex: '1 1 200px',
      maxWidth: 300,
      minWidth: 160,
      boxShadow: searchFocused
        ? isDark
          ? '0 0 0 3px rgba(96, 165, 250, 0.22)'
          : '0 0 0 3px rgba(59, 130, 246, 0.18)'
        : isDark
          ? 'none'
          : '0 1px 2px rgba(15, 23, 42, 0.05)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    }),
    [isDark, searchFocused],
  );

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (fs, path) => {
    if (!q) return true;
    return `${fs} ${path}`.toLowerCase().includes(q);
  };

  const filteredDelta = useMemo(() => {
    let list = deltaRows;
    if (activeFilter !== 'all') {
      list = list.filter((r) => r.status === activeFilter);
    }
    if (q) {
      list = list.filter((r) => matchesSearch(r.filesystem, r.mountPath));
    }
    return list;
  }, [deltaRows, activeFilter, q]);

  const unresolvedFullRows = useMemo(() => {
    const items = reportDiffs?.filesystems?.unresolved ?? [];
    return items.map((item) => {
      if (typeof item === 'string') return { filesystem: 'N/A', mountPath: item, missingFlags: [] };
      return {
        filesystem: item?.filesystem ?? item?.fstype ?? 'N/A',
        mountPath: item?.mountpath ?? item?.name ?? item?.path ?? '',
        missingFlags: (item?.remaining_gaps ?? item?.flags ?? []).map((f) => String(f).toUpperCase()).filter(Boolean),
      };
    });
  }, [reportDiffs?.filesystems?.unresolved]);

  const mountsAddedCount = (reportDiffs?.filesystems?.mounts_added ?? []).length;

  const filteredFull = useMemo(() => {
    let list = unresolvedFilter ? unresolvedFullRows : fullRows;
    if (q) {
      list = list.filter((r) => matchesSearch(r.filesystem, r.mountPath));
    }
    return list;
  }, [fullRows, unresolvedFullRows, unresolvedFilter, q]);

  const tableRows = viewMode === 'delta' ? filteredDelta : filteredFull;
  const totalTable = tableRows.length;
  const pageCount = Math.max(1, Math.ceil(totalTable / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedRows = tableRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const showingFrom = totalTable === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const showingTo = Math.min(totalTable, (safePage + 1) * PAGE_SIZE);
  const formatStatFigure = (n) => {
    const v = Number(n) || 0;
    if (v <= 99) return String(v).padStart(2, '0');
    return formatNumber(v);
  };

  const baselineId =
    reportDiffs?.filesystem_mount_diffs?.last_build_id ??
    reportDiffs?.mount_diffs?.last_build_id ??
    reportDiffs?.mount_flag_diffs?.last_build_id ??
    reportDiffs?.last_build_id ??
    'v2.4.0';
  const targetId = report?.build_id ?? 'v2.4.1';
  const filesystemDebtCount = deltaRows.filter((row) => ['new', 'regressed', 'mixed'].includes(row.status)).length;
  const reviewMountCount = summary.mixedC;

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const scrollToFilesystemTable = () => {
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openDeltaView = (filter = 'all') => {
    setViewMode('delta');
    setActiveFilter(filter);
    setDeltaFilterOpen(filter !== 'all');
    setSearchQuery('');
    setUnresolvedFilter(false);
    setPage(0);
    requestAnimationFrame(scrollToFilesystemTable);
  };

  const openUnresolvedView = () => {
    setViewMode('full');
    setUnresolvedFilter(true);
    setSearchQuery('');
    setPage(0);
    requestAnimationFrame(scrollToFilesystemTable);
  };

  const fullTableShellStyle = {
    borderRadius: 10,
    border: `1px solid ${isDark ? t.border : 'rgba(15, 23, 42, 0.08)'}`,
    overflow: 'hidden',
    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
  };
  const findingsSectionShellStyle = {
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? t.borderStrong : '#cbd5e1'}`,
    borderRadius: 28,
    boxShadow: isDark ? 'none' : '0 10px 35px -15px rgba(15,23,42,0.14)',
    overflow: 'hidden',
    transition: BH_THEME_TRANSITION,
  };
  const insightsInnerShellStyle = {
    borderRadius: 12,
    background: isDark ? 'rgba(17, 24, 39, 0.58)' : 'rgba(255,255,255,0.74)',
    border: `1px solid ${isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.14)'}`,
    boxShadow: 'none',
    overflow: 'hidden',
  };
  const sleekSectionSeparator = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(203,213,225,0.95)';
  const tableRowSeparator = isDark ? 'rgba(148,163,184,0.12)' : '#ccdbe8';
  const tableRowTransition = `${BH_THEME_TRANSITION}, background-color 180ms ease, box-shadow 180ms ease`;

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

  if (loading) {
    return (
      <>
        <PageMetaData title="Filesystems Details" />
        <div className="text-center py-5 text-muted">Loading report...</div>
      </>
    );
  }
  if (status === 'failed') {
    return (
      <>
        <PageMetaData title="Filesystems Details" />
        <div className="text-center py-5 text-danger">Failed to load report</div>
      </>
    );
  }

  return (
    <>
      <PageMetaData title="Filesystems Details" />

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
          margin: isMobile ? '12px' : '20px',
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

        <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '24px 20px 24px' : '36px 40px 48px' }}>
          {/* Header Row */}
          <Row className="g-4 mb-4 align-items-center">
            <Col lg={7}>
              <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                {/* Delta Overview label */}
                <div className="d-flex align-items-center gap-3 mb-2">
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

                <div
                  style={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                    justifyContent: 'flex-start',
                    gap: 14,
                    flexWrap: 'wrap',
                  marginBottom: 4,
                  }}
                >
                  <h1
                    style={{
                      fontFamily: UI_FONT_STACK,
                      fontSize: isMobile ? 26 : 34,
                      fontWeight: 900,
                      letterSpacing: '-0.04em',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      lineHeight: 1.05,
                      margin: 0,
                    }}
                  >
                    Filesystem Security
                  </h1>
                </div>

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
                  Mount flag and filesystem integrity drifts
                </p>
              </div>
            </Col>

            <Col lg={5}>
              <div className="d-flex justify-content-lg-end">
                <style>{`
                  .fs-security-debt-link:hover .fs-security-debt-arrow {
                    color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
                    transform: translate(2px, -2px);
                  }
                `}</style>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openUnresolvedView}
                  className="fs-security-debt-link"
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
                      <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#f43f5e' : '#be123c', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                        Security Debt
                      </span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Unresolved Gaps
                    </div>
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: 8 }}>
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        lineHeight: 1,
                        color: t.title,
                        fontFamily: MONO_FONT_STACK,
                        letterSpacing: '-0.05em',
                      }}
                    >
                      {formatNumber(filesystemDebtCount)}
                    </span>
                    <IconifyIcon icon="solar:arrow-right-up-outline" className="fs-security-debt-arrow" style={{ fontSize: 20, color: t.muted, transition: 'all 0.2s ease' }} />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Row className="g-3 mb-5 align-items-stretch">
            <Col xl={12}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  padding: isMobile ? '16px' : '20px 24px',
                  background: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248,250,252,0.6)',
                  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(226,232,240,0.8)'}`,
                  borderRadius: 28,
                  position: 'relative',
                  transition: BH_THEME_TRANSITION,
                }}
              >
                <div className="pb-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.06)'}` }}>
                  <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
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
                        onClick={() => openDeltaView('new')}
                        style={{
                          gap: 8,
                          padding: '6px 14px',
                          borderRadius: 12,
                          background: isDark ? 'rgba(139,92,246,0.18)' : '#f5f0ff',
                          border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#e9dcff'}`,
                          color: isDark ? '#ecd9ff' : '#5b21b6',
                          cursor: 'pointer',
                        }}
                      >
                        <IconifyIcon icon="solar:add-circle-bold" style={{ fontSize: 13, opacity: 0.9 }} />
                        <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                          <span style={{ fontSize: 14, fontFamily: MONO_FONT_STACK, fontWeight: 800 }}>{formatNumber(summary.newC)}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>Added</span>
                        </div>
                      </div>
                      <div
                        className="d-inline-flex align-items-center"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDeltaView('deleted')}
                        style={{
                          gap: 8,
                          padding: '6px 14px',
                          borderRadius: 12,
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                          color: isDark ? '#e2e8f0' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <IconifyIcon icon="solar:minus-circle-bold" style={{ fontSize: 13, opacity: 0.9 }} />
                        <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                          <span style={{ fontSize: 14, fontFamily: MONO_FONT_STACK, fontWeight: 800 }}>{formatNumber(summary.deletedC)}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>Deleted</span>
                        </div>
                      </div>
                      <div className="ms-md-2 ps-md-3" style={{ borderLeft: isMobile ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}` }}>
                        <div className="d-flex align-items-baseline" style={{ gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? t.title : '#0f172a', fontFamily: MONO_FONT_STACK }}>
                            {formatNumber(fullRows.length)}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Analyzed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                    alignItems: 'stretch',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openDeltaView('regressed')}
                      onMouseEnter={() => setHoveredDriftCard('regressed')}
                      onMouseLeave={() => setHoveredDriftCard(null)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px',
                        flex: 1,
                        borderRadius: 24,
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(30, 41, 59, 0.4) 100%)'
                          : 'linear-gradient(135deg, #fff1f2 0%, #fffefe 100%)',
                        border: `1px solid ${hoveredDriftCard === 'regressed' ? '#f43f5e' : (isDark ? 'rgba(244, 63, 94, 0.2)' : '#fee2e2')}`,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: hoveredDriftCard === 'regressed' ? 'translateY(-2px)' : 'none',
                        overflow: 'hidden',
                        boxShadow: hoveredDriftCard === 'regressed' && isDark ? '0 8px 24px -8px rgba(244, 63, 94, 0.4)' : (isDark ? '0 4px 20px -8px rgba(0,0,0,0.5)' : 'none'),
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.4)' }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#f43f5e' : '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Critical Regression
                        </span>
                      </div>
                      <div className="d-flex align-items-end gap-3">
                        <span style={{ fontSize: 54, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1, fontFamily: MONO_FONT_STACK, letterSpacing: '-0.05em' }}>
                          {formatNumber(summary.regressedC)}
                        </span>
                        <div style={{ paddingBottom: 3, fontSize: 13, fontWeight: 600, color: t.muted, lineHeight: 1.2 }}>mounts lost protection</div>
                      </div>
                    </div>

                    {mountsAddedCount > 0 && (
                      <div
                        role="button"
                        onClick={() => openDeltaView('new')}
                        onMouseEnter={() => setHoveredNewRisk(true)}
                        onMouseLeave={() => setHoveredNewRisk(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderRadius: 16,
                          background: isDark
                            ? hoveredNewRisk ? 'rgba(251,113,133,0.12)' : 'rgba(255,255,255,0.02)'
                            : hoveredNewRisk ? '#fff1f2' : '#f8fafc',
                          border: `1px solid ${hoveredNewRisk ? '#f43f5e' : (isDark ? 'rgba(251,113,133,0.15)' : '#e2e8f0')}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          transform: hoveredNewRisk ? 'translateY(-2px)' : 'none',
                          boxShadow: hoveredNewRisk ? (isDark ? '0 4px 14px -4px rgba(244,63,94,0.4)' : '0 4px 14px -4px rgba(244,63,94,0.12)') : 'none',
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <IconifyIcon icon="solar:danger-triangle-bold" style={{ fontSize: 16, color: '#f43f5e' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#fda4af' : '#be123c' }}>New Risks</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MONO_FONT_STACK, color: isDark ? '#f8fafc' : '#0f172a' }}>{mountsAddedCount}</span>
                          <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 14, color: t.muted }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    {[
                      { key: 'improved', label: 'Improved', value: summary.improvedC, context: 'mounts gained protection', color: '#4ade80', icon: 'mdi:trending-up' },
                      { key: 'mixed', label: 'Mixed', value: reviewMountCount, context: 'lost and gained secure flags', color: '#fbbf24', icon: 'mdi:shield-alert-outline' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        role="button"
                        onClick={() => openDeltaView(item.key)}
                        onMouseEnter={() => setHoveredDriftCard(item.key)}
                        onMouseLeave={() => setHoveredDriftCard(null)}
                        style={{
                          padding: '18px 20px',
                          borderRadius: 20,
                          background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                          border: `1px solid ${hoveredDriftCard === item.key ? item.color : (isDark ? 'transparent' : '#e2e8f0')}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transform: hoveredDriftCard === item.key ? 'translateY(-2px)' : 'none',
                          boxShadow: hoveredDriftCard === item.key && isDark ? `0 8px 20px -6px ${item.color}60` : (isDark ? '0 4px 12px -4px rgba(0,0,0,0.3)' : 'none'),
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between text-uppercase" style={{ fontSize: 9, fontWeight: 800, color: t.muted, letterSpacing: '0.05em' }}>
                          {item.label}
                          <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                            <IconifyIcon icon={item.icon} style={{ fontSize: 16, color: item.color }} />
                          </div>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                          <span style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontFamily: MONO_FONT_STACK }}>{formatNumber(item.value)}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: t.muted }}>{item.context}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <div
            ref={tableSectionRef}
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${isDark ? t.borderStrong : '#cbd5e1'}`,
              borderRadius: 28,
              boxShadow: isDark ? 'none' : '0 10px 35px -15px rgba(15,23,42,0.14)',
              overflow: 'clip',
              transition: BH_THEME_TRANSITION,
            }}
          >
            <CardHeader
              className="py-3 px-4"
              style={{
                background: t.headerBg,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
              }}
            >
              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Search box */}
                <div className="d-flex align-items-center px-2" style={{ ...searchFieldShellStyle, flex: '1 1 200px', maxWidth: 340 }}>
                  <IconifyIcon icon="solar:magnifer-linear" style={{ fontSize: 14, color: searchFocused ? (isDark ? '#93c5fd' : '#3b82f6') : t.muted }} />
                  <Form.Control
                    placeholder="Search mount or filesystem"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="border-0 shadow-none bg-transparent"
                    style={{ color: t.title, fontSize: 12, height: 30 }}
                  />
                </div>

                {/* Status filter */}
                {viewMode === 'delta' && (
                  <div className="d-flex align-items-center gap-2">
                    <Button
                      variant="light"
                      onClick={() => setDeltaFilterOpen(!deltaFilterOpen)}
                      style={
                        deltaFilterOpen
                          ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#111827' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                          : { ...filterInactivePill, gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                      }
                    >
                      <IconifyIcon icon="mdi:filter-variant" style={{ fontSize: 14 }} />
                      <span>Status</span>
                    </Button>
                    {deltaFilterOpen && (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {['all', 'new', 'improved', 'regressed', 'mixed', 'deleted'].map((f) => (
                          <Button
                            key={f}
                            size="sm"
                            onClick={() => { setActiveFilter(f); setPage(0); }}
                            style={activeFilter === f ? FILTER_ACTIVE_ALL : filterInactivePill}
                            className="text-capitalize"
                          >
                            {f}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                      onClick={() => { setViewMode(m); setPage(0); }}
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

            <CardBody className="pt-2 pt-sm-3 px-2 px-sm-4 pb-3 pb-sm-4" style={{ background: isDark ? '#0f172a' : t.cardBg }}>
              <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <Table className="mb-0 align-middle" style={{ borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', tableLayout: 'fixed', width: '100%', minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th style={{ ...filesystemTableHeaderStyle(isDark), borderTopLeftRadius: 14, width: '25%' }}>Mount path</th>
                      <th style={{ ...filesystemTableHeaderStyle(isDark), width: '15%' }}>Filesystem</th>
                      {viewMode === 'delta' ? (
                        <>
                          <th className="text-center" style={{ ...filesystemTableHeaderStyle(isDark), width: '15%' }}>Status</th>
                          <th style={{ ...filesystemTableHeaderStyle(isDark), width: '20%' }}>Flag Changes</th>
                          <th style={{ ...filesystemTableHeaderStyle(isDark), width: '25%', borderRight: 'none', borderTopRightRadius: 14 }}>Remaining gaps</th>
                        </>
                      ) : (
                        <th style={{ ...filesystemTableHeaderStyle(isDark), width: '60%', borderRight: 'none', borderTopRightRadius: 14 }}>Missing flags</th>
                      )}
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: 'none' }}>
                    {pagedRows.length > 0 ? (
                      pagedRows.map((row, idx) => (
                        <tr
                          key={`${row.mountPath}-${idx}`}
                          style={{
                            background: 'transparent',
                            boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                            transition: tableRowTransition,
                          }}
                        >
                          <td className="fw-semibold font-monospace" style={{ background: 'transparent', color: t.title, padding: '14px 16px', fontSize: 13, verticalAlign: 'middle' }}>
                            <div className="text-truncate" title={row.mountPath}>{row.mountPath}</div>
                          </td>
                          <td className="font-monospace" style={{ background: 'transparent', color: t.muted, padding: '14px 16px', fontSize: 13, verticalAlign: 'middle' }}>{row.filesystem}</td>
                          {viewMode === 'delta' ? (
                            <>
                              <td className="text-center" style={{ background: 'transparent', padding: '14px 16px', verticalAlign: 'middle' }}>
                                <FilesystemStatusBadge status={row.status} isDark={isDark} />
                              </td>
                              <td style={{ background: 'transparent', padding: '14px 16px', verticalAlign: 'middle' }}>
                                <BuildChangeCell added={row.buildChangeAdded} removed={row.buildChangeRemoved} isDark={isDark} emptyColor={t.muted} />
                              </td>
                              <td style={{ background: 'transparent', padding: '14px 16px', verticalAlign: 'middle' }}>
                                <FilesystemFlagPills flags={row.remainingGaps} kind="gaps" isDark={isDark} t={t} emptyLabel="Clear" emptyIcon="solar:check-circle-linear" />
                              </td>
                            </>
                          ) : (
                            <td style={{ background: 'transparent', padding: '14px 16px', verticalAlign: 'middle' }}>
                              <FilesystemFlagPills flags={row.missingFlags} kind="gaps" isDark={isDark} t={t} emptyLabel="No missing flags" emptyIcon="solar:check-circle-linear" />
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={viewMode === 'delta' ? 5 : 3} className="text-center py-5 text-muted" style={{ background: 'transparent' }}>No data available</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {totalTable > PAGE_SIZE && (() => {
                // Build page number list: always show first, last, current ±1, with ellipsis gaps
                const buildPages = () => {
                  const pages = [];
                  const delta = 1;
                  const range = [];
                  for (let i = Math.max(0, safePage - delta); i <= Math.min(pageCount - 1, safePage + delta); i++) range.push(i);
                  let prev = -1;
                  const all = [0, ...range, pageCount - 1].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);
                  for (const p of all) {
                    if (prev !== -1 && p - prev > 1) pages.push('...');
                    pages.push(p);
                    prev = p;
                  }
                  return pages;
                };
                const pages = buildPages();
                const btnBase = {
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: UI_FONT_STACK,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  lineHeight: 1,
                  minWidth: 30,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                };
                return (
                  <div className="d-flex align-items-center justify-content-between px-3 py-3" style={{ borderTop: `1px solid ${tableRowSeparator}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                      Showing {showingFrom}–{showingTo} of {totalTable} items
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        disabled={safePage === 0}
                        onClick={() => { setPage(0); scrollTableIntoView(); }}
                        style={{
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                          cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                          opacity: safePage === 0 ? 0.45 : 1,
                          transition: 'all 140ms ease',
                        }}
                      >«</button>
                      <button
                        disabled={safePage === 0}
                        onClick={() => { setPage(p => p - 1); scrollTableIntoView(); }}
                        style={{
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                          opacity: safePage === 0 ? 0.45 : 1,
                          transition: 'all 140ms ease',
                        }}
                      >Prev</button>
                      <div className="d-flex align-items-center px-3" style={{ fontSize: 12, fontWeight: 800, color: t.title, background: isDark ? 'rgba(56,189,248,0.08)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}` }}>
                        {safePage + 1} / {pageCount}
                      </div>
                      <button
                        disabled={safePage >= pageCount - 1}
                        onClick={() => { setPage(p => p + 1); scrollTableIntoView(); }}
                        style={{
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          cursor: safePage >= pageCount - 1 ? 'not-allowed' : 'pointer',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                          opacity: safePage >= pageCount - 1 ? 0.45 : 1,
                          transition: 'all 140ms ease',
                        }}
                      >Next</button>
                      <button
                        disabled={safePage >= pageCount - 1}
                        onClick={() => { setPage(pageCount - 1); scrollTableIntoView(); }}
                        style={{
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                          cursor: safePage >= pageCount - 1 ? 'not-allowed' : 'pointer',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                          opacity: safePage >= pageCount - 1 ? 0.45 : 1,
                          transition: 'all 140ms ease',
                        }}
                      >»</button>
                    </div>
                  </div>
                );
              })()}
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
                transition: BH_THEME_TRANSITION,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-1">
                <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)', border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)'}` }}>
                  <IconifyIcon icon="solar:info-circle-linear" style={{ fontSize: 13, color: isDark ? '#38bdf8' : '#2563eb' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#93c5fd' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mount Flag Legend</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 24 }}>
                {POLICY_LEGEND.map((item) => (
                  <div key={item.title} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flex: '1 1 auto', minWidth: 180, maxWidth: 280 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? '#475569' : '#94a3b8', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.title, letterSpacing: '0.03em', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3 }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
