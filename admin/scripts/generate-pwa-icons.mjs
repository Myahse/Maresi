import sharp from "sharp";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });

function brandSvg(size, radius, fontScale = 0.53) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#0D9488"/>
  <text x="${size / 2}" y="${size * 0.68}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size * fontScale}" font-weight="800" fill="#ffffff">M</text>
</svg>`);
}

function maskableSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" fill="#0D9488"/>
  <text x="${size / 2}" y="${size * 0.68}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size * 0.42}" font-weight="800" fill="#ffffff">M</text>
</svg>`);
}

const jobs = [
  ["pwa-192x192.png", brandSvg(192, 42)],
  ["pwa-512x512.png", brandSvg(512, 112)],
  ["pwa-maskable-512x512.png", maskableSvg(512)],
  ["apple-touch-icon.png", brandSvg(180, 40)],
];

for (const [name, svg] of jobs) {
  await sharp(svg).png().toFile(join(publicDir, name));
  console.log(`wrote public/${name}`);
}
