import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus } from '@/store/slices/reportSlice';
import { useLayoutContext } from '@/context/useLayoutContext';

const PERM_KEYS = new Set(['SetUID', 'SetGID', 'Root UID', 'Root GID', 'Group Exec', 'World Exec']);

const BinaryViolationStatistics = () => {
  const { themeMode } = useLayoutContext();
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const loading = status === 'idle' || status === 'loading';
  const binaryViolations = report?.binary_violations ?? [];
  const totalFiles = binaryViolations.length;
  const isDark = themeMode === 'dark';

  // ── Palette ──────────────────────────────────────────────────────────
  const cardBg      = isDark ? '#0d1117' : '#ffffff';
  const cardBorder  = isDark ? '#21262d' : '#cbd5e1';
  const headerBg    = isDark ? '#161b22' : '#f8fafc';
  const titleColor  = isDark ? '#f8fafc' : '#0f172a';
  const mutedColor  = isDark ? '#7d8590' : '#8b949e';
  const labelColor  = isDark ? '#8b949e' : '#64748b';
  const trackFill   = isDark ? '#21262d' : '#f1f5f9';
  const permFill    = isDark ? '#ff7b72' : '#e85555';   // rose-red  — file permission risk
  const compFill    = isDark ? '#79c0ff' : '#3b82f6';   // sky-blue  — compiler hardening gap
  const tooltipBg   = isDark ? '#1c2128' : '#ffffff';
  const tooltipBdr  = isDark ? '#373e47' : '#d0d7de';

  const chartData = useMemo(() => {
    const violations = {
      'SetUID':     binaryViolations.filter(f => f.file_permissions?.setuid).length,
      'SetGID':     binaryViolations.filter(f => f.file_permissions?.setgid).length,
      'Root UID':   binaryViolations.filter(f => f.file_permissions?.uid_root).length,
      'Root GID':   binaryViolations.filter(f => f.file_permissions?.gid_root).length,
      'Group Exec': binaryViolations.filter(f => f.file_permissions?.group_exec).length,
      'World Exec': binaryViolations.filter(f => f.file_permissions?.world_exec).length,
      'No CANARY':  binaryViolations.filter(f => !f.compiler_flags?.canary).length,
      'No PIE':     binaryViolations.filter(f => !f.compiler_flags?.pie).length,
      'No RELRO':   binaryViolations.filter(f => !f.compiler_flags?.relro && !f.compiler_flags?.partial_relro).length,
      'No NX':      binaryViolations.filter(f => !f.compiler_flags?.nx).length,
      'No CFI':     binaryViolations.filter(f => !f.compiler_flags?.cfi).length,
    };
    return Object.entries(violations)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [binaryViolations]);
  const chartHeight = Math.max(200, chartData.length * 34 + 24);

  // ── Custom Y-axis tick — coloured dot + label ──────────────────────
  const CustomYTick = ({ x, y, payload }) => {
    const isPerm = PERM_KEYS.has(payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx={-76} cy={0} r={3.5} fill={isPerm ? permFill : compFill} />
        <text
          x={-68}
          y={0}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={600}
          fill={labelColor}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // ── Custom bar label — count · pct% ───────────────────────────────
  const CustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value) return null;
    const pct = totalFiles ? Math.round((value / totalFiles) * 100) : 0;
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        fill={labelColor}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
      >
        {value.toLocaleString()} · {pct}%
      </text>
    );
  };

  // ── States ────────────────────────────────────────────────────────
  const stateCard = (children) => (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: 'hidden', height: '100%' }}>
      <div style={{ background: headerBg, borderBottom: `1px solid ${cardBorder}`, padding: '12px 16px' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: titleColor }}>Binary Violations</span>
      </div>
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>{children}</div>
    </div>
  );

  if (loading) return stateCard(<span style={{ color: mutedColor, fontSize: 13 }}>Loading…</span>);
  if (status === 'failed' && !report) return stateCard(<span style={{ color: '#e85555', fontSize: 13 }}>Failed to load report</span>);
  if (totalFiles === 0) return stateCard(<span style={{ color: mutedColor, fontSize: 13 }}>No binary violations found</span>);

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Card header ── */}
      <div
        style={{
          background: headerBg,
          borderBottom: `1px solid ${cardBorder}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: titleColor, lineHeight: 1.2 }}>Binary Violations</div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 1 }}>{totalFiles.toLocaleString()} files analyzed</div>
          </div>
        </div>

        {/* Category / severity legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: mutedColor }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: permFill, display: 'inline-block', flexShrink: 0 }} />
            Permissions
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: mutedColor }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: compFill, display: 'inline-block', flexShrink: 0 }} />
            Compiler
          </span>
        </div>
      </div>

      {/* ── Chart body ── */}
      <div style={{ flex: 1, padding: '16px 8px 12px 0', minHeight: chartHeight + 28 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 80, bottom: 0, left: 16 }}
              barCategoryGap="28%"
            >
              <XAxis
                type="number"
                domain={[0, totalFiles]}
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tickLine={false}
                axisLine={false}
                tick={<CustomYTick />}
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  const isPerm = PERM_KEYS.has(d.name);
                  const pct = totalFiles ? ((d.value / totalFiles) * 100).toFixed(1) : '0';
                  return (
                    <div style={{
                      padding: '10px 14px',
                      background: tooltipBg,
                      border: `1px solid ${tooltipBdr}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: isDark ? '#e6edf3' : '#1f2937',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      minWidth: 180,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: isPerm ? permFill : compFill, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{d.name}</span>
                      </div>
                      <div style={{ color: mutedColor, fontSize: 11 }}>
                        {isPerm ? 'File Permission' : 'Compiler Flag'} violation
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span><strong style={{ color: isDark ? '#e6edf3' : '#0f172a' }}>{d.value.toLocaleString()}</strong> <span style={{ color: mutedColor }}>files</span></span>
                        <span style={{ color: isPerm ? permFill : compFill, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 3, 3, 0]}
                maxBarSize={18}
                isAnimationActive={false}
                background={{ fill: trackFill, radius: [0, 3, 3, 0] }}
                label={<CustomLabel />}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PERM_KEYS.has(entry.name) ? permFill : compFill}
                    fillOpacity={isDark ? 0.9 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: mutedColor, fontSize: 13 }}>
            No violation breakdown to display
          </div>
        )}
      </div>
    </div>
  );
};

export default BinaryViolationStatistics;
