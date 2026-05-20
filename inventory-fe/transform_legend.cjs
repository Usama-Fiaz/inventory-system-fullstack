const fs = require('fs');

let pageCode = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');
let sectionCode = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/BinaryHardeningDetailsSection.jsx', 'utf8');

// 1. Remove the old Hardening Legend offcanvas button from page.jsx
const legendButtonStart = pageCode.indexOf(`              {/* ── Hardening Legend (collapsible, above Security Insights) ── */}`);
if (legendButtonStart !== -1) {
  const legendButtonEnd = pageCode.indexOf(`              <div ref={insightsCardRef}`, legendButtonStart);
  if (legendButtonEnd !== -1) {
    pageCode = pageCode.slice(0, legendButtonStart) + pageCode.slice(legendButtonEnd);
    console.log("Removed Hardening Legend button from page.jsx");
  }
}

// 2. Remove the old Hardening Legend Offcanvas from page.jsx
const offcanvasStart = pageCode.indexOf(`<Offcanvas
        show={insightsLegendOpen}`);
if (offcanvasStart !== -1) {
  const offcanvasEnd = pageCode.indexOf(`      </Offcanvas>`, offcanvasStart);
  if (offcanvasEnd !== -1) {
    pageCode = pageCode.slice(0, offcanvasStart) + pageCode.slice(offcanvasEnd + 18);
    console.log("Removed Hardening Legend Offcanvas from page.jsx");
  }
}

// Write back page.jsx
fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', pageCode);


// 3. Add the legend definitions and UI to BinaryHardeningDetailsSection.jsx

const legendDefinitions = `
const BINARY_COMPILER_LEGEND_ITEMS = [
  { title: 'PIE',          description: 'Randomizes load address to resist jump-oriented attacks.' },
  { title: 'NX',           description: 'Marks stack non-executable.' },
  { title: 'Stack Canary', description: 'Detects stack overflow before return address is corrupted.' },
  { title: 'Debug Symbols',description: 'Stripped in production to prevent reverse engineering.' },
  { title: 'RELRO',        description: 'Hardens GOT/PLT against write-after-use memory exploits.' },
  { title: 'CFI',          description: 'Control-flow integrity stops ROP/JOP code-reuse attacks.' },
];
const BINARY_PERMISSION_LEGEND_ITEMS = [
  { title: 'Setuid/Setgid',   description: 'Runs with elevated user/group privileges.' },
  { title: 'Root',            description: 'Owned by UID 0 and runs as root.' },
  { title: 'World Executable',description: 'Executable by any user.' },
];
const BINARY_CAPABILITY_LEGEND_ITEMS = [
  { title: 'CAP_SYS_PTRACE', description: 'Inspect other processes — major lateral movement risk.' },
  { title: 'CAP_NET_RAW',    description: 'Raw socket access — enables packet capture and spoofing.' },
  { title: 'CAP_SETUID',     description: 'Can change UID — a common privilege escalation path.' },
];

const POLICY_LEGEND = [
  ...BINARY_PERMISSION_LEGEND_ITEMS,
  ...BINARY_COMPILER_LEGEND_ITEMS,
  ...BINARY_CAPABILITY_LEGEND_ITEMS,
];
`;

// Insert definitions after imports
const importEnd = sectionCode.indexOf('\nconst TAB_KEYS = ');
if (importEnd !== -1) {
  sectionCode = sectionCode.slice(0, importEnd) + '\n' + legendDefinitions + sectionCode.slice(importEnd);
  console.log("Inserted legend definitions");
}

// Insert legend UI at the end of the Card
const cardEnd = sectionCode.lastIndexOf(`        </Card>`);
if (cardEnd !== -1) {
  const legendUI = `          {/* Legend Section */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '16px 24px',
              background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241,245,249,0.6)',
              borderTop: \`1px solid \${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}\`,
              transition: 'all 0.3s ease',
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
  sectionCode = sectionCode.slice(0, cardEnd) + legendUI + sectionCode.slice(cardEnd);
  console.log("Inserted legend UI");
}

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/BinaryHardeningDetailsSection.jsx', sectionCode);

