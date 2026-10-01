const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const acorn = require('acorn');
  try {
    acorn.parse(match[1], {ecmaVersion: 2020});
  } catch (e) {
    console.error('Syntax error:', e);
    // process.exit(1);
  }
}
