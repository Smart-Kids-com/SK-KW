// report-link-audit.js
// يفحص كل الملفات (JS/TS/JSX/TSX/HTML/CSS) ويولّد تقرير بالروابط المكسورة/المشبوهة
// تشغيل: node report-link-audit.js

const fs = require("fs");
const path = require("path");

// إعدادات
const ROOT = process.cwd();
const OUT = path.join(ROOT, "link-audit-report.md");
const EXCLUDE_RE = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|out|\.trash)(\/|$)/;
const FILE_RE = /\.(js|jsx|ts|tsx|html|css|md|liquid)$/i;
const HREF_RE = /(?:href|src|action)\s*=\s*["']([^"']+)["']/g;

// مهلة الشبكة للروابط الخارجية
const FETCH_TIMEOUT_MS = 7000;

// اجمع كل الملفات
function listFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      const rel = path.relative(ROOT, p).replace(/\\/g, "/") || ".";
      if (EXCLUDE_RE.test(rel)) continue;
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && FILE_RE.test(e.name)) out.push(rel);
    }
  }
  return out;
}

// بناء فهرس مسارات Next الداخلية
function buildRouteIndex(files) {
  const appRoutes = new Set();
  const pagesRoutes = new Set();

  for (const f of files) {
    // App Router: app/**/page.{js,tsx}
    if (f.startsWith("app/") && /\/page\.(js|jsx|ts|tsx)$/.test(f)) {
      // احذف مجموعات المسارات (مثل (policies))
      const withoutGroups = f
        .replace(/^app\//, "")
        .split("/")
        .filter(seg => !/^\(.+\)$/.test(seg)); // يحذف (group)
      // احذف "page.js"
      const routeParts = withoutGroups.slice(0, -1);
      const route = "/" + routeParts.join("/");
      appRoutes.add(route === "/" ? "/" : route);
    }
    // Pages Router: pages/**/index.js أو pages/**.js
    if (f.startsWith("pages/")) {
      if (/\/index\.(js|jsx|ts|tsx)$/.test(f)) {
        const route = "/" + f.replace(/^pages\//, "").replace(/\/index\.(js|jsx|ts|tsx)$/,"");
        pagesRoutes.add(route === "" ? "/" : "/" + route.replace(/^\/+/, ""));
      } else if (/^pages\/.+\.(js|jsx|ts|tsx)$/.test(f)) {
        const route = "/" + f.replace(/^pages\//, "").replace(/\.(js|jsx|ts|tsx)$/,"");
        pagesRoutes.add(route);
      }
    }
  }
  return { appRoutes, pagesRoutes };
}

function isInternal(url) {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return true;
  return false;
}
function isProtocol(url) {
  return /^(https?:|mailto:|tel:|data:|javascript:)/i.test(url);
}

// تحقق من وجود المسار داخلياً
function checkInternal(urlPath, routeIndex) {
  // نظّف الاستعلام والهاش
  const clean = urlPath.replace(/[?#].*$/, "");
  if (!clean.startsWith("/")) return { ok: false, reason: "relative-path" };
  // جرّب مباشرة
  if (routeIndex.appRoutes.has(clean) || routeIndex.pagesRoutes.has(clean)) {
    return { ok: true, matched: clean };
  }
  // حاول إزالة / في النهاية
  const trim = clean.replace(/\/+$/, "") || "/";
  if (routeIndex.appRoutes.has(trim) || routeIndex.pagesRoutes.has(trim)) {
    return { ok: true, matched: trim };
  }
  // جرّب إضافة /page
  const maybePage = (trim === "/" ? "/" : trim) + (trim.endsWith("/") ? "" : "");
  return { ok: false, reason: "not-found" , tried: [clean, trim, maybePage] };
}

// طلب خارجي مع مهلة
async function headOrGet(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (!res.ok || res.status === 405) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: "ERR" };
  }
}

async function main() {
  const files = listFiles(ROOT);
  const routeIndex = buildRouteIndex(files);

  const rows = [];
  let totalLinks = 0;

  for (const f of files) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }

    let m;
    while ((m = HREF_RE.exec(txt))) {
      const raw = m[1].trim();
      totalLinks++;

      // تجاهل data:, javascript:, #anchors فقط
      if (raw.startsWith("#") || raw.startsWith("data:") || raw.startsWith("javascript:")) continue;

      const rec = { file: f, link: raw, type: "", status: "", note: "" };

      // mailto/tel/wa.me
      if (/^mailto:/i.test(raw)) {
        rec.type = "mailto";
        rec.status = "OK";
        // تحقق بسيط من صيغة الإيميل
        const addr = raw.replace(/^mailto:/i, "").split("?")[0];
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
          rec.status = "WARN";
          rec.note = "صيغة بريد غير قياسية";
        }
        rows.push(rec);
        continue;
      }
      if (/^tel:/i.test(raw)) {
        rec.type = "tel";
        rec.status = "OK";
        rows.push(rec);
        continue;
      }
      if (/wa\.me\//i.test(raw)) {
        rec.type = "whatsapp";
        rec.status = "OK";
        // تحقق بسيط: وجود أرقام بعد الدولة
        if (!/wa\.me\/\d{6,}/.test(raw)) {
          rec.status = "WARN";
          rec.note = "رابط واتساب قد يكون ناقص رقم";
        }
        rows.push(rec);
        continue;
      }

      if (isInternal(raw)) {
        rec.type = "internal";
        // حوّل الروابط النسبية لروت (تقريب)
        let urlPath = raw;
        if (raw.startsWith("./") || raw.startsWith("../")) {
          // نبسّط: نعتبره نسبي لملفّه—نحوّل لمسار تقريبي
          const baseDir = path.dirname("/" + f.replace(/^(app|pages)\//,""));
          urlPath = path.posix.normalize(path.posix.join(baseDir, raw));
          if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;
        }
        const chk = checkInternal(urlPath, routeIndex);
        rec.status = chk.ok ? "OK" : "BROKEN";
        rec.note = chk.ok ? (chk.matched || "") : `Not found (tried: ${chk.tried?.join(" | ")})`;
        rows.push(rec);
      } else if (isProtocol(raw)) {
        rec.type = "external";
        rows.push(rec); // نملأ الحالة لاحقاً بفحص الشبكة
      } else if (/^\/\//.test(raw)) {
        rec.type = "external";
        rec.link = "https:" + raw;
        rows.push(rec);
      } else {
        // أشياء مثل assets نسبية بدون بروتوكول
        rec.type = "static/relative";
        rec.status = fs.existsSync(path.join(ROOT, raw)) ? "OK" : "WARN";
        if (rec.status !== "OK") rec.note = "قد يكون مسار أصل/صورة غير موجود";
        rows.push(rec);
      }
    }
  }

  // افحص الروابط الخارجية عبر الشبكة (دفعات صغيرة)
  const externals = rows.filter(r => r.type === "external" && !r.status);
  const BATCH = 15;
  for (let i = 0; i < externals.length; i += BATCH) {
    const slice = externals.slice(i, i + BATCH);
    await Promise.all(slice.map(async r => {
      const res = await headOrGet(r.link);
      r.status = res.ok ? "OK" : "BROKEN";
      r.note = `HTTP ${res.status}`;
    }));
  }

  // اكتب التقرير
  const lines = [];
  lines.push("# Link Audit Report");
  lines.push("");
  lines.push(`- Total files scanned: **${files.length}**`);
  lines.push(`- Total links found: **${totalLinks}**`);
  const brokenCount = rows.filter(r => r.status === "BROKEN").length;
  const warnCount = rows.filter(r => r.status === "WARN").length;
  lines.push(`- Broken: **${brokenCount}** | Warnings: **${warnCount}** | OK: **${rows.length - brokenCount - warnCount}**`);
  lines.push("");
  lines.push("| File | Type | Link | Status | Note |");
  lines.push("|---|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| ${r.file} | ${r.type} | ${r.link.replace(/\|/g,"\\|")} | ${r.status} | ${r.note.replace(/\|/g,"\\|")} |`);
  }
  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`✅ Done. See: ${OUT}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
