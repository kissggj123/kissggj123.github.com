const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].includes('showBcosCarLockscreen')) {
        console.log("Code at 669786:");
        console.log(match[1].substring(669786, 669786 + 100));
    }
}
