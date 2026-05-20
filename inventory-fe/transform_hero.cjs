const fs = require('fs');

let code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

// 1. Remove Hot Binaries completely
// Lines start with <div style={{ marginBottom: 0, background: panelGradient, ...
// containing "Hot Binaries" and "Tap to reveal the binaries"
// Ends with </div> \n </div>
const hotBinariesStart = code.indexOf(`              <div style={{ marginBottom: 0, background: panelGradient, borderRadius: BH_CARD_RADIUS_PX, border: \`1px solid \${t.borderStrong}\`, overflow: 'hidden', boxShadow: 'none', transition: THEME_TRANSITION }}>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setHotBinariesOpen((s) => !s)}`);
if (hotBinariesStart !== -1) {
  let slice = code.slice(hotBinariesStart);
  let endIndex = slice.indexOf("{/* Hot Binaries now open as an overlay Offcanvas to avoid pushing layout */}");
  if (endIndex !== -1) {
    let restOfSlice = slice.slice(endIndex);
    let endDiv2 = restOfSlice.indexOf("</div>");
    let afterEndDiv2 = restOfSlice.indexOf("</div>", endDiv2 + 6);
    let finalIndex = hotBinariesStart + endIndex + afterEndDiv2 + 6;
    code = code.slice(0, hotBinariesStart) + code.slice(finalIndex);
    console.log("Removed Hot Binaries.");
  }
}

// 2. Extract Privilege Analysis and Memory Protection cards
// They start at {/* ── Privilege Analysis + Memory Protection ── */}
const privMemStart = code.indexOf("{/* ── Privilege Analysis + Memory Protection ── */}");
let cardsJSX = "";
if (privMemStart !== -1) {
  const containerStart = code.lastIndexOf("<div", privMemStart);
  // Actually, wait, Privilege and Memory Protection are wrapped inside:
  // <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', minHeight: 0, maxWidth: '100%' }}>
  // {/* Card 1 — Privilege Analysis */}
  const cardsContainerStart = code.indexOf("<div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', minHeight: 0, maxWidth: '100%' }}>", privMemStart);
  
  if (cardsContainerStart !== -1) {
    let temp = code.slice(cardsContainerStart);
    // Find the closing tag of this div
    // We know it ends before: 
    // </div>
    // </div>
    // </Col>
    let endStr = `                      );
                    })()}
                  </div>`;
    let endIndex = temp.indexOf(endStr) + endStr.length;
    cardsJSX = temp.slice(0, endIndex);
    
    // Remove it from its original place
    code = code.slice(0, cardsContainerStart) + temp.slice(endIndex);
    console.log("Extracted Privilege Analysis and Memory Protection cards.");
  }
}

// 3. Redesign the legend under the table.
// Hardening Legend is inside the sidebar right now! Let's move it under the table.
// Actually, wait, the prompt says "redesign the legend under the table (refer to Filesystems table)".
// Wait, filesystems table legend looks like this:
// {/* Legend Section */}
// <div
//   style={{
//     position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 24px', background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241,245,249,0.6)', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, transition: THEME_TRANSITION,
//   }}
// > ...

// For Binary Hardening page, where should Privilege and Memory Protection go in the Hero section?
// In Hero:
// <div style={{ position: 'relative', zIndex: 1, padding: isNarrowViewport ? '24px 20px 24px' : '36px 40px 48px' }}>
//   <Row className="g-4 mb-4 align-items-center">

// We can put the cardsJSX inside another `<Row className="g-4 mb-0 mt-2 align-items-stretch">` just after the first `<Row>` in Hero section!
const heroEnd = code.indexOf(`                </Col>
              </Row>
            </div>
          </div>

          <div>
            <Row className="g-3 mb-0" style={{ marginTop: 0}}>`);

if (heroEnd !== -1) {
  // Let's change the layout of cardsJSX slightly so it fits in a Row (e.g. two Cols)
  // Instead of a single column wrapper, we'll put them in two Cols.
  // Wait, cardsJSX currently wraps both cards in a column flex div. We can replace that wrapper with a Row.
  cardsJSX = cardsJSX.replace(
    `<div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', minHeight: 0, maxWidth: '100%' }}>`,
    `<Row className="g-3 align-items-stretch mt-1">`
  );
  // And wrap each card in <Col md={6}>
  cardsJSX = cardsJSX.replace(`{/* Card 1 — Privilege Analysis */}`, `<Col md={6}>{/* Card 1 — Privilege Analysis */}`);
  cardsJSX = cardsJSX.replace(`{/* Card 2 — Memory Protection */}`, `</Col><Col md={6}>{/* Card 2 — Memory Protection */}`);
  // Replace the closing tag of the original column flex div with `</Col></Row>`
  // It ends with:
  //                 })()}
  //               </div>
  cardsJSX = cardsJSX.replace(/                  <\/div>$/, `                  </Col></Row>`);
  
  // Insert it before the end of the hero relative padding div
  const insertionPoint = heroEnd + `                </Col>
              </Row>`.length;
  code = code.slice(0, insertionPoint) + `\n              ` + cardsJSX + code.slice(insertionPoint);
  console.log("Inserted Privilege Analysis and Memory Protection into Hero.");
}

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', code);
console.log("Transform completed.");
