import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SecurityInsightCard from './SecurityInsightCard';

const UI_FONT_STACK = '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif';

const SecurityInsightsPanel = ({ items = [], isDark, onCardHover, onCardLeave }) => (
  <div className="d-flex flex-column" style={{ gap: 10, height: '100%', minHeight: 0 }}>
    {/* Section eyebrow — neutral, typographic, no color noise */}
    <div
      className="d-flex align-items-center"
      style={{
        padding: '10px 14px',
        marginBottom: 6,
        background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.03)',
        borderRadius: 12,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)'}`,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
        <span style={{
          fontFamily: UI_FONT_STACK,
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(51,65,85,0.7)',
        }}>
          Drifts
        </span>
        <span style={{
          fontFamily: UI_FONT_STACK,
          fontSize: 11,
          fontWeight: 500,
          color: isDark ? 'rgba(100,116,139,0.75)' : 'rgba(100,116,139,0.85)',
          letterSpacing: '-0.01em',
        }}>
          Changes and new additions
        </span>
      </div>

      <div className="ms-auto d-flex align-items-center gap-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconifyIcon icon="solar:round-arrow-down-broken" style={{ fontSize: 13, color: isDark ? '#f87171' : '#ef4444' }} />
          <span style={{ fontFamily: UI_FONT_STACK, fontSize: 9, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Regressions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconifyIcon icon="solar:danger-triangle-bold" style={{ fontSize: 13, color: isDark ? '#f87171' : '#ef4444' }} />
          <span style={{ fontFamily: UI_FONT_STACK, fontSize: 9, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Risks</span>
        </div>
      </div>
    </div>
    <div className="d-flex flex-column" style={{ gap: 10, flex: 1, minHeight: 0 }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <SecurityInsightCard item={item} isDark={isDark} onCardHover={onCardHover} onCardLeave={onCardLeave} />
        </div>
      ))}
    </div>
  </div>
);

export default SecurityInsightsPanel;