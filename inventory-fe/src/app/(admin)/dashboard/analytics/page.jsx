import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';
import { selectReport, selectReportDiffs, selectReportTimestamp } from '@/store/slices/reportSlice';
import SecurityInsightsPanel from './components/SecurityInsightsPanel';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SecurityPostureRadar from './components/SecurityPostureRadar';
import {
  buildSecurityOverviewAxes,
  buildSecuritySideInsights,
  getOverviewComposite,
} from './components/securityOverviewData';

const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';

export default function Home() {
  const { themeMode } = useLayoutContext();
  const report = useSelector(selectReport);
  const reportDiffs = useSelector(selectReportDiffs);
  const reportTimestamp = useSelector(selectReportTimestamp);
  const isDark = themeMode === 'dark';
  const { width: viewWidth } = useViewPort();
  const isMobile = viewWidth < 768;
  const isStacked = viewWidth < 992; // Bootstrap lg breakpoint
  const [activeAxis, setActiveAxis] = useState(null);
  const [hoveredCard, setHoveredCard] = useState({ axisIds: [], color: null });
  const pageRootRef = useRef(null);
  const compareSectionRef = useRef(null);

  const overviewAxes = useMemo(() => buildSecurityOverviewAxes({ report, reportDiffs }), [report, reportDiffs]);

  const insightCards = useMemo(() => buildSecuritySideInsights({ report, reportDiffs, axes: overviewAxes }), [report, reportDiffs, overviewAxes]);
  const overviewComposite = getOverviewComposite(overviewAxes);
  const overviewDelta = overviewComposite.delta;
  const overviewCurrentScore = overviewComposite.currentScore;
  const overviewImproved = overviewDelta >= 0;
  const categoryCounts = useMemo(() => {
    let improved = 0, regressed = 0;
    for (const card of insightCards) {
      const delta = Number(card?.delta ?? 0);
      if (delta > 0) improved++;
      else if (delta < 0) regressed++;
    }
    return { improved, regressed };
  }, [insightCards]);
  const baselineId = reportDiffs?.last_build_id ?? '—';
  const baselineTime = reportDiffs?.last_build_time ?? null;
  const targetId = report?.build_id ?? '—';
  const targetTime = report?.timestamp ?? reportTimestamp ?? null;

  const scrollToComparison = () => {
    compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const pageRoot = pageRootRef.current;
    if (!pageRoot) return undefined;

    const pageContent = pageRoot.closest('.page-content');
    const containerFluid = pageRoot.closest('.container-fluid');
    const footer = pageContent?.querySelector('.footer');

    const previousPageContent = pageContent
      ? {
          minHeight: pageContent.style.minHeight,
          height: pageContent.style.height,
        }
      : null;
    const previousContainerFluid = containerFluid
      ? {
          flex: containerFluid.style.flex,
        }
      : null;
    const previousFooter = footer
      ? {
          marginTop: footer.style.marginTop,
        }
      : null;

    if (pageContent) {
      pageContent.style.minHeight = 'auto';
      pageContent.style.height = 'auto';
    }

    if (containerFluid) {
      containerFluid.style.flex = '0 0 auto';
    }

    if (footer) {
      footer.style.marginTop = '0';
    }

    return () => {
      if (pageContent && previousPageContent) {
        pageContent.style.minHeight = previousPageContent.minHeight;
        pageContent.style.height = previousPageContent.height;
      }

      if (containerFluid && previousContainerFluid) {
        containerFluid.style.flex = previousContainerFluid.flex;
      }

      if (footer && previousFooter) {
        footer.style.marginTop = previousFooter.marginTop;
      }
    };
  }, []);

  return (
    <div ref={pageRootRef} className="analytics-compact-page">
      <PageMetaData title="Security Analytics" />

      <Card
        className="border-0 shadow-lg"
        style={{
          borderRadius: 32,
          background: isDark
            ? 'linear-gradient(165deg, #0f172a 0%, #020617 100%)'
            : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 100%)',
          border: `1px solid ${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}`,
          position: 'relative',
          overflow: 'hidden'
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

        <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '24px 20px 20px' : '36px 40px 28px' }}>

          {/* ── Page title ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: isMobile ? 20 : 28 }}>
            {/* Eyebrow — Binary Hardening plain-text style */}
            <div style={{ marginBottom: 10 }}>
              <span style={{
                fontFamily: UI_FONT_STACK,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isDark ? '#93c5fd' : '#1d4ed8',
              }}>
                Delta Overview
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              justifyContent: 'flex-start',
              gap: 14,
              flexWrap: 'wrap',
            }}>
              {/* H1 */}
              <h1 style={{
                fontFamily: UI_FONT_STACK,
                fontSize: isMobile ? 28 : 38,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: isDark ? '#f8fafc' : '#0f172a',
                lineHeight: 1.05,
                marginBottom: 0,
                flex: '0 1 auto',
              }}>
                System Hardening
              </h1>

              <div style={{
                display: 'flex',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: 12,
                flex: isMobile ? '1 1 100%' : '0 1 auto',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  padding: '7px 14px',
                  borderRadius: 10,
                  background: isDark ? 'linear-gradient(180deg, rgba(30,41,59,0.72) 0%, rgba(15,23,42,0.76) 100%)' : '#f1f5f9',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : '#cbd5e1'}`,
                }}>
                  {[
                    { label: 'Baseline', id: baselineId, time: baselineTime, dot: '#64748b', labelColor: isDark ? '#94a3b8' : '#64748b' },
                    { label: 'Current', id: targetId, time: targetTime, dot: '#8b5cf6', labelColor: isDark ? '#e2e8f0' : '#0f172a' },
                  ].map((item, i) => (
                    <div key={item.label} className="d-flex align-items-center" style={{ gap: 8 }}>
                      {i === 1 && <div style={{ width: 1, height: 22, background: isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0', marginRight: 4 }} />}
                      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 8 }}>
                        <div className="d-flex align-items-center" style={{ gap: 8, marginBottom: 2 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                          <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: item.labelColor, opacity: 0.9 }}>{item.label}</span>
                          <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 12, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>{item.id}</span>
                        </div>
                        {item.time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 500, color: isDark ? '#8b949e' : '#64748b', fontFamily: MONO_FONT_STACK, opacity: 0.9, whiteSpace: 'nowrap' }}>
                              {(() => { try { return new Date(item.time).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return String(item.time); } })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled
                  style={{
                    flex: isMobile ? '1 1 auto' : '0 0 auto',
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#21262d' : '#cbd5e1'}`,
                    cursor: 'not-allowed',
                    opacity: 0.55,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <IconifyIcon icon="solar:layers-minimalistic-bold" style={{ fontSize: 14, color: isDark ? '#8b949e' : '#64748b' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#c9d1d9' : '#475569', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Compare Release
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Trend summary bar ──────────────────────────────────────── */}
          <div style={{
            borderRadius: 18,
            background: isDark
              ? 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(2,6,23,0.9) 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
            border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : '#e2e8f0'}`,
            boxShadow: isDark ? 'none' : '0 2px 8px -2px rgba(15,23,42,0.04)',
            padding: isMobile ? '18px 20px' : '20px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}>
            {/* Left: posture verdict + absolute score breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{
                fontFamily: UI_FONT_STACK,
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? '#64748b' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Overall Security Posture
              </span>

              <div className="d-flex align-items-center" style={{ gap: 14, flexWrap: 'wrap' }}>
                {/* Trend Badge: matching sidecard semantic */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 12,
                  background: overviewImproved
                    ? `${isDark ? '#4ade80' : '#16a34a'}14`
                    : `${isDark ? '#f87171' : '#dc2626'}0f`,
                  border: `1px solid ${overviewImproved ? (isDark ? 'rgba(74,222,128,0.38)' : 'rgba(22,163,74,0.28)') : (isDark ? 'rgba(248,113,113,0.38)' : 'rgba(220,38,38,0.24)')}`,
                }}>
                  <IconifyIcon
                    icon={overviewImproved ? 'solar:double-alt-arrow-up-bold-duotone' : 'solar:double-alt-arrow-down-bold-duotone'}
                    style={{ fontSize: 18, color: overviewImproved ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f87171' : '#dc2626') }}
                  />
                  <div className="d-flex align-items-baseline" style={{ gap: 4 }}>
                    <span style={{
                      fontFamily: MONO_FONT_STACK,
                      fontSize: 24,
                      fontWeight: 900,
                      letterSpacing: '-0.04em',
                      color: overviewImproved ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f87171' : '#dc2626'),
                      lineHeight: 1,
                    }}>
                      {overviewImproved ? '+' : ''}{overviewDelta.toFixed(1)}
                    </span>
                    <span style={{
                      fontFamily: MONO_FONT_STACK,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'lowercase',
                      color: overviewImproved ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f87171' : '#dc2626'),
                      opacity: 0.8,
                      marginLeft: 2,
                    }}>
                      pts
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center" style={{ gap: 12 }}>
                  <span style={{
                    fontFamily: MONO_FONT_STACK,
                    fontSize: 10,
                    fontWeight: 700,
                    color: isDark ? '#475569' : '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    opacity: 0.8
                  }}>
                    vs baseline
                  </span>

                  <div style={{ width: 1, height: 16, background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.1)' }} />

                  <div className="d-flex align-items-center" style={{ gap: 6 }}>
                    <span style={{
                      fontFamily: MONO_FONT_STACK,
                      fontSize: 12,
                      fontWeight: 800,
                      color: isDark ? '#cbd5e1' : '#334155',
                      letterSpacing: '-0.01em',
                    }}>
                      {overviewCurrentScore.toFixed(1)}<span style={{ fontWeight: 500, color: isDark ? '#475569' : '#94a3b8', fontSize: 10, opacity: 0.7 }}> / 100</span>
                    </span>
                    <span style={{
                      fontFamily: UI_FONT_STACK,
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDark ? '#64748b' : '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      opacity: 0.8
                    }}>
                      overall score
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: improved / regressed counters */}
            <div className="d-flex align-items-center" style={{ gap: 0, flexShrink: 0, marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : '38%', justifyContent: 'flex-start' }}>
              {/* separator */}
              <div style={{ width: 1, height: 56, background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.1)', marginRight: 24, flexShrink: 0 }} />

              <div className="d-flex" style={{ gap: 28, justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{
                    fontFamily: MONO_FONT_STACK,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: isDark ? '#4ade80' : '#16a34a',
                  }}>
                    {categoryCounts.improved}
                  </span>
                  <span style={{
                    fontFamily: UI_FONT_STACK,
                    fontSize: 11,
                    fontWeight: 500,
                    color: isDark ? '#64748b' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    Categories Improved
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{
                    fontFamily: MONO_FONT_STACK,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: isDark ? '#f87171' : '#dc2626',
                  }}>
                    {categoryCounts.regressed}
                  </span>
                  <span style={{
                    fontFamily: UI_FONT_STACK,
                    fontSize: 11,
                    fontWeight: 500,
                    color: isDark ? '#64748b' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    Categories Regressed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Row
          ref={compareSectionRef}
          className="g-0 align-items-stretch"
          style={{
            position: 'relative',
            zIndex: 1,
            margin: isMobile ? '0 12px 12px' : '0 18px 18px',
            borderTop: `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : '#cbd5e1'}`,
            width: 'auto',
          }}
        >
          <Col xl={7} lg={7} md={12} className="d-flex">
            <div style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <SecurityPostureRadar
                  items={overviewAxes}
                  isDark={isDark}
                  baselineId={baselineId}
                  baselineTime={baselineTime}
                  targetId={targetId}
                  targetTime={targetTime}
                  activeAxis={activeAxis}
                  onAxisHover={setActiveAxis}
                  onAxisLeave={() => setActiveAxis(null)}
                  highlightedAxes={hoveredCard.axisIds}
                  highlightColor={hoveredCard.color}
                />
            </div>
          </Col>

          <Col xl={5} lg={5} md={12} className="d-flex">
            <div style={{
              flex: 1,
              padding: isMobile ? '16px' : '24px',
              borderLeft: isStacked ? 'none' : `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : '#cbd5e1'}`,
              borderTop: isStacked ? `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : '#cbd5e1'}` : 'none',
              display: 'flex',
              flexDirection: 'column',
            }}>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <SecurityInsightsPanel
                  items={insightCards}
                  isDark={isDark}
                  onCardHover={({ axisIds, color }) => setHoveredCard({ axisIds, color })}
                  onCardLeave={() => setHoveredCard({ axisIds: [], color: null })}
                />
                </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}