const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1].split('\n').length > 100) {
    fs.writeFileSync('main_script.js', match[1]);
    console.log('Extracted main script');
  }
}
