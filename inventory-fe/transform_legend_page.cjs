const fs = require('fs');

let pageCode = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

const legendDefinitions = `
const POLICY_LEGEND = [
  ...BINARY_PERMISSION_LEGEND_ITEMS,
  ...BINARY_COMPILER_LEGEND_ITEMS,
  ...BINARY_CAPABILITY_LEGEND_ITEMS,
];
`;

// Insert the definition near the existing definitions
const importEnd = pageCode.indexOf('const ALLCAPS_TERMS = new Set');
if (importEnd !== -1) {
  pageCode = pageCode.slice(0, importEnd) + legendDefinitions + '\n' + pageCode.slice(importEnd);
  console.log("Inserted POLICY_LEGEND definition.");
}

// Insert the UI just before </Card>
const cardEnd = pageCode.lastIndexOf('          </Card>');
if (cardEnd !== -1) {
  const legendUI = `            {/* Legend Section */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '16px 24px',
                background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241,245,249,0.6)',
                borderTop: \`1px solid \${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}\`,
                transition: THEME_TRANSITION,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-1">
                <div style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)', border: \`1px solid \${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)'}\` }}>
                  <IconifyIcon icon="solar:info-circle-linear" style={{ fontSize: 13, color: isDark ? '#38bdf8' : '#2563eb' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#93c5fd' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardening Legend</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {POLICY_LEGEND.map((item) => (
                  <div key={item.title} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flex: '1 1 auto', minWidth: 180, maxWidth: 280 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? '#475569' : '#94a3b8', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.title, letterSpacing: '0.03em', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: t.muted, lineHeight: 1.3 }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
`;
  pageCode = pageCode.slice(0, cardEnd) + legendUI + pageCode.slice(cardEnd);
  console.log("Inserted Hardening Legend UI.");
}

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', pageCode);

EOF
