'use strict';
const BASE = 'https://redirect.internal.invalid';
const pendingWrites = new WeakMap();
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }

function internalURL(value, source = false) {
  if (typeof value !== 'string') fail('Enter an internal path.');
  let path = value.trim();
  if (!path || path.length > 2048 || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(path)) fail('Use an internal path, not an external URL.');
  if (!path.startsWith('/')) path = '/' + path;
  let url;
  try {
    url = new URL(path, BASE);
    let decoded = url.pathname;
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (decoded.startsWith('//') || /[\\?#\u0000-\u0020\u007f]/.test(decoded)) fail('Invalid internal path.');
    url = new URL(decoded + url.search + url.hash, BASE);
  } catch (error) {
    if (error.status) throw error;
    fail('Invalid internal path.');
  }
  if (url.origin !== BASE || url.username || url.password || url.pathname.startsWith('//')) fail('External destinations are not allowed.');
  if (source && (url.search || url.hash)) fail('The source must be a path without query parameters or a fragment.');
  return url;
}
const sourcePath = value => internalURL(value, true).pathname;
function destinationPath(value) { const u = internalURL(value); return u.pathname + u.search + u.hash; }
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail('Invalid redirect id.');
  return Number(value);
}
function assertNoLoop(rows, source, destination) {
  const edges = new Map();
  for (const row of rows) {
    try { edges.set(sourcePath(row.source_path), internalURL(row.destination_path).pathname); }
    catch { /* Invalid legacy targets are never followed by the resolver. */ }
  }
  edges.set(source, internalURL(destination).pathname);
  const seen = new Set();
  for (let next = source; edges.has(next); next = edges.get(next)) {
    if (seen.has(next)) fail('This redirect would create a loop.');
    seen.add(next);
  }
}
async function writeTransaction(db, fn) {
  const previous = pendingWrites.get(db) || Promise.resolve();
  const work = previous.catch(() => {}).then(async () => {
    if (!db.useTurso) return db.transaction(() => fn(db));
    const tx = await (await db.ensureTursoClient()).transaction('write');
    const adapter = {
      all: async (sql, args = []) => (await tx.execute({ sql, args })).rows.map(row => ({ ...row })),
      run: (sql, args = []) => tx.execute({ sql, args })
    };
    try { const result = await fn(adapter); await tx.commit(); return result; }
    catch (error) { await tx.rollback(); throw error; }
    finally { tx.close(); }
  });
  pendingWrites.set(db, work);
  return work.finally(() => { if (pendingWrites.get(db) === work) pendingWrites.delete(db); });
}
async function save(db, body, redirectId) {
  return writeTransaction(db, async tx => {
    const rows = await tx.all('SELECT id, source_path, destination_path, status_code, is_active, notes FROM redirects');
    const old = redirectId === undefined ? null : rows.find(row => Number(row.id) === redirectId);
    if (redirectId !== undefined && !old) fail('Redirect not found.', 404);
    const source = sourcePath(body.source_path ?? old?.source_path);
    const destination = destinationPath(body.destination_path ?? old?.destination_path);
    const status = Number(body.status_code ?? old?.status_code ?? 301);
    if (![301, 302].includes(status)) fail('Choose 301 or 302.');
    const active = body.is_active ?? old?.is_active ?? 1;
    if (![true, false, 0, 1, '0', '1'].includes(active)) fail('Invalid active status.');
    const notes = body.notes ?? old?.notes ?? '';
    if (typeof notes !== 'string' || notes.length > 4000) fail('Notes must be at most 4000 characters.');
    const others = rows.filter(row => Number(row.id) !== redirectId);
    for (const row of others) {
      let existing;
      try { existing = sourcePath(row.source_path); } catch { continue; }
      if (existing === source) fail('A redirect already uses this source path.', 409);
    }
    assertNoLoop(others, source, destination);
    const args = [source, destination, status, Number(active === true || active === 1 || active === '1'), notes.trim()];
    if (old) await tx.run('UPDATE redirects SET source_path=?, destination_path=?, status_code=?, is_active=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [...args, redirectId]);
    else await tx.run('INSERT INTO redirects(source_path,destination_path,status_code,is_active,notes,created_at,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', args);
    return { source_path: source, destination_path: destination };
  });
}
async function remove(db, redirectId) {
  return writeTransaction(db, async tx => {
    if (!(await tx.all('SELECT id FROM redirects WHERE id=?', [redirectId])).length) fail('Redirect not found.', 404);
    await tx.run('DELETE FROM redirects WHERE id=?', [redirectId]);
  });
}
function mergeQuery(destination, originalUrl) {
  const target = internalURL(destination), original = new URL(originalUrl, BASE);
  const destinationKeys = new Set(target.searchParams.keys());
  for (const [key, value] of original.searchParams) if (!destinationKeys.has(key)) target.searchParams.append(key, value);
  return target.pathname + target.search + target.hash;
}
async function resolve(db, path, originalUrl) {
  const source = sourcePath(path);
  const row = await db.get('SELECT source_path, destination_path, status_code FROM redirects WHERE source_path=? AND is_active=1 LIMIT 1', [source]);
  if (!row) return null;
  const destination = destinationPath(row.destination_path);
  const rows = await db.all('SELECT source_path, destination_path FROM redirects WHERE is_active=1');
  assertNoLoop(rows, source, destination);
  return { destination: mergeQuery(destination, originalUrl), status: Number(row.status_code) === 302 ? 302 : 301 };
}
module.exports = { sourcePath, destinationPath, mergeQuery, resolve, save, remove, id };
