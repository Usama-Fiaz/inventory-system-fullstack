import { useEffect, useMemo, useRef, useState } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import {
  BH_INTERACTIVE_TRANSITION,
  BH_THEME_TRANSITION,
} from '../../binary-hardening/binaryHardeningTheme';

const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';
const VIEWBOX_SIZE = 440;
const CENTER = VIEWBOX_SIZE / 2;
const PLOT_RADIUS = 118;
const LABEL_RADIUS = 176;
const GUIDE_RINGS = [0.25, 0.5, 0.75, 1];
const CURRENT_BUILD_PURPLE = '#8b5cf6';
const CURRENT_BUILD_PURPLE_SOFT = 'rgba(139,92,246,0.22)';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const polarPoint = (index, total, distance) => {
  const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * distance,
    y: CENTER + Math.sin(angle) * distance,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
  };
};

const buildClosedPath = (points) => {
  if (!points.length) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  points.slice(1).forEach((point) => {
    path += ` L ${point.x} ${point.y}`;
  });
  return `${path} Z`;
};

const getLabelPlacement = (point) => {
  const xPct = `${((point.x / VIEWBOX_SIZE) * 100).toFixed(3)}%`;
  const yPct = `${((point.y / VIEWBOX_SIZE) * 100).toFixed(3)}%`;

  if (Math.abs(point.dx) < 0.25) {
    return point.dy < 0
      ? { left: xPct, top: yPct, transform: 'translate(-50%, -100%)', textAlign: 'center' }
      : { left: xPct, top: yPct, transform: 'translate(-50%, 0)', textAlign: 'center' };
  }

  return point.dx > 0
    ? { left: xPct, top: yPct, transform: 'translate(0, -50%)', textAlign: 'left' }
    : { left: xPct, top: yPct, transform: 'translate(-100%, -50%)', textAlign: 'right' };
};

const getDirectionMeta = (axis) => axis.direction === 'minimize'
  ? {
      icon: 'solar:alt-arrow-down-linear',
      tint: '#64748b',
      soft: 'rgba(100,116,139,0.10)',
      label: 'Minimize exposure',
      description: 'Lower values reduce risk',
    }
  : {
      icon: 'solar:alt-arrow-up-linear',
      tint: '#64748b',
      soft: 'rgba(100,116,139,0.10)',
      label: 'Maximize hardening',
      description: 'Higher values enhance security',
    };

const isAxisMoreSecure = (axis) => {
  if (!axis) return true;
  return axis.direction === 'minimize'
    ? Number(axis.current ?? 0) <= Number(axis.baseline ?? 0)
    : Number(axis.current ?? 0) >= Number(axis.baseline ?? 0);
};

const getSecurityHoverTone = (axis, isDark) => {
  const secure = isAxisMoreSecure(axis);
  return secure
    ? {
        color: isDark ? '#4ade80' : '#16a34a',
        border: isDark ? 'rgba(74,222,128,0.38)' : 'rgba(22,163,74,0.24)',
        glow: isDark ? 'rgba(74,222,128,0.26)' : 'rgba(22,163,74,0.18)',
        soft: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(22,163,74,0.08)',
      }
    : {
        color: isDark ? '#f87171' : '#dc2626',
        border: isDark ? 'rgba(248,113,113,0.38)' : 'rgba(220,38,38,0.24)',
        glow: isDark ? 'rgba(248,113,113,0.26)' : 'rgba(220,38,38,0.18)',
        soft: isDark ? 'rgba(239,68,68,0.14)' : 'rgba(220,38,38,0.08)',
      };
};

const formatBuildMetaTime = (value) => {
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
};

const formatBuildMetaId = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/A';
  return raw.length > 18 ? `${raw.slice(0, 18)}...` : raw;
};

const formatAxisValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '—';
};

const OVERALL_POSTURE_EXPLAINER = {
  title: 'How overall posture is scored',
  summary: 'Each axis is normalized so higher always means better, then the build score is averaged across all axes.',
  formulas: [
    {
      label: 'Normalize axis',
      value: 's_i(build) = x_i  if maximize\ns_i(build) = 1 − x_i  if minimize',
    },
    {
      label: 'Equal weighted average score',
      value: 'Posture(build) = (Σ s_i(build) / 4) × 100',
    },
    {
      label: 'Trend in absolute points',
      value: 'Δ pts = Posture(current) − Posture(baseline)',
    },
  ],
};

