import React, { useMemo } from 'react';
import { Card, CardBody, CardTitle, Row, Col, Badge } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useSelector } from 'react-redux';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getStatusIcon } from '../../statusIcons';
import { selectReport, selectReportStatus, selectReportError } from '@/store/slices/reportSlice';
import { useLayoutContext } from '@/context/useLayoutContext';

const NoticeCell = ({ bgIdle, borderColor, icon, iconColor, label, labelColor, fix, fixColor }) => {
  return (
    <div
      className="rounded p-2 mt-1 d-flex align-items-start gap-2"
      style={{
        backgroundColor: bgIdle,
        border: `1px solid ${borderColor}`,
        minWidth: 0,
        cursor: 'default',
      }}
    >
      <IconifyIcon icon={icon} style={{ fontSize: 14, color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: labelColor,
            marginBottom: 2,
            lineHeight: 1.3,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 10,
            color: fixColor,
            lineHeight: 1.3,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            marginTop: '6px',
          }}
        >
          Fix: {fix}
        </div>
      </div>
    </div>
  );
};

const MandatoryAccessControls = () => {
  const { themeMode } = useLayoutContext();
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const isDark = themeMode === 'dark';

  const titleFontSize = 'clamp(16px, 2.1vw, 18px)';
  const subsystemTitleFontSize = 'clamp(14px, 1.9vw, 15px)';
  const helperTextFontSize = 'clamp(11px, 1.5vw, 12px)';

  const loading = status === 'idle' || status === 'loading';

  const {
    apparmorStatus,
    selinuxStatus,
    tomoyoStatus,
    donutData,
    apparmorPercent
  } = useMemo(() => {
    // Demo: AppArmor enabled, 75% enforced / 25% missing
    const enforced = 75;
    const missing = 25;
    const total = enforced + missing;
    const percent = Math.round((enforced / total) * 100);

    return {
      apparmorStatus: 'Enabled',
      selinuxStatus: 'Not Activated',
      tomoyoStatus: 'Disabled',
      donutData: [
        { key: 'enforced', name: 'Profiles Active', value: enforced },
        { key: 'missing', name: 'Missing', value: missing }
      ],
      apparmorPercent: percent
    };
  }, []);

  const textColor = isDark ? '#e5e7eb' : '#111827';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const enforcedColor = '#22c55e';
  const missingColor = isDark ? '#4b5563' : '#e5e7eb';
  const cardBgGrey = isDark ? '#374151' : '#f3f4f6';

  if (loading) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-4">
        <h5 className="mb-0 fw-semibold" style={{ fontSize: titleFontSize }}>Mandatory Access Controls</h5>
          <div className="placeholder-glow mt-3">
            <span className="placeholder col-12 mb-2" style={{ height: 140, borderRadius: 12 }} />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (status === 'failed' && !report) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-4">
        <h5 className="mb-0 fw-semibold" style={{ fontSize: titleFontSize }}>Mandatory Access Controls</h5>
          <div className="text-danger small">Failed to load report.</div>
        </CardBody>
      </Card>
    );
  }

  const renderCenterLabel = () => (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 18, fontWeight: 700, fill: textColor }}
    >
      {apparmorPercent}%
    </text>
  );

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardBody className="p-3 p-xl-4">
        <CardTitle as="h5" className="mb-4" style={{ fontSize: titleFontSize, fontWeight: 600, color: textColor }}>
          Mandatory Access Controls
        </CardTitle>

        <Row className="g-3 g-md-4 align-items-stretch">
          <Col xs={12} md={6} xl={4} className="d-flex">
            <div
              className="rounded-3 w-100 p-2 p-xl-3"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="mb-2 d-flex align-items-center justify-content-between" style={{ gap: 6 }}>
                <span className="fw-semibold" style={{ fontSize: subsystemTitleFontSize, color: textColor, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  AppArmor
                </span>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
                    fontSize: 11, fontWeight: 600, borderRadius: 999,
                    padding: '3px 10px',
                    backgroundColor: /disabled/i.test(apparmorStatus)
                      ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)')
                      : (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)'),
                    border: /disabled/i.test(apparmorStatus)
                      ? `1px solid ${isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.22)'}`
                      : `1px solid ${isDark ? 'rgba(34,197,94,0.30)' : 'rgba(34,197,94,0.22)'}`,
                    color: /disabled/i.test(apparmorStatus)
                      ? (isDark ? '#fca5a5' : '#b91c1c')
                      : (isDark ? '#4ade80' : '#15803d'),
                  }}>
                    {/disabled/i.test(apparmorStatus) ? 'Disabled' : 'Enabled'}
                  </span>
              </div>
              {!/disabled/i.test(apparmorStatus) && (
                <div className="mb-2 d-flex align-items-center gap-1 rounded" style={{
                  backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.10)',
                  border: `1px solid ${isDark ? 'rgba(34,197,94,0.28)' : 'rgba(34,197,94,0.22)'}`,
                  padding: '4px 8px',
                  width: 'fit-content'
                }}>
                  <IconifyIcon icon="solar:shield-check-bold" style={{ fontSize: 12, color: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#4ade80' : '#15803d' }}>Policy Mode: Enforced</span>
                </div>
              )}
              <div style={{ height: 'clamp(140px, 26vw, 180px)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="78%"
                    paddingAngle={2}
                    isAnimationActive={false}
                    stroke="none"
                    labelLine={false}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.key} fill={entry.key === 'enforced' ? enforcedColor : missingColor} />
                    ))}
                  </Pie>
                  {renderCenterLabel()}
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const key = props?.payload?.key;
                      return [value, key === 'enforced' ? 'Profiles Active' : 'Missing'];
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="d-flex gap-3 mt-2" style={{ fontSize: helperTextFontSize, color: mutedColor }}>
              <span className="d-flex align-items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: enforcedColor }} />
                Profiles Active
              </span>
              <span className="d-flex align-items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: missingColor, border: isDark ? '1px solid #6b7280' : '1px solid #d1d5db' }} />
                Missing
              </span>
            </div>
            </div>
          </Col>

          <Col xs={12} md={6} xl={4} className="d-flex">
            <div
              className="rounded-3 w-100 p-2 p-xl-3"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="mb-2 d-flex align-items-center justify-content-between" style={{ gap: 6 }}>
                <span className="fw-semibold" style={{ fontSize: subsystemTitleFontSize, color: textColor, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>SELinux</span>
              <span style={{
                  display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 600, borderRadius: 999,
                  padding: '3px 10px',
                  backgroundColor: (/disabled/i.test(selinuxStatus) || /not activated/i.test(selinuxStatus))
                    ? (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.10)')
                    : (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)'),
                  border: (/disabled/i.test(selinuxStatus) || /not activated/i.test(selinuxStatus))
                    ? `1px solid ${isDark ? 'rgba(245,158,11,0.30)' : 'rgba(245,158,11,0.22)'}`
                    : `1px solid ${isDark ? 'rgba(34,197,94,0.30)' : 'rgba(34,197,94,0.22)'}`,
                  color: (/disabled/i.test(selinuxStatus) || /not activated/i.test(selinuxStatus))
                    ? (isDark ? '#fcd34d' : '#92400e')
                    : (isDark ? '#4ade80' : '#15803d'),
                }}>
                {(/disabled/i.test(selinuxStatus) || /not activated/i.test(selinuxStatus)) ? 'Inactive' : 'Enabled'}
              </span>
            </div>
            {(/disabled/i.test(selinuxStatus) || /not activated/i.test(selinuxStatus)) && (
              <NoticeCell
                bgIdle={isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)'}
                bgHover={isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.14)'}
                borderColor={isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.20)'}
                icon="solar:danger-triangle-bold"
                iconColor="#f59e0b"
                label="Not active on this system"
                labelColor={isDark ? '#fcd34d' : '#92400e'}
                fix="Set SELINUX=enforcing in /etc/selinux/config"
                fixColor={isDark ? 'rgba(252,211,77,0.75)' : 'rgba(146,64,14,0.75)'}
              />
            )}
            </div>
          </Col>

          <Col xs={12} md={6} xl={4} className="d-flex">
            <div
              className="rounded-3 w-100 p-2 p-xl-3"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="mb-2 d-flex align-items-center justify-content-between" style={{ gap: 6 }}>
                <span className="fw-semibold" style={{ fontSize: subsystemTitleFontSize, color: textColor, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tomoyo</span>
              <span style={{
                  display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 600, borderRadius: 999,
                  padding: '3px 10px',
                  backgroundColor: /disabled/i.test(tomoyoStatus)
                    ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)')
                    : (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)'),
                  border: /disabled/i.test(tomoyoStatus)
                    ? `1px solid ${isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.22)'}`
                    : `1px solid ${isDark ? 'rgba(34,197,94,0.30)' : 'rgba(34,197,94,0.22)'}`,
                  color: /disabled/i.test(tomoyoStatus)
                    ? (isDark ? '#fca5a5' : '#b91c1c')
                    : (isDark ? '#4ade80' : '#15803d'),
                }}>
                {/disabled/i.test(tomoyoStatus) ? 'Disabled' : 'Enabled'}
              </span>
            </div>
            {/disabled/i.test(tomoyoStatus) && (
              <NoticeCell
                bgIdle={isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)'}
                bgHover={isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)'}
                borderColor={isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)'}
                icon={getStatusIcon('regressed')}
                iconColor="#ef4444"
                label="Kernel config missing"
                labelColor={isDark ? '#fca5a5' : '#b91c1c'}
                fix="Enable CONFIG_SECURITY_TOMOYO in kernel"
                fixColor={isDark ? 'rgba(252,165,165,0.75)' : 'rgba(185,28,28,0.70)'}
              />
            )}
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default MandatoryAccessControls;

