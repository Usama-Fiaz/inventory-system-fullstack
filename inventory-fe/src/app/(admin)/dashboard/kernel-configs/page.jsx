import { Col, Row, Card, CardBody, CardHeader, Table, Form, Offcanvas, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useEffect, useMemo, useRef, useState } from 'react';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useSelector } from 'react-redux';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';
import { selectReport, selectReportStatus, selectReportDiffs, selectReportTimestamp } from '@/store/slices/reportSlice';
import {
  BH_INTERACTIVE_TRANSITION,
  BH_THEME_TRANSITION,
  getBinaryHardeningTheme,
} from '../binary-hardening/binaryHardeningTheme';

const DEFAULT_REASON = 'Configuration setting for improved security';
const STITCH_TECH_TEXT = {
  fontFamily: '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#4b5563',
};

const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';
const FONT = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 15,
  lg: 18,
  xl: 26,
};

const STITCH_STATUS_BADGE_BASE = {
  borderRadius: 999,
  fontFamily: UI_FONT_STACK,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '4px 12px',
  lineHeight: 1,
};

/** Filter chips: soft rounded rect (not stadium pill), slimmer than search bar. */
const FILTER_PILL_BASE = {
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.2,
  minHeight: 28,
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

  const FILTER_ACTIVE_IMPROVED = FILTER_ACTIVE_ALL;
  const FILTER_ACTIVE_REGRESSED = FILTER_ACTIVE_ALL;
  const FILTER_ACTIVE_GREEN = FILTER_ACTIVE_ALL;
  const FILTER_ACTIVE_RED = FILTER_ACTIVE_ALL;
  const FILTER_ACTIVE_AMBER = FILTER_ACTIVE_ALL;

const KERNEL_FULL_PAGE_SIZE = 8;
const KERNEL_DELTA_PAGE_SIZE = 8;

// --- Polished Color Palette ---
const PALETTE = {
  blue: {
    bg: (isDark) => isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
    border: (isDark) => isDark ? 'rgba(96,165,250,0.22)' : '#dbeafe',
    text: (isDark) => isDark ? '#93c5fd' : '#1d4ed8',
  },
  emerald: {
    bg: (isDark) => isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
    border: (isDark) => isDark ? 'rgba(52,211,153,0.22)' : '#d1fae5',
    text: (isDark) => isDark ? '#6ee7b7' : '#047857',
  },
  rose: {
    bg: (isDark) => isDark ? 'rgba(244,63,94,0.12)' : '#fff1f2',
    border: (isDark) => isDark ? 'rgba(251,113,133,0.22)' : '#ffe4e6',
    text: (isDark) => isDark ? '#fda4af' : '#be123c',
  },
  slate: {
    bg: (isDark) => isDark ? 'rgba(148,163,184,0.12)' : '#f8fafc',
    border: (isDark) => isDark ? 'rgba(148,163,184,0.22)' : '#e2e8f0',
    text: (isDark) => isDark ? '#94a3b8' : '#475569',
  }
};

function normalizeDiffEntry(item) {
  if (typeof item === 'string') return { itemName: item, reason: DEFAULT_REASON };
  return {
    itemName: item?.name || item?.config || item?.module || 'N/A',
    reason: item?.description || item?.reason || DEFAULT_REASON,
  };
}

function normalizeKernelStateLabel(value, fallback = 'UNKNOWN') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  if (upper === 'M' || upper === 'MODULE' || upper === 'LOADABLE') return 'LOADABLE';
  if (upper.includes('ENABLE')) return 'ENABLED';
  if (upper.includes('DISABLE')) return 'DISABLED';
  if (upper.includes('LOAD')) return 'LOADABLE';
  if (upper.includes('REVIEW')) return 'REVIEW';
  return upper;
}

function parseModuleSigned(value) {
  if (typeof value === 'boolean') return value;
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function mapToNamedEntries(bucket, nameKey) {
  if (!bucket) return [];
  if (Array.isArray(bucket)) {
    return bucket.map((item) => (typeof item === 'string' ? { [nameKey]: item } : item));
  }
  if (typeof bucket === 'object') {
    return Object.entries(bucket).map(([name, details]) => ({
      [nameKey]: name,
      ...(details && typeof details === 'object' ? details : {}),
    }));
  }
  return [];
}

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

const tableHeaderStyle = (isDark) => ({
  background: isDark ? 'rgba(15,23,42,0.92)' : '#f3f7fb',
  borderBottom: `1px solid ${isDark ? '#243244' : '#dbe5ef'}`,
  borderRight: `1px solid ${isDark ? '#243244' : '#dbe5ef'}`,
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

function pickPreviewValue(item, keys) {
  if (!item || typeof item !== 'object') return '';
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function classifyModulePreviewState(raw) {
  const value = String(raw || '').trim().toUpperCase();
  if (!value) return null;
  if (value.includes('INACTIVE') || value.includes('DISABLE') || value.includes('UNLOAD')) return 'inactive';
  if (value.includes('ACTIVE') || value.includes('ENABLE') || value.includes('LOAD')) return 'active';
  return null;
}

function normalizeConfigCompliance(value, fallback = 'review') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw.includes('insecure')) return 'insecure';
  if (raw.includes('secure')) return 'secure';
  if (raw.includes('review') || raw.includes('unknown')) return 'review';
  return fallback;
}

function configComplianceMeta(value, isDark) {
  const compliance = normalizeConfigCompliance(value);
  if (compliance === 'secure') {
    return {
      key: 'secure',
      label: 'Secure',
      tone: 'secure',
      icon: 'solar:check-circle-bold',
      color: isDark ? '#4ade80' : '#16a34a',
    };
  }
  if (compliance === 'insecure') {
    return {
      key: 'insecure',
      label: 'Insecure',
      tone: 'insecure',
      icon: 'solar:danger-triangle-bold',
      color: isDark ? '#f87171' : '#dc2626',
    };
  }
  return {
    key: 'review',
    label: 'Review',
    tone: 'review',
    icon: null,
    color: isDark ? '#94a3b8' : '#64748b',
  };
}

function kernelConfigStateMeta(value, isDark) {
  const state = normalizeKernelStateLabel(value, 'UNKNOWN');
  if (state === 'ENABLED') {
    return {
      key: 'enabled',
      label: 'Enabled',
      color: isDark ? '#4ade80' : '#22c55e',
      border: isDark ? '#14532d' : '#86efac',
    };
  }
  if (state === 'LOADABLE') {
    return {
      key: 'loadable',
      label: 'Loadable',
      color: isDark ? '#fbbf24' : '#f59e0b',
      border: isDark ? '#92400e' : '#fcd34d',
    };
  }
  if (state === 'DISABLED') {
    return {
      key: 'disabled',
      label: 'Disabled',
      color: isDark ? '#64748b' : '#94a3b8',
      border: isDark ? '#475569' : '#cbd5e1',
    };
  }
  return {
    key: 'unknown',
    label: state,
    color: isDark ? '#64748b' : '#94a3b8',
    border: isDark ? '#475569' : '#cbd5e1',
  };
}

function kernelDeltaStatusPillStyle(status, isDark) {
  const key = String(status ?? 'regressed').toLowerCase();
  const p = key === 'improved'
    ? {
        bg: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)',
        text: isDark ? '#6ee7b7' : '#059669',
      }
    : key === 'review'
      ? {
          bg: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(180, 83, 9, 0.06)',
          text: isDark ? '#fcd34d' : '#b45309',
        }
      : key === 'new'
        ? {
            bg: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(29, 78, 216, 0.06)',
            text: isDark ? '#93c5fd' : '#1d4ed8',
          }
        : key === 'deleted'
          ? {
              bg: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.06)',
              text: isDark ? '#cbd5e1' : '#475569',
            }
          : {
              bg: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(185, 28, 28, 0.06)',
              text: isDark ? '#f87171' : '#b91c1c',
            };
  return {
    ...STITCH_STATUS_BADGE_BASE,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: p.text,
    background: p.bg,
    border: '1px solid transparent',
    minWidth: 0,
    whiteSpace: 'nowrap',
    transition: BH_THEME_TRANSITION,
  };
}

function formatKernelDeltaStatusLabel(status) {
  const key = String(status ?? 'regressed').toLowerCase();
  if (key === 'new') return 'NEW';
  if (key === 'deleted') return 'REMOVED';
  if (key === 'review') return 'REVIEW';
  if (key === 'improved') return 'IMPROVED';
  return 'REGRESSED';
}


function getPaginationCells(currentPage, totalPages) {
  if (totalPages <= 0) return [];
  const pages = [];
  const delta = 1;
  const range = [];
  for (let i = Math.max(0, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) range.push(i);
  let prev = -1;
  const all = [0, ...range, totalPages - 1].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);
  for (const p of all) {
    if (prev !== -1 && p - prev > 1) pages.push('...');
    pages.push(p);
    prev = p;
  }
  return pages;
}

