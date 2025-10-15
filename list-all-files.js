// احفظ الملف باسم list-all-files.js ثم شغّله: node list-all-files.js
// يخرج "project-filelist.txt" فيه كل الملفات (استبعدت مجلدات ضخمة؛ شِلها من EXCLUDE لو تبغى حرفيًا كل شيء).
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'project-filelist.txt');
// عدّل/احذف الاستبعادات حسب رغبتك:
const EXCLUDE = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|out|\.DS_Store)(\/|$)/;

(async function main() {
  const all = [];
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch { continue; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      const rel = path.relative(ROOT, p) || '.';
      if (EXCLUDE.test(rel)) continue;
      if (ent.isDirectory()) {
        stack.push(p);
      } else if (ent.isFile()) {
        all.push(rel.replace(/\\/g, '/'));
      }
    }
  }
  all.sort((a,b)=>a.localeCompare(b));
  await fs.promises.writeFile(OUT_FILE, all.join('\n') + '\n', 'utf8');
  console.log(`تم الحفظ: ${OUT_FILE} — عدد الملفات: ${all.length}`);
})();
