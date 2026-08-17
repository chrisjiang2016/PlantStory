const fs = require('fs');
const html = fs.readFileSync('prototype/h5-app/public/pages/06-病虫害诊断.html', 'utf8');
const blocks = [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)];
const js = blocks.at(-1)?.[1];
if (!js) throw new Error('inline script not found');
new Function(js);
console.log('H5 diagnosis inline script syntax: OK');
