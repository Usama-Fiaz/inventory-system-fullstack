import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getStatusIcon } from '../../statusIcons';
import { Card, CardBody, Col, Row, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus, selectReportError, selectReportDiffs } from '@/store/slices/reportSlice';
import { useLayoutContext } from '@/context/useLayoutContext';
import { getStatData } from '../data';

// Helper function to get variant colors
const getVariantStyles = (variant) => {
  const variants = {
    secondary: {
      iconBg: 'bg-secondary-subtle',
      iconColor: 'text-secondary',
      badgeBg: 'bg-secondary',
      badgeText: 'text-white'
    },
    info: {
      iconBg: 'bg-info-subtle',
      iconColor: 'text-info',
      badgeBg: 'bg-info',
      badgeText: 'text-white'
    },
    danger: {
      iconBg: 'bg-danger-subtle',
      iconColor: 'text-danger',
      badgeBg: 'bg-danger',
      badgeText: 'text-white'
    },
    success: {
      iconBg: 'bg-success-subtle',
      iconColor: 'text-success',
      badgeBg: 'bg-success',
      badgeText: 'text-white'
    }
  };
  return variants[variant] || variants.secondary;
};

const formatCompactCount = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat().format(value);
};

const StatCard = ({
  change,
  trend,
  icon,
  stat,
  title,
  variant,
  subtitle,
  enableCount: propEnableCount,
  disableCount: propDisableCount,
  route,
  tooltip,
  additionalStats,
  loadingState,
  errorMessage
}) => {
  const navigate = useNavigate();
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const styles = getVariantStyles(variant);
  const isLoading = !!loadingState;
  const statText = typeof stat === 'string' ? stat : '';
  
  const isKernelConfigs = title === 'Kernel Configurations';
  const isFilesystems = title === 'Filesystem Violations';
  let enableCount = 0;
  let disableCount = 0;
  
  if (isKernelConfigs) {
    // Use props if available, otherwise parse from stat string
    if (!isLoading && propEnableCount !== undefined && propDisableCount !== undefined) {
      enableCount = Number(propEnableCount);
      disableCount = Number(propDisableCount);
    } else if (!isLoading) {
      const match = statText.match(/(\d+)\s+Enable\s+(\d+)\s+Disable/);
      if (match) {
        enableCount = Number(match[1]);
        disableCount = Number(match[2]);
      }
    }
  }

  const totalKernel = enableCount + disableCount;
  const trendDisplay = trend?.display ?? trend?.value ?? null;
  const hasTrend = Boolean(trend && trendDisplay);
  const hasImprovedSignal = trend?.improved === true || trend?.improved === false;
  const filesystemDirection = trend?.direction;
  const trendImproved = isFilesystems
    ? filesystemDirection === 'improved' || (filesystemDirection == null && trend?.improved === true)
    : trend?.improved === true;
  const trendRegressed = isFilesystems
    ? filesystemDirection === 'regressed' || (filesystemDirection == null && trend?.improved === false)
    : trend?.improved === false;
  const trendTone = hasTrend && hasImprovedSignal
    ? (trendImproved
    ? {
      color: isDark ? '#86efac' : '#166534',
      bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5',
      border: isDark ? 'rgba(16,185,129,0.3)' : '#bbf7d0',
      icon: isFilesystems ? 'mdi:arrow-down-bold' : 'mdi:arrow-up-bold',
    }
    : {
      color: isDark ? '#fca5a5' : '#b91c1c',
      bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
      border: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
      icon: isFilesystems ? 'mdi:arrow-up-bold' : 'mdi:arrow-down-bold',
    })
    : {
      color: isDark ? '#cbd5e1' : '#64748b',
      bg: isDark ? 'rgba(148,163,184,0.14)' : '#f1f5f9',
      border: isDark ? 'rgba(148,163,184,0.28)' : '#cbd5e1',
      icon: 'mdi:minus',
    };

  const trendPillStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: trendTone.color,
    background: trendTone.bg,
    border: `1px solid ${trendTone.border}`,
    borderRadius: 999,
    padding: '3px 8px',
    letterSpacing: '0.02em',
    minHeight: 24,
    lineHeight: 1,
  };

  const filesystemFlagTrends = additionalStats?.flagTrends ?? {};
  const noexecTrend = filesystemFlagTrends?.noexec ?? null;
  const nosuidTrend = filesystemFlagTrends?.nosuid ?? null;

  const miniTrendTone = (itemTrend) => {
    if (!itemTrend || itemTrend.numericValue == null || itemTrend.numericValue <= 0) return null;
    if (itemTrend.improved === true) {
      return {
        color: isDark ? '#86efac' : '#166534',
        bg: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5',
        border: isDark ? 'rgba(16,185,129,0.3)' : '#bbf7d0',
        icon: 'mdi:arrow-up-bold',
      };
    }
    if (itemTrend.improved === false) {
      return {
        color: isDark ? '#fca5a5' : '#b91c1c',
        bg: isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
        border: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
        icon: 'mdi:arrow-down-bold',
      };
    }
    return null;
  };

  const cardTooltip = (
    <Tooltip id={`tooltip-${title}`} style={{ maxWidth: '280px' }}>
      <div style={{ padding: '6px 2px', textAlign: 'left' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.6', opacity: 0.92 }}>
          {tooltip || `${title} metric card`}
        </div>
      </div>
    </Tooltip>
  );

  return (
    <Card 
      className="h-100 position-relative overflow-hidden d-flex flex-column" 
      style={{ 
        transition: 'all 0.15s ease',
        borderRadius: '12px',
        border: isDark ? 'none' : '1px solid #cbd5e1',
        boxShadow: isDark ? '0 .125rem .25rem rgba(0,0,0,.075)' : 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
        if (!isDark) e.currentTarget.style.borderColor = '#94a3b8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isDark ? '0 .125rem .25rem rgba(0,0,0,.075)' : 'none';
        if (!isDark) e.currentTarget.style.borderColor = '#cbd5e1';
      }}>
      <CardBody className="p-4 pb-2 d-flex flex-column" style={{ flex: '1 1 auto', minHeight: '220px' }}>
        {/* Header: Icon and View More */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <IconifyIcon icon={icon} className={`${styles.iconColor}`} style={{ fontSize: '28px' }} />
          {route && (
            <button
              className="btn btn-sm btn-link text-decoration-none p-1"
              style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                minWidth: '80px',
                textAlign: 'right',
                lineHeight: '1.2'
              }}
              onClick={() => navigate(route)}
              onMouseEnter={(e) => {
                e.currentTarget.classList.add('text-primary');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('text-primary');
              }}>
              View More →
            </button>
          )}
        </div>

        {/* Title with Info Icon */}
        <div className="d-flex align-items-center gap-1 mb-3">
          <h5 className="text-dark mb-0 fw-bold" style={{ 
            fontSize: '18px', 
            letterSpacing: '-0.2px',
            fontWeight: '700',
            lineHeight: '1.3'
          }}>
            {title}
          </h5>
          {tooltip && (
            <OverlayTrigger
              placement="top"
              overlay={cardTooltip}
              trigger={['hover', 'focus']}>
              <span>
                <IconifyIcon 
                  icon="solar:info-circle-bold-duotone" 
                  style={{ fontSize: '17px', cursor: 'help', color: isDark ? 'rgba(148,163,184,0.70)' : 'rgba(100,116,139,0.65)', transition: 'color 0.15s ease' }}
                />
              </span>
            </OverlayTrigger>
          )}
        </div>

        {/* Main Stat Value - Flex grow to use available space */}
        <div className="flex-grow-1 d-flex flex-column">
          {isKernelConfigs ? (
            <div>
              {/* Missing Configs count */}
              {!isLoading ? (
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <h2 className="text-dark mb-0 fw-bold" style={{ 
                    fontSize: '36px',
                    lineHeight: '1.1',
                    fontWeight: '700',
                    letterSpacing: '-0.5px'
                  }}>
                    {totalKernel}
                    <span className="text-muted fw-normal ms-2" style={{ fontSize: '16px', fontWeight: '500' }}>
                      Actions Needed
                    </span>
                  </h2>
                  {hasTrend ? (
                    <span
                      className="d-inline-flex align-items-center gap-1"
                      style={trendPillStyle}
                    >
                      <IconifyIcon icon={trendTone.icon} style={{ fontSize: 12 }} />
                      <span>{trendDisplay}</span>
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="placeholder-glow mb-2">
                  <span className="placeholder col-6" style={{ height: '34px', borderRadius: '8px' }} />
                </div>
              )}
              {/* Bar on next line */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 0, paddingTop: '1.1rem' }}>
              <div className="d-flex gap-2">
                {/* Enabled sub-cell */}
                <div
                  className="d-flex align-items-center gap-2 flex-grow-1"
                  style={{
                    background: isDark ? 'rgba(108,157,236,0.13)' : 'rgba(108,157,236,0.09)',
                    border: `1px solid ${isDark ? 'rgba(108,157,236,0.30)' : 'rgba(108,157,236,0.22)'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    minWidth: 0,
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: isDark ? 'rgba(108,157,236,0.22)' : 'rgba(108,157,236,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <IconifyIcon icon="solar:add-circle-bold" style={{ fontSize: 17, color: isDark ? '#93c5fd' : '#1d4ed8' }} />
                  </div>
                  <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: isDark ? 'rgba(147,197,253,0.90)' : 'rgba(30,64,175,0.80)' }}>
                      To Enable
                    </span>
                    <span className="fw-semibold" style={{ fontSize: 15, lineHeight: 1.2, color: isDark ? '#93c5fd' : '#1e40af' }}>
                      {enableCount} {enableCount === 1 ? 'config' : 'configs'}
                    </span>
                  </div>
                </div>
                {/* Disabled sub-cell */}
                <div
                  className="d-flex align-items-center gap-2 flex-grow-1"
                  style={{
                    background: isDark ? 'rgba(156,156,157,0.13)' : 'rgba(156,156,157,0.09)',
                    border: `1px solid ${isDark ? 'rgba(156,156,157,0.30)' : 'rgba(156,156,157,0.22)'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    minWidth: 0,
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: isDark ? 'rgba(156,156,157,0.22)' : 'rgba(156,156,157,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <IconifyIcon icon="solar:minus-circle-bold" style={{ fontSize: 17, color: isDark ? '#d1d5db' : '#4b5563' }} />
                  </div>
                  <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: isDark ? 'rgba(209,213,219,0.90)' : 'rgba(55,65,81,0.80)' }}>
                      To Disable
                    </span>
                    <span className="fw-semibold" style={{ fontSize: 15, lineHeight: 1.2, color: isDark ? '#d1d5db' : '#374151' }}>
                      {disableCount} {disableCount === 1 ? 'config' : 'configs'}
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div>
              {!isLoading ? (
                <>
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <h2 className="text-dark fw-bold mb-0" style={{ 
                      fontSize: '36px',
                      lineHeight: '1.1',
                      fontWeight: '700',
                      letterSpacing: '-0.5px'
                    }}>
                      {statText.split(' ')[0] || '—'}
                      <span className="text-muted fw-normal ms-2" style={{ fontSize: '18px', fontWeight: '500' }}>
                        {statText.split(' ').slice(1).join(' ') || ''}
                      </span>
                    </h2>
                    {isFilesystems && hasTrend && (
                      <span
                        className="d-inline-flex align-items-center gap-1"
                        style={trendPillStyle}
                      >
                        <IconifyIcon icon={trendTone.icon} style={{ fontSize: 12 }} />
                        <span>{trendDisplay}</span>
                        {trendImproved ? <span>Good</span> : trendRegressed ? <span>Bad</span> : null}
                      </span>
                    )}
                  </div>
                  {isFilesystems && hasTrend && (
                    <div className="text-muted" style={{ fontSize: 12, marginTop: -2, marginBottom: 8 }}>
                      vs previous build
                      {trend?.previousTotal != null ? ` · Prev ${formatCompactCount(trend.previousTotal)}` : ''}
                      {trend?.currentTotal != null ? ` · Current ${formatCompactCount(trend.currentTotal)}` : ''}
                    </div>
                  )}
                </>
              ) : (
                <div className="placeholder-glow mb-2">
                  <span className="placeholder col-7" style={{ height: '34px', borderRadius: '8px' }} />
                </div>
              )}

              {!!errorMessage && !isLoading && (
                <div className="text-danger small mb-2" style={{ lineHeight: 1.2 }}>
                  Failed to load report
                </div>
              )}

              {/* Violation blocks for Filesystems */}
              {isFilesystems && additionalStats?.flagViolations && !isLoading && (
                <div
                  style={{
                    marginTop: 0,
                    paddingTop: '1rem',
                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <div className="d-flex gap-2">
                    {additionalStats.flagViolations.noexec > 0 && (
                      <div
                        className="d-flex align-items-center gap-2 flex-grow-1"
                        style={{
                          background: isDark ? 'rgba(244,63,94,0.13)' : 'rgba(244,63,94,0.09)',
                          border: `1px solid ${isDark ? 'rgba(244,63,94,0.30)' : 'rgba(244,63,94,0.22)'}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          minWidth: 0,
                        }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: isDark ? 'rgba(244,63,94,0.22)' : 'rgba(244,63,94,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <IconifyIcon icon="solar:close-circle-bold" style={{ fontSize: 17, color: isDark ? '#fb7185' : '#e11d48' }} />
                        </div>
                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: isDark ? 'rgba(253,164,175,0.9)' : 'rgba(190,18,60,0.9)' }}>
                            Missing noexec
                          </span>
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="fw-semibold" style={{ fontSize: 15, lineHeight: 1.2, color: isDark ? '#fda4af' : '#be123c' }}>
                              {additionalStats.flagViolations.noexec} mount{additionalStats.flagViolations.noexec !== 1 ? 's' : ''}
                            </span>
                            {miniTrendTone(noexecTrend) ? (
                              <span
                                className="d-inline-flex align-items-center gap-1"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  borderRadius: 999,
                                  padding: '2px 6px',
                                  color: miniTrendTone(noexecTrend).color,
                                  background: miniTrendTone(noexecTrend).bg,
                                  border: `1px solid ${miniTrendTone(noexecTrend).border}`,
                                }}
                              >
                                <IconifyIcon icon={miniTrendTone(noexecTrend).icon} style={{ fontSize: 10 }} />
                                <span>{noexecTrend.value}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                    {additionalStats.flagViolations.nosuid > 0 && (
                      <div
                        className="d-flex align-items-center gap-2 flex-grow-1"
                        style={{
                          background: isDark ? 'rgba(234,88,12,0.13)' : 'rgba(234,88,12,0.09)',
                          border: `1px solid ${isDark ? 'rgba(234,88,12,0.30)' : 'rgba(234,88,12,0.22)'}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          minWidth: 0,
                        }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: isDark ? 'rgba(234,88,12,0.22)' : 'rgba(234,88,12,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <IconifyIcon icon={getStatusIcon('regressed')} style={{ fontSize: 17, color: isDark ? '#fdba74' : '#c2410c' }} />
                        </div>
                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: isDark ? 'rgba(253,186,116,0.95)' : 'rgba(154,52,18,0.95)' }}>
                            Missing nosuid
                          </span>
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="fw-semibold" style={{ fontSize: 15, lineHeight: 1.2, color: isDark ? '#fdba74' : '#9a3412' }}>
                              {additionalStats.flagViolations.nosuid} mount{additionalStats.flagViolations.nosuid !== 1 ? 's' : ''}
                            </span>
                            {miniTrendTone(nosuidTrend) ? (
                              <span
                                className="d-inline-flex align-items-center gap-1"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  borderRadius: 999,
                                  padding: '2px 6px',
                                  color: miniTrendTone(nosuidTrend).color,
                                  background: miniTrendTone(nosuidTrend).bg,
                                  border: `1px solid ${miniTrendTone(nosuidTrend).border}`,
                                }}
                              >
                                <IconifyIcon icon={miniTrendTone(nosuidTrend).icon} style={{ fontSize: 10 }} />
                                <span>{nosuidTrend.value}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {additionalStats && title === 'Vulnerabilities' && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 0, paddingTop: '1.1rem' }}>
                <div className="d-flex flex-column gap-1" style={{ fontSize: '13px' }}>
                    <Row className="g-2">
                      <Col xs={6}>
                        <div className="d-flex justify-content-between align-items-center px-2 py-1 rounded" style={{ background: 'linear-gradient(90deg, rgba(24,24,27,0.04) 0%, rgba(24,24,27,0.18) 100%)' }}>
                          <span className="text-muted small fw-medium">Critical</span>
                          <span className="fw-bold" style={{ color: '#18181b', fontSize: '14px' }}>{additionalStats.critical ?? 0}</span>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="d-flex justify-content-between align-items-center px-2 py-1 rounded" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.05) 0%, rgba(239,68,68,0.22) 100%)' }}>
                          <span className="text-muted small fw-medium">High</span>
                          <span className="fw-bold" style={{ color: '#ef4444', fontSize: '14px' }}>{additionalStats.high ?? 0}</span>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="d-flex justify-content-between align-items-center px-2 py-1 rounded" style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.05) 0%, rgba(249,115,22,0.22) 100%)' }}>
                          <span className="text-muted small fw-medium">Medium</span>
                          <span className="fw-bold" style={{ color: '#f97316', fontSize: '14px' }}>{additionalStats.medium ?? 0}</span>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="d-flex justify-content-between align-items-center px-2 py-1 rounded" style={{ background: 'linear-gradient(90deg, rgba(252,211,77,0.12) 0%, rgba(252,211,77,0.45) 100%)' }}>
                          <span className="text-muted small fw-medium">Low</span>
                          <span className="fw-bold" style={{ color: '#78350f', fontSize: '14px' }}>{additionalStats.low ?? 0}</span>
                        </div>
                      </Col>
                    </Row>
                </div>
                </div>
              )}
            </div>
          )}
        </div>


      </CardBody>
    </Card>
  );
};

