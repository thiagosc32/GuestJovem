/**
 * Gera ícones para web/PWA a partir de assets/web-favicon-source.png
 * Execute: node scripts/generate-web-icons.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const input = path.join(root, 'assets', 'web-favicon-source.png');
const publicDir = path.join(root, 'public');
const assetsDir = path.join(root, 'assets');

async function main() {
  if (!fs.existsSync(input)) {
    console.error('Missing:', input);
    process.exit(1);
  }
  await sharp(input).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(input).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(input).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(input).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(input).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  // Expo `web.favicon` (aba do navegador)
  await sharp(input).resize(48, 48).png().toFile(path.join(assetsDir, 'favicon-web.png'));
  console.log('Web icons generated OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
