import React, { useMemo } from 'react';
import { Card, CardBody, Row, Col, CardTitle, Badge } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import getStatusIcon from '@/app/(admin)/dashboard/statusIcons';
import { selectReport, selectReportStatus, selectReportError } from '@/store/slices/reportSlice';
import { useLayoutContext } from '@/context/useLayoutContext';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** CRA Readiness Score display value (0–100). Change this to show a different percentage. */
const CRA_READINESS_DISPLAY_PERCENT = 50;

const ComplianceOverview = () => {
  const { themeMode } = useLayoutContext();
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const isDark = themeMode === 'dark';

  const titleFontSize = 'clamp(16px, 2.1vw, 18px)';
  const badgeFontSize = 'clamp(10px, 1.4vw, 11px)';
  const percentFontSize = 'clamp(22px, 4.3vw, 32px)';
  const helperTextFontSize = 'clamp(11px, 1.5vw, 12px)';

  const loading = status === 'idle' || status === 'loading';

  const {
    readinessScore,
    readinessLabel,
    readinessColor,
    blockingRequirements,
    legalStatusLabel,
    legalStatusColor
  } = useMemo(() => {
    if (!report) {
      return {
        readinessScore: 0,
        readinessLabel: 'No data',
        readinessColor: isDark ? '#9ca3af' : '#6b7280',
        blockingRequirements: 0,
        legalStatusLabel: 'Unknown',
        legalStatusColor: isDark ? '#e5e7eb' : '#374151'
      };
    }

    const filesystemCount = report?.system_hardening?.mount_flag_violations?.length ?? 0;
    const kernelEnableCount = report?.system_hardening?.kernel_config?.need_to_enable?.length ?? 0;
    const kernelDisableCount = report?.system_hardening?.kernel_config?.need_to_disable?.length ?? 0;

    // Count critical/high unpatched CVEs for blocking requirements.
    let criticalHighCount = 0;
    const pkgs = report?.cve?.package ?? [];
    pkgs.forEach((pkg) => {
      (pkg?.issue ?? []).forEach((issue) => {
        const s = issue?.status;
        const isUnpatched = s !== 'Patched' && s !== 'Ignored';
        if (!isUnpatched) return;
        const sevRaw = (issue?.severity || issue?.Severity || '').toString().toLowerCase();
        if (sevRaw === 'critical' || sevRaw === 'high') {
          criticalHighCount += 1;
        }
      });
    });

    const displayScore = clamp(CRA_READINESS_DISPLAY_PERCENT, 0, 100);

    let readinessLabelLocal = 'Low Readiness';
    if (displayScore >= 80) readinessLabelLocal = 'High Readiness';
    else if (displayScore >= 55) readinessLabelLocal = 'Moderate Readiness';

    // Use brighter, more saturated colors in dark mode so they pop against the background
    const lowColor = isDark ? '#fb6a6a' : '#dc2626';
    const midColor = isDark ? '#fb923c' : '#c2410c'; // amber-600/orange-700 — readable on both light and dark
    const highColor = isDark ? '#4ade80' : '#16a34a';

    const readinessColorLocal = displayScore >= 80
      ? highColor
      : displayScore >= 55
        ? midColor
        : lowColor;

    const blocking =
      (criticalHighCount > 0 ? 1 : 0) +
      (kernelDisableCount > 0 ? 1 : 0) +
      (filesystemCount > 0 ? 1 : 0);

    const hasBlocking = blocking > 0;
    const legalStatusLabelLocal = hasBlocking ? 'NOT COMPLIANT' : 'On Track';
    const legalStatusColorLocal = hasBlocking ? lowColor : highColor;

    return {
      readinessScore: displayScore,
      readinessLabel: readinessLabelLocal,
      readinessColor: readinessColorLocal,
      blockingRequirements: blocking,
      legalStatusLabel: legalStatusLabelLocal,
      legalStatusColor: legalStatusColorLocal
    };
  }, [report, isDark]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="d-flex align-items-center justify-content-center rounded-circle overflow-hidden" style={{ width: 28, height: 28 }} aria-label="EU">
                <IconifyIcon icon="circle-flags:eu" style={{ fontSize: 28 }} />
              </span>
              <h5 className="mb-0 fw-bold">EU CRA Legal Status</h5>
            </div>
          </div>
          <div className="placeholder-glow">
            <span className="placeholder col-6 mb-2" style={{ height: 18, borderRadius: 8 }} />
            <span className="placeholder col-4 mb-3" style={{ height: 18, borderRadius: 8 }} />
            <span className="placeholder col-8 mb-4" style={{ height: 20, borderRadius: 10 }} />
            <span className="placeholder col-5" style={{ height: 28, borderRadius: 10 }} />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (status === 'failed' && !report) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-4">
          <h5 className="mb-2 fw-bold">EU CRA Legal Status</h5>
          <Badge bg="danger-subtle" className="text-danger" style={{ fontSize: 11, fontWeight: 600 }}>
            Failed to load report.
          </Badge>
        </CardBody>
      </Card>
    );
  }

  const textColor = isDark ? '#e5e7eb' : '#111827';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardBody className="p-4 d-flex flex-column">
        <div className="d-flex align-items-center gap-2 mb-3">
          <span
            className="d-flex align-items-center justify-content-center rounded-circle overflow-hidden flex-shrink-0"
            style={{ width: 32, height: 32 }}
            aria-label="EU"
          >
            <IconifyIcon icon="circle-flags:eu" style={{ fontSize: 32 }} />
          </span>
          <CardTitle className="mb-0" style={{ fontSize: titleFontSize, fontWeight: 600 }}>
            EU Cyber Resilience Act
          </CardTitle>
        </div>

        <div className="d-flex align-items-center gap-2 mb-1">
          <IconifyIcon
            icon={legalStatusLabel === 'NOT COMPLIANT' ? getStatusIcon('regressed') : getStatusIcon('improved')}
            style={{ fontSize: 18, color: legalStatusColor }}
          />
          <Badge
            bg={legalStatusLabel === 'NOT COMPLIANT' ? 'danger-subtle' : 'success-subtle'}
            className={legalStatusLabel === 'NOT COMPLIANT' ? 'text-danger' : 'text-success'}
            style={{ fontSize: badgeFontSize, fontWeight: 600 }}
          >
            {legalStatusLabel}
          </Badge>
        </div>
        <div className="mb-3" style={{ fontSize: helperTextFontSize, color: mutedColor }}>
          Blocking requirements: {blockingRequirements}
        </div>

        <hr className="my-2" />

        <Row className="align-items-center mb-3">
          <Col sm={6} className="mb-3 mb-sm-0">
            <div style={{ fontSize: helperTextFontSize, color: mutedColor }} className="mb-1">
              CRA Readiness Score
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span
                className="fw-bold"
                style={{ fontSize: percentFontSize, lineHeight: 1, color: readinessColor }}
              >
                {readinessScore}%
              </span>
              <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 11, fontWeight: 600, borderRadius: 999,
                  padding: '3px 10px',
                  backgroundColor: readinessLabel === 'Low Readiness'
                    ? (isDark ? 'rgba(251,106,106,0.15)' : 'rgba(220,38,38,0.10)')
                    : readinessLabel === 'Moderate Readiness'
                      ? (isDark ? 'rgba(251,146,60,0.15)' : 'rgba(194,65,12,0.10)')
                      : (isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.10)'),
                  border: `1px solid ${readinessColor}33`,
                  color: readinessColor,
                }}>
                {readinessLabel}
              </span>
            </div>
          </Col>
          <Col sm={6}>
            {/* Gradient is stretched on the filled bar so its right edge always maps to the correct spectrum color */}
            <div
              className="rounded-pill overflow-hidden"
              style={{
                height: 12,
                backgroundColor: isDark ? '#1f2933' : '#f3f4f6',
              }}
            >
              <div
                className="h-100 rounded-pill"
                style={{
                  width: `${clamp(readinessScore, 0, 100)}%`,
                  background: 'linear-gradient(90deg, #ef4444 0%, #f97316 22%, #eab308 48%, #22c55e 78%, #16a34a 100%)',
                  backgroundSize: readinessScore > 0 ? `${(10000 / readinessScore).toFixed(2)}% 100%` : '100% 100%',
                  backgroundPosition: '0 0',
                  transition: 'width 0.15s ease',
                }}
              />
            </div>
            <div
              className="d-flex justify-content-between align-items-center mt-1"
              style={{
                fontSize: helperTextFontSize,
                color: mutedColor,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </Col>
        </Row>

        <div style={{ fontSize: 11, color: mutedColor }}>
          This score reflects implementation progress and is a heuristic indicator only. It does not
          constitute a legal assessment of compliance under the EU Cyber Resilience Act (CRA).
        </div>
      </CardBody>
    </Card>
  );
};

export default ComplianceOverview;

