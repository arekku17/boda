/**
 * Genera public/og-image.png: la vista previa que se muestra al compartir el
 * link en WhatsApp, Facebook, Twitter, etc.
 *
 *   node scripts/build-og-image.mjs
 *
 * El texto se convierte a trazos vectoriales (ver ttf2path.mjs), así que la
 * imagen final no depende de que las fuentes estén instaladas en el sistema.
 * Las tipografías se descargan de Google Fonts a node_modules/.cache la
 * primera vez.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { loadFont, textPath } from "./ttf2path.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "node_modules/.cache/og-fonts");
const OUT = path.join(ROOT, "public/og-image.png");

const FONTS = {
  "GreatVibes.ttf":
    "https://fonts.gstatic.com/s/greatvibes/v21/RWmMoKWR9v4ksMfaWd_JN-XC.ttf",
  "Outfit-300.ttf":
    "https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4e6yC4E.ttf",
  "Outfit-400.ttf":
    "https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4W61C4E.ttf",
};

async function ensureFonts() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const file = path.join(CACHE, name);
    if (fs.existsSync(file)) continue;
    console.log(`Descargando ${name}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar ${name}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
}

await ensureFonts();

const script = loadFont(path.join(CACHE, "GreatVibes.ttf"));
const sansLight = loadFont(path.join(CACHE, "Outfit-300.ttf"));
const sans = loadFont(path.join(CACHE, "Outfit-400.ttf"));

// Paleta sage, la misma de src/index.css
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#fdfdfb"/>
      <stop offset="55%" stop-color="#f4f6f1"/>
      <stop offset="100%" stop-color="#e7ecdf"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#bccfae" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#bccfae" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#92a582" stop-opacity="0"/>
      <stop offset="50%" stop-color="#92a582" stop-opacity="1"/>
      <stop offset="100%" stop-color="#92a582" stop-opacity="0"/>
    </linearGradient>
    <g id="sprig">
      <path d="M0 0 C 20 -8 42 -13 64 -13" fill="none" stroke="#a3b393" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="14" cy="-12" rx="10" ry="4.6" fill="#b2c1a4" transform="rotate(-30 14 -12)"/>
      <ellipse cx="32" cy="-18" rx="11" ry="5"   fill="#a3b393" transform="rotate(-20 32 -18)"/>
      <ellipse cx="51" cy="-22" rx="9.5" ry="4.4" fill="#b2c1a4" transform="rotate(-12 51 -22)"/>
      <ellipse cx="21" cy="-2"  rx="8.5" ry="4"  fill="#c4d1b8" transform="rotate(24 21 -2)"/>
      <ellipse cx="40" cy="-5"  rx="9"  ry="4.3" fill="#b2c1a4" transform="rotate(16 40 -5)"/>
    </g>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="150" cy="40" rx="470" ry="400" fill="url(#glowA)"/>
  <ellipse cx="1090" cy="620" rx="520" ry="440" fill="url(#glowB)"/>

  <rect x="44" y="44" width="1112" height="542" rx="10" fill="none" stroke="#c4d1b8" stroke-width="1.5"/>
  <rect x="57" y="57" width="1086" height="516" rx="6" fill="none" stroke="#dde5d4" stroke-width="1"/>

  <use href="#sprig" transform="translate(96,126)"/>
  <use href="#sprig" transform="translate(1104,126) scale(-1,1)"/>
  <use href="#sprig" transform="translate(96,504) scale(1,-1)"/>
  <use href="#sprig" transform="translate(1104,504) scale(-1,-1)"/>

  <path fill="#92a582" d="${textPath(sansLight, "NOS CASAMOS", { size: 24, cx: 600, by: 122, letterSpacing: 11 })}"/>

  <path fill="#5c6f4e" d="${textPath(script, "L", { size: 235, cx: 455, by: 336 })}"/>
  <path fill="#9dad8b" d="${textPath(script, "&", { size: 170, cx: 600, by: 326 })}"/>
  <path fill="#5c6f4e" d="${textPath(script, "A", { size: 235, cx: 748, by: 336 })}"/>

  <rect x="400" y="444" width="400" height="1.5" fill="url(#rule)"/>
  <circle cx="600" cy="444.75" r="4.5" fill="#92a582"/>

  <path fill="#4a5a3f" d="${textPath(sans, "17 · 10 · 26", { size: 54, cx: 600, by: 516, letterSpacing: 13 })}"/>

  <path fill="#748a63" d="${textPath(sansLight, "LAURA & ALEJANDRO", { size: 21, cx: 600, by: 556, letterSpacing: 7.5 })}"/>
</svg>`;

const info = await sharp(Buffer.from(svg), { density: 72 })
  .flatten({ background: "#f4f6f1" })
  .png({ compressionLevel: 9, palette: true })
  .toFile(OUT);

console.log(
  `public/og-image.png · ${info.width}x${info.height} · ${Math.round(info.size / 1024)} KB`,
);
