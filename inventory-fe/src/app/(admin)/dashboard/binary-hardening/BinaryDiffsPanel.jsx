import { Button, Card, CardBody, CardHeader, Col, Form, Row } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import { TAB_KEYS } from './BinaryHardeningDetailsSection';
import { BH_CARD_RADIUS_PX, BH_CARD_SHADOW, getBinaryHardeningTheme } from './binaryHardeningTheme';

const BASE = {
  fontSans: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  radiusLg: BH_CARD_RADIUS_PX,
  radiusMd: 8,
  radiusSm: 6,
  shadow: BH_CARD_SHADOW,
};

const PREVIEW = 3;
const COMPILER_FLAGS = new Set(['canary', 'pie', 'relro', 'partial_relro']);

const scrollBox = {
  height: 72,
  overflowY: 'auto',
  overflowX: 'hidden',
};

function normalizeConfigName(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function classifyDiffs(items = []) {
  const out = { compiler: [], capabilities: [] };
  for (const d of items) {
    const cfg = normalizeConfigName(d?.config_name);
    if (cfg === 'capabilities') out.capabilities.push(d);
    else if (COMPILER_FLAGS.has(cfg)) out.compiler.push(d);
  }
  return out;
}

function formatAddedBullet(entry, formatYesNo) {
  const bv = entry?.binary_violations;
  const path = String(entry?.name ?? bv?.name ?? '').trim();
  if (!path) return null;
  const su = formatYesNo(bv?.setuid);
  const sg = formatYesNo(bv?.setgid);
  return { path, suffix: `(SetUID:${su}, SetGID:${sg})` };
}

function formatTransitionLine(d, formatYesNo, boldCur, theme) {
  const cur = formatYesNo(d.current_value);
  const prev = formatYesNo(d.previous_value);
  const name = d.binaryName || '—';
  const cfg = d.config_name || '—';
  return (
    <span style={{ fontSize: 12, color: theme.muted, lineHeight: 1.45 }}>
      <span style={{ fontFamily: BASE.fontMono, fontWeight: 600, color: theme.title }}>{name}</span>
      <span style={{ color: theme.muted }}>: {cfg} </span>
      <span style={{ color: theme.muted }}>({prev} </span>
      <span style={{ fontWeight: 700, color: boldCur }}>→ {cur}</span>
      <span style={{ color: theme.muted }}>)</span>
    </span>
  );
}

function MiniBucket({ title, color, items, more, renderItem, muted, unavailable, themeBg }) {
  return (
    <div style={{ background: themeBg, borderRadius: 8, border: '1px solid rgba(148,163,184,0.18)', padding: '10px 12px' }}>
      <div className="fw-semibold mb-1" style={{ fontSize: 12, letterSpacing: '.01em', color }}>
        {title}
      </div>
      {unavailable ? (
        <span style={{ fontSize: 12, color: muted }}>Diff data unavailable</span>
      ) : items.length === 0 ? (
        <span style={{ fontSize: 12, color: muted }}>No entries</span>
      ) : (
        <div style={scrollBox}>
          {items.map(renderItem)}
          {more > 0 && <div style={{ fontSize: 12, color: muted }}>+{more} more</div>}
        </div>
      )}
    </div>
  );
}

export default function BinaryDiffsPanel({
  report,
  activeDetailTab,
  activeDiffCard,
  hasBinaryDiffs,
  binariesAdded,
  addedNames,
  removedNames,
  removedTop,
  addedMore,
  removedMore,
  positiveUnique,
  negativeUnique,
  formatYesNo,
  onOpenDetails,
}) {
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const t = getBinaryHardeningTheme(isDark);

  const jobId = report?.job_id ?? report?.report?.job_id;
  const addedPreview = binariesAdded.slice(0, PREVIEW);
  const removedPreview = removedTop.slice(0, PREVIEW);

  const positive = classifyDiffs(positiveUnique);
  const negative = classifyDiffs(negativeUnique);
  const compilerImprovementPreview = positive.compiler.slice(0, PREVIEW);
  const compilerRegressionPreview = negative.compiler.slice(0, PREVIEW);
  const capabilityImprovementPreview = positive.capabilities.slice(0, PREVIEW);
  const capabilityRegressionPreview = negative.capabilities.slice(0, PREVIEW);
  const riskSummary = {
    added: hasBinaryDiffs ? binariesAdded.length : 0,
    removed: hasBinaryDiffs ? removedNames.length : 0,
    regressions: hasBinaryDiffs ? (negative.compiler.length + negative.capabilities.length) : 0,
    improvements: hasBinaryDiffs ? (positive.compiler.length + positive.capabilities.length) : 0,
  };

  const cardHighlight = (tab, cardId = tab) => {
    const active = tab === TAB_KEYS.CONFIG
      ? activeDetailTab === TAB_KEYS.CONFIG && activeDiffCard === cardId
      : activeDetailTab === tab && activeDiffCard === cardId;
    if (!active) return {};
    return {
      border: `1px solid ${isDark ? 'rgba(92, 89, 182, 0.75)' : 'rgba(92, 89, 182, 0.55)'}`,
      boxShadow: isDark ? '0 0 0 1px rgba(92,89,182,0.25)' : '0 0 0 1px rgba(92,89,182,0.16)',
    };
  };

  const cardClickProps = (tab, cardId = tab) => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => onOpenDetails?.(tab, cardId),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenDetails?.(tab, cardId);
      }
    },
  });

  return (
    <Row className="mb-3">
      <Col>
        <Card className="border-0" style={{ fontFamily: BASE.fontSans, background: t.cardBg, borderRadius: BASE.radiusLg, boxShadow: BASE.shadow, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <CardHeader className="border-0 d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ padding: '20px 20px 12px', background: t.cardBg }}>
            <div>
              <h4 className="mb-1" style={{ fontSize: 20, fontWeight: 700, color: t.title, letterSpacing: '-0.02em' }}>Binary Diffs</h4>
              <div style={{ fontSize: 12, color: t.muted }}>Delta view grouped by risk and category</div>
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: t.muted }}>
                <span style={{ color: t.muted, fontWeight: 600 }}>Baseline</span>
                <span style={{ color: t.greenText, fontWeight: 700 }}>v1.0.1</span>
                <IconifyIcon icon="solar:arrow-right-linear" style={{ fontSize: 16, color: t.muted }} />
                <span style={{ color: t.muted, fontWeight: 600 }}>Current</span>
                <span style={{ color: t.title, fontWeight: 700 }}>v1.0.2</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Compare:</span>
                <Form.Select size="sm" aria-label="Compare version" style={{ width: 110, fontSize: 12, borderColor: t.border, borderRadius: BASE.radiusSm, color: t.title, background: isDark ? t.cardBg : undefined }} defaultValue="v1.0.2">
                  <option value="v1.0.2">v1.0.2</option>
                  <option value="v1.0.1">v1.0.1</option>
                </Form.Select>
              </div>
            </div>
          </CardHeader>

          <CardBody style={{ padding: '0 20px 20px' }}>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className="rounded-pill px-2 py-1" style={{ fontSize: 11, fontWeight: 700, fontFamily: BASE.fontMono, letterSpacing: '0.03em', textTransform: 'uppercase', border: `1px solid ${t.border}`, color: t.muted }}>
                +{riskSummary.added} Added
              </span>
              <span className="rounded-pill px-2 py-1" style={{ fontSize: 11, fontWeight: 700, fontFamily: BASE.fontMono, letterSpacing: '0.03em', textTransform: 'uppercase', border: `1px solid ${t.border}`, color: t.muted }}>
                {riskSummary.removed} Removed
              </span>
              <span className="rounded-pill px-2 py-1" style={{ fontSize: 11, fontWeight: 700, border: '1px solid rgba(239,68,68,0.25)', color: t.redText, background: t.redBg }}>
                {riskSummary.regressions} Regressions
              </span>
              <span className="rounded-pill px-2 py-1" style={{ fontSize: 11, fontWeight: 700, border: '1px solid rgba(16,185,129,0.25)', color: t.greenText, background: t.greenBg }}>
                {riskSummary.improvements} Improvements
              </span>
            </div>
            <Row className="g-3">
              <Col md={6}>
                <div className="h-100 d-flex flex-column" {...cardClickProps(TAB_KEYS.NEW, 'new')} style={{ background: t.amberBg ?? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fff7ed'), border: `1px solid ${t.border}`, borderRadius: BASE.radiusMd, padding: '16px', minHeight: 220, cursor: onOpenDetails ? 'pointer' : 'default', transition: 'all 180ms ease', ...cardHighlight(TAB_KEYS.NEW, 'new') }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="d-flex align-items-center justify-content-center" style={{ width: 24, height: 24, background: t.amberText ?? (isDark ? '#f59e0b' : '#b45309'), borderRadius: 6 }}>
                      <span style={{ color: isDark ? '#0f172a' : '#fff', fontSize: 14, fontWeight: 700 }}>+</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.amberText ?? (isDark ? '#fbbf24' : '#92400e') }}>+{hasBinaryDiffs ? binariesAdded.length : 0} Binaries Added</span>
                  </div>
                  {!hasBinaryDiffs ? (
                    <span style={{ fontSize: 13, color: t.muted }}>Diff data unavailable for this response</span>
                  ) : addedNames.length === 0 ? (
                    <span style={{ fontSize: 13, color: t.muted }}>No additions</span>
                  ) : (
                    <>
                      <div style={{ height: 130, overflowY: 'auto' }} className="flex-grow-1">
                        {addedPreview.map((entry, idx) => {
                          const bullet = formatAddedBullet(entry, formatYesNo);
                          if (!bullet) return null;
                          return (
                            <div key={`${bullet.path}:${idx}`} className="mb-2" style={{ fontSize: 13 }}>
                              <span style={{ color: t.muted }}>• </span>
                              <span style={{ fontFamily: BASE.fontMono, fontWeight: 600, color: t.title }}>{bullet.path}</span>
                              <span style={{ color: t.muted }}> {bullet.suffix}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-auto pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(180, 83, 9, 0.2)'}` }}>
                        <span style={{ fontSize: 13, color: t.mutedLight }}>{addedMore > 0 ? `+${addedMore} more` : '\u00a0'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.01em', color: t.amberText ?? (isDark ? '#fbbf24' : '#92400e') }}>View in table →</span>
                      </div>
                    </>
                  )}
                </div>
              </Col>

              <Col md={6}>
                <div className="h-100 d-flex flex-column" {...cardClickProps(TAB_KEYS.REMOVED, 'removed')} style={{ background: t.redBg, border: `1px solid ${t.border}`, borderRadius: BASE.radiusMd, padding: '16px', minHeight: 220, cursor: onOpenDetails ? 'pointer' : 'default', transition: 'all 180ms ease', ...cardHighlight(TAB_KEYS.REMOVED, 'removed') }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="d-flex align-items-center justify-content-center" style={{ width: 26, height: 26, background: t.redText, borderRadius: 6 }}>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>−</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.redText }}>{hasBinaryDiffs ? removedNames.length : 0} Binaries Removed</span>
                  </div>
                  {!hasBinaryDiffs ? (
                    <span style={{ fontSize: 13, color: t.muted }}>Diff data unavailable for this response</span>
                  ) : removedNames.length === 0 ? (
                    <span style={{ fontSize: 13, color: t.muted }}>No removals</span>
                  ) : (
                    <>
                      <div style={{ height: 130, overflowY: 'auto' }} className="flex-grow-1">
                        {removedPreview.map((name, idx) => (
                          <div key={`${name}:${idx}`} className="mb-2" style={{ fontSize: 13 }}>
                            <span style={{ color: t.muted }}>• </span>
                            <span style={{ fontFamily: BASE.fontMono, fontWeight: 600, color: t.redText }}>{name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-auto pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(248,113,113,0.25)' : 'rgba(164,22,26,0.15)'}` }}>
                        <span style={{ fontSize: 13, color: t.mutedLight }}>{removedMore > 0 ? `+${removedMore} more` : '\u00a0'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.01em', color: t.redText }}>View in table →</span>
                      </div>
                    </>
                  )}
                </div>
              </Col>

              <Col md={6}>
                <div className="h-100 d-flex flex-column" {...cardClickProps(TAB_KEYS.CONFIG, 'compiler')} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: BASE.radiusMd, padding: '16px', minHeight: 220, cursor: onOpenDetails ? 'pointer' : 'default', transition: 'all 180ms ease', ...cardHighlight(TAB_KEYS.CONFIG, 'compiler') }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <IconifyIcon icon="solar:shield-keyhole-bold-duotone" style={{ color: t.muted, fontSize: 20 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.title }}>Compiler Flags</span>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <MiniBucket
                      title={`Improvements (${hasBinaryDiffs ? positive.compiler.length : 0})`}
                      color={t.greenText}
                      items={compilerImprovementPreview}
                      more={Math.max(0, positive.compiler.length - compilerImprovementPreview.length)}
                      muted={t.muted}
                      unavailable={!hasBinaryDiffs}
                      themeBg={t.greenBg}
                      renderItem={(d, idx) => (
                        <div key={`pi-${idx}`} className="mb-1">
                          <span style={{ color: t.muted }}>• </span>
                          {formatTransitionLine(d, formatYesNo, t.greenText, t)}
                        </div>
                      )}
                    />
                    <MiniBucket
                      title={`Regressions (${hasBinaryDiffs ? negative.compiler.length : 0})`}
                      color={t.redText}
                      items={compilerRegressionPreview}
                      more={Math.max(0, negative.compiler.length - compilerRegressionPreview.length)}
                      muted={t.muted}
                      unavailable={!hasBinaryDiffs}
                      themeBg={t.redBg}
                      renderItem={(d, idx) => (
                        <div key={`ni-${idx}`} className="mb-1">
                          <span style={{ color: t.muted }}>• </span>
                          {formatTransitionLine(d, formatYesNo, t.redText, t)}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div className="h-100 d-flex flex-column" {...cardClickProps(TAB_KEYS.CONFIG, 'capabilities')} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: BASE.radiusMd, padding: '16px', minHeight: 220, cursor: onOpenDetails ? 'pointer' : 'default', transition: 'all 180ms ease', ...cardHighlight(TAB_KEYS.CONFIG, 'capabilities') }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <IconifyIcon icon="solar:shield-user-bold-duotone" style={{ color: t.muted, fontSize: 20 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.title }}>Capabilities</span>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <MiniBucket
                      title={`Improvements (${hasBinaryDiffs ? positive.capabilities.length : 0})`}
                      color={t.greenText}
                      items={capabilityImprovementPreview}
                      more={Math.max(0, positive.capabilities.length - capabilityImprovementPreview.length)}
                      muted={t.muted}
                      unavailable={!hasBinaryDiffs}
                      themeBg={t.greenBg}
                      renderItem={(d, idx) => (
                        <div key={`pc-${idx}`} className="mb-1" style={{ fontSize: 12, color: t.muted }}>
                          <span style={{ color: t.muted }}>• </span>
                          <span style={{ fontFamily: BASE.fontMono, fontWeight: 600, color: t.title }}>{d.binaryName}</span>
                          <span> capabilities updated</span>
                        </div>
                      )}
                    />
                    <MiniBucket
                      title={`Regressions (${hasBinaryDiffs ? negative.capabilities.length : 0})`}
                      color={t.redText}
                      items={capabilityRegressionPreview}
                      more={Math.max(0, negative.capabilities.length - capabilityRegressionPreview.length)}
                      muted={t.muted}
                      unavailable={!hasBinaryDiffs}
                      themeBg={t.redBg}
                      renderItem={(d, idx) => (
                        <div key={`nc-${idx}`} className="mb-1" style={{ fontSize: 12, color: t.muted }}>
                          <span style={{ color: t.muted }}>• </span>
                          <span style={{ fontFamily: BASE.fontMono, fontWeight: 600, color: t.title }}>{d.binaryName}</span>
                          <span> capabilities updated</span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </Col>
            </Row>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${t.divider ?? t.border}` }}>
              <Button style={{ background: '#0f766e', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '.01em', padding: '8px 16px', borderRadius: BASE.radiusSm, color: '#fff' }} onClick={() => onOpenDetails?.(TAB_KEYS.ALL, 'all')}>
                Show All Changes
              </Button>
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
}
