import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import png2icons from 'png2icons';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'electron-app', 'resources');
const icons = path.join(resources, 'icons');
const source = path.join(resources, 'app-icon.svg');

fs.mkdirSync(icons, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
for (const size of sizes) {
    await sharp(source)
        .resize(size, size, { fit: 'contain' })
        .png()
        .toFile(path.join(icons, `icon-${size}.png`));
}

await sharp(source)
    .resize(128, 128, { fit: 'contain' })
    .png()
    .toFile(path.join(icons, '128x128.png'));

await sharp(source)
    .resize(256, 256, { fit: 'contain' })
    .png()
    .toFile(path.join(icons, '256x256.png'));

await sharp(source)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(icons, '512x512.png'));

const master = fs.readFileSync(path.join(icons, 'icon-1024.png'));

const ico = png2icons.createICO(master, png2icons.BICUBIC, 0, false, true);
if (!ico) {
    throw new Error('Could not generate the Windows icon.');
}
fs.writeFileSync(path.join(icons, 'icon.ico'), ico);

const icns = png2icons.createICNS(master, png2icons.BICUBIC, 0);
if (!icns) {
    throw new Error('Could not generate the macOS icon.');
}
fs.writeFileSync(path.join(icons, 'icon.icns'), icns);

console.log(`Generated application assets in ${path.relative(root, icons)}`);