const Stats = () => {
  // Read the report from Redux (no report.json usage)
  const report = useSelector(selectReport);
  const reportDiffs = useSelector(selectReportDiffs);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const loading = status === 'idle' || status === 'loading';

  const fallbackStats = [
    {
      title: 'Filesystem Violations',
      icon: 'tabler:server-2',
      stat: '—',
      change: '—',
      route: '/dashboard/filesystems',
      tooltip:
        'Mount paths with missing security flags (noexec, nosuid).',
      additionalStats: { flagViolations: { noexec: 0, nosuid: 0 } },
    },
    {
      title: 'Kernel Configurations',
      icon: 'solar:cpu-bold-duotone',
      stat: '0 Enable 0 Disable',
      change: '—',
      enableCount: 0,
      disableCount: 0,
      route: '/dashboard/kernel-configs',
      tooltip:
        'Kernel settings that must be enabled or disabled for optimal security.',
    },
    {
      title: 'Vulnerabilities',
      icon: 'tabler:shield-search',
      stat: '—',
      change: '—',
      route: '/dashboard/vulnerabilities',
      tooltip: 'Open (unpatched) CVEs: vulnerabilities that are neither Patched nor Ignored.',
      additionalStats: { critical: 0, high: 0, medium: 0, low: 0, packages: 0 },
    },
  ];

  const statData = report ? getStatData(report, reportDiffs) : fallbackStats;
  const visibleStats = statData.slice(0, 3);
  
  return (
    <Row className="g-3 mb-3">
      {visibleStats.map((stat, idx) => (
        <Col md={6} xl={4} key={idx}>
          <StatCard
            {...stat}
            loadingState={loading}
            errorMessage={status === 'failed' ? error : null}
          />
        </Col>
      ))}
    </Row>
  );
};

export default Stats;