const fs = require('fs');

let pageCode = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

// Find and remove the Hot Binaries offcanvas
const hotOffcanvasStart = pageCode.indexOf('<Offcanvas\n        show={hotBinariesOpen}');
if (hotOffcanvasStart !== -1) {
  // It ends with </Offcanvas>
  const offcanvasEnd = pageCode.indexOf('      </Offcanvas>', hotOffcanvasStart);
  if (offcanvasEnd !== -1) {
    pageCode = pageCode.slice(0, hotOffcanvasStart) + pageCode.slice(offcanvasEnd + 18);
    console.log("Removed Hot Binaries Offcanvas.");
  }
}

// Remove state definitions that are now unused to clean up
pageCode = pageCode.replace(/  const \[insightsLegendOpen, setInsightsLegendOpen\] = useState\(false\);\n/, '');
pageCode = pageCode.replace(/  const \[hotBinariesOpen, setHotBinariesOpen\] = useState\(false\);\n/, '');

fs.writeFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', pageCode);

EOF