const btnBaseStyle = {
  border: 'none',
  background: 'transparent',
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: '"Nunito Sans", "Segoe UI", Roboto, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  lineHeight: 1,
  minWidth: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function KernelConfigsPage() {
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const { width: vw } = useViewPort();
  const isMobile = vw < 768;
  const isCompactTable = vw < 992;
  const isVeryNarrow = vw < 480;
  const isHeroCompact = vw < 1440;
  const isHeroMetaStacked = vw < 1520;
  const t = getBinaryHardeningTheme(isDark);

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

  const panelGradient = isDark
    ? '#0f172a'
    : '#ffffff';
  const tableRowSeparator = isDark ? 'rgba(148,163,184,0.12)' : '#ccdbe8';
  const tableRowTransition = `${BH_THEME_TRANSITION}, background-color 180ms ease, box-shadow 180ms ease`;
  const report = useSelector(selectReport);
  const reportDiffs = useSelector(selectReportDiffs);
  const status = useSelector(selectReportStatus);
  const reportTimestamp = useSelector(selectReportTimestamp);
  const loading = status === 'idle' || status === 'loading';
  const [activeFilter, setActiveFilter] = useState('all');
  const [moduleDeltaFilter, setModuleDeltaFilter] = useState('all');
  const [hoveredKernelRowKey, setHoveredKernelRowKey] = useState(null);
  const [deltaFilterOpen, setDeltaFilterOpen] = useState(false);
  const [fullFilterOpen, setFullFilterOpen] = useState(false);
  const [fullComplianceFilter, setFullComplianceFilter] = useState('all');
  const [fullModuleIntegrityFilterOpen, setFullModuleIntegrityFilterOpen] = useState(false);
  const [fullModuleStateFilterOpen, setFullModuleStateFilterOpen] = useState(false);
  const [fullModuleIntegrityFilter, setFullModuleIntegrityFilter] = useState('all');
  const [fullModuleStateFilter, setFullModuleStateFilter] = useState('all');
  const [fullPage, setFullPage] = useState(0);
  const [deltaPage, setDeltaPage] = useState(0);
  const [viewMode, setViewMode] = useState('delta');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedDeltaRow, setSelectedDeltaRow] = useState(null);
  const [baselineDrawerOpen, setBaselineDrawerOpen] = useState(false);
  const [hoveredCategoryCard, setHoveredCategoryCard] = useState(null);
  const [deltaType, setDeltaType] = useState('config');
  const kernelTableSectionRef = useRef(null);
  const scrollTableIntoView = () => {
    setTimeout(() => kernelTableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const {
    kernelConfigSource,
    kernelConfigSummary,
    kernelConfigDiffs,
    moduleAddedList,
    moduleRemovedList,
    improvedModuleList,
    regressedModuleList,
    reviewModuleList,
    unresolvedModuleList,
    configAddedList,
    configRemovedList,
    improvedConfigList,
    regressedConfigList,
    reviewConfigList,
    unresolvedConfigList,
  } = useMemo(() => {
    const kernelConfigSourceValue = report?.system_hardening?.kernel_config ?? {};
    const kernelConfigSummaryValue = kernelConfigSourceValue?.summary ?? {};
    const kernelConfigDiffsValue = reportDiffs?.kernel_config_diffs ?? reportDiffs?.kernel_config ?? {};
    const kernelModuleDiffsValue =
      reportDiffs?.kernel_modules ?? reportDiffs?.kernel_module_diffs ?? reportDiffs?.kernel_modules_diffs ?? reportDiffs?.kernel_module ?? {};

    return {
      kernelConfigSource: kernelConfigSourceValue,
      kernelConfigSummary: kernelConfigSummaryValue,
      kernelConfigDiffs: kernelConfigDiffsValue,
      moduleAddedList: mapToNamedEntries(kernelModuleDiffsValue?.added, 'module'),
      moduleRemovedList: mapToNamedEntries(kernelModuleDiffsValue?.removed ?? kernelModuleDiffsValue?.deleted, 'module'),
      improvedModuleList: mapToNamedEntries(kernelModuleDiffsValue?.improved, 'module'),
      regressedModuleList: mapToNamedEntries(kernelModuleDiffsValue?.regressed, 'module'),
      reviewModuleList: mapToNamedEntries(kernelModuleDiffsValue?.review, 'module'),
      unresolvedModuleList: mapToNamedEntries(kernelModuleDiffsValue?.unresolved, 'module'),
      configAddedList: mapToNamedEntries(kernelConfigDiffsValue?.added, 'config'),
      configRemovedList: mapToNamedEntries(kernelConfigDiffsValue?.removed ?? kernelConfigDiffsValue?.deleted, 'config'),
      improvedConfigList: mapToNamedEntries(kernelConfigDiffsValue?.improved, 'config'),
      regressedConfigList: mapToNamedEntries(kernelConfigDiffsValue?.regressed, 'config'),
      reviewConfigList: mapToNamedEntries(kernelConfigDiffsValue?.review, 'config'),
      unresolvedConfigList: mapToNamedEntries(kernelConfigDiffsValue?.unresolved, 'config'),
    };
  }, [report?.system_hardening?.kernel_config, reportDiffs]);

  const regressedModulesNeedToEnableList = regressedModuleList.filter((item) => item?.loaded === true);

  const baselineId =
    kernelConfigDiffs?.last_build_id ?? reportDiffs?.last_build_id ?? 'v6.4-stable';
  const baselineTime =
    kernelConfigDiffs?.last_build_time ?? reportDiffs?.last_build_time ?? null;
  const targetId = report?.build_id ?? 'v6.5-rc1';
  const targetTime = report?.timestamp ?? reportTimestamp ?? null;
  const THEME_TRANSITION = BH_THEME_TRANSITION;

  /** Inactive pills: light visible border (Bootstrap `border-0` on Button was stripping this). */
  const filterInactivePill = useMemo(
    () => ({
      ...FILTER_PILL_BASE,
      background: isDark ? 'rgba(30,41,59,0.9)' : '#ffffff',
      border: isDark ? '1px solid rgba(148,163,184,0.26)' : '1px solid #d1d5db',
      color: isDark ? t.title : '#1e293b',
      boxShadow: 'none',
    }),
    [isDark, t.title],
  );

  const searchFieldShellStyle = useMemo(
    () => ({
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
      flex: isMobile ? '1 1 100%' : '1 1 220px',
      maxWidth: isMobile ? '100%' : 320,
      minWidth: isMobile ? '100%' : 180,
      boxShadow: searchFocused
        ? isDark
          ? '0 0 0 3px rgba(96, 165, 250, 0.22)'
          : '0 0 0 3px rgba(59, 130, 246, 0.18)'
        : isDark
          ? 'none'
          : '0 1px 2px rgba(15, 23, 42, 0.05)',
      transition: BH_INTERACTIVE_TRANSITION,
    }),
    [isDark, isMobile, searchFocused, t.borderStrong, t.cardBg],
  );

  const configDeltaRows = useMemo(() => {
    const mapConfigDeltaRow = (item, status) => {
      const n = normalizeDiffEntry(item);
      const isNew = status === 'new';
      const isDeleted = status === 'deleted';
      const baselineState = normalizeKernelStateLabel(
        item?.prevState ?? item?.previous_state ?? item?.previousState ?? (isDeleted ? item?.State ?? item?.state : null),
        isNew ? '—' : isDeleted ? 'UNKNOWN' : 'UNKNOWN',
      );
      const targetState = normalizeKernelStateLabel(
        item?.currState ?? item?.current_state ?? item?.currentState ?? (isNew ? item?.State ?? item?.state : null),
        isDeleted ? 'REMOVED' : 'UNKNOWN',
      );
      return {
        ...n,
        status,
        changeKind: status,
        baseline: isNew ? '—' : baselineState,
        target: isDeleted ? 'REMOVED' : targetState,
        targetLabel: isDeleted ? 'REMOVED' : targetState,
        baselineState: isNew ? null : baselineState,
        targetState: isDeleted ? null : targetState,
        currentState: isDeleted ? baselineState : targetState,
        expectedState: normalizeKernelStateLabel(
          item?.ExpectedState ?? item?.expectedState ?? item?.expected_state,
          'UNKNOWN',
        ),
        compliance: normalizeConfigCompliance(
          item?.currCompliance ?? item?.Compliance ?? item?.compliance,
        ),
        deltaType: 'config',
      };
    };

    return [
      ...improvedConfigList.map((item) => mapConfigDeltaRow(item, 'improved')),
      ...regressedConfigList.map((item) => mapConfigDeltaRow(item, 'regressed')),
      ...reviewConfigList.map((item) => mapConfigDeltaRow(item, 'review')),
      ...configAddedList.map((item) => mapConfigDeltaRow(item, 'new')),
      ...configRemovedList.map((item) => mapConfigDeltaRow(item, 'deleted')),
    ];
  }, [improvedConfigList, regressedConfigList, reviewConfigList, configAddedList, configRemovedList]);

  const moduleDeltaRows = useMemo(() => {
    const improved = improvedModuleList.map((item) => {
      const n = normalizeDiffEntry(item);
      return {
        ...n,
        status: 'improved',
        changeKind: 'improved',
        baseline: 'UNSIGNED',
        target: 'SIGNED',
        targetLabel: 'SIGNED',
        signed: item?.signed,
        loaded: item?.loaded,
        deltaType: 'module',
      };
    });

    const regressed = regressedModuleList.map((item) => {
      const n = normalizeDiffEntry(item);
      return {
        ...n,
        status: 'regressed',
        changeKind: 'regressed',
        baseline: 'SIGNED',
        target: 'UNSIGNED',
        targetLabel: 'UNSIGNED',
        signed: item?.signed,
        loaded: item?.loaded,
        deltaType: 'module',
      };
    });

    const review = reviewModuleList.map((item) => {
      const n = normalizeDiffEntry(item);
      const loaded = Boolean(item?.loaded);
      return {
        ...n,
        status: 'review',
        changeKind: 'review',
        baseline: loaded ? 'NOT LOADED' : 'LOADED',
        target: loaded ? 'LOADED' : 'NOT LOADED',
        targetLabel: loaded ? 'LOADED' : 'NOT LOADED',
        signed: item?.signed,
        loaded,
        deltaType: 'module',
      };
    });

    const added = moduleAddedList.map((item) => {
      const n = normalizeDiffEntry(item);
      return {
        ...n,
        status: 'new',
        changeKind: 'new',
        baseline: '-',
        target: '-',
        targetLabel: '-',
        signed: item?.signed,
        loaded: item?.loaded,
        deltaType: 'module',
      };
    });

    const removed = moduleRemovedList.map((item) => {
      const n = normalizeDiffEntry(item);
      return {
        ...n,
        status: 'deleted',
        changeKind: 'deleted',
        baseline: '-',
        target: '-',
        targetLabel: '-',
        signed: null,
        loaded: null,
        deltaType: 'module',
      };
    });

    return [...improved, ...regressed, ...review, ...added, ...removed];
  }, [
    improvedModuleList,
    regressedModuleList,
    reviewModuleList,
    moduleAddedList,
    moduleRemovedList,
  ]);

  const activeDeltaRows = deltaType === 'module' ? moduleDeltaRows : configDeltaRows;

  const deltaFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeDeltaFilter = deltaType === 'module' ? moduleDeltaFilter : activeFilter;
    return activeDeltaRows.filter((row) => {
      const statusMatches =
        activeDeltaFilter === 'all' ||
        (activeDeltaFilter === 'new_risk'
          ? deltaType === 'config'
            ? (row.changeKind ?? row.status) === 'new' && row.compliance === 'insecure'
            : (row.changeKind ?? row.status) === 'new' && (row.signed === false || row.signed === 'false' || row.signed == null)
          : (deltaType === 'module' ? row.changeKind === activeDeltaFilter : (row.changeKind ?? row.status) === activeDeltaFilter));
      const queryMatches =
        !q ||
        row.itemName.toLowerCase().includes(q) ||
        String(row.reason || '').toLowerCase().includes(q) ||
        (row.targetLabel && row.targetLabel.toLowerCase().includes(q)) ||
        String(row.currentState || '').toLowerCase().includes(q) ||
        String(row.compliance || '').toLowerCase().includes(q);
      return statusMatches && queryMatches;
    });
  }, [activeDeltaRows, activeFilter, deltaType, moduleDeltaFilter, searchQuery]);

  useEffect(() => {
    const maxDeltaPage = Math.max(0, Math.ceil(deltaFilteredRows.length / KERNEL_DELTA_PAGE_SIZE) - 1);
    if (deltaPage > maxDeltaPage) setDeltaPage(maxDeltaPage);
  }, [deltaFilteredRows.length, deltaPage]);

  useEffect(() => {
    setDeltaPage(0);
  }, [viewMode, deltaType, activeFilter, moduleDeltaFilter, searchQuery]);

  const deltaPageRows = useMemo(() => {
    const maxDeltaPage = Math.max(0, Math.ceil(deltaFilteredRows.length / KERNEL_DELTA_PAGE_SIZE) - 1);
    const idx = Math.min(deltaPage, maxDeltaPage);
    const start = idx * KERNEL_DELTA_PAGE_SIZE;
    return deltaFilteredRows.slice(start, start + KERNEL_DELTA_PAGE_SIZE);
  }, [deltaFilteredRows, deltaPage]);

  const deltaTotalPages = Math.max(1, Math.ceil(deltaFilteredRows.length / KERNEL_DELTA_PAGE_SIZE));

  const fullRows = useMemo(() => {
    if (!kernelConfigSource || typeof kernelConfigSource !== 'object' || Array.isArray(kernelConfigSource)) return [];
    return Object.entries(kernelConfigSource)
      .filter(([configName]) => String(configName).toLowerCase() !== 'summary')
      .map(([configName, configMeta]) => ({
        configName,
        reason: configMeta?.Description ?? configMeta?.description ?? DEFAULT_REASON,
        mode: normalizeConfigCompliance(configMeta?.Compliance ?? configMeta?.compliance),
        currentState: normalizeKernelStateLabel(configMeta?.State ?? configMeta?.state, 'UNKNOWN'),
        currentLabel: normalizeKernelStateLabel(configMeta?.State ?? configMeta?.state, 'UNKNOWN'),
        recommendedState: normalizeKernelStateLabel(
          configMeta?.ExpectedState ?? configMeta?.expectedState ?? configMeta?.expected_state,
          'UNKNOWN',
        ),
        recommendedLabel: normalizeKernelStateLabel(
          configMeta?.ExpectedState ?? configMeta?.expectedState ?? configMeta?.expected_state,
          'UNKNOWN',
        ),
        compliance: normalizeConfigCompliance(configMeta?.Compliance ?? configMeta?.compliance),
      }));
  }, [kernelConfigSource]);

  const unresolvedConfigRows = useMemo(() => {
    return unresolvedConfigList.map((item) => {
      const configName = item?.config ?? item?.name ?? item?.configName ?? 'N/A';
      const currentState = normalizeKernelStateLabel(
        item?.currState ?? item?.current_state ?? item?.currentState ?? item?.State ?? item?.state,
        'UNKNOWN',
      );
      const recommendedState = normalizeKernelStateLabel(
        item?.ExpectedState ?? item?.expectedState ?? item?.expected_state,
        'UNKNOWN',
      );

      return {
        configName,
        reason: item?.description ?? item?.reason ?? DEFAULT_REASON,
        mode: normalizeConfigCompliance(item?.Compliance ?? item?.compliance, 'insecure'),
        currentState,
        currentLabel: currentState,
        recommendedState,
        recommendedLabel: recommendedState,
        compliance: normalizeConfigCompliance(item?.Compliance ?? item?.compliance, 'insecure'),
      };
    });
  }, [unresolvedConfigList]);

  const totalKernelConfigCount = useMemo(() => {
    const summaryCount = Number(kernelConfigSummary?.total_analyzed);
    if (Number.isFinite(summaryCount) && summaryCount > 0) return summaryCount;
    return fullRows.length || 0;
  }, [kernelConfigSummary?.total_analyzed, fullRows.length]);

  const fullFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const showUnresolvedConfigRows = fullComplianceFilter === 'gaps';
    const sourceRows = showUnresolvedConfigRows ? unresolvedConfigRows : fullRows;
    return sourceRows.filter((row) => {
      const complianceOk =
        showUnresolvedConfigRows ||
        fullComplianceFilter === 'all' ||
        row.compliance === fullComplianceFilter;
      const queryMatches =
        !q ||
        row.configName.toLowerCase().includes(q) ||
        row.reason.toLowerCase().includes(q) ||
        row.currentLabel.toLowerCase().includes(q) ||
        row.recommendedLabel.toLowerCase().includes(q) ||
        row.compliance.toLowerCase().includes(q);
      return complianceOk && queryMatches;
    });
  }, [fullRows, fullComplianceFilter, searchQuery, unresolvedConfigRows]);

  const fullModuleRows = useMemo(() => {
    const modules = report?.system_hardening?.kernel_modules;
    if (!modules || typeof modules !== 'object' || Array.isArray(modules)) return [];
    return Object.entries(modules)
      .filter(([moduleName]) => String(moduleName).toLowerCase() !== 'summary')
      .map(([moduleName, moduleEntry]) => {
        const signed = parseModuleSigned(moduleEntry?.signed);
        const loaded = Boolean(moduleEntry?.loaded);
        return {
          moduleName,
          loaded,
          signed,
          currentStateLabel: loaded ? 'Loaded' : 'Inactive',
          integrityLabel: String(signed),
        };
      });
  }, [report?.system_hardening?.kernel_modules]);

  const unresolvedModuleRows = useMemo(() => {
    return unresolvedModuleList.map((item) => {
      const moduleName = item?.module ?? item?.name ?? item?.moduleName ?? 'N/A';
      const previewState = classifyModulePreviewState(
        pickPreviewValue(item, ['status', 'state', 'runtime_status', 'current_state', 'current', 'target_state', 'target', 'reason']),
      );
      const loaded = typeof item?.loaded === 'boolean' ? item.loaded : previewState !== 'inactive';
      const signed = typeof item?.signed === 'boolean'
        ? item.signed
        : !String(
            pickPreviewValue(item, ['integrity', 'signature', 'status', 'state', 'reason']) || '',
          ).toLowerCase().includes('unsigned');

      return {
        moduleName,
        loaded,
        signed,
        currentStateLabel: loaded ? 'Loaded' : 'Inactive',
        integrityLabel: signed ? 'true' : 'false',
      };
    });
  }, [unresolvedModuleList]);

  const fullModuleFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const showUnresolvedModuleRows =
      fullModuleIntegrityFilter === 'unsigned' && fullModuleStateFilter === 'loaded';
    const sourceRows = showUnresolvedModuleRows ? unresolvedModuleRows : fullModuleRows;
    return sourceRows.filter((row) => {
      const integrityMatches =
        showUnresolvedModuleRows ||
        fullModuleIntegrityFilter === 'all' ||
        (fullModuleIntegrityFilter === 'signed' && row.signed) ||
        (fullModuleIntegrityFilter === 'unsigned' && !row.signed);
      const stateMatches =
        showUnresolvedModuleRows ||
        fullModuleStateFilter === 'all' ||
        (fullModuleStateFilter === 'loaded' && row.loaded) ||
        (fullModuleStateFilter === 'inactive' && !row.loaded);
      const queryMatches =
        !q ||
        row.moduleName.toLowerCase().includes(q) ||
        row.currentStateLabel.toLowerCase().includes(q) ||
        row.integrityLabel.toLowerCase().includes(q);
      return integrityMatches && stateMatches && queryMatches;
    });
  }, [fullModuleRows, fullModuleIntegrityFilter, fullModuleStateFilter, searchQuery, unresolvedModuleRows]);

  const activeFullFilteredRows = useMemo(
    () => (deltaType === 'module' ? fullModuleFilteredRows : fullFilteredRows),
    [deltaType, fullFilteredRows, fullModuleFilteredRows],
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(activeFullFilteredRows.length / KERNEL_FULL_PAGE_SIZE) - 1);
    if (fullPage > maxPage) setFullPage(maxPage);
  }, [activeFullFilteredRows.length, fullPage]);

  const fullReportPageRows = useMemo(() => {
    const maxPage = Math.max(0, Math.ceil(activeFullFilteredRows.length / KERNEL_FULL_PAGE_SIZE) - 1);
    const idx = Math.min(fullPage, maxPage);
    const start = idx * KERNEL_FULL_PAGE_SIZE;
    return activeFullFilteredRows.slice(start, start + KERNEL_FULL_PAGE_SIZE);
  }, [activeFullFilteredRows, fullPage]);

  const fullReportTotalPages = Math.max(1, Math.ceil(activeFullFilteredRows.length / KERNEL_FULL_PAGE_SIZE));

  const configStats = useMemo(() => {
    let improvedCount = 0;
    let regressedCount = 0;
    let improvedNewlyEnabled = 0;
    let improvedNewlyDisabled = 0;
    let regressedNewlyEnabled = 0;

    for (const row of configDeltaRows) {
      if (row.status === 'improved') {
        improvedCount += 1;
        if (row.targetState === 'ENABLED') improvedNewlyEnabled += 1;
        if (row.targetState === 'DISABLED') improvedNewlyDisabled += 1;
      }
      if (row.status === 'regressed') {
        regressedCount += 1;
        if (row.targetState === 'ENABLED') regressedNewlyEnabled += 1;
      }
    }

    let regressedHardeningRemoved = 0;
    let regressedRiskyEnabled = 0;
    for (const item of regressedConfigList) {
      const prevState = normalizeKernelStateLabel(
        item?.prevState ?? item?.previous_state ?? item?.previousState ?? item?.State ?? item?.state,
        '',
      );
      const prevCompliance = normalizeConfigCompliance(
        item?.prevCompliance ?? item?.previous_compliance ?? item?.previousCompliance ?? item?.prev_compliance ?? item?.Compliance ?? item?.compliance,
      );
      if (prevState === 'ENABLED' && prevCompliance === 'secure') regressedHardeningRemoved += 1;
      if (prevState === 'DISABLED' && prevCompliance === 'secure') regressedRiskyEnabled += 1;
    }

    const newRisksCount = configAddedList.filter((item) =>
      normalizeConfigCompliance(
        item?.currCompliance ?? item?.Compliance ?? item?.compliance,
      ) === 'insecure',
    ).length;

    return {
      improvedCount,
      regressedCount,
      improvedNewlyEnabled,
      improvedNewlyDisabled,
      regressedNewlyEnabled,
      regressedHardeningRemoved,
      regressedRiskyEnabled,
      reviewCount: reviewConfigList.length,
      newRisksCount,
    };
  }, [configDeltaRows, regressedConfigList, reviewConfigList.length, configAddedList]);

  const moduleStats = useMemo(() => {
    let improvedCount = 0;
    let regressedCount = 0;
    for (const row of moduleDeltaRows) {
      if (row.status === 'improved') improvedCount += 1;
      if (row.status === 'regressed') regressedCount += 1;
    }

    const newRisksCount = moduleAddedList.filter((item) => item?.signed === false || item?.signed === 'false' || item?.signed == null).length;

    return {
      improvedCount,
      regressedCount,
      improvedDisabledCount: improvedModuleList.filter((item) => item?.loaded === false).length,
      regressedNeedEnableCount: regressedModulesNeedToEnableList.length,
      reviewCount: reviewModuleList.length,
      installedCount: moduleAddedList.length,
      deletedCount: moduleRemovedList.length,
      newRisksCount,
    };
  }, [improvedModuleList, moduleAddedList, moduleDeltaRows, moduleRemovedList.length, regressedModulesNeedToEnableList.length, reviewModuleList.length]);

  const kernelModulesSummary = report?.system_hardening?.kernel_modules?.summary ?? {};
  const totalInstalledModules = Number.isFinite(Number(kernelModulesSummary?.total_installed))
    ? Number(kernelModulesSummary?.total_installed)
    : fullModuleRows.length;
  const unchangedConfigCount = Math.max(0, fullRows.length - configStats.regressedCount);
  const unchangedModuleCount = Math.max(0, totalInstalledModules - moduleStats.improvedCount - moduleStats.regressedCount);
  const configAddedCount = configAddedList.length;
  const configDeletedCount = configRemovedList.length;
  const securityDriftImprovedTotal = configStats.improvedCount + moduleStats.improvedCount;
  const securityDriftRegressedTotal = configStats.regressedCount + moduleStats.regressedCount;
  const securityDriftUnchangedTotal = unchangedConfigCount + unchangedModuleCount;
  const securityDriftTotal =
    securityDriftImprovedTotal + securityDriftRegressedTotal + securityDriftUnchangedTotal;
  const netSurfaceDeltaPct = securityDriftTotal > 0
    ? ((securityDriftRegressedTotal - securityDriftImprovedTotal) / securityDriftTotal) * 100
    : 0;
  const configModuleSig = useMemo(() => {
    const config = report?.system_hardening?.kernel_config || {};
    const sigConfig = config['MODULE_SIG_FORCE'];
    return sigConfig?.State === 'enabled' || sigConfig?.state === 'enabled';
  }, [report?.system_hardening?.kernel_config]);
  const signedModulesStats = useMemo(() => {
    const modules = report?.system_hardening?.kernel_modules || {};
    const entries = Object.values(modules);
    const total = entries.length;
    const signed = entries.filter((v) => v && parseModuleSigned(v.signed)).length;
    return { total, signed };
  }, [report?.system_hardening?.kernel_modules]);
  const enabledHardeningConfigs = useMemo(
    () => {
      const summaryEnabled = Number(kernelConfigSummary?.total_enabled);
      if (Number.isFinite(summaryEnabled) && summaryEnabled >= 0) return summaryEnabled;
      return fullRows.filter((row) => row.currentState === 'ENABLED').length;
    },
    [kernelConfigSummary?.total_enabled, fullRows],
  );
  const totalHardeningBaseline = totalKernelConfigCount || 1;
  const totalExposureUnits = enabledHardeningConfigs + totalInstalledModules;
  const staticExposure = enabledHardeningConfigs;
  const activeExposure = totalInstalledModules;
  const securityPostureRatio = enabledHardeningConfigs / totalHardeningBaseline;
  const postureRating =
    securityPostureRatio >= 0.85 ? 'Strong'
      : securityPostureRatio >= 0.65 ? 'Medium'
        : securityPostureRatio >= 0.4 ? 'Fair'
          : 'Poor';
  const postureColor =
    postureRating === 'Strong' ? '#10b981'
      : postureRating === 'Medium' ? '#f59e0b'
        : postureRating === 'Fair' ? '#ef4444'
          : '#be123c';
  const posturePct = Number.isFinite(securityPostureRatio) ? Math.max(0, Math.min(1, securityPostureRatio)) : 0;
  const safeNetSurfaceDeltaPct = Number.isFinite(netSurfaceDeltaPct) ? netSurfaceDeltaPct : 0;
  const allDriftItems = useMemo(() => [
    {
      key: 'improved',
      sectionKey: 'configs',
      label: 'Improved',
      contextLabel: 'configs hardened',
      value: configStats.improvedCount,
      accent: isDark ? '#4ade80' : '#16a34a',
      trendIcon: 'mdi:trending-up',
      trendColor: isDark ? '#4ade80' : '#16a34a',
    },
    {
      key: 'regressed',
      sectionKey: 'configs',
      label: 'Regressed',
      contextLabel: 'configs weakened',
      value: configStats.regressedCount,
      accent: isDark ? '#f87171' : '#dc2626',
      trendIcon: 'mdi:trending-down',
      trendColor: isDark ? '#f87171' : '#dc2626',
    },
    {
      key: 'review',
      sectionKey: 'configs',
      label: 'Need review',
      contextLabel: 'changed state',
      value: configStats.reviewCount,
      accent: isDark ? '#fbbf24' : '#d97706',
      trendIcon: 'mdi:alert-outline',
      trendColor: isDark ? '#fbbf24' : '#d97706',
    },
    {
      key: 'improved',
      sectionKey: 'modules',
      label: 'Improved',
      contextLabel: 'now signed',
      value: moduleStats.improvedCount,
      accent: isDark ? '#4ade80' : '#16a34a',
      trendIcon: 'mdi:trending-up',
      trendColor: isDark ? '#4ade80' : '#16a34a',
    },
    {
      key: 'regressed',
      sectionKey: 'modules',
      label: 'Regressed',
      contextLabel: 'lost signature',
      value: moduleStats.regressedCount,
      accent: isDark ? '#f87171' : '#dc2626',
      trendIcon: 'mdi:trending-down',
      trendColor: isDark ? '#f87171' : '#dc2626',
    },
    {
      key: 'review',
      sectionKey: 'modules',
      label: 'Need review',
      contextLabel: 'changed state',
      value: moduleStats.reviewCount,
      accent: isDark ? '#fbbf24' : '#d97706',
      trendIcon: 'mdi:alert-outline',
      trendColor: isDark ? '#fbbf24' : '#d97706',
    },
  ], [configStats, isDark, moduleStats]);
  const selectedDeltaAccent = selectedDeltaRow?.status === 'improved'
    ? '#15803d'
    : selectedDeltaRow?.status === 'review'
      ? '#d97706'
      : selectedDeltaRow?.status === 'new'
        ? '#2563eb'
        : '#dc2626';
  const drawerPanelStyle = {
    background: isDark ? '#0f172a' : '#f8fafc',
    color: t.title,
    borderLeft: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    width: isMobile ? '100vw' : 'min(480px, 100vw)',
  };
  const baselineDrawerStyle = {
    background: isDark ? '#0f172a' : '#ffffff',
    color: t.title,
    borderLeft: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    width: isMobile ? '100vw' : 'min(360px, 100vw)',
  };

  

  const scrollToKernelTable = () => {
    window.setTimeout(() => {
      kernelTableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const resetKernelTableState = (nextViewMode = 'delta') => {
    setViewMode(nextViewMode);
    setSelectedDeltaRow(null);
    setFullFilterOpen(false);
    setFullModuleIntegrityFilterOpen(false);
    setFullModuleStateFilterOpen(false);
    setDeltaFilterOpen(false);
    setActiveFilter('all');
    setModuleDeltaFilter('all');
    setSearchQuery('');
    setFullComplianceFilter('all');
    setFullModuleIntegrityFilter('all');
    setFullModuleStateFilter('all');
    setFullPage(0);
    setDeltaPage(0);
  };

  const openKernelSecurityDebtView = (target) => {
    resetKernelTableState('full');
    if (target === 'configs') {
      setDeltaType('config');
      setFullComplianceFilter('gaps');
    } else {
      setDeltaType('module');
      setFullModuleIntegrityFilter('unsigned');
      setFullModuleStateFilter('loaded');
    }
    scrollToKernelTable();
  };

  const moduleIntegrityIndicator = (signed, showLabel = false, isLegend = false) => {
    const icon = signed ? 'lucide:shield-check' : 'lucide:shield-alert';
    const color = signed ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#fb7185' : '#e11d48');
    
    if (isLegend) {
      return (
        <span
          className="d-inline-flex align-items-center"
          style={{ gap: 6, minWidth: 64 }}
          title={signed ? 'Signed' : 'Unsigned'}
        >
          <IconifyIcon icon={icon} style={{ fontSize: 16, color }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? '#94a3b8' : t.muted,
              fontFamily: UI_FONT_STACK,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {signed ? 'Signed' : 'Unsigned'}
          </span>
        </span>
      );
    }

    return (
      <span
        className="d-inline-flex align-items-center"
        title={signed ? 'Signed' : 'Unsigned'}
        style={{
          gap: 6,
          padding: showLabel ? '4px 10px' : '4px',
          borderRadius: showLabel ? 999 : 6,
          background: showLabel 
            ? (signed ? (isDark ? 'rgba(34,197,94,0.08)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2'))
            : 'transparent',
          border: showLabel 
            ? `1px solid ${signed ? (isDark ? 'rgba(74,222,128,0.2)' : '#bbf7d0') : (isDark ? 'rgba(248,113,113,0.2)' : '#fecaca')}`
            : 'none',
          color,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: UI_FONT_STACK,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: BH_THEME_TRANSITION,
        }}
      >
        <IconifyIcon icon={icon} style={{ fontSize: showLabel ? 14 : 18 }} />
        {showLabel && <span>{signed ? 'Signed' : 'Unsigned'}</span>}
      </span>
    );
  };

  const renderKernelConfigStateIndicator = (value, compact = false, showLabel = true) => {
    const meta = kernelConfigStateMeta(value, isDark);

    return (
      <span
        className="d-inline-flex align-items-center"
        style={{
          gap: compact ? 6 : 8,
          minWidth: compact || !showLabel ? 0 : 76,
        }}
        title={meta.label}
      >
        <span
          aria-hidden
          className="rounded-circle d-inline-block"
          style={{
            width: compact ? 8 : 9,
            height: compact ? 8 : 9,
            background: meta.color,
            border: `1px solid ${meta.border}`,
            boxShadow: isDark ? `0 0 0 2px ${meta.color}15` : `0 0 0 2px ${meta.color}18`,
            flexShrink: 0,
          }}
        />
        {showLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? '#94a3b8' : t.muted,
              fontFamily: UI_FONT_STACK,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {meta.label}
          </span>
        ) : null}
      </span>
    );
  };

  const renderKernelConfigCompliance = (value) => {
    const meta = configComplianceMeta(value, isDark);
    if (meta.key === 'review') {
      return (
        <span
          title="Review"
          aria-label="Review"
          style={{ color: meta.color, fontSize: 16, fontWeight: 600, lineHeight: 1, display: 'inline-block' }}
        >
          –
        </span>
      );
    }
    return (
      <IconifyIcon
        icon={meta.icon}
        title={meta.label}
        aria-label={meta.label}
        style={{ fontSize: 20, color: meta.color, display: 'inline-block', lineHeight: 1 }}
      />
    );
  };

  const renderConfigFooterLegends = () => (
    <div className="d-flex flex-wrap align-items-center gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        {renderKernelConfigStateIndicator('ENABLED', true, true)}
        {renderKernelConfigStateIndicator('LOADABLE', true, true)}
        {renderKernelConfigStateIndicator('DISABLED', true, true)}
      </div>
      <span aria-hidden style={{ width: 1, height: 20, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)' }} />
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 700, color: t.muted, fontFamily: UI_FONT_STACK, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {renderKernelConfigCompliance('secure')}
          SECURE
        </span>
        <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 700, color: t.muted, fontFamily: UI_FONT_STACK, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {renderKernelConfigCompliance('insecure')}
          INSECURE
        </span>
        <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 700, color: t.muted, fontFamily: UI_FONT_STACK, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {renderKernelConfigCompliance('review')}
          REVIEW
        </span>
      </div>
    </div>
  );

  const renderModuleStateIndicator = (value, compact = false, showLabel = true) => {
    const normalized = typeof value === 'boolean'
      ? (value ? 'loaded' : 'inactive')
      : String(value ?? '').trim().toLowerCase();
    const isLoaded = normalized === 'loaded' || normalized === 'active' || normalized === 'enabled';
    const activeState = {
      label: isLoaded ? 'Loaded' : 'Inactive',
      color: isLoaded ? (isDark ? '#4ade80' : '#22c55e') : (isDark ? '#94a3b8' : '#cbd5e1'),
      border: isLoaded ? (isDark ? '#14532d' : '#86efac') : (isDark ? '#475569' : '#94a3b8'),
    };

    return (
      <span
        className="d-inline-flex align-items-center"
        style={{ gap: compact ? 6 : 8, minWidth: showLabel ? (compact ? 64 : 82) : 0 }}
        title={activeState.label}
      >
        <span
          aria-hidden
          className="rounded-circle d-inline-block"
          style={{
            width: compact ? 8 : 9,
            height: compact ? 8 : 9,
            background: activeState.color,
            border: `1px solid ${activeState.border}`,
            boxShadow: `0 0 0 2px ${activeState.color}18`,
            flexShrink: 0,
          }}
        />
        {showLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: t.muted,
              fontFamily: UI_FONT_STACK,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {activeState.label}
          </span>
        ) : null}
      </span>
    );
  };

  const renderModuleFooterLegends = () => (
    <div className="d-flex flex-wrap align-items-center gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        {renderModuleStateIndicator('loaded', true, true)}
        {renderModuleStateIndicator('inactive', true, true)}
      </div>
      <span aria-hidden style={{ width: 1, height: 20, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)' }} />
      <div className="d-flex flex-wrap align-items-center gap-2">
        {moduleIntegrityIndicator(true, false, true)}
        {moduleIntegrityIndicator(false, false, true)}
      </div>
    </div>
  );

  const renderDeltaConfigCompactDetails = (row, kind) => (
    <div className="d-flex flex-column" style={{ gap: 8, minWidth: 0 }}>
      <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
        {kind === 'new' ? (
          renderKernelConfigStateIndicator(row.currentState ?? row.targetState, false, false)
        ) : kind === 'deleted' ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: t.muted,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Removed
          </span>
        ) : (
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
            {renderKernelConfigStateIndicator(row.baselineState, false, false)}
            <IconifyIcon icon="solar:double-alt-arrow-right-bold" style={{ fontSize: 14, color: t.muted, flexShrink: 0 }} />
            {renderKernelConfigStateIndicator(row.currentState ?? row.targetState, false, false)}
          </div>
        )}
        {renderKernelConfigCompliance(row.compliance)}
      </div>
      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {row.reason}
      </span>
    </div>
  );

  const renderFullConfigCompactDetails = (row) => (
    <div className="d-flex flex-column" style={{ gap: 8, minWidth: 0 }}>
      <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
        {renderKernelConfigStateIndicator(row.currentState, false, false)}
        <IconifyIcon icon="solar:double-alt-arrow-right-bold" style={{ fontSize: 14, color: t.muted, flexShrink: 0 }} />
        {renderKernelConfigStateIndicator(row.recommendedState, false, false)}
        {renderKernelConfigCompliance(row.compliance)}
      </div>
      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {row.reason}
      </span>
    </div>
  );

  const buildDeltaNarrative = (row) => {
    if (!row) return '';
    const itemTypeLabel = row.deltaType === 'module' ? 'module' : 'hardening control';
    if (row.status === 'new') {
      return `This ${itemTypeLabel} is newly present in the current build and was not in the baseline.`;
    }
    if (row.status === 'deleted') {
      return `This ${itemTypeLabel} was present in the baseline but has been removed from the current build.`;
    }
    if (row.status === 'improved') {
      return row.target === 'ENABLED'
        ? `This ${itemTypeLabel} is now enabled in the current build, which closes a previously missing protection.`
        : row.target === 'LOADABLE'
          ? `This ${itemTypeLabel} is now loadable in the current build and should be reviewed against the expected hardening baseline.`
          : `This ${itemTypeLabel} is now disabled in the current build, which reduces the exposed attack surface.`;
    }
    if (row.status === 'review') {
      return `This ${itemTypeLabel} changed classification and now needs manual review before it can be considered secure or insecure.`;
    }

    return row.target === 'DISABLED'
      ? `This ${itemTypeLabel} is no longer enabled in the current build, creating a regression from the previous version.`
      : row.target === 'LOADABLE'
        ? `This ${itemTypeLabel} has moved to a loadable state, which widens the runtime attack surface compared with the previous build.`
        : `This ${itemTypeLabel} is now enabled in the current build and should be disabled to restore the previous security posture.`;
  };

  const buildActionLabel = (row) => {
    if (!row) return '';
    if (row.status === 'improved') {
      return 'No immediate action required — keep this setting consistent in future builds.';
    }
    if (row.status === 'new') {
      return 'Verify this newly added entry is intentional and aligns with the expected security profile.';
    }
    if (row.status === 'deleted') {
      return 'Verify the removal is intentional. Re-add if this setting is required by your security policy.';
    }
    if (row.status === 'review') {
      return 'Review this item manually and decide whether it should be tracked as secure, insecure, or expected as loadable.';
    }
    const noun = row.deltaType === 'module' ? 'module' : 'configuration';
    return row.target === 'DISABLED'
      ? `Recommended follow-up: re-enable this ${noun} in the target build.`
      : row.target === 'LOADABLE'
        ? `Recommended follow-up: confirm this ${noun} is expected to remain loadable in the target build.`
        : `Recommended follow-up: disable this ${noun} in the target build.`;
  };

  if (loading) {
    return (
      <>
        <PageMetaData title="Kernel Configs Details" />
        <div className="text-center py-5 text-muted">Loading report...</div>
      </>
    );
  }
  if (status === 'failed') {
    return (
      <>
        <PageMetaData title="Kernel Configs Details" />
        <div className="text-center py-5 text-danger">
          Failed to load report
        </div>
      </>
    );
  }

  return (
    <>
      <PageMetaData title="Kernel Configs Details" />
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
          <Row className="g-4 mb-5 align-items-center">
          <Col xl={4} lg={5} className="mb-3 mb-xl-0">
            <div className="d-flex flex-column pe-xl-4 pe-lg-3" style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
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
                  Kernel Hardening
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
                Hardening config and loadable module drifts
              </p>

              <div className="d-flex align-items-center flex-wrap" style={{ gap: 6, marginTop: 12 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 9px 4px 6px',
                    borderRadius: 7,
                    background: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
                    border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0'}`,
                  }}
                  title={`MODULE_SIG_FORCE is ${configModuleSig ? 'enabled' : 'disabled'}`}
                >
                  <IconifyIcon
                    icon={configModuleSig ? 'solar:shield-check-bold' : 'solar:shield-warning-bold'}
                    style={{
                      fontSize: 12,
                      color: configModuleSig
                        ? (isDark ? '#34d399' : '#16a34a')
                        : (isDark ? '#f87171' : '#dc2626'),
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: isDark ? '#cbd5e1' : '#334155',
                      fontFamily: MONO_FONT_STACK,
                      lineHeight: 1,
                    }}
                  >
                    {configModuleSig ? 'SIG ENFORCED' : 'SIG UNENFORCED'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 9px 4px 6px',
                    borderRadius: 7,
                    background: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
                    border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0'}`,
                  }}
                  title={`${signedModulesStats.signed} of ${signedModulesStats.total} kernel modules are signed`}
                >
                  <IconifyIcon
                    icon="solar:verified-check-bold"
                    style={{ fontSize: 11, color: isDark ? '#34d399' : '#16a34a', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      fontFamily: MONO_FONT_STACK,
                      color: isDark ? '#cbd5e1' : '#334155',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{signedModulesStats.signed}</span>
                    <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>
                    <span>{signedModulesStats.total}</span>
                    <span style={{ opacity: 0.55, marginLeft: 4, fontSize: 9, fontFamily: UI_FONT_STACK, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Modules Signed</span>
                  </span>
                </div>
              </div>
            </div>
          </Col>

          
          
          <Col xl={5} lg={7} className="mb-3 mb-xl-0 border-start border-end" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1) !important' : 'rgba(0,0,0,0.08) !important' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
            }}>
              <div className="ps-xl-4 py-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', flex: 1, transform: 'translateY(-8px)' }}>
                <div className="d-flex align-items-center gap-1 justify-content-start" style={{ marginBottom: 10, width: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Security Posture
                  </span>
                  <button
                    type="button"
                    onClick={() => setBaselineDrawerOpen(true)}
                    title="View baseline details"
                    style={{ background: 'transparent', border: 'none', padding: '0 2px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: t.muted, opacity: 0.7, lineHeight: 1 }}
                  >
                    <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 11 }} />
                  </button>
                </div>
                <div style={{ padding: '2px 10px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', border: `1px solid ${postureColor}40`, fontSize: 11, fontWeight: 800, color: postureColor, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  {postureRating}
                </div>
              </div>

              <div className="py-2 position-relative overflow-hidden d-flex flex-column justify-content-center" style={{ flex: 1, paddingLeft: isMobile ? 0 : 12, paddingRight: isMobile ? 0 : 4 }}>
                <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, whiteSpace: isMobile ? 'normal' : 'nowrap' }}>
                    Net attack surface {safeNetSurfaceDeltaPct >= 0 ? 'increased' : 'reduced'}{' '}
                    <span style={{ color: safeNetSurfaceDeltaPct >= 0 ? '#fb7185' : '#34d399', fontWeight: 700, fontFamily: MONO_FONT_STACK, fontSize: 13 }}>
                      {safeNetSurfaceDeltaPct >= 0 ? '+' : ''}{safeNetSurfaceDeltaPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mb-1">
                    <div style={{ fontSize: 36, fontWeight: 900, color: t.title, fontFamily: MONO_FONT_STACK, lineHeight: 1, letterSpacing: '-1px' }}>
                      {totalExposureUnits}
                    </div>
                    <OverlayTrigger
                      trigger={['click', 'hover', 'focus']}
                      placement="top"
                      overlay={
                        <Tooltip id="teu-tooltip" style={{ fontSize: 12 }}>
                          <div>Enabled Kernel Configs + Loaded Kernel Modules</div>
                          <div style={{ marginTop: 4, opacity: 0.85 }}><strong>{staticExposure}</strong> Configs&nbsp;&nbsp;·&nbsp;&nbsp;<strong>{activeExposure}</strong> Modules Active</div>
                        </Tooltip>
                      }
                    >
                      <div style={{ cursor: 'pointer', borderBottom: `1px dashed ${t.muted}`, fontSize: 11, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Exposure Units</div>
                    </OverlayTrigger>
                  </div>
                </div>
              </div>
            </div>
          </Col>

<Col xl={3} lg={12} className="mb-3 mb-xl-0 d-flex justify-content-xl-end">
            <div className="d-flex justify-content-lg-end">
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: isMobile ? 'flex-start' : 'flex-end',
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-lg-end"
                  style={{ gap: 16 }}
                >
                  <div className="text-lg-end">
                    <div className="d-flex align-items-center justify-content-lg-end" style={{ gap: 5, marginBottom: 4 }}>
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
                      {formatNumber(unresolvedConfigRows.length + unresolvedModuleRows.length)}
                    </span>
                  </div>
                </div>

                <div className="d-flex flex-wrap justify-content-lg-end" style={{ gap: 10 }}>
                  <style>{`
                    .kernel-security-debt-link:hover .kernel-security-debt-arrow {
                      color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
                      transform: translate(2px, -2px);
                    }
                  `}</style>
                  {[
                    { label: 'Configs', value: unresolvedConfigRows.length, target: 'configs' },
                    { label: 'Modules', value: unresolvedModuleRows.length, target: 'modules' },
                  ].map((item) => (
                    <button
                      key={item.target}
                      type="button"
                      onClick={() => openKernelSecurityDebtView(item.target)}
                      className="d-inline-flex align-items-center gap-2 kernel-security-debt-link"
                      style={{
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'}`,
                        background: 'transparent',
                        color: t.title,
                        borderRadius: 16,
                        padding: '6px 14px',
                        cursor: 'pointer',
                        fontFamily: UI_FONT_STACK,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MONO_FONT_STACK, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {formatNumber(item.value)}
                      </span>
                      <IconifyIcon icon="solar:arrow-right-up-outline" className="kernel-security-debt-arrow" style={{ fontSize: 12, color: t.muted, opacity: 0.8, transition: 'all 0.2s ease' }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        <Row className="g-3 mb-5 align-items-stretch">
          {[
            {
              key: 'configs',
              id: 'configs',
              icon: 'solar:settings-bold',
              title: 'Config Drift Analysis',
              subtitle: 'Config state and enforcement drifts',
              debtCount: unresolvedConfigRows.length,
              summaryCards: [
                {
                  key: 'added',
                  valueText: formatNumber(configAddedCount),
                  icon: 'solar:add-circle-bold',
                },
                {
                  key: 'deleted',
                  valueText: formatNumber(configDeletedCount),
                  icon: 'solar:minus-circle-bold',
                },
                {
                  key: 'total',
                  valueText: formatNumber(totalKernelConfigCount),
                  icon: 'solar:layers-bold',
                },
              ],
            },
            {
              key: 'modules',
              id: 'modules',
              icon: 'solar:box-bold-duotone',
              title: 'Modules Drift Analysis',
              subtitle: 'Module integrity and availability drifts',
              debtCount: unresolvedModuleRows.length,
              summaryCards: [
                {
                  key: 'installed',
                  valueText: formatNumber(moduleStats.installedCount),
                  icon: 'solar:add-circle-bold',
                },
                {
                  key: 'deleted',
                  valueText: formatNumber(moduleStats.deletedCount),
                  icon: 'solar:minus-circle-bold',
                },
                {
                  key: 'total',
                  valueText: formatNumber(totalInstalledModules),
                  icon: 'solar:layers-bold',
                },
              ],
            },
          ].map((section) => {
            const summaryPills = section.summaryCards.map((card) => ({
              ...card,
              isDeletedCard: card.key === 'deleted',
            }));
            const isConfigSection = section.key === 'configs';
            const regItem = allDriftItems.find((item) => item.sectionKey === section.key && item.key === 'regressed');
            const secondaryItems = allDriftItems.filter((item) => item.sectionKey === section.key && item.key !== 'regressed');
            const newRisks = isConfigSection ? configStats.newRisksCount : moduleStats.newRisksCount;
            const regHovered = hoveredCategoryCard?.section === section.key && hoveredCategoryCard?.key === 'regressed';
            const newRiskHovered = hoveredCategoryCard?.section === section.key && hoveredCategoryCard?.key === 'new_risk';

            const applySectionDeltaFilter = (filterKey) => {
              resetKernelTableState('delta');
              setDeltaType(isConfigSection ? 'config' : 'module');
              if (isConfigSection) {
                setActiveFilter(filterKey);
                setModuleDeltaFilter('all');
              } else {
                setModuleDeltaFilter(filterKey);
                setActiveFilter('all');
              }
              scrollToKernelTable();
            };

            return (
              <Col xl={6} key={section.key}>
                <div
                  id={section.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    padding: isMobile ? '16px' : '20px 24px',
                    background: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248,250,252,0.6)',
                    border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(226,232,240,0.8)'}`,
                    borderRadius: 28,
                    height: '100%',
                    position: 'relative',
                    transition: BH_THEME_TRANSITION,
                  }}
                >
                <div className="pb-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.06)'}` }}>
                  <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                        }}
                      >
                        <IconifyIcon icon={section.icon} style={{ fontSize: 18, color: isDark ? '#94a3b8' : '#64748b' }} />
                      </div>
                      <h2
                        className="mb-0"
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
                        {section.title}
                      </h2>
                    </div>

                    <div className="d-flex align-items-center flex-wrap justify-content-lg-end" style={{ gap: 10 }}>

                      <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
                        {summaryPills.filter((pill) => pill.key !== 'total').map((pill) => {
                          const isConfigDeltaPill = isConfigSection && (pill.key === 'added' || pill.key === 'deleted');
                          const isModuleDeltaPill = !isConfigSection && (pill.key === 'installed' || pill.key === 'deleted');
                          const isDeltaPill = isConfigDeltaPill || isModuleDeltaPill;
                          const handleSummaryPillClick = () => {
                            if (!isDeltaPill) return;
                            applySectionDeltaFilter(isConfigSection
                              ? (pill.key === 'added' ? 'new' : 'deleted')
                              : (pill.key === 'installed' ? 'new' : 'deleted'));
                          };

                          return (
                            <div
                              key={pill.key}
                              className="d-inline-flex align-items-center"
                              role={isDeltaPill ? 'button' : undefined}
                              tabIndex={isDeltaPill ? 0 : undefined}
                              onClick={handleSummaryPillClick}
                              onKeyDown={(event) => {
                                if (isDeltaPill && (event.key === 'Enter' || event.key === ' ')) {
                                  event.preventDefault();
                                  handleSummaryPillClick();
                                }
                              }}
                              style={{
                                gap: 8,
                                padding: '6px 14px',
                                borderRadius: 12,
                                background: pill.isDeletedCard
                                  ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)')
                                  : (isDark ? 'rgba(139,92,246,0.18)' : '#f5f0ff'),
                                border: `1px solid ${pill.isDeletedCard
                                  ? (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')
                                  : (isDark ? 'rgba(139,92,246,0.3)' : '#e9dcff')}`,
                                color: pill.isDeletedCard
                                  ? (isDark ? '#e2e8f0' : '#475569')
                                  : (isDark ? '#ecd9ff' : '#5b21b6'),
                                boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                                cursor: isDeltaPill ? 'pointer' : 'default',
                              }}
                            >
                              <IconifyIcon icon={pill.icon} style={{ fontSize: 13, opacity: 0.9 }} />
                              <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                                <span style={{ fontSize: 14, fontFamily: MONO_FONT_STACK, fontWeight: 800, letterSpacing: '-0.02em' }}>{pill.valueText}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.7, letterSpacing: '0.02em' }}>
                                  {isConfigSection ? (pill.isDeletedCard ? 'Deleted' : 'Added') : (pill.isDeletedCard ? 'Removed' : 'Added')}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <div className="ms-0 ms-md-2 ps-0 ps-md-3" style={{ borderLeft: isMobile ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}` }}>
                          <div className="d-flex align-items-baseline" style={{ gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontFamily: MONO_FONT_STACK }}>
                              {summaryPills.find((pill) => pill.key === 'total')?.valueText}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Analyzed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
                    gap: 12,
                    alignItems: 'stretch',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, height: '100%' }}>
                    {regItem ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => applySectionDeltaFilter('regressed')}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            applySectionDeltaFilter('regressed');
                          }
                        }}
                        onMouseEnter={() => setHoveredCategoryCard({ section: section.key, key: 'regressed' })}
                        onMouseLeave={() => setHoveredCategoryCard(null)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flexGrow: 1,
                          padding: '20px',
                          borderRadius: 24,
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(30, 41, 59, 0.4) 100%)'
                            : 'linear-gradient(135deg, #fff1f2 0%, #fffefe 100%)',
                          border: `1px solid ${regHovered ? '#f43f5e' : (isDark ? 'rgba(244, 63, 94, 0.2)' : '#fee2e2')}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: regHovered ? 'translateY(-2px)' : 'none',
                          overflow: 'hidden',
                          boxShadow: regHovered && isDark ? '0 8px 24px -8px rgba(244, 63, 94, 0.4)' : (isDark ? '0 4px 20px -8px rgba(0,0,0,0.5)' : 'none'),
                        }}
                      >
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.4)' }} />
                            <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#f43f5e' : '#e11d48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Critical Regression
                            </span>
                        </div>

                        <div className="d-flex align-items-end gap-3 flex-wrap">
                          <span style={{ fontSize: 54, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1, fontFamily: MONO_FONT_STACK, letterSpacing: '-0.05em' }}>
                            {formatNumber(regItem.value)}
                          </span>
                          <div style={{ paddingBottom: 3, fontSize: 13, fontWeight: 600, color: t.muted, lineHeight: 1.2 }}>
                            {regItem.contextLabel ?? 'security risks'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {newRisks ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          applySectionDeltaFilter('new_risk');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            applySectionDeltaFilter('new_risk');
                          }
                        }}
                        onMouseEnter={() => setHoveredCategoryCard({ section: section.key, key: 'new_risk' })}
                        onMouseLeave={() => setHoveredCategoryCard(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderRadius: 16,
                          cursor: 'pointer',
                          background: isDark
                            ? newRiskHovered ? 'rgba(251,113,133,0.12)' : 'rgba(255,255,255,0.02)'
                            : newRiskHovered ? '#fff1f2' : '#f8fafc',
                          border: `1px solid ${newRiskHovered ? '#f43f5e' : (isDark ? 'rgba(251,113,133,0.15)' : '#e2e8f0')}`,
                          transition: 'all 0.3s ease',
                          transform: newRiskHovered ? 'translateY(-2px)' : 'none',
                          boxShadow: newRiskHovered ? (isDark ? '0 4px 14px -4px rgba(244,63,94,0.4)' : '0 4px 14px -4px rgba(244,63,94,0.12)') : 'none',
                        }}
                      >
                        <div className="d-flex align-items-center" style={{ gap: 8 }}>
                          <IconifyIcon icon="solar:danger-triangle-bold" style={{ fontSize: 16, color: '#f43f5e' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#fda4af' : '#be123c' }}>
                            New Risks
                          </span>
                        </div>
                        <div className="d-flex align-items-center" style={{ gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MONO_FONT_STACK, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {newRisks}
                          </span>
                          <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 14, color: t.muted }} />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    {secondaryItems.map((item) => {
                      const isHovered = hoveredCategoryCard?.section === item.sectionKey && hoveredCategoryCard?.key === item.key;
                      return (
                        <div
                          key={`${item.sectionKey}-${item.key}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => applySectionDeltaFilter(item.key)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              applySectionDeltaFilter(item.key);
                            }
                          }}
                          onMouseEnter={() => setHoveredCategoryCard({ section: item.sectionKey, key: item.key })}
                          onMouseLeave={() => setHoveredCategoryCard(null)}
                          style={{
                            padding: '18px 20px',
                            borderRadius: 20,
                            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                            border: `1px solid ${isHovered ? item.accent : (isDark ? 'transparent' : '#e2e8f0')}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            transform: isHovered ? 'translateY(-2px)' : 'none',
                            boxShadow: isHovered && isDark ? `0 8px 20px -6px ${item.accent}60` : (isDark ? '0 4px 12px -4px rgba(0,0,0,0.3)' : 'none'),
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between text-uppercase" style={{ fontSize: 9, fontWeight: 800, color: t.muted, letterSpacing: '0.05em' }}>
                              {item.label}
                            <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                              <IconifyIcon icon={item.trendIcon} style={{ fontSize: 16, color: item.trendColor }} />
                            </div>
                          </div>
                          <div className="d-flex align-items-baseline gap-2 flex-wrap">
                            <span style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', fontFamily: MONO_FONT_STACK }}>
                              {formatNumber(item.value)}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: t.muted }}>
                              {item.contextLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}

        </Row>

    {/* ── Table + Attack Surface Sidebar ── */}
    <Row className="gy-3 align-items-start mt-0">
            <Col xs={12}>
          <Card ref={kernelTableSectionRef} style={{ background: panelGradient, border: `1px solid ${isDark ? t.borderStrong : '#cbd5e1'}`, borderRadius: 28, overflow: 'hidden', transition: THEME_TRANSITION, boxShadow: isDark ? 'none' : '0 10px 35px -15px rgba(15,23,42,0.14)' }}>
            <CardHeader
              className="py-2 py-sm-3 px-2 px-sm-4"
              style={{
                background: isDark ? 'rgba(15,23,42,0.78)' : t.headerBg,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                transition: THEME_TRANSITION,
              }}
            >
              <h2 className="visually-hidden">Kernel configuration</h2>
              {/* ── Tab bar: Kernel Config / Kernel Modules (delta + full report) ── */}
              <div
                className="d-flex align-items-center justify-content-between flex-wrap mb-4 mt-1"
                style={{
                  background: 'transparent',
                  borderRadius: 0,
                  padding: 0,
                  border: 'none',
                  transition: THEME_TRANSITION,
                }}
              >
                <div
                  className="d-flex align-items-center flex-wrap"
                  style={{
                    gap: 10,
                    paddingBottom: 2,
                  }}
                >
                {[{ id: 'config', label: 'Kernel Config', icon: 'solar:settings-bold' }, { id: 'module', label: 'Kernel Modules', icon: 'solar:box-bold-duotone' }].map((tab) => {
                  const isActive = deltaType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                        onClick={() => {
                        setDeltaType(tab.id);
                        setSelectedDeltaRow(null);
                        setSearchQuery('');
                        setActiveFilter('all');
                        setModuleDeltaFilter('all');
                        setDeltaFilterOpen(false);
                        setFullFilterOpen(false);
                        setFullModuleIntegrityFilterOpen(false);
                        setFullModuleStateFilterOpen(false);
                        setFullModuleIntegrityFilter('all');
                        setFullModuleStateFilter('all');
                        setFullPage(0);
                      }}
                      className="d-inline-flex align-items-center gap-2"
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: isMobile ? '8px 0' : '10px 0',
                        background: 'transparent',
                        color: isActive ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
                        boxShadow: 'none',
                        fontSize: 13,
                        fontWeight: isActive ? 800 : 600,
                        letterSpacing: isActive ? '-0.01em' : '0',
                        transition: BH_INTERACTIVE_TRANSITION,
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isActive
                            ? (isDark ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.10)')
                            : (isDark ? 'rgba(148,163,184,0.10)' : 'rgba(148,163,184,0.10)'),
                          color: isActive
                            ? (isDark ? '#93c5fd' : '#2563eb')
                            : (isDark ? '#94a3b8' : '#64748b'),
                          border: `1px solid ${isActive
                            ? (isDark ? 'rgba(96,165,250,0.26)' : 'rgba(147,197,253,0.9)')
                            : (isDark ? 'rgba(148,163,184,0.18)' : 'rgba(203,213,225,0.9)')}`,
                          transition: BH_INTERACTIVE_TRANSITION,
                        }}
                      >
                        <IconifyIcon icon={tab.icon} style={{ fontSize: 15 }} />
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
                </div>
                {/* Segmented view toggle — moved to upper row */}
                <div
                  className="d-inline-flex align-items-center gap-0 p-1"
                  role="group"
                  aria-label="Configuration view"
                  style={{
                    borderRadius: 99,
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                    backdropFilter: 'blur(4px)',
                    flexShrink: 0,
                    transition: BH_INTERACTIVE_TRANSITION,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('delta');
                      setActiveFilter('all');
                      setModuleDeltaFilter('all');
                      setSearchQuery('');
                      setDeltaFilterOpen(false);
                      setFullComplianceFilter('all');
                      setFullFilterOpen(false);
                      setFullModuleIntegrityFilterOpen(false);
                      setFullModuleStateFilterOpen(false);
                      setFullModuleIntegrityFilter('all');
                      setFullModuleStateFilter('all');
                      setFullPage(0);
                    }}
                    className="text-nowrap"
                    style={{
                      border: 'none',
                      borderRadius: 99,
                      padding: '6px 16px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: UI_FONT_STACK,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      color: viewMode === 'delta' ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'),
                      background: viewMode === 'delta' ? (isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff') : 'transparent',
                      boxShadow: viewMode === 'delta' ? (isDark ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.06)') : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    Delta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('full');
                      setActiveFilter('all');
                      setModuleDeltaFilter('all');
                      setSelectedDeltaRow(null);
                      setSearchQuery('');
                      setDeltaFilterOpen(false);
                      setFullFilterOpen(false);
                      setFullComplianceFilter('all');
                      setFullModuleIntegrityFilterOpen(false);
                      setFullModuleStateFilterOpen(false);
                      setFullModuleIntegrityFilter('all');
                      setFullModuleStateFilter('all');
                      setFullPage(0);
                    }}
                    className="text-nowrap"
                    style={{
                      border: 'none',
                      borderRadius: 99,
                      padding: '6px 16px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: UI_FONT_STACK,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      color: viewMode === 'full' ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'),
                      background: viewMode === 'full' ? (isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff') : 'transparent',
                      boxShadow: viewMode === 'full' ? (isDark ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.06)') : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    Full Scan
                  </button>
                </div>
              </div>
              <div className="d-flex flex-column gap-2 w-100">
                <div className="d-flex align-items-center gap-3 w-100 flex-wrap">
                  <div className="d-flex align-items-center flex-shrink-1 min-w-0 px-2" style={searchFieldShellStyle}>
                    <IconifyIcon icon="solar:magnifer-linear" className="flex-shrink-0" style={{ fontSize: 14, color: searchFocused ? (isDark ? '#93c5fd' : '#3b82f6') : '#64748b', transition: BH_THEME_TRANSITION }} aria-hidden />
                    <Form.Control
                      placeholder={
                        viewMode === 'delta'
                          ? deltaType === 'module'
                            ? 'Search kernel modules…'
                            : 'Search kernel configs…'
                          : deltaType === 'module'
                            ? 'Search module names…'
                            : 'Search config names…'
                      }
                      value={searchQuery}
                      aria-label={
                        viewMode === 'delta'
                          ? deltaType === 'module'
                            ? 'Search kernel modules'
                            : 'Search kernel configs'
                          : deltaType === 'module'
                            ? 'Search module names'
                            : 'Search kernel config names'
                      }
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (viewMode === 'full') setFullPage(0);
                      }}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      className="border-0 shadow-none flex-grow-1 text-truncate"
                      style={{
                        background: 'transparent',
                        color: t.title,
                        fontSize: FONT.base,
                        paddingLeft: 6,
                        minWidth: 0,
                        height: '100%',
                      }}
                    />
                  </div>
                  <Button
                    variant="light"
                    type="button"
                    onClick={() => {
                      if (viewMode === 'delta') setDeltaFilterOpen((s) => !s);
                      else setFullFilterOpen((s) => !s);
                    }}
                    aria-pressed={
                      viewMode === 'delta'
                        ? deltaFilterOpen
                        : fullFilterOpen
                    }
                    aria-label="Status"
                    title="Status"
                    className="d-inline-flex align-items-center"
                    style={
                      (
                        viewMode === 'delta'
                          ? deltaFilterOpen
                          : fullFilterOpen
                      )
                        ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#111827' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                        : { ...filterInactivePill, gap: 6, height: 34, display: 'flex', alignItems: 'center' }
                    }
                  >
                    <IconifyIcon icon="mdi:filter-variant" style={{ fontSize: 14 }} />
                    <span>{viewMode === 'full' && deltaType === 'config' ? 'Risk' : 'Status'}</span>
                  </Button>

                  {viewMode === 'delta' && deltaFilterOpen ? (
                    <div className="d-flex flex-wrap align-items-center gap-1 gap-sm-2" role="group" aria-label="Kernel delta status filters">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'improved', label: 'Improved' },
                        { id: 'new', label: 'New' },
                        { id: 'deleted', label: 'Deleted' },
                        { id: 'regressed', label: 'Regressed' },
                        { id: 'review', label: 'Review' },
                      ].map((opt) => (
                        <Button
                          key={opt.id}
                          variant="light"
                          type="button"
                          onClick={() => {
                            if (deltaType === 'module') setModuleDeltaFilter(opt.id);
                            else setActiveFilter(opt.id);
                          }}
                          className="d-inline-flex align-items-center text-nowrap"
                          style={
                            (deltaType === 'module' ? moduleDeltaFilter : activeFilter) === opt.id
                              ? opt.id === 'improved'
                                ? FILTER_ACTIVE_GREEN
                                : opt.id === 'review'
                                  ? FILTER_ACTIVE_AMBER
                                  : opt.id === 'regressed' || opt.id === 'deleted'
                                    ? FILTER_ACTIVE_RED
                                    : FILTER_ACTIVE_ALL
                              : filterInactivePill
                          }
                        >
                          <span>{opt.label}</span>
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {viewMode === 'full' && deltaType === 'config' && fullFilterOpen ? (
                    <div className="d-flex flex-wrap align-items-center gap-1 gap-sm-2" role="group" aria-label="Kernel full config status filters">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'gaps', label: 'Gaps' },
                        { id: 'secure', label: 'Low' },
                        { id: 'insecure', label: 'High' },
                        { id: 'review', label: 'Medium' },
                      ].map((opt) => (
                        <Button
                          key={opt.id}
                          variant="light"
                          type="button"
                          onClick={() => {
                            setFullComplianceFilter(opt.id);
                            setFullPage(0);
                          }}
                          className="d-inline-flex align-items-center text-nowrap"
                          style={
                            fullComplianceFilter === opt.id
                              ? opt.id === 'secure'
                                ? FILTER_ACTIVE_GREEN
                                : opt.id === 'gaps'
                                  ? FILTER_ACTIVE_RED
                                : opt.id === 'review'
                                  ? FILTER_ACTIVE_AMBER
                                  : opt.id === 'insecure'
                                  ? FILTER_ACTIVE_RED
                                  : FILTER_ACTIVE_ALL
                              : filterInactivePill
                          }
                        >
                          <span>{opt.label}</span>
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {viewMode === 'full' && deltaType === 'module' ? (
                    <>
                    <Button
                      variant="light"
                      type="button"
                      onClick={() => setFullModuleIntegrityFilterOpen((s) => !s)}
                      aria-pressed={fullModuleIntegrityFilterOpen}
                      aria-label="Integrity"
                      title="Integrity"
                      className="d-inline-flex align-items-center"
                      style={fullModuleIntegrityFilterOpen ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#111827' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 8 } : { ...filterInactivePill, gap: 8 }}
                    >
                      <IconifyIcon icon="mdi:shield-check-outline" style={{ fontSize: 14, color: fullModuleIntegrityFilterOpen ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#475569') }} />
                      <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap', color: fullModuleIntegrityFilterOpen ? (isDark ? '#ffffff' : '#0f172a') : undefined }}>Integrity</span>
                    </Button>
                    {fullModuleIntegrityFilterOpen ? (
                    <div className="d-flex flex-wrap align-items-center gap-1 gap-sm-2" role="group" aria-label="Kernel full module integrity filters">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'signed', label: 'Signed' },
                        { id: 'unsigned', label: 'Unsigned' },
                      ].map((opt) => (
                        <Button
                          key={opt.id}
                          variant="light"
                          type="button"
                          onClick={() => {
                            setFullModuleIntegrityFilter(opt.id);
                            setFullPage(0);
                          }}
                          className="d-inline-flex align-items-center text-nowrap"
                          style={
                            fullModuleIntegrityFilter === opt.id
                              ? opt.id === 'signed'
                                ? FILTER_ACTIVE_GREEN
                                : opt.id === 'unsigned'
                                  ? FILTER_ACTIVE_RED
                                  : FILTER_ACTIVE_ALL
                              : filterInactivePill
                          }
                        >
                          <span>{opt.label}</span>
                        </Button>
                      ))}
                    </div>
                    ) : null}
                    <Button
                      variant="light"
                      type="button"
                      onClick={() => setFullModuleStateFilterOpen((s) => !s)}
                      aria-pressed={fullModuleStateFilterOpen}
                      aria-label="State"
                      title="State"
                      className="d-inline-flex align-items-center"
                      style={fullModuleStateFilterOpen ? { ...FILTER_PILL_BASE, background: isDark ? '#111827' : '#f3f4f6', border: `1px solid ${isDark ? '#111827' : '#d1d5db'}`, color: isDark ? '#ffffff' : '#0f172a', gap: 8 } : { ...filterInactivePill, gap: 8 }}
                    >
                      <IconifyIcon icon="mdi:layers-outline" style={{ fontSize: 14, color: fullModuleStateFilterOpen ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#475569') }} />
                      <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap', color: fullModuleStateFilterOpen ? (isDark ? '#ffffff' : '#0f172a') : undefined }}>State</span>
                    </Button>
                    {fullModuleStateFilterOpen ? (
                    <div className="d-flex flex-wrap align-items-center gap-1 gap-sm-2" role="group" aria-label="Kernel full module state filters">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'loaded', label: 'Loaded' },
                        { id: 'inactive', label: 'Inactive' },
                      ].map((opt) => (
                        <Button
                          key={opt.id}
                          variant="light"
                          type="button"
                          onClick={() => {
                            setFullModuleStateFilter(opt.id);
                            setFullPage(0);
                          }}
                          className="d-inline-flex align-items-center text-nowrap"
                          style={
                            fullModuleStateFilter === opt.id
                              ? opt.id === 'loaded'
                                ? FILTER_ACTIVE_GREEN
                                : opt.id === 'inactive'
                                  ? FILTER_ACTIVE_ALL
                                  : FILTER_ACTIVE_ALL
                              : filterInactivePill
                          }
                        >
                          <span>{opt.label}</span>
                        </Button>
                      ))}
                    </div>
                    ) : null}
                    </>
                  ) : null}
                </div>

              </div>
            </CardHeader>
            <CardBody className="pt-2 pt-sm-3 px-2 px-sm-4 pb-3 pb-sm-4">
              {viewMode === 'delta' ? (
              deltaType === 'module' ? (
              <>
                <div className="table-responsive">
                  <Table
                    className="mb-0 align-middle"
                    style={{ borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', tableLayout: 'fixed', width: '100%', minWidth: isMobile ? 540 : undefined }}
                  >
                    <thead>
                      <tr>
                        <th style={{ ...tableHeaderStyle(isDark), borderTopLeftRadius: 14 }}>Module</th>
                        <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '18%' }}>Status</th>
                        <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '44%', borderTopRightRadius: 14 }}>Change Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deltaPageRows.length > 0 ? deltaPageRows.map((row, idx) => {
                        const kind = row.changeKind || row.status;
                        const isRemoved = kind === 'deleted';
                        const isReview = kind === 'review';
                        const arrowColor = t.muted;
                        const statusPillStyle = kernelDeltaStatusPillStyle(kind, isDark);
                        return (
                          <tr
                            key={`${row.itemName}-${idx}`}
                            onClick={() => setSelectedDeltaRow(row)}
                            onMouseEnter={() => setHoveredKernelRowKey(`modd-${idx}`)}
                            onMouseLeave={() => setHoveredKernelRowKey((p) => (p === `modd-${idx}` ? null : p))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedDeltaRow(row);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Open findings for ${row.itemName}`}
                            style={{
                              cursor: 'pointer',
                              background: selectedDeltaRow?.itemName === row.itemName && selectedDeltaRow?.status === row.status
                                ? t.selectedSurface
                                : hoveredKernelRowKey === `modd-${idx}`
                                  ? t.hoverSurface
                                  : idx % 2 ? t.tableStripe : 'transparent',
                              boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                              transition: tableRowTransition,
                            }}
                          >
                            <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 13 }}>
                              <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                <span className="fw-semibold font-monospace text-truncate" style={{ flex: '1 1 auto', minWidth: 0, fontSize: 13, fontFamily: MONO_FONT_STACK, color: t.title }}>
                                  {row.itemName}
                                </span>
                                <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 20, height: 20, background: isDark ? '#0f172a' : '#eff6ff', color: isDark ? '#cbd5e1' : '#0f172a' }} aria-hidden>
                                  <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#0f172a' }} />
                                </span>
                              </div>
                            </td>
                            <td className="align-middle text-center" style={{ padding: '14px 16px', minWidth: 0 }}>
                              <span style={statusPillStyle}>
                                {formatKernelDeltaStatusLabel(kind)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', minWidth: 0 }}>
                              {kind === 'new' || isRemoved ? (
                                <span style={{ color: t.muted, fontWeight: 600, display: 'block', textAlign: 'center' }}>—</span>
                            ) : isReview ? (
                              <div
                                className="d-flex align-items-center justify-content-center"
                                style={{ gap: 10 }}
                              >
                                {renderModuleStateIndicator(row.loaded ? 'inactive' : 'loaded', false, false)}
                                <IconifyIcon icon="solar:double-alt-arrow-right-bold" style={{ fontSize: 16, color: arrowColor, flexShrink: 0 }} />
                                {renderModuleStateIndicator(row.loaded ? 'loaded' : 'inactive', false, false)}
                              </div>
                              ) : (
                                <div
                                  className="d-flex align-items-center justify-content-center"
                                  style={{ gap: 10 }}
                                >
                                  {moduleIntegrityIndicator(kind === 'regressed', false, false)}
                                  <IconifyIcon icon="solar:double-alt-arrow-right-bold" style={{ fontSize: 16, color: arrowColor, flexShrink: 0 }} />
                                  {moduleIntegrityIndicator(kind !== 'regressed', false, false)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-4">
                            No kernel module changes found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                    Showing {Math.min(deltaPageRows.length, KERNEL_DELTA_PAGE_SIZE)} of {deltaFilteredRows.length} items
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      disabled={deltaPage === 0}
                      onClick={() => { setDeltaPage(0); scrollTableIntoView(); }}
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
                      onClick={() => { setDeltaPage(p => p - 1); scrollTableIntoView(); }}
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
                      {deltaPage + 1} / {deltaTotalPages}
                    </div>
                    <button
                      disabled={deltaPage >= deltaTotalPages - 1}
                      onClick={() => { setDeltaPage(p => p + 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                        cursor: deltaPage >= deltaTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: deltaPage >= deltaTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >Next</button>
                    <button
                      disabled={deltaPage >= deltaTotalPages - 1}
                      onClick={() => { setDeltaPage(deltaTotalPages - 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                        cursor: deltaPage >= deltaTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: deltaPage >= deltaTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >»</button>
                  </div>
                </div>
              </>
              ) : (
              <>
              <div className="table-responsive">
                <Table
                  className="mb-0 align-middle"
                  style={{ borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', tableLayout: 'fixed', width: '100%', minWidth: isCompactTable ? 640 : 920 }}
                >
                  <thead>
                      <tr>
                        <th style={{ ...tableHeaderStyle(isDark), width: '30%', borderTopLeftRadius: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Config Name</th>
                        <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '12%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Status</th>
                        {isCompactTable ? (
                          <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '58%', borderTopRightRadius: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Details</th>
                        ) : (
                          <>
                            <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '24%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>State Transition</th>
                            <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '14%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Risk</th>
                            <th style={{ ...tableHeaderStyle(isDark), width: '20%', borderTopRightRadius: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Description</th>
                          </>
                        )}
                      </tr>
                  </thead>
                  <tbody>
                    {deltaPageRows.length > 0 ? deltaPageRows.map((row, idx) => {
                      const kind = row.changeKind || row.status;
                      return (
                        <tr
                          key={`${row.itemName}-${idx}`}
                          onClick={() => setSelectedDeltaRow(row)}
                          onMouseEnter={() => setHoveredKernelRowKey(`cfgd-${idx}`)}
                          onMouseLeave={() => setHoveredKernelRowKey((p) => (p === `cfgd-${idx}` ? null : p))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedDeltaRow(row);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Open findings for ${row.itemName}`}
                          style={{
                            cursor: 'pointer',
                            background: selectedDeltaRow?.itemName === row.itemName && selectedDeltaRow?.status === row.status
                              ? t.selectedSurface
                              : hoveredKernelRowKey === `cfgd-${idx}`
                                ? t.hoverSurface
                                : idx % 2 ? t.tableStripe : 'transparent',
                            boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                            transition: tableRowTransition,
                          }}
                        >
                          <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: 13 }}>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <span
                                className="fw-semibold font-monospace text-truncate"
                                style={{ flex: '1 1 auto', minWidth: 0, fontSize: 13, fontFamily: MONO_FONT_STACK, color: t.title }}
                              >
                                {row.itemName}
                              </span>
                              <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 20, height: 20, background: isDark ? '#0f172a' : '#eff6ff', color: isDark ? '#cbd5e1' : '#0f172a' }} aria-hidden>
                                <IconifyIcon icon="solar:alt-arrow-right-linear" style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#0f172a' }} />
                              </span>
                            </div>
                          </td>
                          <td className="align-middle text-center" style={{ padding: '14px 16px' }}>
                            <span style={kernelDeltaStatusPillStyle(row.status, isDark)}>
                              {formatKernelDeltaStatusLabel(row.status)}
                            </span>
                          </td>
                            {isCompactTable ? (
                              <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                {renderDeltaConfigCompactDetails(row, kind)}
                              </td>
                            ) : (
                              <>
                                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                  {kind === 'new' ? (
                                    <div className="d-flex justify-content-center">
                                      {renderKernelConfigStateIndicator(row.currentState ?? row.targetState, false, false)}
                                    </div>
                                  ) : kind === 'deleted' ? (
                                    <div className="d-flex justify-content-center">
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: t.muted,
                                          letterSpacing: '0.04em',
                                          textTransform: 'uppercase',
                                        }}
                                      >
                                        Removed
                                      </span>
                                    </div>
                                  ) : (
                                    <div
                                      className="d-flex align-items-center justify-content-center"
                                      style={{ gap: 10 }}
                                    >
                                      {renderKernelConfigStateIndicator(row.baselineState, false, false)}
                                      <IconifyIcon icon="solar:double-alt-arrow-right-bold" style={{ fontSize: 16, color: t.muted, flexShrink: 0 }} />
                                      {renderKernelConfigStateIndicator(row.currentState ?? row.targetState, false, false)}
                                    </div>
                                  )}
                                </td>
                                <td className="text-center" style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                  {renderKernelConfigCompliance(row.compliance)}
                                </td>
                                <td style={{ padding: '14px 16px', verticalAlign: 'top', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, lineHeight: 1.55, fontFamily: UI_FONT_STACK }}>
                                  {row.reason}
                                </td>
                              </>
                            )}
                        </tr>
                      );
                    }) : (
                        <tr>
                            <td colSpan={isCompactTable ? 3 : 5} className="text-center text-muted py-4">
                            {deltaType === 'module' ? 'No kernel module changes found' : 'No kernel config changes found'}
                          </td>
                        </tr>
                      )
                    }
                  </tbody>
                </Table>
              </div>
                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                    Showing {Math.min(deltaPageRows.length, KERNEL_DELTA_PAGE_SIZE)} of {deltaFilteredRows.length} items
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      disabled={deltaPage === 0}
                      onClick={() => { setDeltaPage(0); scrollTableIntoView(); }}
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
                      onClick={() => { setDeltaPage(p => p - 1); scrollTableIntoView(); }}
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
                      {deltaPage + 1} / {deltaTotalPages}
                    </div>
                    <button
                      disabled={deltaPage >= deltaTotalPages - 1}
                      onClick={() => { setDeltaPage(p => p + 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                        cursor: deltaPage >= deltaTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: deltaPage >= deltaTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >Next</button>
                    <button
                      disabled={deltaPage >= deltaTotalPages - 1}
                      onClick={() => { setDeltaPage(deltaTotalPages - 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                        cursor: deltaPage >= deltaTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: deltaPage >= deltaTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >»</button>
                  </div>
                </div>
              </>
              )
              ) : deltaType === 'module' ? (
              <>
                <div className="table-responsive">
                  <Table
                    className="mb-0 align-middle"
                    style={{ borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', tableLayout: 'fixed', width: '100%', minWidth: isMobile ? 540 : undefined }}
                  >
                    <thead>
                      <tr>
                        <th style={{ ...tableHeaderStyle(isDark), borderTopLeftRadius: 14 }}>Module</th>
                        <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '22%' }}>Current State</th>
                        <th style={{ ...tableHeaderStyle(isDark), borderTopRightRadius: 14 }}>Integrity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullReportPageRows.length > 0 ? (
                        fullReportPageRows.map((row, idx) => (
                          <tr
                            key={`${row.moduleName}-${row.integrityLabel}-${idx}`}
                            onMouseEnter={() => setHoveredKernelRowKey(`modfull-${idx}`)}
                            onMouseLeave={() => setHoveredKernelRowKey((p) => (p === `modfull-${idx}` ? null : p))}
                            style={{
                              background: hoveredKernelRowKey === `modfull-${idx}` ? t.hoverSurface : (idx % 2 ? t.tableStripe : 'transparent'),
                              boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                              transition: tableRowTransition,
                            }}
                          >
                            <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                              <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                <span
                                  className="fw-semibold font-monospace text-break"
                                  style={{
                                    fontSize: 13,
                                    fontFamily: MONO_FONT_STACK,
                                    color: t.title,
                                  }}
                                >
                                  {row.moduleName}
                                </span>
                              </div>
                            </td>
                            <td className="text-center" style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              {renderModuleStateIndicator(row.loaded, false, false)}
                            </td>
                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              {moduleIntegrityIndicator(Boolean(row.signed))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-4">
                            No kernel modules match your search
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                    Showing {Math.min(fullReportPageRows.length, KERNEL_FULL_PAGE_SIZE)} of {fullModuleFilteredRows.length} items
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      disabled={fullPage === 0}
                      onClick={() => { setFullPage(0); scrollTableIntoView(); }}
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
                      onClick={() => { setFullPage(p => p - 1); scrollTableIntoView(); }}
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
                      {fullPage + 1} / {fullReportTotalPages}
                    </div>
                    <button
                      disabled={fullPage >= fullReportTotalPages - 1}
                      onClick={() => { setFullPage(p => p + 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                        cursor: fullPage >= fullReportTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: fullPage >= fullReportTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >Next</button>
                    <button
                      disabled={fullPage >= fullReportTotalPages - 1}
                      onClick={() => { setFullPage(fullReportTotalPages - 1); scrollTableIntoView(); }}
                      style={{
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                        cursor: fullPage >= fullReportTotalPages - 1 ? 'not-allowed' : 'pointer',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                        opacity: fullPage >= fullReportTotalPages - 1 ? 0.45 : 1,
                        transition: 'all 140ms ease',
                      }}
                    >»</button>
                  </div>
                </div>
              </>
              ) : (
              <Row className="g-3">
                <Col xs={12}>
                  <div className="table-responsive">
                    <Table
                      className="mb-0 align-middle"
                      style={{ borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden', tableLayout: 'fixed', width: '100%', minWidth: isCompactTable ? 640 : 960 }}
                    >
                      <thead>
                        <tr>
                          <th style={{ ...tableHeaderStyle(isDark), width: isCompactTable ? '32%' : '28%', borderTopLeftRadius: 14 }}>Config Name</th>
                          {isCompactTable ? (
                            <>
                              <th style={{ ...tableHeaderStyle(isDark), width: '16%' }}>State</th>
                              <th style={{ ...tableHeaderStyle(isDark), width: '52%', borderTopRightRadius: 14 }}>Details</th>
                            </>
                          ) : (
                            <>
                              <th style={{ ...tableHeaderStyle(isDark), width: '13%' }}>Current State</th>
                              <th style={{ ...tableHeaderStyle(isDark), width: '17%' }}>Recommended State</th>
                              <th className="text-center" style={{ ...tableHeaderStyle(isDark), width: '10%' }}>Risk</th>
                              <th style={{ ...tableHeaderStyle(isDark), width: '32%', borderTopRightRadius: 14 }}>Description</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {fullReportPageRows.length > 0 ? (
                          fullReportPageRows.map((row, idx) => {
                            return (
                              <tr
                                key={`${row.configName}-${row.compliance}-${idx}`}
                                onMouseEnter={() => setHoveredKernelRowKey(`cfgfull-${idx}`)}
                                onMouseLeave={() => setHoveredKernelRowKey((p) => (p === `cfgfull-${idx}` ? null : p))}
                                style={{
                                  background: hoveredKernelRowKey === `cfgfull-${idx}` ? t.hoverSurface : (idx % 2 ? t.tableStripe : 'transparent'),
                                  boxShadow: `inset 0 -1px 0 ${tableRowSeparator}`,
                                  transition: tableRowTransition,
                                }}
                              >
                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                                    <span
                                      className="fw-semibold font-monospace text-truncate"
                                      style={{
                                        flex: '1 1 auto',
                                        minWidth: 0,
                                        fontSize: 13,
                                        fontFamily: MONO_FONT_STACK,
                                        color: t.title,
                                      }}
                                    >
                                      {row.configName}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                  {renderKernelConfigStateIndicator(row.currentState, false, false)}
                                </td>
                                {isCompactTable ? (
                                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                    {renderFullConfigCompactDetails(row)}
                                  </td>
                                ) : (
                                  <>
                                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                      {renderKernelConfigStateIndicator(row.recommendedState, false, false)}
                                    </td>
                                    <td className="text-center" style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                      {renderKernelConfigCompliance(row.compliance)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '14px 16px',
                                        verticalAlign: 'top',
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                        wordBreak: 'break-word',
                                      }}
                                      title={row.reason}
                                    >
                                      {row.reason}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={isCompactTable ? 3 : 5} className="text-center text-muted py-4">
                              No kernel configuration rows match your filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                  <div
                    className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-2"
                    style={{ borderTop: `1px solid ${t.lineStrong}`, transition: THEME_TRANSITION }}
                  >
                  {renderConfigFooterLegends()}
                    <div className="d-flex align-items-center justify-content-between mt-4">
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.muted }}>
                        Showing {Math.min(fullReportPageRows.length, KERNEL_FULL_PAGE_SIZE)} of {fullFilteredRows.length} items
                      </div>
                      <div className="d-flex gap-1">
                        <button
                          disabled={fullPage === 0}
                          onClick={() => { setFullPage(0); scrollTableIntoView(); }}
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
                          onClick={() => { setFullPage(p => p - 1); scrollTableIntoView(); }}
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
                          {fullPage + 1} / {fullReportTotalPages}
                        </div>
                        <button
                          disabled={fullPage >= fullReportTotalPages - 1}
                          onClick={() => { setFullPage(p => p + 1); scrollTableIntoView(); }}
                          style={{
                            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                            borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                            cursor: fullPage >= fullReportTotalPages - 1 ? 'not-allowed' : 'pointer',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                            opacity: fullPage >= fullReportTotalPages - 1 ? 0.45 : 1,
                            transition: 'all 140ms ease',
                          }}
                        >Next</button>
                        <button
                          disabled={fullPage >= fullReportTotalPages - 1}
                          onClick={() => { setFullPage(fullReportTotalPages - 1); scrollTableIntoView(); }}
                          style={{
                            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                            borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                            cursor: fullPage >= fullReportTotalPages - 1 ? 'not-allowed' : 'pointer',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', color: t.title,
                            opacity: fullPage >= fullReportTotalPages - 1 ? 0.45 : 1,
                            transition: 'all 140ms ease',
                          }}
                        >»</button>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
              )}
            </CardBody>
          </Card>
            </Col>

          </Row>
        </div>
      </div>
      <Offcanvas
        show={baselineDrawerOpen}
        onHide={() => setBaselineDrawerOpen(false)}
        placement="end"
        backdrop
        scroll={false}
        style={baselineDrawerStyle}
      >
        <Offcanvas.Header closeButton style={{ background: isDark ? '#020617' : '#ffffff', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
          <div className="d-flex flex-column gap-1 pe-4">
            <span style={{ ...STITCH_TECH_TEXT, color: isDark ? '#94a3b8' : '#64748b' }}>Baseline</span>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="p-4">
            <div
              className="rounded-4 p-4"
              style={{
                background: isDark ? 'rgba(15,23,42,0.72)' : '#f8fafc',
                border: `1px solid ${isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0'}`,
                boxShadow: isDark ? 'none' : '0 20px 40px rgba(15, 23, 42, 0.06)',
                color: isDark ? '#e2e8f0' : '#334155',
                fontSize: 14,
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              <div style={{ marginBottom: 16 }}>Kernel Config Hardening baseline to be established.</div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Baseline Coverage</span>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO_FONT_STACK, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {enabledHardeningConfigs} <span style={{ opacity: 0.4, fontSize: 11 }}>/</span> {totalHardeningBaseline}
                </span>
              </div>
            </div>
          </div>
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
            <span style={{ ...STITCH_TECH_TEXT, color: isDark ? '#94a3b8' : '#64748b' }}>{selectedDeltaRow?.deltaType === 'module' ? 'Kernel Module' : 'Kernel Config'}</span>
            <Offcanvas.Title as="h5" style={{ margin: 0, color: t.title, fontWeight: 700, fontSize: 20 }}>
              {selectedDeltaRow?.itemName}
            </Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          {selectedDeltaRow ? (
            <div className="p-3 p-md-4 d-flex flex-column gap-3">

              {/* ── Status card ── */}
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
                    className="align-self-start"
                    style={kernelDeltaStatusPillStyle(selectedDeltaRow.status, isDark)}
                  >
                    {formatKernelDeltaStatusLabel(selectedDeltaRow.status)}
                  </span>
                  <div style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    {buildDeltaNarrative(selectedDeltaRow)}
                  </div>
                </div>
              </div>

              {/* ── State Change card (FS-style accent header + rows) ── */}
              <div
                className="rounded-4"
                style={{
                  background: isDark ? '#0f172a' : '#ffffff',
                  border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                  overflow: 'hidden',
                  boxShadow: isDark ? 'none' : '0 1px 4px rgba(15,23,42,0.06)',
                }}
              >
                {/* Header */}
                <div
                  className="d-flex align-items-center px-3 py-2"
                  style={{
                    background: isDark ? '#111827' : '#f8fafc',
                    borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                  }}
                >
                  <IconifyIcon
                    icon="solar:sort-by-time-bold-duotone"
                    style={{ fontSize: 15, color: selectedDeltaAccent, flexShrink: 0, marginRight: 8 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: selectedDeltaAccent }}>
                    State Change
                  </span>
                </div>

                {/* Baseline row */}
                <div
                  className="d-flex align-items-start gap-3 px-3 py-3"
                  style={{ borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isDark ? 'rgba(148,163,184,0.14)' : '#f1f5f9',
                      border: `1px solid ${isDark ? 'rgba(148,163,184,0.32)' : '#cbd5e1'}`,
                      marginTop: 1,
                    }}
                  >
                    <IconifyIcon icon="mdi:clock-outline" style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 6 }}>
                      Baseline · <span style={{ fontFamily: MONO_FONT_STACK }}>{baselineId}</span>
                    </div>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                      textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6,
                      color: isDark ? '#e2e8f0' : '#334155',
                      background: isDark ? 'rgba(148,163,184,0.14)' : '#f1f5f9',
                      border: `1px solid ${isDark ? 'rgba(148,163,184,0.30)' : '#cbd5e1'}`,
                      fontFamily: MONO_FONT_STACK,
                    }}>
                      {selectedDeltaRow.baseline}
                    </span>
                  </div>
                </div>

                {/* Current row */}
                <div className="d-flex align-items-start gap-3 px-3 py-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: selectedDeltaRow.status === 'improved'
                        ? (isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4')
                        : (isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2'),
                      border: `1px solid ${selectedDeltaRow.status === 'improved'
                        ? (isDark ? 'rgba(34,197,94,0.32)' : '#bbf7d0')
                        : (isDark ? 'rgba(239,68,68,0.32)' : '#fecaca')}`,
                      marginTop: 1,
                    }}
                  >
                    <IconifyIcon
                      icon={selectedDeltaRow.status === 'improved' ? 'mdi:check' : 'mdi:alert'}
                      style={{
                        fontSize: 14,
                        color: selectedDeltaRow.status === 'improved'
                          ? (isDark ? '#4ade80' : '#16a34a')
                          : (isDark ? '#f87171' : '#dc2626'),
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
                      color: selectedDeltaRow.status === 'improved'
                        ? (isDark ? '#4ade80' : '#15803d')
                        : (isDark ? '#f87171' : '#b91c1c'),
                    }}>
                      Current · <span style={{ fontFamily: MONO_FONT_STACK }}>{targetId}</span>
                    </div>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                      textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6,
                      color: selectedDeltaRow.status === 'improved'
                        ? (isDark ? '#86efac' : '#14532d')
                        : (isDark ? '#fca5a5' : '#991b1b'),
                      background: selectedDeltaRow.status === 'improved'
                        ? (isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4')
                        : (isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2'),
                      border: `1px solid ${selectedDeltaRow.status === 'improved'
                        ? (isDark ? 'rgba(34,197,94,0.35)' : '#bbf7d0')
                        : (isDark ? 'rgba(239,68,68,0.35)' : '#fecaca')}`,
                      fontFamily: MONO_FONT_STACK,
                    }}>
                      {selectedDeltaRow.targetLabel ?? selectedDeltaRow.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Reason / details (table column is Status) ── */}
              <div
                className="rounded-4 p-3"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                }}
              >
                <div className="mb-2" style={STITCH_TECH_TEXT}>Reason</div>
                <div style={{ color: isDark ? '#e2e8f0' : '#334155', fontSize: 14, lineHeight: 1.7, fontFamily: UI_FONT_STACK }}>
                  {selectedDeltaRow.reason}
                </div>
              </div>

              {/* ── Next step card ── */}
              <div
                className="rounded-4 p-3"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
                }}
              >
                <div className="mb-2" style={STITCH_TECH_TEXT}>Next step</div>
                <div style={{ color: isDark ? '#e2e8f0' : '#334155', fontSize: 14, lineHeight: 1.7, fontFamily: UI_FONT_STACK }}>
                  {buildActionLabel(selectedDeltaRow)}
                </div>
              </div>

            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
