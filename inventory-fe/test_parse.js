const fs = require('fs');
const code = fs.readFileSync('src/app/(admin)/dashboard/binary-hardening/page.jsx', 'utf8');

let divs = 0;
let row = 0;
let col = 0;
let lines = code.split('\n');

const stack = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // A very naive parser just to see where it breaks
  let match;
  let re = /<\/?(div|Row|Col|Card|CardBody|CardHeader)[^>]*>/g;
  while ((match = re.exec(line)) !== null) {
     let tag = match[0];
     if (tag.startsWith('</')) {
        stack.pop();
     } else if (!tag.endsWith('/>')) {
        stack.push({tag: tag, line: i+1});
     }
  }
}
console.log(stack);
