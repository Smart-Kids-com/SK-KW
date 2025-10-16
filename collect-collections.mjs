// collect-collections.mjs  (Node 18+ / 22 عندك تمام)
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const exts = new Set([".liquid",".json",".js",".jsx",".ts",".tsx",".html",".htm"]);
const skip = new Set(["node_modules","dist","build",".git",".cache",".next"]);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skip.has(e.name)) continue;
      yield* walk(p);
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      yield p;
    }
  }
}

function decodeTwice(s) {
  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}

const RE_REL = /\/collections\/([^\s"'()?#<>\\]+)/g;                 // /collections/<...>
const RE_ABS = /https?:\/\/[^"'()\s<>]+\/collections\/([^\s"'?#<>\\]+)/g; // https://.../collections/<...>
const RE_LIQ = /collections\[['"]([^'"]+)['"]\]\.url/g;              // collections['handle'].url

const handles = new Map(); // handle -> "/collections/handle"

for (const file of walk(ROOT)) {
  let txt = "";
  try {
    const st = fs.statSync(file);
    if (st.size > 2_000_000) continue;
    txt = fs.readFileSync(file, "utf8");
  } catch { continue; }

  let m;
  for (const re of [RE_REL, RE_ABS]) {
    re.lastIndex = 0;
    while ((m = re.exec(txt))) {
      const first = (m[1] || "").split("/")[0];
      collect(first);
    }
  }
  RE_LIQ.lastIndex = 0;
  while ((m = RE_LIQ.exec(txt))) collect(m[1] || "");
}

function collect(raw) {
  if (!raw) return;
  // شيل ذيول مزعجة
  let h = raw.replace(/[\\\/)]+$/g, "");
  // تجاهل متغيرات وقوالب
  if (/[{}\[\]\$]/.test(h)) return;
  // خذ أول جزء فقط
  h = h.split("/")[0];
  // فلترة أسماء غير صالحة
  if (/^(page(\.js)?|pages|collections)$/i.test(h)) return;

  h = decodeTwice(h);
  if (!h) return;
  // لا تغيّر حالة الأحرف (دعم العربية)
  if (!handles.has(h)) handles.set(h, `/collections/${h}`);
}

// اطبع: handle,/collections/handle
for (const [h, url] of [...handles.entries()].sort((a,b)=>a[0].localeCompare(b[0]))) {
  console.log(`${h},${url}`);
}
