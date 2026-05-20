import { useSelector } from 'react-redux';
import { selectJobId } from '@/store/slices/sessionSlice';
import { selectReport } from '@/store/slices/reportSlice';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useState } from 'react';
import { useLayoutContext } from '@/context/useLayoutContext';
import { useLocation } from 'react-router-dom';

/**
 * Displays the current scan/job ID in the topbar (IoT context).
 * Shows nothing when viewing latest report (no job_id).
 */
export default function JobIdBadge() {
  const sessionJobId = useSelector(selectJobId);
  const report = useSelector(selectReport);
  const reportJobId = report?.report?.job_id ?? report?.job_id ?? null;
  const jobId = sessionJobId ?? reportJobId;
  const [hovered, setHovered] = useState(false);
  const { themeMode } = useLayoutContext();
  const isDark = themeMode === 'dark';
  const { pathname } = useLocation();
  const isAnalyticsPage = pathname === '/dashboard';

  if (!jobId) return null;

  const runUrl = `https://github.com/abhis3n/corefense-demo-prototype/actions/runs/${jobId}`;
  const palette = isDark
    ? {
        border: hovered ? 'rgba(167, 139, 250, 0.50)' : 'rgba(167, 139, 250, 0.32)',
        background: hovered ? 'rgba(109, 40, 217, 0.24)' : 'rgba(109, 40, 217, 0.16)',
        shadow: hovered ? '0 0 0 3px rgba(109, 40, 217, 0.18)' : 'none',
        iconColor: '#ddd6fe',
        textColor: '#f5f3ff',
        arrowColor: '#c4b5fd',
      }
    : {
        border: hovered ? 'rgba(139, 92, 246, 0.40)' : 'rgba(139, 92, 246, 0.26)',
        background: hovered ? 'rgba(139, 92, 246, 0.13)' : 'rgba(139, 92, 246, 0.07)',
        shadow: hovered ? '0 0 0 3px rgba(139, 92, 246, 0.10)' : 'none',
        iconColor: '#8b5cf6',
        textColor: '#7c3aed',
        arrowColor: '#8b5cf6',
      };

  return (
    <a
      href={runUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="d-flex align-items-center gap-2 text-decoration-none"
      style={{
        padding: '6px 11px 6px 9px',
        borderRadius: 8,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.background,
        boxShadow: palette.shadow,
        transition: 'all 0.15s ease',
        cursor: isAnalyticsPage ? 'default' : 'pointer',
        flex: '0 0 auto',
        alignSelf: 'center',
        maxWidth: '220px',
        marginLeft: '12px',
        whiteSpace: 'nowrap',
      }}
      onClick={isAnalyticsPage ? (e) => e.preventDefault() : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={
        isAnalyticsPage
          ? 'Git job run link is disabled on the Analytics page'
          : `Open GitHub Actions run ${jobId}`
      }
      aria-disabled={isAnalyticsPage ? 'true' : undefined}
      tabIndex={isAnalyticsPage ? -1 : 0}
    >
      {/* Git icon */}
      <IconifyIcon
        icon="mdi:git"
        style={{ fontSize: 17, color: palette.iconColor, flexShrink: 0 }}
      />

      {/* Label only */}
      <span
        style={{
          fontSize: '0.76rem',
          fontWeight: 700,
          textTransform: 'none',
          letterSpacing: '0.06em',
          color: palette.textColor,
          whiteSpace: 'nowrap',
        }}
      >
        Git Job Run
      </span>

      {/* External link icon */}
      <IconifyIcon
        icon="solar:arrow-right-up-linear"
        style={{
          fontSize: 12,
          color: palette.arrowColor,
          flexShrink: 0,
          opacity: hovered ? 1 : 0.72,
          transition: 'opacity 0.15s ease',
          marginLeft: 1,
        }}
      />
    </a>
  );
}
