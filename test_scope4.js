const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].includes('showBcosCarLockscreen')) {
        console.log("IIFE ends at:");
        console.log(match[1].substring(782410, 782430));
    }
}
