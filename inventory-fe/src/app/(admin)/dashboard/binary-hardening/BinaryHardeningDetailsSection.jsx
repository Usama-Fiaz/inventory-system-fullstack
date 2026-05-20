import { forwardRef, useMemo } from 'react';
import { Button, Card, CardBody, CardHeader, Col, Form, OverlayTrigger, Row, Table, Tooltip } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getStatusIcon } from './statusIcons';
import { useLayoutContext } from '@/context/useLayoutContext';
import { GroupExecBadge, StatusBadge } from './hardeningBadges';
import { BH_CARD_RADIUS_PX, BH_CARD_SHADOW, BH_TAB_ACTIVE, BH_TAB_UNDERLINE_PX, getBinaryHardeningTheme } from './binaryHardeningTheme';


const BINARY_COMPILER_LEGEND_ITEMS = [
  { title: 'PIE',          description: 'Randomizes load address to resist jump-oriented attacks.' },
  { title: 'NX',           description: 'Marks stack non-executable.' },
  { title: 'Stack Canary', description: 'Detects stack overflow before return address is corrupted.' },
  { title: 'Debug Symbols',description: 'Stripped in production to prevent reverse engineering.' },
  { title: 'RELRO',        description: 'Hardens GOT/PLT against write-after-use memory exploits.' },
  { title: 'CFI',          description: 'Control-flow integrity stops ROP/JOP code-reuse attacks.' },
];
const BINARY_PERMISSION_LEGEND_ITEMS = [
  { title: 'Setuid/Setgid',   description: 'Runs with elevated user/group privileges.' },
  { title: 'Root',            description: 'Owned by UID 0 and runs as root.' },
  { title: 'World Executable',description: 'Executable by any user.' },
];
const BINARY_CAPABILITY_LEGEND_ITEMS = [
  { title: 'CAP_SYS_PTRACE', description: 'Inspect other processes — major lateral movement risk.' },
  { title: 'CAP_NET_RAW',    description: 'Raw socket access — enables packet capture and spoofing.' },
  { title: 'CAP_SETUID',     description: 'Can change UID — a common privilege escalation path.' },
];

const POLICY_LEGEND = [
  ...BINARY_PERMISSION_LEGEND_ITEMS,
  ...BINARY_COMPILER_LEGEND_ITEMS,
  ...BINARY_CAPABILITY_LEGEND_ITEMS,
];

const TAB_KEYS = { ALL: 'all', NEW: 'new', CONFIG: 'config', REMOVED: 'removed', FULL: 'full' };
const FILE_PERMISSION_KEYS = ['setuid', 'setgid', 'uid_root', 'gid_root', 'group_exec', 'world_exec'];
const COMPILER_FLAG_KEYS = ['canary', 'pie', 'relro', 'partial_relro'];
const CAP_KEYS = ['capabilities', 'capability', 'cap'];

function matchesDetailSearch(query, ...parts) {
  const s = String(query ?? '').trim().toLowerCase();
  if (!s) return true;
  return parts.some((p) => String(p ?? '').toLowerCase().includes(s));
}

