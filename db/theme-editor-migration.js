'use strict';
async function migrateThemeEditor(db) {
  await db.run(`CREATE TABLE IF NOT EXISTS theme_editor_documents (
    id INTEGER PRIMARY KEY CHECK(id=1), draft_json TEXT NOT NULL, published_json TEXT NOT NULL,
    draft_revision INTEGER NOT NULL DEFAULT 0, published_revision INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const initial=JSON.stringify({version:1,global:{desktop:{},mobile:{}},shared:{overrides:{}},pages:{}});
  await db.run('INSERT OR IGNORE INTO theme_editor_documents(id,draft_json,published_json) VALUES(1,?,?)',[initial,initial]);
  await db.run(`CREATE TABLE IF NOT EXISTS theme_editor_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, document_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.run(`CREATE TABLE IF NOT EXISTS theme_editor_media (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL, data_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.run(`CREATE TABLE IF NOT EXISTS theme_editor_library (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, draft_json TEXT NOT NULL,
    draft_revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.run(`CREATE TABLE IF NOT EXISTS theme_editor_identity (
    id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL DEFAULT 'Smart Kids',
    published_name TEXT NOT NULL DEFAULT 'Smart Kids', published_source TEXT NOT NULL DEFAULT 'current')`);
  await db.run('INSERT OR IGNORE INTO theme_editor_identity(id) VALUES(1)');
  const historyColumns = await db.all('PRAGMA table_info(theme_editor_history)');
  if (!historyColumns.some(c => c.name === 'theme_id')) {
    await db.run("ALTER TABLE theme_editor_history ADD COLUMN theme_id TEXT NOT NULL DEFAULT 'current'");
  }
}
module.exports={migrateThemeEditor};
