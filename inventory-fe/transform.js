const fs = require('fs');
let code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

// We need to replace the outer wrapper
const oldWrapperStart = `  return (
    <>
      <PageMetaData title="Binary Hardening" />
      <Row className="g-0" style={{ fontFamily: UI_FONT_STACK, fontSize: FONT.base, lineHeight: 1.5 }}>
        <Col>
          <div className="d-flex flex-column">
          <div
            style={{
              background: heroGradient,
              border: \`1px solid \${isDark ? 'rgba(148,163,184,0.18)' : '#d7dee8'}\`,
              borderRadius: 24,
              padding: isNarrowViewport ? '16px' : '20px 28px',
              marginBottom: 16,
              boxShadow: isDark
                ? '0 1px 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(148,163,184,0.05) inset, 0 18px 40px -24px rgba(2,6,23,0.75)'
                : '0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(226,232,240,0.55) inset, 0 12px 30px -18px rgba(15,23,42,0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: isDark
                  ? 'radial-gradient(circle at top left, rgba(148,163,184,0.08), transparent 32%), radial-gradient(circle at right center, rgba(51,65,85,0.18), transparent 28%)'
                  : 'radial-gradient(circle at top left, rgba(148,163,184,0.12), transparent 34%)',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: isNarrowViewport ? 16 : 24,
                right: isNarrowViewport ? 16 : 24,
                height: 1,
                background: \`linear-gradient(90deg, rgba(148,163,184,0), \${isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.3)'}, rgba(148,163,184,0))\`,
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Row className="g-3 align-items-stretch position-relative">`;

const newWrapperStart = `  return (
    <>
      <PageMetaData title="Binary Hardening" />

      <div
        style={{
          background: isDark
            ? 'linear-gradient(165deg, #0f172a 0%, #020617 100%)'
            : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 32,
          border: \`1px solid \${isDark ? 'rgba(56,189,248,0.15)' : '#e2e8f0'}\`,
          boxShadow: isDark ? '0 20px 50px -20px rgba(0,0,0,0.5)' : '0 15px 35px -15px rgba(15,23,42,0.1)',
          position: 'relative',
          overflow: 'hidden',
          margin: isNarrowViewport ? '12px' : '20px',
          fontFamily: UI_FONT_STACK, 
          fontSize: FONT.base, 
          lineHeight: 1.5
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: isDark
              ? 'radial-gradient(circle at 0% 0%, rgba(56,189,248,0.08), transparent 40%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.08), transparent 40%)'
              : 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.03), transparent 35%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, padding: isNarrowViewport ? '24px 20px 24px' : '36px 40px 48px' }}>
          <Row className="g-4 mb-4 align-items-center">`;

if (code.includes(oldWrapperStart)) {
  code = code.replace(oldWrapperStart, newWrapperStart);
  console.log("Wrapper start replaced successfully.");
} else {
  console.log("Failed to find oldWrapperStart.");
}

// At the end, we need to replace the closing tags.
// The old closing was:
//           </div>
//         </Col>
//       </Row>
//     </>
//   );
// }

const oldWrapperEnd = `          </div>
        </Col>
      </Row>
    </>
  );
}`;

const newWrapperEnd = `        </div>
      </div>
    </>
  );
}`;

if (code.includes(oldWrapperEnd)) {
  code = code.replace(oldWrapperEnd, newWrapperEnd);
  console.log("Wrapper end replaced successfully.");
} else {
  console.log("Failed to find oldWrapperEnd.");
}

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', code);
