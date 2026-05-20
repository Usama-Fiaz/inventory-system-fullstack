const fs = require('fs');

let code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

// 1. Extract Privilege Analysis and Memory Protection
// They are wrapped in:
// {/* ── Privilege Analysis + Memory Protection ── */}
// <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', minHeight: 0, maxWidth: '100%' }}>
//   {/* Card 1 — Privilege Analysis */}
//   ...
//   {/* Card 2 — Memory Protection */}
//   ...
// </div>

const startMarker = "{/* ── Privilege Analysis + Memory Protection ── */}";
const endMarker = "                  </div>\n              </div>\n              </div>\n            </Col>"; // the end of that col
const startIndex = code.indexOf(startMarker);

// Let's find exactly where the container for Privilege + Memory ends.
// The container is `<div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', minHeight: 0, maxWidth: '100%' }}>`
let innerCode = code.slice(startIndex, startIndex + 20000);
let idx = innerCode.indexOf("{/* Card 1 — Privilege Analysis */}");
// let's just match using a regex or simple split.

fs.writeFileSync('test_extract.js', `console.log("ready")`);