const SecurityPostureRadar = ({
  items = [],
  isDark,
  baselineId,
  baselineTime,
  targetId,
  targetTime,
  activeAxis,
  onAxisHover,
  onAxisLeave,
  highlightedAxes = [],
  highlightColor = null,
}) => {
  const [selectedAxisId, setSelectedAxisId] = useState(null);
  const [showOverviewTooltip, setShowOverviewTooltip] = useState(false);
  const [animationFactor, setAnimationFactor] = useState(0);
  const tooltipRootRef = useRef(null);

  const hasItems = useMemo(() => Array.isArray(items) && items.length > 0, [items]);

  useEffect(() => {
    if (!hasItems) return;
    
    let frame;
    const startTime = performance.now();
    const duration = 1200;

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimationFactor(easeOut);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [hasItems]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (tooltipRootRef.current && !tooltipRootRef.current.contains(event.target)) {
        setSelectedAxisId(null);
        setShowOverviewTooltip(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedAxisId(null);
        setShowOverviewTooltip(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const chartModel = useMemo(() => {
    if (!hasItems) return { axes: [], baselinePath: '', currentPath: '' };
    const total = items.length;

    const axes = items.map((item, index) => {
      const outerPoint = polarPoint(index, total, PLOT_RADIUS);
      const labelPoint = polarPoint(index, total, LABEL_RADIUS);
      
      const animatedBaseline = (item.baseline ?? 0) * animationFactor;
      const animatedCurrent = (item.current ?? 0) * animationFactor;

      return {
        ...item,
        index,
        outerPoint,
        labelPoint,
        labelPlacement: getLabelPlacement(labelPoint),
        baselinePoint: polarPoint(index, total, PLOT_RADIUS * clamp01(animatedBaseline)),
        currentPoint: polarPoint(index, total, PLOT_RADIUS * clamp01(animatedCurrent)),
        animatedBaseline,
        animatedCurrent,
      };
    });

    return {
      axes,
      baselinePath: buildClosedPath(axes.map((item) => item.baselinePoint)),
      currentPath: buildClosedPath(axes.map((item) => item.currentPoint)),
    };
  }, [items, animationFactor]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: '100%',
        padding: '18px 18px 14px',
        borderRadius: 24,
        background: isDark ? 'rgba(2,6,23,0.34)' : 'rgba(248,250,252,0.85)',
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : '#dbe5ef'}`,
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
          : 'inset 0 1px 0 rgba(255,255,255,0.88)',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: 0,
          borderRadius: 0,
          background: 'transparent',
          border: 'none',
          overflow: 'visible',
        }}
      >
        <div ref={tooltipRootRef} style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAxisId(null);
                setShowOverviewTooltip((current) => !current);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                borderRadius: 999,
                border: `1px solid ${isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)'}`,
                background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.85)',
                color: isDark ? '#cbd5e1' : '#475569',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: showOverviewTooltip ? 'none' : (isDark ? '0 4px 12px -4px rgba(0,0,0,0.4)' : '0 4px 12px -4px rgba(0,0,0,0.08)'),
              }}
            >
              <IconifyIcon 
                icon="solar:question-circle-linear"
                style={{ 
                  fontSize: 14, 
                  color: isDark ? '#60a5fa' : '#2563eb',
                }} 
              />
              <span style={{ fontFamily: UI_FONT_STACK, fontSize: 10.5, fontWeight: 500, lineHeight: 1.4, color: isDark ? '#94a3b8' : '#64748b' }}>
                Posture Score
              </span>
            </button>

            {showOverviewTooltip && (
              <div
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 44,
                  left: 0,
                  width: 280,
                  maxWidth: 'calc(100vw - 48px)',
                  padding: '16px',
                  borderRadius: 20,
                  background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.99)',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.2)' : 'rgba(219,229,239,0.9)'}`,
                  boxShadow: isDark
                    ? '0 24px 48px -12px rgba(2,6,23,0.9), 0 0 0 1px rgba(255,255,255,0.05) inset'
                    : '0 24px 48px -12px rgba(15,23,42,0.18), 0 1px 0 rgba(255,255,255,0.95) inset',
                  backdropFilter: 'blur(20px)',
                  zIndex: 8,
                  animation: 'tooltipFadeIn 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: UI_FONT_STACK, fontSize: 10, fontWeight: 800, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Methodology
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16, fontFamily: UI_FONT_STACK, fontSize: 12, lineHeight: 1.5, color: isDark ? '#cbd5e1' : '#475569' }}>
                  {OVERALL_POSTURE_EXPLAINER.summary}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {OVERALL_POSTURE_EXPLAINER.formulas.map((entry) => (
                    <div key={entry.label} style={{ 
                      padding: '12px', 
                      borderRadius: 14, 
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: isDark ? '#475569' : '#cbd5e1' }} />
                        <div style={{ fontFamily: UI_FONT_STACK, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                          {entry.label}
                        </div>
                      </div>
                      <div style={{ fontFamily: MONO_FONT_STACK, fontSize: 10.5, lineHeight: 1.5, color: isDark ? '#e2e8f0' : '#475569', whiteSpace: 'pre-line' }}>
                        {entry.value}
                      </div>
                    </div>
                  ))}
                </div>
                
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes tooltipFadeIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}} />
              </div>
            )}
          </div>

          <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>

          <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
            {hasItems && (
            <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} onClick={() => { setSelectedAxisId(null); setShowOverviewTooltip(false); }} style={{ width: '100%', height: '100%', display: 'block' }}>
            <defs>
              <filter id="current-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx={CENTER} cy={CENTER} r={PLOT_RADIUS + 26} fill={isDark ? 'rgba(15,23,42,0.32)' : 'rgba(255,255,255,0.66)'} />

            {GUIDE_RINGS.map((ring) => (
              <g key={ring}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={PLOT_RADIUS * ring}
                  fill="none"
                  stroke={isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.32)'}
                  strokeWidth={ring === 1 ? 1.5 : 1}
                />
                <text
                  x={CENTER}
                  y={CENTER - (PLOT_RADIUS * ring) - 4}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.7)',
                    fontFamily: MONO_FONT_STACK,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {ring === 1 ? '1.0' : ring.toFixed(1)}
                </text>
              </g>
            ))}
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              style={{
                fontSize: 9,
                fontWeight: 700,
                fill: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.7)',
                fontFamily: MONO_FONT_STACK,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              0
            </text>

            {chartModel.axes.map((axis) => {
              const isActive = axis.id === activeAxis;
              const hoverTone = getSecurityHoverTone(axis, isDark);
              return (
                <g key={axis.id} style={{ pointerEvents: 'none' }}>
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={axis.outerPoint.x}
                    y2={axis.outerPoint.y}
                    stroke={isActive ? hoverTone.color : (isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.28)')}
                    strokeWidth={isActive ? 2 : 1}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={axis.outerPoint.x}
                    cy={axis.outerPoint.y}
                    r={isActive ? 4.5 : 3}
                    fill={isActive ? hoverTone.color : (isDark ? '#475569' : '#cbd5e1')}
                  />
                </g>
              );
            })}

            <path
              d={chartModel.baselinePath}
              fill="rgba(148,163,184,0.05)"
              stroke={isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.4)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d={chartModel.currentPath}
              fill={isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)'}
              stroke={CURRENT_BUILD_PURPLE}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#current-glow)"
            />

            {chartModel.axes.map((axis) => {
              const isActive = axis.id === activeAxis || highlightedAxes.includes(axis.id);
              return (
                <circle
                  key={`${axis.id}-hitbox`}
                  cx={axis.outerPoint.x}
                  cy={axis.outerPoint.y}
                  r={24}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onAxisHover?.(axis.id)}
                  onMouseLeave={() => onAxisLeave?.()}
                />
              );
            })}

            {chartModel.axes.map((axis) => {
              const isHighlighted = highlightedAxes.includes(axis.id);
              const isActive = axis.id === activeAxis || isHighlighted;
              const hoverTone = getSecurityHoverTone(axis, isDark);
              const resolvedTone = isHighlighted && !activeAxis && highlightColor
                ? { color: highlightColor, border: `${highlightColor}55`, glow: `${highlightColor}30`, soft: `${highlightColor}14` }
                : hoverTone;
              return (
                <g key={`${axis.id}-points`}>
                  <circle
                    cx={axis.baselinePoint.x}
                    cy={axis.baselinePoint.y}
                    r={isActive ? 5 : 4}
                    fill={isDark ? '#0f172a' : '#ffffff'}
                    stroke={isActive ? resolvedTone.color : (isDark ? 'rgba(148,163,184,0.72)' : '#94a3b8')}
                    strokeWidth={2}
                  />
                  <circle
                    cx={axis.currentPoint.x}
                    cy={axis.currentPoint.y}
                    r={isActive ? 6 : 5}
                    fill={CURRENT_BUILD_PURPLE}
                    stroke={isDark ? '#020617' : '#ffffff'}
                    strokeWidth={2.25}
                  />
                  {isActive && (
                    <circle
                      cx={axis.currentPoint.x}
                      cy={axis.currentPoint.y}
                      r={10}
                      fill="none"
                      stroke={resolvedTone.color}
                      strokeOpacity="0.35"
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}
            </svg>
            )}

            {hasItems && chartModel.axes.map((axis) => {
              const isHighlighted = highlightedAxes.includes(axis.id);
              const isActive = axis.id === activeAxis || isHighlighted;
              const placement = axis.labelPlacement;
              const isSelected = axis.id === selectedAxisId;
              const directionMeta = getDirectionMeta(axis);
              const hoverTone = getSecurityHoverTone(axis, isDark);
              const resolvedTone = isHighlighted && !activeAxis && highlightColor
                ? { color: highlightColor, border: `${highlightColor}55`, glow: `${highlightColor}30`, soft: `${highlightColor}14` }
                : hoverTone;
              const openAbove = axis.labelPoint.dy > 0.45;
              // Align tooltips to open toward the chart center (invert default left/right)
              const tooltipAlign = placement.textAlign === 'right'
                ? { left: 0 }
                : placement.textAlign === 'center'
                  ? { left: '50%', transform: 'translateX(-50%)' }
                  : { right: 0 };

              return (
                <div
                  key={`${axis.id}-label`}
                  onMouseEnter={() => onAxisHover?.(axis.id)}
                  onMouseLeave={() => onAxisLeave?.()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedAxisId((current) => current === axis.id ? null : axis.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: placement.left,
                    top: placement.top,
                    transform: placement.transform,
                    textAlign: placement.textAlign,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-grid',
                      justifyItems: 'center',
                      gap: 3,
                      padding: '5px 6px',
                      borderRadius: 14,
                      background: isActive
                        ? (isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.97)')
                        : (isDark ? 'rgba(15,23,42,0.68)' : 'rgba(255,255,255,0.86)'),
                      border: `1px solid ${isSelected || isActive ? (isActive ? resolvedTone.border : (isDark ? 'rgba(148,163,184,0.12)' : '#dbe5ef')) : isDark ? 'rgba(148,163,184,0.10)' : '#dbe5ef'}`,
                      boxShadow: isSelected || isActive ? `0 12px 28px -18px ${isActive ? resolvedTone.glow : (isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.12)')}` : 'none',
                      transition: `${BH_THEME_TRANSITION}, ${BH_INTERACTIVE_TRANSITION}`,
                      width: 'max-content',
                      maxWidth: 'none',
                    }}
                  >
                    <div className="d-flex align-items-center" style={{ gap: 4, justifyContent: 'center' }}>
                      <span
                        className="d-inline-flex align-items-center justify-content-center"
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: directionMeta.soft,
                          color: directionMeta.tint,
                          flexShrink: 0,
                        }}
                      >
                        <IconifyIcon icon={directionMeta.icon} style={{ fontSize: 12 }} />
                      </span>
                      <div style={{ fontFamily: UI_FONT_STACK, fontSize: 11, fontWeight: 800, color: isActive ? resolvedTone.color : (isDark ? '#bfdbfe' : '#334155'), lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                        {axis.label}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span title="Baseline" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: isDark ? 'rgba(148,163,184,0.6)' : '#64748b', display: 'inline-block' }} />
                        <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569' }}>{formatAxisValue(axis.baseline ?? 0)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span title="Current" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: CURRENT_BUILD_PURPLE, display: 'inline-block' }} />
                        <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 800, color: CURRENT_BUILD_PURPLE }}>{formatAxisValue(axis.current ?? 0)}</span>
                      </div>
                    </div>
                  </div>
 

                  {isSelected && axis.tooltip && (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        position: 'absolute',
                        zIndex: 5,
                        ...(placement.textAlign === 'center'
                          ? (openAbove ? { bottom: 'calc(100% + 10px)' } : { top: 'calc(100% + 10px)' })
                          : { top: '50%', marginTop: -48 }),
                        width: 230,
                        maxWidth: 'min(230px, calc(100vw - 48px))',
                        padding: '10px 12px',
                        borderRadius: 14,
                        background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
                        border: `1px solid ${isActive ? resolvedTone.border : (isDark ? 'rgba(148,163,184,0.12)' : '#dbe5ef')}`,
                        boxShadow: isDark
                          ? '0 18px 38px -24px rgba(2,6,23,0.95), 0 0 0 1px rgba(255,255,255,0.02) inset'
                          : '0 18px 38px -24px rgba(15,23,42,0.24), 0 1px 0 rgba(255,255,255,0.84) inset',
                        backdropFilter: 'blur(18px)',
                        textAlign: 'left',
                        ...tooltipAlign,
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Close ${axis.label} explanation`}
                        onClick={() => setSelectedAxisId(null)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: 'none',
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? '#94a3b8' : '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: BH_INTERACTIVE_TRANSITION,
                        }}
                      >
                        <IconifyIcon icon="solar:close-circle-linear" style={{ fontSize: 14 }} />
                      </button>

                      <div style={{ paddingRight: 28, fontFamily: UI_FONT_STACK, fontSize: 12, lineHeight: 1.5, color: isDark ? '#e2e8f0' : '#334155', marginBottom: 10 }}>
                        {axis.tooltip.summary}
                      </div>

                      <div style={{ padding: '10px', borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <div style={{ fontFamily: UI_FONT_STACK, fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#64748b' : '#94a3b8', marginBottom: 6 }}>
                          Formula
                        </div>
                        <div style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, lineHeight: 1.6, color: isDark ? '#cbd5e1' : '#475569', whiteSpace: 'pre-line', opacity: 0.9 }}>
                          {axis.tooltip.formula}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        <div
          className="d-flex align-items-center justify-content-between flex-wrap"
          style={{
            gap: 14,
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)'}`,
          }}
        >
          <div className="d-flex flex-wrap" style={{ gap: 14 }}>
            {[
              getDirectionMeta({ direction: 'maximize' }),
              getDirectionMeta({ direction: 'minimize' }),
            ].map((entry) => (
              <div key={entry.label} className="d-flex align-items-center" style={{ gap: 6 }}>
                <div
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: entry.soft,
                    color: entry.tint,
                    flexShrink: 0,
                  }}
                >
                  <IconifyIcon icon={entry.icon} style={{ fontSize: 11 }} />
                </div>
                <span style={{ fontFamily: UI_FONT_STACK, fontSize: 10.5, lineHeight: 1.4, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {entry.description}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: UI_FONT_STACK, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 'auto' }}>
            <div className="d-flex align-items-center" style={{ gap: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: isDark ? '#38bdf8' : '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, lineHeight: 1.4, color: isDark ? '#94a3b8' : '#64748b' }}>Values normalized on a <strong style={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: 700 }}>0.0 &mdash; 1.0</strong> scale</span>
            </div>
            <span style={{ paddingLeft: 10, fontSize: 9.5, color: isDark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>Click nodes for details</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPostureRadar;
