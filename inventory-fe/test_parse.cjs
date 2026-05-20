const fs = require('fs');
const code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

const stack = [];
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // Simple regex for tags we care about. 
  // It's not a real AST parser, but good enough to find gross structural errors.
  let re = /<\/?(div|Row|Col|Card|CardHeader|CardBody)(?:\s+[^>]*?)?\/?>/g;
  let match;
  while ((match = re.exec(line)) !== null) {
     let tag = match[0];
     // ignore self closing
     if (tag.endsWith('/>')) continue;
     
     let tagName = match[1];
     if (tag.startsWith('</')) {
        let last = stack.pop();
        if (!last || last.tagName !== tagName) {
           console.log(`Mismatch at line ${i+1}: Expected </${last ? last.tagName : 'nothing'}> but found </${tagName}>. Stack top was line ${last ? last.line : '?'}`);
        }
     } else {
        stack.push({tagName: tagName, line: i+1});
     }
  }
}
console.log("Remaining stack size:", stack.length);
if (stack.length > 0) {
  console.log("First unmatched tag:", stack[0]);
}
