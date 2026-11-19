// Converte o MP4 em pedaços (fragmentado) que o MediaRecorder grava num MP4 normal, com o índice (moov) no
// começo. Sem reencodar: só reorganiza as caixas. Assim o player mostra a duração certa, pula para qualquer
// ponto e Instagram/WhatsApp aceitam o arquivo. Uso: node tools/video/remux-mp4.js arquivo.mp4 [outro.mp4 ...]
const fs = require("fs");

function boxes(b, s, e) {
  const out = [];
  while (s + 8 <= e) {
    let size = b.readUInt32BE(s), hdr = 8;
    const type = b.toString("latin1", s + 4, s + 8);
    if (size === 1) { size = Number(b.readBigUInt64BE(s + 8)); hdr = 16; }
    if (size === 0) size = e - s;
    out.push({ type, s, e: s + size, body: s + hdr });
    s += size;
  }
  return out;
}
const kid = (b, bx, t) => boxes(b, bx.body, bx.e).find((x) => x.type === t);
const kids = (b, bx, t) => boxes(b, bx.body, bx.e).filter((x) => x.type === t);
function box(type, ...parts) {
  const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))));
  const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, "latin1");
  return Buffer.concat([h, body]);
}
const u32 = (v) => { const x = Buffer.alloc(4); x.writeUInt32BE(v >>> 0); return x; };
const u64 = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64BE(BigInt(Math.round(v))); return x; };
const full = (v, f) => Buffer.from([v, (f >> 16) & 255, (f >> 8) & 255, f & 255]);

