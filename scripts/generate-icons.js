const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync('public/icon.svg', 'utf-8');

async function generate() {
  await sharp(Buffer.from(svg))
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  console.log('✅ Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png');
}

generate().catch(console.error);
