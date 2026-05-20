const fs = require('fs');

let code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

// The Sidebar starts with {/* ── Security Insights Sidebar ── */}
const sidebarStart = code.indexOf('{/* ── Security Insights Sidebar ── */}');
if (sidebarStart !== -1) {
  // Find the closing Col for this sidebar.
  // The sidebar structure is:
  // {/* ── Security Insights Sidebar ── */}
  // <Col xl={3} lg={4} ...>
  //   <div>
  //     <div ref={insightsCardRef} ...>
  //       {/* ── Privilege Analysis + Memory Protection ── */}
  //     </div>
  //   </div>
  // </Col>

  const colStart = code.lastIndexOf('<Col xl={3} lg={4}', sidebarStart + 100); // just to be safe if it's right after
  
  // The end string is:
  //               </div>
  //               </div>
  //             </Col>
  const endMarker = '              </div>\n              </div>\n            </Col>\n';
  const sidebarEnd = code.indexOf(endMarker, sidebarStart);

  if (sidebarEnd !== -1) {
    code = code.slice(0, sidebarStart) + code.slice(sidebarEnd + endMarker.length);
    console.log("Removed Security Insights Sidebar completely.");
  }
}

// Since I also removed the sidebar, there's a Col that was taking the main table width:
// <Col xl={9} lg={8}>
// I should change it to <Col xl={12} lg={12}> to take full width since sidebar is gone.
code = code.replace('<Col xl={9} lg={8}>', '<Col xl={12} lg={12}>');

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', code);
