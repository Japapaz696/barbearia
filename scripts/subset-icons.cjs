// Build-time only: retain the original Font Awesome declarations for used icons.
// No hand-drawn/replaced glyphs; the complete upstream CSS remains the source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['index.html', ...fs.readdirSync(path.join(root, 'cliente')).filter(f => f.endsWith('.html')).map(f => `cliente/${f}`), 'admin/index.html', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`)];
const classes = new Set(['fa', 'fas', 'far', 'fab', 'fa-solid', 'fa-regular', 'fa-brands', 'fa-eye', 'fa-eye-slash']);
for (const file of files) for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/\bfa-[a-z0-9-]+/g)) classes.add(match[0]);
const original = fs.readFileSync(path.join(root, 'assets/vendor/fontawesome/css/all.min.css'), 'utf8');
const output = [original.slice(0, original.indexOf('*/') + 2)];
for (const match of original.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    let declaration = match[2];
    if (selector === '@font-face' && declaration.includes('"Font Awesome 6 ')) {
        declaration = declaration.replace('font-display:block', 'font-display:swap').replace(/,url\([^)]*\.ttf\) format\("truetype"\)/g, '');
        output.push(`${selector}{${declaration}}`);
    } else if (!selector.includes('@')) {
        const selected = selector.split(',').filter(item => [...item.matchAll(/\.([a-zA-Z0-9-]+)/g)].some(m => classes.has(m[1])));
        if (selected.length) output.push(`${selected.join(',')}{${declaration}}`);
    }
}
fs.writeFileSync(path.join(root, 'assets/vendor/fontawesome/css/used.css'), output.join('\n'));
console.log(`Font Awesome: ${original.length} → ${output.join('\n').length} CSS bytes, ${classes.size} referenced classes.`);