function normalizeConfigName(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function parseCapability(item) {
  if (typeof item === 'string') return { name: item, mode: '', impact: '', description: '' };
  if (Array.isArray(item)) return { name: String(item[0] ?? ''), mode: String(item[1] ?? ''), impact: '', description: '' };
  if (item && typeof item === 'object') return {
    name: String(item.name ?? item.capability ?? ''),
    mode: String(item.mode_string ?? item.mode ?? ''),
    impact: String(item.impact ?? ''),
    description: String(item.description ?? ''),
  };
  return { name: '', mode: '', impact: '', description: '' };
}

function getCapabilityList(row) {
  const caps = Array.isArray(row?.capabilities) ? row.capabilities : [];
  return caps.map(parseCapability).filter((c) => c.name);
}

function renderTooltip(text, id) {
  return <Tooltip id={id} style={{ whiteSpace: 'pre-line' }}>{text}</Tooltip>;
}

function summarizeCapabilitiesDiff(delta) {
  const out = { removed: [], added: [], improvedModes: [], regressedModes: [] };
  const pos = Array.isArray(delta?.config_positive_diffs) ? delta.config_positive_diffs : [];
  const neg = Array.isArray(delta?.config_negative_diffs) ? delta.config_negative_diffs : [];
  for (const d of pos) {
    const name = normalizeConfigName(d?.config_name);
    if (!CAP_KEYS.includes(name)) continue;
    out.removed.push(...(Array.isArray(d?.cap_removed) ? d.cap_removed : []).map((c) => String(c?.name ?? '').trim()).filter(Boolean));
    out.improvedModes.push(
      ...(Array.isArray(d?.cap_mode_diffs) ? d.cap_mode_diffs : [])
        .map((c) => ({ capability: String(c?.capability ?? ''), previous_mode: String(c?.previous_mode ?? ''), current_mode: String(c?.current_mode ?? '') }))
        .filter((c) => c.capability)
    );
  }
  for (const d of neg) {
    const name = normalizeConfigName(d?.config_name);
    if (!CAP_KEYS.includes(name)) continue;
    out.added.push(
      ...(Array.isArray(d?.cap_new) ? d.cap_new : [])
        .map((c) => ({ name: String(c?.name ?? '').trim(), mode: String(c?.mode ?? '').trim() }))
        .filter((c) => c.name)
    );
    out.regressedModes.push(
      ...(Array.isArray(d?.cap_mode_diffs) ? d.cap_mode_diffs : [])
        .map((c) => ({ capability: String(c?.capability ?? ''), previous_mode: String(c?.previous_mode ?? ''), current_mode: String(c?.current_mode ?? '') }))
        .filter((c) => c.capability)
    );
  }
  return out;
}

function getTransitionForConfig(delta, key) {
  const pos = Array.isArray(delta?.config_positive_diffs) ? delta.config_positive_diffs : [];
  const neg = Array.isArray(delta?.config_negative_diffs) ? delta.config_negative_diffs : [];
  for (const d of pos) {
    const cfg = normalizeConfigName(d?.config_name);
    if (cfg === key) return { kind: 'improved', previous_value: d?.previous_value, current_value: d?.current_value };
  }
  for (const d of neg) {
    const cfg = normalizeConfigName(d?.config_name);
    if (cfg === key) return { kind: 'regression', previous_value: d?.previous_value, current_value: d?.current_value };
  }
  return null;
}

function formatYesNo(v) {
  if (v === 1 || v === true || String(v).toLowerCase() === '1') return 'Yes';
  if (v === 0 || v === false || String(v).toLowerCase() === '0') return 'No';
  return String(v ?? '—');
}

function DiffTabButton({ active, children, onClick, tabInactiveColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: active ? BH_TAB_ACTIVE : (tabInactiveColor ?? '#64748b'),
        fontWeight: active ? 600 : 500,
        fontSize: 13,
        padding: '10px 14px 8px',
        marginBottom: -1,
        borderBottom: `${BH_TAB_UNDERLINE_PX}px solid ${active ? BH_TAB_ACTIVE : 'transparent'}`,
        lineHeight: 1.45,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function TransitionPill({ kind, previousValue, currentValue }) {
  const improved = kind === 'improved';
  return (
    <span
      className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1"
      style={{
        background: improved ? '#ecfdf5' : '#fef2f2',
        border: `1px solid ${improved ? '#bbf7d0' : '#fecaca'}`,
        color: improved ? '#166534' : '#991b1b',
        fontWeight: 600,
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {formatYesNo(previousValue)}
      <IconifyIcon icon="solar:arrow-right-linear" />
      {formatYesNo(currentValue)}
    </span>
  );
}

function ChangeBadge({ type, isDark }) {
  const map = isDark
    ? {
        new: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', icon: 'solar:add-circle-bold', label: 'New Binary' },
        modified: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', icon: 'solar:refresh-bold', label: 'Modified' },
        improved: { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', icon: getStatusIcon('improved'), label: 'Improvement' },
        regression: { bg: 'rgba(248, 113, 113, 0.2)', color: '#f87171', icon: getStatusIcon('regressed'), label: 'Regression' },
        removed: { bg: 'rgba(248, 113, 113, 0.2)', color: '#f87171', icon: 'solar:minus-circle-bold', label: 'Removed Binary' },
      }
    : {
        new: { bg: '#fef3c7', color: '#92400e', icon: 'solar:add-circle-bold', label: 'New Binary' },
        modified: { bg: '#fef9c3', color: '#854d0e', icon: 'solar:refresh-bold', label: 'Modified' },
        improved: { bg: '#dcfce7', color: '#166534', icon: getStatusIcon('improved'), label: 'Improvement' },
        regression: { bg: '#fee2e2', color: '#b91c1c', icon: getStatusIcon('regressed'), label: 'Regression' },
        removed: { bg: '#fee2e2', color: '#b91c1c', icon: 'solar:minus-circle-bold', label: 'Removed Binary' },
      };
  const m = map[type] ?? map.modified;
  return (
    <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1" style={{ background: m.bg, color: m.color, fontSize: 12, fontWeight: 600 }}>
      <IconifyIcon icon={m.icon} style={{ fontSize: 14 }} />
      {m.label}
    </span>
  );
}

function CapabilityCountCell({ row }) {
  const list = getCapabilityList(row);
  const label = list.length
    ? list.map((c) => {
        let s = c.name;
        if (c.mode) s += ` (${c.mode})`;
        if (c.impact) s += ` — ${c.impact}`;
        return s;
      }).join('\n')
    : 'No capabilities';
  const countLabel = `${list.length} ${list.length === 1 ? 'cap' : 'caps'}`;
  return (
    <OverlayTrigger placement="top" overlay={renderTooltip(label, `cap-list-${row?.name ?? 'x'}`)}>
      <span className="d-inline-flex rounded-pill px-2 py-1" style={{ border: '1px solid #d1d5db', background: '#f8fafc', fontWeight: 600, fontSize: 12, cursor: 'help' }}>
        {countLabel}
      </span>
    </OverlayTrigger>
  );
}

function CapabilityDiffPills({ delta }) {
  const summary = summarizeCapabilitiesDiff(delta);
  const pills = [];
  if (summary.removed.length > 0) {
    pills.push({
      label: `${summary.removed.length} removed`,
      title: summary.removed.join('\n'),
      style: { background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534' },
    });
  }
  if (summary.added.length > 0) {
    pills.push({
      label: `${summary.added.length} added`,
      title: summary.added.map((c) => `${c.name}${c.mode ? ` (${c.mode})` : ''}`).join('\n'),
      style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' },
    });
  }
  if (summary.regressedModes.length > 0) {
    pills.push({
      label: `${summary.regressedModes.length} regression`,
      title: summary.regressedModes.map((c) => `${c.capability}: ${c.previous_mode} -> ${c.current_mode}`).join('\n'),
      style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' },
    });
  }
  if (summary.improvedModes.length > 0) {
    pills.push({
      label: `${summary.improvedModes.length} improvement`,
      title: summary.improvedModes.map((c) => `${c.capability}: ${c.previous_mode} -> ${c.current_mode}`).join('\n'),
      style: { background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534' },
    });
  }
  if (pills.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="d-flex flex-wrap gap-1">
      {pills.map((p, idx) => (
        <OverlayTrigger key={idx} placement="top" overlay={renderTooltip(p.title, `cap-diff-${idx}`)}>
          <span className="d-inline-flex rounded-pill px-2 py-1" style={{ ...p.style, fontWeight: 700, fontSize: 11, cursor: 'help' }}>
            {p.label}
          </span>
        </OverlayTrigger>
      ))}
    </div>
  );
}

function BoolCell({ value, risky }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  return <StatusBadge value={value} yesIsSafe={!risky} />;
}

function cellGroupDivider(t) {
  return { borderLeft: `1px solid ${t.divider ?? t.border}` };
}

const BinaryHardeningDetailsSection = forwardRef(function BinaryHardeningDetailsSection(
  {
    activeTab,
    onTabChange,
    detailSearch = '',
    onDetailSearchChange,
    binariesAdded,
    binariesRemoved,
    binariesDelta,
    violations,
    setPage,
    pageSize,
    setPageSize,
    pageRows,
    totalPages,
    currentPage,
    start,
    formatNumber,
    PAGE_SIZE_OPTIONS,
    violationsFilteredCount,
  },
  ref
) {
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const t = getBinaryHardeningTheme(isDark);

  const counts = useMemo(
    () => ({
      nNew: binariesAdded?.length ?? 0,
      nRemoved: binariesRemoved?.length ?? 0,
      nConfig: binariesDelta?.length ?? 0,
    }),
    [binariesAdded, binariesRemoved, binariesDelta]
  );

  const tabs = [
    { key: TAB_KEYS.ALL, label: 'All Changes' },
    { key: TAB_KEYS.NEW, label: `New Binaries (${counts.nNew})` },
    { key: TAB_KEYS.CONFIG, label: `Config Changes (${counts.nConfig})` },
    { key: TAB_KEYS.REMOVED, label: `Removed Binaries (${counts.nRemoved})` },
    { key: TAB_KEYS.FULL, label: 'Full Table' },
  ];

  const violationsByName = useMemo(() => {
    const map = new Map();
    for (const v of violations ?? []) map.set(String(v?.name ?? '').trim(), v);
    return map;
  }, [violations]);

  const addedFiltered = useMemo(
    () =>
      (binariesAdded ?? []).filter((entry) => {
        const path = String(entry?.name ?? entry?.binary_violations?.name ?? '').trim();
        return path && matchesDetailSearch(detailSearch, path);
      }),
    [binariesAdded, detailSearch]
  );

  const removedFiltered = useMemo(
    () =>
      (binariesRemoved ?? []).filter((entry) => {
        const path = String(entry?.name ?? '').trim();
        return path && matchesDetailSearch(detailSearch, path);
      }),
    [binariesRemoved, detailSearch]
  );

  const deltaFiltered = useMemo(
    () =>
      (binariesDelta ?? []).filter((d) => {
        const path = String(d?.name ?? '').trim();
        if (!path) return false;
        const pos = Array.isArray(d?.config_positive_diffs) ? d.config_positive_diffs.map((x) => x?.config_name).join(' ') : '';
        const neg = Array.isArray(d?.config_negative_diffs) ? d.config_negative_diffs.map((x) => x?.config_name).join(' ') : '';
        return matchesDetailSearch(detailSearch, path, pos, neg);
      }),
    [binariesDelta, detailSearch]
  );

  const showChangeColumn = activeTab === TAB_KEYS.ALL;
  const hasSearchQuery = String(detailSearch ?? '').trim().length > 0;
  const baseColCount = 1 + FILE_PERMISSION_KEYS.length + COMPILER_FLAG_KEYS.length;
  const totalColumns = (showChangeColumn ? 1 : 0) + 1 + baseColCount;
  const showAddedRows = activeTab === TAB_KEYS.NEW || activeTab === TAB_KEYS.ALL;
  const showDeltaRows = activeTab === TAB_KEYS.CONFIG || activeTab === TAB_KEYS.ALL;
  const showRemovedRows = activeTab === TAB_KEYS.REMOVED || activeTab === TAB_KEYS.ALL;
  const fullFilteredBySearch = useMemo(() => {
    if (!hasSearchQuery) return [];
    return (violations ?? []).filter((v) => matchesDetailSearch(detailSearch, v?.name));
  }, [hasSearchQuery, violations, detailSearch]);
  const hasAddedSearchMatches = hasSearchQuery && addedFiltered.length > 0;
  const hasDeltaSearchMatches = hasSearchQuery && deltaFiltered.length > 0;
  const hasRemovedSearchMatches = hasSearchQuery && removedFiltered.length > 0;
  const hasFullSearchMatches = hasSearchQuery && fullFilteredBySearch.length > 0;

  const renderGroupedHeader = () => (
    <>
      <tr style={{ background: t.headerBg }}>
        {showChangeColumn ? <th rowSpan={2} className="border-0 py-2 ps-3">Change</th> : null}
        <th rowSpan={2} className="border-0 py-2">File Name</th>
        <th rowSpan={2} className="border-0 py-2">Capabilities</th>
        <th colSpan={6} className="border-0 text-center py-2">File Permissions</th>
        <th colSpan={4} className="border-0 text-center py-2">Compiler Flags</th>
      </tr>
      <tr style={{ background: t.subheaderBg, fontSize: 11, color: t.muted }}>
        <th className="py-2 border-0 text-uppercase fw-semibold">SetUID</th>
        <th className="py-2 border-0 text-uppercase fw-semibold">SetGID</th>
        <th className="py-2 border-0 text-uppercase fw-semibold">Root UID</th>
        <th className="py-2 border-0 text-uppercase fw-semibold">Root GID</th>
        <th className="py-2 border-0 text-uppercase fw-semibold">Group Exec</th>
        <th className="py-2 border-0 text-uppercase fw-semibold">World Exec</th>
        <th className="py-2 border-0 text-uppercase fw-semibold" style={{ background: t.headerBg, borderLeft: `1px solid ${t.border}` }}>CANARY</th>
        <th className="py-2 border-0 text-uppercase fw-semibold" style={{ background: t.headerBg }}>PIE</th>
        <th className="py-2 border-0 text-uppercase fw-semibold" style={{ background: t.headerBg }}>RELRO</th>
        <th className="py-2 border-0 text-uppercase fw-semibold" style={{ background: t.headerBg }}>Partial RELRO</th>
      </tr>
    </>
  );

  const renderSnapshotCells = (row) => (
    <>
      <td><CapabilityCountCell row={row} /></td>
      <td><BoolCell value={row?.setuid} risky /></td>
      <td><BoolCell value={row?.setgid} risky /></td>
      <td><BoolCell value={row?.uid_root} risky /></td>
      <td><BoolCell value={row?.gid_root} risky /></td>
      <td><GroupExecBadge value={row?.group_exec} /></td>
      <td><BoolCell value={row?.world_exec} risky /></td>
      <td><BoolCell value={row?.canary} /></td>
      <td><BoolCell value={row?.pie} /></td>
      <td><BoolCell value={row?.relro} /></td>
      <td><BoolCell value={row?.partial_relro} /></td>
    </>
  );

  const renderDeltaCells = (delta, row) => (
    <>
      <td><CapabilityDiffPills delta={delta} /></td>
      {FILE_PERMISSION_KEYS.map((k) => {
        const tr = getTransitionForConfig(delta, k);
        return <td key={k}>{tr ? <TransitionPill kind={tr.kind} previousValue={tr.previous_value} currentValue={tr.current_value} /> : <BoolCell value={row?.[k]} risky={k !== 'group_exec'} />}</td>;
      })}
      {COMPILER_FLAG_KEYS.map((k) => {
        const tr = getTransitionForConfig(delta, k);
        return <td key={k}>{tr ? <TransitionPill kind={tr.kind} previousValue={tr.previous_value} currentValue={tr.current_value} /> : <BoolCell value={row?.[k]} />}</td>;
      })}
    </>
  );

  const renderDeltaLabels = (delta) => {
    const pos = Array.isArray(delta?.config_positive_diffs) ? delta.config_positive_diffs : [];
    const neg = Array.isArray(delta?.config_negative_diffs) ? delta.config_negative_diffs : [];
    return (
      <div className="d-flex flex-wrap gap-1">
        <ChangeBadge type="modified" isDark={isDark} />
        {neg.length > 0 ? <ChangeBadge type="regression" isDark={isDark} /> : null}
        {pos.length > 0 ? <ChangeBadge type="improved" isDark={isDark} /> : null}
      </div>
    );
  };

  return (
    <Row className="mb-3" ref={ref}>
      <Col>
        <Card className="border-0" style={{ background: t.cardBg, borderRadius: BH_CARD_RADIUS_PX, border: `1px solid ${t.border}`, boxShadow: BH_CARD_SHADOW, overflow: 'hidden' }}>
          <CardHeader className="border-bottom py-3" style={{ background: t.cardBg }}>
            <h4 className="mb-1 fw-bold" style={{ fontSize: 18, color: t.title }}>Binary Hardening Details</h4>
            <div style={{ fontSize: 12, color: t.muted }}>Professional delta table grouped by risk category and hardening class</div>
          </CardHeader>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 px-3 pt-3 pb-2" style={{ background: t.tabStripBg, borderBottom: `1px solid ${t.divider ?? t.border}` }}>
            <div className="d-flex flex-wrap align-items-end gap-1 flex-grow-1" style={{ minWidth: 0 }}>
              {tabs.map((tab) => (
                <DiffTabButton key={tab.key} active={activeTab === tab.key} onClick={() => onTabChange(tab.key)} tabInactiveColor={t.muted}>
                  {tab.label}
                </DiffTabButton>
              ))}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
              <Form.Control
                type="search"
                size="sm"
                placeholder="Search files..."
                value={detailSearch}
                onChange={(e) => onDetailSearchChange?.(e.target.value)}
                style={{ width: 220, borderRadius: 6, border: `1px solid ${t.border}`, fontSize: 12, background: isDark ? t.cardBg : '#fff', color: t.title }}
              />
            </div>
          </div>

          <CardBody className="p-0">
            {hasSearchQuery ? (
              <div className="table-responsive">
                <Table className="mb-0 align-middle" style={{ fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>{renderGroupedHeader()}</thead>
                  <tbody>
                    {hasAddedSearchMatches && (
                      <tr style={{ background: t.subheaderBg }}>
                        <td colSpan={totalColumns} className="fw-semibold">Matches in New Binaries ({addedFiltered.length})</td>
                      </tr>
                    )}
                    {hasAddedSearchMatches && addedFiltered.map((entry, idx) => {
                      const row = entry?.binary_violations ?? entry;
                      const path = String(entry?.name ?? row?.name ?? '').trim();
                      if (!path) return null;
                      return (
                        <tr key={`s-add-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2"><ChangeBadge type="new" isDark={isDark} /></td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          {renderSnapshotCells(row)}
                        </tr>
                      );
                    })}

                    {hasDeltaSearchMatches && (
                      <tr style={{ background: t.subheaderBg }}>
                        <td colSpan={totalColumns} className="fw-semibold">Matches in Config Changes ({deltaFiltered.length})</td>
                      </tr>
                    )}
                    {hasDeltaSearchMatches && deltaFiltered.map((delta, idx) => {
                      const path = String(delta?.name ?? '').trim();
                      const row = violationsByName.get(path);
                      return (
                        <tr key={`s-delta-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2">{renderDeltaLabels(delta)}</td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          {renderDeltaCells(delta, row)}
                        </tr>
                      );
                    })}

                    {hasRemovedSearchMatches && (
                      <tr style={{ background: t.subheaderBg }}>
                        <td colSpan={totalColumns} className="fw-semibold">Matches in Removed Binaries ({removedFiltered.length})</td>
                      </tr>
                    )}
                    {hasRemovedSearchMatches && removedFiltered.map((entry, idx) => {
                      const path = String(entry?.name ?? '').trim();
                      if (!path) return null;
                      return (
                        <tr key={`s-rem-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2"><ChangeBadge type="removed" isDark={isDark} /></td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          <td colSpan={baseColCount} className="text-muted">—</td>
                        </tr>
                      );
                    })}

                    {hasFullSearchMatches && (
                      <tr style={{ background: t.subheaderBg }}>
                        <td colSpan={totalColumns} className="fw-semibold">Matches in Full Table ({fullFilteredBySearch.length})</td>
                      </tr>
                    )}
                    {hasFullSearchMatches && fullFilteredBySearch.map((row, idx) => (
                      <tr key={`s-full-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                        {showChangeColumn ? <td className="ps-3 py-2 text-muted">—</td> : null}
                        <td className="font-monospace fw-semibold py-2">{row?.name}</td>
                        {renderSnapshotCells(row)}
                      </tr>
                    ))}

                    {!hasAddedSearchMatches && !hasDeltaSearchMatches && !hasRemovedSearchMatches && !hasFullSearchMatches && (
                      <tr><td colSpan={totalColumns} className="text-center text-muted py-4">No rows match your search</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            ) : activeTab === TAB_KEYS.FULL ? (
              <>
                {pageRows.length > 0 ? (
                  <>
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle table-dashboard">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>{renderGroupedHeader()}</thead>
                        <tbody>
                          {pageRows.map((row, idx) => (
                            <tr key={idx} style={{ background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                              <td className="fw-semibold font-monospace">{row.name}</td>
                              {renderSnapshotCells(row)}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top" style={{ background: isDark ? t.subheaderBg : undefined }}>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Showing {formatNumber(start + 1)}–{formatNumber(Math.min(start + pageSize, violationsFilteredCount ?? 0))} of {formatNumber(violationsFilteredCount ?? 0)}</span>
                        <Form.Select size="sm" className="w-auto" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                          {PAGE_SIZE_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
                        </Form.Select>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <Button variant="outline-secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><IconifyIcon icon="bx:left-arrow-alt" /></Button>
                        <span className="px-2 small">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline-secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><IconifyIcon icon="bx:right-arrow-alt" /></Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <h5>No binary violations found</h5>
                    <p className="mb-0">All security checks passed successfully.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="table-responsive">
                <Table className="mb-0 align-middle" style={{ fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>{renderGroupedHeader()}</thead>
                  <tbody>
                    {showAddedRows && addedFiltered.map((entry, idx) => {
                      const row = entry?.binary_violations ?? entry;
                      const path = String(entry?.name ?? row?.name ?? '').trim();
                      if (!path) return null;
                      return (
                        <tr key={`add-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2"><ChangeBadge type="new" isDark={isDark} /></td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          {renderSnapshotCells(row)}
                        </tr>
                      );
                    })}

                    {showDeltaRows && deltaFiltered.map((delta, idx) => {
                      const path = String(delta?.name ?? '').trim();
                      const row = violationsByName.get(path);
                      return (
                        <tr key={`delta-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2">{renderDeltaLabels(delta)}</td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          {renderDeltaCells(delta, row)}
                        </tr>
                      );
                    })}

                    {showRemovedRows && removedFiltered.map((entry, idx) => {
                      const path = String(entry?.name ?? '').trim();
                      if (!path) return null;
                      return (
                        <tr key={`rem-${idx}`} style={{ borderColor: t.border, background: idx % 2 ? 'rgba(148,163,184,0.06)' : 'transparent' }}>
                          {showChangeColumn ? <td className="ps-3 py-2"><ChangeBadge type="removed" isDark={isDark} /></td> : null}
                          <td className="font-monospace fw-semibold py-2">{path}</td>
                          <td colSpan={baseColCount} className="text-muted">—</td>
                        </tr>
                      );
                    })}

                    {activeTab === TAB_KEYS.NEW && addedFiltered.length === 0 && <tr><td colSpan={totalColumns} className="text-center text-muted py-4">No new binaries in diff</td></tr>}
                    {activeTab === TAB_KEYS.REMOVED && removedFiltered.length === 0 && <tr><td colSpan={totalColumns} className="text-center text-muted py-4">No removed binaries</td></tr>}
                    {activeTab === TAB_KEYS.CONFIG && deltaFiltered.length === 0 && <tr><td colSpan={totalColumns} className="text-center text-muted py-4">No config changes</td></tr>}
                    {activeTab === TAB_KEYS.ALL && addedFiltered.length === 0 && removedFiltered.length === 0 && deltaFiltered.length === 0 && <tr><td colSpan={totalColumns} className="text-center text-muted py-4">No changes in this diff</td></tr>}
                  </tbody>
                </Table>
              </div>
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
              transition: 'all 0.3s ease',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-1">
              <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)', border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)'}` }}>
                <IconifyIcon icon="solar:info-circle-linear" style={{ fontSize: 13, color: isDark ? '#38bdf8' : '#2563eb' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#93c5fd' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardening Legend</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
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
        </Card>
      </Col>
    </Row>
  );
});

export default BinaryHardeningDetailsSection;
export { TAB_KEYS };
