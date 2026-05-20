import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getDeltaDirection, getRiskTone } from './securityOverviewData';

const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';
const MONO_FONT_STACK = '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';

const getTrendGlowTone = (delta, isDark) => {
  if (delta > 0) {
    return {
      color: isDark ? '#4ade80' : '#16a34a',
      border: isDark ? 'rgba(74,222,128,0.38)' : 'rgba(22,163,74,0.28)',
      glow: isDark ? 'rgba(74,222,128,0.28)' : 'rgba(22,163,74,0.22)',
      soft: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(22,163,74,0.08)',
    };
  }

  if (delta < 0) {
    return {
      color: isDark ? '#f87171' : '#dc2626',
      border: isDark ? 'rgba(248,113,113,0.38)' : 'rgba(220,38,38,0.24)',
      glow: isDark ? 'rgba(248,113,113,0.28)' : 'rgba(220,38,38,0.18)',
      soft: isDark ? 'rgba(239,68,68,0.14)' : 'rgba(220,38,38,0.06)',
    };
  }

  return {
    color: isDark ? '#93c5fd' : '#2563eb',
    border: isDark ? 'rgba(147,197,253,0.34)' : 'rgba(37,99,235,0.22)',
    glow: isDark ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.16)',
    soft: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.06)',
  };
};

