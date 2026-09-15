import fs from "node:fs";

export function loadFont(file) {
  const b = fs.readFileSync(file);
  const numTables = b.readUInt16BE(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    tables[b.toString("ascii", o, o + 4)] = {
      off: b.readUInt32BE(o + 8),
      len: b.readUInt32BE(o + 12),
    };
  }
  const head = tables.head.off;
  const unitsPerEm = b.readUInt16BE(head + 18);
  const indexToLocFormat = b.readInt16BE(head + 50);
  const numGlyphs = b.readUInt16BE(tables.maxp.off + 4);
  const numberOfHMetrics = b.readUInt16BE(tables.hhea.off + 34);

  // loca
  const loca = [];
  for (let i = 0; i <= numGlyphs; i++) {
    loca.push(
      indexToLocFormat
        ? b.readUInt32BE(tables.loca.off + i * 4)
        : b.readUInt16BE(tables.loca.off + i * 2) * 2,
    );
  }

  // cmap format 4
  const cm = tables.cmap.off;
  const nSub = b.readUInt16BE(cm + 2);
  let sub = 0;
  for (let i = 0; i < nSub; i++) {
    const o = cm + 4 + i * 8;
    const pid = b.readUInt16BE(o);
    const eid = b.readUInt16BE(o + 2);
    const off = cm + b.readUInt32BE(o + 4);
    if ((pid === 3 && (eid === 1 || eid === 0)) || (pid === 0 && !sub))
      sub = off;
  }
  if (b.readUInt16BE(sub) !== 4) throw new Error("cmap format 4 required");
  const segX2 = b.readUInt16BE(sub + 6);
  const segs = segX2 / 2;
  const endO = sub + 14;
  const startO = endO + segX2 + 2;
  const deltaO = startO + segX2;
  const rangeO = deltaO + segX2;
  const cmapLookup = (code) => {
    for (let s = 0; s < segs; s++) {
      const end = b.readUInt16BE(endO + s * 2);
      if (code > end) continue;
      const start = b.readUInt16BE(startO + s * 2);
      if (code < start) return 0;
      const delta = b.readInt16BE(deltaO + s * 2);
      const ro = b.readUInt16BE(rangeO + s * 2);
      if (ro === 0) return (code + delta) & 0xffff;
      const gi = b.readUInt16BE(rangeO + s * 2 + ro + (code - start) * 2);
      return gi === 0 ? 0 : (gi + delta) & 0xffff;
    }
    return 0;
  };

  const advance = (gid) => {
    const i = Math.min(gid, numberOfHMetrics - 1);
    return b.readUInt16BE(tables.hmtx.off + i * 4);
  };

  // glyph outline -> array of contours in font units
  const outline = (gid, depth = 0) => {
    if (depth > 5) return [];
    const start = tables.glyf.off + loca[gid];
    if (loca[gid] === loca[gid + 1]) return [];
    const nc = b.readInt16BE(start);
    if (nc < 0) {
      // composite
      let p = start + 10;
      const parts = [];
      for (;;) {
        const flags = b.readUInt16BE(p);
        const glyphIndex = b.readUInt16BE(p + 2);
        p += 4;
        let dx, dy;
        if (flags & 1) {
          dx = b.readInt16BE(p);
          dy = b.readInt16BE(p + 2);
          p += 4;
        } else {
          dx = b.readInt8(p);
          dy = b.readInt8(p + 1);
          p += 2;
        }
        let a = 1,
          bb = 0,
          c = 0,
          d = 1;
        const f2 = (o) => b.readInt16BE(o) / 16384;
        if (flags & 8) {
          a = d = f2(p);
          p += 2;
        } else if (flags & 0x40) {
          a = f2(p);
          d = f2(p + 2);
          p += 4;
        } else if (flags & 0x80) {
          a = f2(p);
          bb = f2(p + 2);
          c = f2(p + 4);
          d = f2(p + 6);
          p += 8;
        }
        for (const cont of outline(glyphIndex, depth + 1)) {
          parts.push(
            cont.map((pt) => ({
              x: a * pt.x + c * pt.y + dx,
              y: bb * pt.x + d * pt.y + dy,
              on: pt.on,
            })),
          );
        }
        if (!(flags & 0x20)) break;
      }
      return parts;
    }
    const ends = [];
    for (let i = 0; i < nc; i++) ends.push(b.readUInt16BE(start + 10 + i * 2));
    const nPts = ends[nc - 1] + 1;
    let p = start + 10 + nc * 2;
    p += 2 + b.readUInt16BE(p); // skip instructions
    const flags = [];
    while (flags.length < nPts) {
      const f = b.readUInt8(p++);
      flags.push(f);
      if (f & 8) {
        let r = b.readUInt8(p++);
        while (r--) flags.push(f);
      }
    }
    const xs = [],
      ys = [];
    let v = 0;
    for (let i = 0; i < nPts; i++) {
      const f = flags[i];
      if (f & 2) {
        const d = b.readUInt8(p++);
        v += f & 16 ? d : -d;
      } else if (!(f & 16)) {
        v += b.readInt16BE(p);
        p += 2;
      }
      xs.push(v);
    }
    v = 0;
    for (let i = 0; i < nPts; i++) {
      const f = flags[i];
      if (f & 4) {
        const d = b.readUInt8(p++);
        v += f & 32 ? d : -d;
      } else if (!(f & 32)) {
        v += b.readInt16BE(p);
        p += 2;
      }
      ys.push(v);
    }
    const contours = [];
    let s = 0;
    for (const e of ends) {
      const pts = [];
      for (let i = s; i <= e; i++)
        pts.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
      contours.push(pts);
      s = e + 1;
    }
    return contours;
  };

  return { unitsPerEm, cmapLookup, advance, outline };
}

// Render a string as a single SVG path `d`, centered at cx, baseline at by.
export function textPath(font, text, { size, cx, by, letterSpacing = 0 }) {
  const k = size / font.unitsPerEm;
  const gids = [...text].map((ch) => font.cmapLookup(ch.codePointAt(0)));
  const widths = gids.map((g) => font.advance(g) * k);
  const total =
    widths.reduce((a, w) => a + w, 0) + letterSpacing * (gids.length - 1);
  let x = cx - total / 2;
  const out = [];
  const r = (n) => Math.round(n * 100) / 100;

  gids.forEach((gid, i) => {
    for (const cont of font.outline(gid)) {
      if (!cont.length) continue;
      const P = cont.map((pt) => ({
        x: x + pt.x * k,
        y: by - pt.y * k,
        on: pt.on,
      }));
      // ensure we start on an on-curve point
      let st = P.findIndex((pt) => pt.on);
      let pts;
      if (st === -1) {
        const mid = {
          x: (P[0].x + P[P.length - 1].x) / 2,
          y: (P[0].y + P[P.length - 1].y) / 2,
          on: true,
        };
        pts = [mid, ...P];
        st = 0;
      } else {
        pts = [...P.slice(st), ...P.slice(0, st)];
      }
      let d = `M${r(pts[0].x)} ${r(pts[0].y)}`;
      let j = 1;
      const n = pts.length;
      while (j <= n) {
        const cur = pts[j % n];
        if (cur.on) {
          d += `L${r(cur.x)} ${r(cur.y)}`;
          j++;
        } else {
          const next = pts[(j + 1) % n];
          const end = next.on
            ? next
            : { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
          d += `Q${r(cur.x)} ${r(cur.y)} ${r(end.x)} ${r(end.y)}`;
          j += next.on ? 2 : 1;
        }
      }
      out.push(d + "Z");
    }
    x += widths[i] + letterSpacing;
  });
  return out.join("");
}
