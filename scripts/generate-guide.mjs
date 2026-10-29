import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const htmlPath = path.join(docs, 'feature-guide.html');
const pdfPath = path.join(docs, 'Laravel-Studio-Feature-Guide.pdf');
const markdown = fs.readFileSync(path.join(root, 'FEATURES.md'), 'utf8');
const logoSvg = fs.readFileSync(path.join(root, 'electron-app', 'resources', 'app-icon.svg'), 'utf8');
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const body = md.render(markdown).replace(/<h1>[^<]*<\/h1>/, '');
const headings = [...markdown.matchAll(/^## (.+)$/gm)].map((match, index) => ({
    number: String(index + 1).padStart(2, '0'),
    title: match[1]
}));

fs.mkdirSync(docs, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f5f6f8; color: #1b1e24; }
    body {
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
        font-size: 9.6pt;
        line-height: 1.55;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .cover {
        position: relative;
        width: 210mm;
        height: 297mm;
        padding: 26mm 24mm;
        overflow: hidden;
        color: #f2f5fa;
        background:
            radial-gradient(ellipse 70% 50% at 75% 6%, rgba(69, 120, 212, .20), transparent 70%),
            linear-gradient(145deg, #171a21 0%, #101216 70%);
        page-break-after: always;
    }
    .cover::after {
        position: absolute;
        right: -62mm;
        bottom: -75mm;
        width: 210mm;
        height: 210mm;
        border: 1px solid rgba(255,255,255,.06);
        border-radius: 50%;
        content: '';
        box-shadow: 0 0 0 32mm rgba(255,255,255,.015), 0 0 0 64mm rgba(255,255,255,.01);
    }
    .cover__logo { width: 46mm; height: 46mm; }
    .cover__logo svg { width: 100%; height: 100%; filter: drop-shadow(0 18px 36px rgba(0,0,0,.35)); }
    .cover__product { margin-top: 21mm; color: #f5f7fb; font-size: 34pt; font-weight: 620; letter-spacing: -1.5pt; }
    .cover__tagline { max-width: 118mm; margin-top: 5mm; color: #a2a9b7; font-size: 14pt; font-weight: 350; line-height: 1.4; }
    .cover__rule { width: 24mm; height: 1.5px; margin-top: 15mm; background: #5e9bff; }
    .cover__meta { position: absolute; left: 24mm; bottom: 25mm; color: #7b8290; font-size: 8.2pt; letter-spacing: .4pt; text-transform: uppercase; }
    .cover__meta strong { display: block; margin-bottom: 2mm; color: #c6ccd7; font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 9pt; }
    .cover__edition { position: absolute; right: 24mm; bottom: 25mm; color: #6e7583; font-size: 8.2pt; text-align: right; }
    .doc { padding: 18mm 22mm 20mm; }
    .masthead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12mm; padding-bottom: 5mm; border-bottom: 1px solid #dfe3e9; }
    .masthead__brand { color: #1c2027; font-size: 9pt; font-weight: 650; letter-spacing: -.1pt; }
    .masthead__brand span { color: #7b8492; font-weight: 400; }
    .masthead__version { color: #8b929e; font-family: 'Cascadia Code', Consolas, monospace; font-size: 7.6pt; }
    .toc { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 12mm; margin: 0 0 13mm; padding: 0; list-style: none; }
    .toc li { display: flex; gap: 4mm; color: #4e5663; font-size: 8.7pt; }
    .toc b { color: #7d8da8; font-family: 'Cascadia Code', Consolas, monospace; font-size: 7.5pt; font-weight: 600; }
    h1 { color: #15181d; font-size: 20pt; font-weight: 650; letter-spacing: -1pt; }
    h2 { margin: 8mm 0 2.5mm; color: #15191f; font-size: 14.5pt; font-weight: 640; letter-spacing: -.5pt; break-after: avoid; }
    h2:first-of-type { margin-top: 0; }
    h3 { margin: 5mm 0 1.5mm; color: #2c323b; font-size: 10.5pt; font-weight: 620; break-after: avoid; }
    p { margin: 0 0 2.2mm; color: #3d4551; }
    ul { margin: 0 0 3mm; padding-left: 5mm; }
    li { margin-bottom: 1.1mm; color: #3d4551; break-inside: avoid; }
    li::marker { color: #4d8cf0; }
    strong { color: #20252d; font-weight: 620; }
    code { padding: .5mm 1mm; border-radius: 1mm; background: #e9edf3; color: #304d7c; font-family: 'Cascadia Code', Consolas, monospace; font-size: 8pt; }
    pre { margin: 3mm 0; padding: 4mm; overflow: hidden; border: 1px solid #dfe3e9; border-radius: 2.5mm; background: #15181e; color: #d9dfe8; break-inside: avoid; }
    pre code { padding: 0; background: transparent; color: inherit; }
    blockquote { margin: 3mm 0; padding: 3mm 4mm; border-left: 2px solid #5e9bff; background: #eef3fb; color: #45505e; }
    hr { margin: 6mm 0; border: 0; border-top: 1px solid #dfe3e9; }
    a { color: #2f6fe4; text-decoration: none; }
    .footer { display: flex; justify-content: space-between; margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #dfe3e9; color: #8b929e; font-size: 7.3pt; }
    .footer strong { color: #59616d; font-weight: 600; }
    @media print {
        .cover { break-inside: avoid; }
        h2, h3 { break-inside: avoid; }
        ul { break-inside: auto; }
    }
</style>
</head>
<body>
    <section class="cover">
        <div class="cover__logo">${logoSvg}</div>
        <div class="cover__product">Laravel Studio</div>
        <div class="cover__tagline">A quieter place to build Laravel. Feature, setup and platform guide for the desktop studio.</div>
        <div class="cover__rule"></div>
        <div class="cover__meta"><strong>Version 1.0.0</strong>Windows · Linux · macOS</div>
        <div class="cover__edition">Dark by design.<br>Built on Eclipse Theia.</div>
    </section>
    <main class="doc">
        <header class="masthead">
            <div class="masthead__brand">Laravel Studio <span>· Feature &amp; Setup Guide</span></div>
            <div class="masthead__version">v1.0.0 / 2026</div>
        </header>
        <ul class="toc">
            ${headings.map(item => `<li><b>${item.number}</b><span>${item.title}</span></li>`).join('\n')}
        </ul>
        ${body}
        <footer class="footer">
            <span><strong>Laravel Studio</strong> · Desktop IDE for Laravel</span>
            <span>PHP · Laravel · Open VSX · Theia</span>
        </footer>
    </main>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');

const pdfMain = path.join(root, 'scripts', 'guide-pdf-main.cjs');
const electron = path.join(root, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const result = spawnSync(electron, [pdfMain, htmlPath, pdfPath], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }
});
if (result.error) {
    throw result.error;
}
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
console.log(`Wrote ${path.relative(root, pdfPath)}`);
