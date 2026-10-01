const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].includes('_bcosRepos')) {
        const lines = match[1].split('\n');
        console.log("Line 9569:");
        console.log(lines[9568]);
        console.log(lines[9569]);
    }
}
