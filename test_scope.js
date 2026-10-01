const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].includes('showBcosCarLockscreen')) {
        const ast = acorn.parse(match[1], {ecmaVersion: 2020});
        walk.ancestor(ast, {
            FunctionDeclaration(node, ancestors) {
                if (node.id.name === 'showBcosCarLockscreen') {
                    console.log("Ancestors:");
                    ancestors.forEach(a => {
                        if (a.type === 'FunctionDeclaration' || a.type === 'BlockStatement') {
                            console.log(" - " + a.type + (a.id ? " (" + a.id.name + ")" : ""));
                        }
                    });
                }
            }
        });
    }
}
