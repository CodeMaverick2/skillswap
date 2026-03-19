const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');
const SVG    = path.join(__dirname, '..', 'assets', 'logo.svg');

const svgBuf = fs.readFileSync(SVG);

// Adaptive icon SVG — same mark but transparent background, arrows centered in safe zone
const adaptiveSvg = Buffer.from(`
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B7FFF"/>
      <stop offset="100%" stop-color="#6C63FF"/>
    </linearGradient>
    <linearGradient id="tealGrad" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#5EEDC8"/>
      <stop offset="100%" stop-color="#43D9AD"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Transparent background -->
  <!-- Purple: right-pointing arrow (top) — scaled to stay in Android safe zone (66%) -->
  <g filter="url(#glow)">
    <rect x="200" y="390" width="456" height="70" rx="35" fill="url(#purpleGrad)"/>
    <polygon points="622,330 796,425 622,520" fill="#6C63FF"/>
  </g>
  <!-- Teal: left-pointing arrow (bottom) -->
  <g filter="url(#glow)">
    <rect x="368" y="564" width="456" height="70" rx="35" fill="url(#tealGrad)"/>
    <polygon points="402,504 228,599 402,694" fill="#43D9AD"/>
  </g>
</svg>`);

// Splash SVG — logo centered on tall dark canvas
const splashSvg = Buffer.from(`
<svg viewBox="0 0 1242 2688" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1B3A"/>
      <stop offset="100%" stop-color="#0D0C18"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B7FFF"/>
      <stop offset="100%" stop-color="#6C63FF"/>
    </linearGradient>
    <linearGradient id="tealGrad" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#5EEDC8"/>
      <stop offset="100%" stop-color="#43D9AD"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1242" height="2688" fill="url(#bg)"/>
  <!-- Logo centered at 621, 1344 — scaled for splash -->
  <!-- Purple arrow -->
  <g filter="url(#glow)">
    <rect x="171" y="1198" width="586" height="76" rx="38" fill="url(#purpleGrad)"/>
    <polygon points="757,1140 951,1236 757,1332" fill="#6C63FF"/>
  </g>
  <!-- Teal arrow -->
  <g filter="url(#glow)">
    <rect x="369" y="1410" width="586" height="76" rx="38" fill="url(#tealGrad)"/>
    <polygon points="369,1352 175,1448 369,1544" fill="#43D9AD"/>
  </g>
  <!-- App name -->
  <text x="621" y="1660" font-family="system-ui, -apple-system, sans-serif"
        font-size="88" font-weight="700" fill="white" text-anchor="middle"
        letter-spacing="2">SkillSwap</text>
  <text x="621" y="1740" font-family="system-ui, -apple-system, sans-serif"
        font-size="42" fill="#9A99BC" text-anchor="middle" letter-spacing="1">Learn. Teach. Exchange.</text>
</svg>`);

async function generate() {
  // icon.png — 1024x1024
  await sharp(svgBuf)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png');

  // adaptive-icon.png — 1024x1024 transparent bg
  await sharp(adaptiveSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png');

  // splash.png — 1242x2688
  await sharp(splashSvg)
    .resize(1242, 2688)
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));
  console.log('✓ splash.png');

  console.log('\nAll assets generated.');
}

generate().catch(console.error);