const SecurityInsightCard = ({ item, isDark, onHover, onLeave, onCardHover, onCardLeave }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const direction = getDeltaDirection(item.delta);
  const totalUnits = Number(String(item.units ?? '0').replace(/,/g, '')) || 0;
  const riskCount = Number(item.risks) || 0;
  const secureCount = Number.isFinite(Number(item.secureCount))
    ? Math.max(Number(item.secureCount), 0)
    : Math.max(totalUnits - riskCount, 0);

  // Per-card accent for visual identity
  const accentColor = item.accent || (isDark ? '#38bdf8' : '#2563eb');
  const accentSoft = item.accentSoft || (isDark ? 'rgba(56,189,248,0.12)' : 'rgba(37,99,235,0.07)');

  // Donut chart calculations for drift
  const driftPct = Math.min(100, Number(item.coverage) || 0);
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (driftPct / 100) * circumference;

  const deltaColor = direction === 'improvement'
    ? (isDark ? '#4ade80' : '#16a34a')
    : direction === 'regression'
      ? (isDark ? '#f87171' : '#dc2626')
      : (isDark ? '#94a3b8' : '#64748b');
  const glowTone = getTrendGlowTone(item.delta, isDark);
  const secureColor = isDark ? '#4ade80' : '#16a34a';

  const riskTone = getRiskTone(riskCount);
  // Using consistent risk red for all "Risk" badges regardless of severity or topic
  const riskColor = isDark ? '#f87171' : '#dc2626';

  // Use weighted contribution to overall for badge (sums to overall delta across cards)
  const badgeDelta = Number(item.contribution ?? item.delta ?? 0);
  const badgeDirection = getDeltaDirection(badgeDelta);
  const badgeDeltaColor = badgeDirection === 'improvement'
    ? (isDark ? '#4ade80' : '#16a34a')
    : badgeDirection === 'regression'
      ? (isDark ? '#f87171' : '#dc2626')
      : (isDark ? '#94a3b8' : '#64748b');
  const rawDelta = badgeDelta;
  const trendValue = `${rawDelta > 0 ? '+' : rawDelta < 0 ? '−' : ''}${Math.abs(rawDelta).toFixed(1)}`;
  const trendIcon = badgeDirection === 'improvement'
    ? 'solar:double-alt-arrow-up-bold-duotone'
    : badgeDirection === 'regression'
      ? 'solar:double-alt-arrow-down-bold-duotone'
      : null;

  const handleNavigate = (event) => {
    if (!item.route) return;

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    const goToRoute = () => {
      window.scrollTo(0, 0);
      navigate(item.route);
    };

    if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        goToRoute();
      });
      return;
    }

    goToRoute();
  };

  return (
    <Link
      to={item.route || '#'}
      onClick={handleNavigate}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover?.();
        onCardHover?.({ axisIds: item.axisIds ?? [], color: badgeDeltaColor });
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onLeave?.();
        onCardLeave?.();
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flex: 1,
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        textDecoration: 'none',
        cursor: item.route ? 'pointer' : 'default',
        flexDirection: 'column',
        gap: 0,
        minHeight: 176,
        padding: '18px 22px 16px',
        borderRadius: 20,
        background: isDark
          ? 'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.99) 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        border: `1px solid ${isHovered ? glowTone.color + '55' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.1)')}`,
        boxShadow: isHovered
          ? `0 16px 36px -16px ${glowTone.glow}, inset 0 0 0 1px ${glowTone.soft}`
          : isDark
            ? `0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)`
            : `0 2px 8px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Ambient glow tied to trend direction — whisper of context, not a shout */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '60%',
          background: `radial-gradient(ellipse at top right, ${glowTone.color}0a 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 16 }}>
        <span style={{ 
          fontFamily: UI_FONT_STACK,
          fontSize: 15,
          fontWeight: 600,
          color: isDark ? '#f1f5f9' : '#0f172a',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          {item.label}
        </span>
        {/* Trend badge */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '3px 9px',
            borderRadius: 999,
            background: isDark ? `${badgeDeltaColor}14` : `${badgeDeltaColor}0f`,
            border: `1px solid ${badgeDeltaColor}30`,
          }}
        >
          {trendIcon && <IconifyIcon icon={trendIcon} style={{ fontSize: 11, color: badgeDeltaColor }} />}
          <span style={{
            fontFamily: MONO_FONT_STACK,
            fontSize: 12,
            fontWeight: 800,
            color: badgeDeltaColor,
            letterSpacing: '-0.02em',
          }}>
            {trendValue}
          </span>
          <span style={{
            fontFamily: MONO_FONT_STACK,
            fontSize: 10,
            fontWeight: 700,
            color: badgeDeltaColor,
            textTransform: 'lowercase',
            opacity: 0.82,
          }}>
            pts
          </span>
        </div>
      </div>

      {/* Primary metric row: [number + analyzed] | [divider] | [donut + drifts] */}
      <div className="d-flex align-items-center" style={{ gap: 16, marginBottom: 16, flex: 1 }}>
        {/* Left: analyzed count */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: MONO_FONT_STACK,
            fontSize: 40,
            fontWeight: 900,
            color: isDark ? '#f1f5f9' : '#0f172a',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}>
            {item.units}
          </div>
          <div style={{
            fontFamily: UI_FONT_STACK,
            fontSize: 10,
            fontWeight: 700,
            color: isDark ? '#64748b' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginTop: 5,
          }}>
            Analyzed{item.id === 'kernel' && (
              <span style={{ fontWeight: 500, fontSize: 9, color: isDark ? '#64748b' : '#6b7280', textTransform: 'none', letterSpacing: 0 }}> (configs + modules)</span>
            )}
          </div>
        </div>

        {/* Thin vertical divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)', flexShrink: 0 }} />

        {/* Right: donut alongside count + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="42" height="42" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="20" cy="20" r={radius} fill="transparent"
                stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)'}
                strokeWidth="3" />
              <circle cx="20" cy="20" r={radius} fill="transparent"
                stroke={isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.4)'}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.22,1,0.36,1)' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: MONO_FONT_STACK, fontSize: 8, fontWeight: 800,
              color: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(71,85,105,0.6)',
            }}>
              {driftPct}%
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: MONO_FONT_STACK, fontSize: 15, fontWeight: 900,
              color: isDark ? '#e2e8f0' : '#1e293b', lineHeight: 1,
            }}>
              {item.driftCount}
            </div>
            <div style={{
              fontFamily: UI_FONT_STACK, fontSize: 9, fontWeight: 700,
              color: isDark ? 'rgba(148,163,184,0.5)' : 'rgba(71,85,105,0.65)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3,
            }}>
              Drifts
            </div>
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div 
        className="d-flex align-items-center"
        style={{ gap: 8, paddingTop: 12, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.08)'}` }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 999,
          background: isDark ? 'rgba(74,222,128,0.08)' : 'rgba(22,163,74,0.07)',
          border: `1px solid ${isDark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.18)'}`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: secureColor }} />
          <span style={{ fontFamily: UI_FONT_STACK, fontSize: 11, fontWeight: 700, color: secureColor }}>
            {secureCount} <span style={{ opacity: 0.7 }}>Secure</span>
          </span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 999,
          background: isDark ? `${riskColor}12` : `${riskColor}0e`,
          border: `1px solid ${riskColor}30`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: riskColor }} />
          <span style={{ fontFamily: UI_FONT_STACK, fontSize: 11, fontWeight: 700, color: riskColor }}>
            {riskCount} <span style={{ opacity: 0.7 }}>Risks</span>
          </span>
          {riskCount > 0 && (
            <div className="d-flex align-items-center" style={{ marginLeft: 6, gap: 8, borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'}`, paddingLeft: 8 }}>
              <div className="d-flex align-items-center" style={{ gap: 3 }}>
                <IconifyIcon icon="solar:round-arrow-down-broken" style={{ fontSize: 13, color: riskColor }} />
                <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 700, color: riskColor }}>{item.regressions || 0}</span>
              </div>
              <div className="d-flex align-items-center" style={{ gap: 3 }}>
                <IconifyIcon icon="solar:danger-triangle-bold" style={{ fontSize: 13, color: riskColor }} />
                <span style={{ fontFamily: MONO_FONT_STACK, fontSize: 10, fontWeight: 700, color: riskColor }}>{item.newRisks || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default SecurityInsightCard;