function remux(file) {
  const b = fs.readFileSync(file);
  const top = boxes(b, 0, b.length);
  const moov = top.find((x) => x.type === "moov");
  if (!top.some((x) => x.type === "moof")) return file + ": já é MP4 normal";
  const mvhd = kid(b, moov, "mvhd");
  const mvTs = b.readUInt32BE(mvhd.body + (b[mvhd.body] === 1 ? 20 : 12));
  const trex = {};
  const mvex = kid(b, moov, "mvex");
  for (const t of kids(b, mvex, "trex")) {
    const p = t.body + 4;
    trex[b.readUInt32BE(p)] = { sdi: b.readUInt32BE(p + 4), dur: b.readUInt32BE(p + 8), size: b.readUInt32BE(p + 12), flags: b.readUInt32BE(p + 16) };
  }
  const tracks = {};
  for (const tr of kids(b, moov, "trak")) {
    const tkhd = kid(b, tr, "tkhd"), v = b[tkhd.body];
    const id = b.readUInt32BE(tkhd.body + (v === 1 ? 20 : 12));
    const mdia = kid(b, tr, "mdia"), mdhd = kid(b, mdia, "mdhd");
    const ts = b.readUInt32BE(mdhd.body + (b[mdhd.body] === 1 ? 20 : 12));
    const hdlr = kid(b, mdia, "hdlr"), kind = b.toString("latin1", hdlr.body + 8, hdlr.body + 12);
    tracks[id] = { id, tr, tkhd, mdia, mdhd, ts, kind, samples: [] };
  }
  // percorre os fragmentos e junta as amostras de cada faixa
  for (const mf of top.filter((x) => x.type === "moof")) {
    for (const tf of kids(b, mf, "traf")) {
      const th = kid(b, tf, "tfhd"), fl = b.readUIntBE(th.body + 1, 3);
      let p = th.body + 4;
      const id = b.readUInt32BE(p); p += 4;
      const T = tracks[id], d = trex[id] || { dur: 0, size: 0, flags: 0 };
      let base = mf.s, dDur = d.dur, dSize = d.size, dFlags = d.flags;
      if (fl & 1) { base = Number(b.readBigUInt64BE(p)); p += 8; }
      if (fl & 2) p += 4;
      if (fl & 8) { dDur = b.readUInt32BE(p); p += 4; }
      if (fl & 0x10) { dSize = b.readUInt32BE(p); p += 4; }
      if (fl & 0x20) { dFlags = b.readUInt32BE(p); p += 4; }
      const tfdt = kid(b, tf, "tfdt");
      let t = tfdt ? (b[tfdt.body] === 1 ? Number(b.readBigUInt64BE(tfdt.body + 4)) : b.readUInt32BE(tfdt.body + 4)) : null;
      for (const tn of kids(b, tf, "trun")) {
        const v = b[tn.body], f = b.readUIntBE(tn.body + 1, 3);
        let q = tn.body + 4;
        const n = b.readUInt32BE(q); q += 4;
        let off = base;
        if (f & 1) { off = base + b.readInt32BE(q); q += 4; }
        let first = null;
        if (f & 4) { first = b.readUInt32BE(q); q += 4; }
        for (let i = 0; i < n; i++) {
          const dur = f & 0x100 ? b.readUInt32BE((q += 4) - 4) : dDur;
          const size = f & 0x200 ? b.readUInt32BE((q += 4) - 4) : dSize;
          let sf = f & 0x400 ? b.readUInt32BE((q += 4) - 4) : dFlags;
          if (i === 0 && first !== null) sf = first;
          const cto = f & 0x800 ? (v === 1 ? b.readInt32BE((q += 4) - 4) : b.readUInt32BE((q += 4) - 4)) : 0;
          T.samples.push({ off, size, dur, sync: !(sf & 0x10000), cto, t });
          off += size;
          if (t !== null) t += dur;
        }
      }
    }
  }
  // novo mdat com as amostras na ordem em que estavam no arquivo
  const all = [];
  for (const T of Object.values(tracks)) for (const s of T.samples) all.push(s);
  all.sort((a, c) => a.off - c.off);
  const mdatLen = all.reduce((a, s) => a + s.size, 0);
  const build = (mdatStart) => {
    let pos = mdatStart;
    for (const s of all) { s.nOff = pos; pos += s.size; }
    let movieDur = 0;
    const traks = Object.values(tracks).map((T) => {
      const S = T.samples, dur = S.reduce((a, s) => a + s.dur, 0);
      movieDur = Math.max(movieDur, (dur / T.ts) * mvTs);
      const stts = []; for (const s of S) { const l = stts[stts.length - 1]; if (l && l[1] === s.dur) l[0]++; else stts.push([1, s.dur]); }
      const hasC = S.some((s) => s.cto);
      const ctts = []; if (hasC) for (const s of S) { const l = ctts[ctts.length - 1]; if (l && l[1] === s.cto) l[0]++; else ctts.push([1, s.cto]); }
      const sync = S.map((s, i) => (s.sync ? i + 1 : 0)).filter(Boolean);
      const stblOld = kid(b, kid(b, kid(b, T.tr, "mdia"), "minf"), "stbl");
      const stsd = kid(b, stblOld, "stsd");
      const parts = [b.subarray(stsd.s, stsd.e),
        box("stts", full(0, 0), u32(stts.length), ...stts.map(([c, d]) => Buffer.concat([u32(c), u32(d)])))];
      if (hasC) parts.push(box("ctts", full(1, 0), u32(ctts.length), ...ctts.map(([c, d]) => { const x = Buffer.alloc(8); x.writeUInt32BE(c); x.writeInt32BE(d, 4); return x; })));
      if (T.kind === "vide" && sync.length < S.length) parts.push(box("stss", full(0, 0), u32(sync.length), ...sync.map(u32)));
      parts.push(box("stsc", full(0, 0), u32(1), u32(1), u32(1), u32(1)));
      parts.push(box("stsz", full(0, 0), u32(0), u32(S.length), ...S.map((s) => u32(s.size))));
      parts.push(box("co64", full(0, 0), u32(S.length), ...S.map((s) => u64(s.nOff))));
      const stbl = box("stbl", ...parts);
      // minf: mantém vmhd/smhd/dinf, troca só o stbl
      const minfOld = kid(b, T.mdia, "minf");
      const minf = box("minf", ...boxes(b, minfOld.body, minfOld.e).map((x) => (x.type === "stbl" ? stbl : b.subarray(x.s, x.e))));
      const mdhd = Buffer.from(b.subarray(T.mdhd.s, T.mdhd.e));
      if (mdhd[8] === 1) mdhd.writeBigUInt64BE(BigInt(dur), 8 + 4 + 16 + 4); else mdhd.writeUInt32BE(dur, 8 + 4 + 8 + 4);
      const mdia = box("mdia", ...boxes(b, T.mdia.body, T.mdia.e).map((x) => (x.type === "minf" ? minf : x.type === "mdhd" ? mdhd : b.subarray(x.s, x.e))));
      const tkhd = Buffer.from(b.subarray(T.tkhd.s, T.tkhd.e));
      const tDur = Math.round((dur / T.ts) * mvTs);
      if (tkhd[8] === 1) tkhd.writeBigUInt64BE(BigInt(tDur), 8 + 4 + 16 + 4 + 4); else tkhd.writeUInt32BE(tDur, 8 + 4 + 8 + 4 + 4);
      return box("trak", ...boxes(b, T.tr.body, T.tr.e).filter((x) => x.type !== "edts").map((x) => (x.type === "mdia" ? mdia : x.type === "tkhd" ? tkhd : b.subarray(x.s, x.e))));
    });
    const mv = Buffer.from(b.subarray(mvhd.s, mvhd.e));
    if (mv[8] === 1) mv.writeBigUInt64BE(BigInt(Math.round(movieDur)), 8 + 4 + 16 + 4); else mv.writeUInt32BE(Math.round(movieDur), 8 + 4 + 8 + 4);
    const others = boxes(b, moov.body, moov.e).filter((x) => !["mvhd", "trak", "mvex"].includes(x.type)).map((x) => b.subarray(x.s, x.e));
    return { moov: box("moov", mv, ...traks, ...others), movieDur };
  };
  const ftyp = box("ftyp", "isom", u32(512), "isomiso2avc1mp41");
  let r = build(0);
  const mdatHdr = Buffer.alloc(16); mdatHdr.writeUInt32BE(1, 0); mdatHdr.write("mdat", 4, "latin1"); mdatHdr.writeBigUInt64BE(BigInt(16 + mdatLen), 8);
  r = build(ftyp.length + r.moov.length + 16);
  const out = fs.openSync(file + ".tmp", "w");
  fs.writeSync(out, ftyp); fs.writeSync(out, r.moov); fs.writeSync(out, mdatHdr);
  for (const s of all) fs.writeSync(out, b, s.off, s.size);
  fs.closeSync(out);
  fs.renameSync(file + ".tmp", file);
  return file + ": " + (r.movieDur / mvTs).toFixed(1) + " s, " + Object.values(tracks).map((T) => T.kind + " " + T.samples.length).join(", ");
}
for (const f of process.argv.slice(2)) console.log(remux(f));
