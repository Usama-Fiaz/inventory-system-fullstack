import IconifyIcon from '@/components/wrappers/IconifyIcon';

const DEFAULT_MONO_FONT_STACK =
  '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", "Noto Sans Mono", "Liberation Mono", "Cascadia Mono", monospace';

export default function BuildCompareBoxes({
  isDark,
  baselineId,
  baselineTime,
  targetId,
  targetTime,
  monoFontStack = DEFAULT_MONO_FONT_STACK,
  transition = 'all 0.2s ease',
  maxWidth = 580,
}) {
  const items = [
    {
      label: 'Baseline build',
      id: baselineId,
      time: baselineTime,
      background: isDark ? 'rgba(15,23,42,0.68)' : 'rgba(255,255,255,0.86)',
      border: isDark ? 'rgba(148,163,184,0.16)' : '#dbe5f1',
      labelColor: isDark ? '#94a3b8' : '#64748b',
      valueColor: isDark ? '#f8fafc' : '#0f172a',
      badgeLabel: 'Reference',
      badgeBackground: isDark ? 'rgba(148,163,184,0.10)' : '#f8fafc',
      badgeBorder: isDark ? 'rgba(148,163,184,0.18)' : '#d7e0ea',
      badgeColor: isDark ? '#cbd5e1' : '#475569',
    },
    {
      label: 'Current build',
      id: targetId,
      time: targetTime,
      background: isDark ? 'rgba(30,41,59,0.88)' : '#f3f6fa',
      border: isDark ? 'rgba(148,163,184,0.24)' : '#cbd5e1',
      labelColor: isDark ? '#cbd5e1' : '#475569',
      valueColor: isDark ? '#f8fafc' : '#0f172a',
      badgeLabel: 'Current',
      badgeBackground: isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0',
      badgeBorder: isDark ? 'rgba(148,163,184,0.24)' : '#cbd5e1',
      badgeColor: isDark ? '#e2e8f0' : '#334155',
    },
  ];

  return (
    <div className="d-flex flex-wrap align-items-stretch" style={{ gap: 8, width: '100%', maxWidth }}>
      {items.map((item, index) => (
        <div key={item.label} className="d-flex align-items-center" style={{ gap: 6, flex: '1 1 220px', minWidth: 180 }}>
          {index === 1 ? (
            <div
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.22)',
                border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : '#dbe5f1'}`,
                color: isDark ? '#94a3b8' : '#475569',
                flexShrink: 0,
                transition,
              }}
              aria-label="Compare baseline and target"
            >
              <IconifyIcon icon="solar:transfer-horizontal-bold" style={{ fontSize: 11 }} />
            </div>
          ) : null}

          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '7px 10px',
              borderRadius: 10,
              background: item.background,
              border: `1px solid ${item.border}`,
              boxShadow: 'none',
              transition,
            }}
          >
            <div className="d-flex align-items-center justify-content-between" style={{ gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: item.labelColor }}>
                {item.label}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1px 5px',
                  borderRadius: 999,
                  background: item.badgeBackground,
                  border: `1px solid ${item.badgeBorder}`,
                  color: item.badgeColor,
                  fontSize: 7,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  transition,
                }}
              >
                {item.badgeLabel}
              </span>
            </div>
            <div className="text-truncate" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.02em', color: item.valueColor, marginBottom: 1, fontFamily: monoFontStack }}>
              {item.id}
            </div>
            <div className="text-truncate" style={{ fontSize: 10, lineHeight: 1.4, color: isDark ? '#94a3b8' : '#64748b', fontFamily: monoFontStack }}>
              {item.time || 'Timestamp unavailable'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

