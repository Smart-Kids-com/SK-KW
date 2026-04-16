const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@libsql/client');
const { SYSTEM_CONFIG } = require('../config/system');

const USE_TURSO = !!process.env.DATABASE_URL;
const DB_PATH = path.join(__dirname, '.', SYSTEM_CONFIG.DATABASE_CONFIG.NAME);

const TURSO_OP_TIMEOUT_MS = Number(process.env.TURSO_OP_TIMEOUT_MS || 12_000);
const TURSO_INIT_TIMEOUT_MS = Number(process.env.TURSO_INIT_TIMEOUT_MS || 5_000);

let client = null;
let clientInitPromise = null;

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.useTurso = USE_TURSO;
  }

  async ensureTursoClient() {
    if (!this.useTurso) return null;
    if (client) return client;
    if (clientInitPromise) return clientInitPromise;

    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!url) {
      throw new Error('DATABASE_URL is missing but USE_TURSO is enabled.');
    }

    clientInitPromise = withTimeout(
      (async () => {
        console.log('🌐 اتصال بـ Turso (إنتاج)');
        const c = createClient({ url, authToken });
        await c.execute({ sql: 'SELECT 1 as ok', args: [] });
        client = c;
        console.log('✅ تم الاتصال بـ Turso بنجاح');
        return client;
      })(),
      TURSO_INIT_TIMEOUT_MS,
      'Turso client init'
    ).finally(() => {
      clientInitPromise = null;
    });

    return clientInitPromise;
  }

  async open() {
    if (this.useTurso) {
      await this.ensureTursoClient();
      return;
    }

    console.log('💾 اتصال بـ SQLite محلي (تطوير)');
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ خطأ في فتح قاعدة البيانات:', err);
          reject(err);
        } else {
          console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
          resolve();
        }
      });
    });
  }

  async close() {
    if (this.useTurso) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ خطأ في إغلاق قاعدة البيانات:', err);
            reject(err);
          } else {
            console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql, params = []) {
    if (this.useTurso) {
      try {
        const c = await this.ensureTursoClient();
        const result = await withTimeout(
          c.execute({ sql, args: params }),
          TURSO_OP_TIMEOUT_MS,
          'Turso run'
        );
        return { id: result.lastInsertRowid, changes: result.rowsAffected };
      } catch (err) {
        console.error('❌ خطأ Turso (run):', err);
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    if (this.useTurso) {
      try {
        const c = await this.ensureTursoClient();
        const result = await withTimeout(
          c.execute({ sql, args: params }),
          TURSO_OP_TIMEOUT_MS,
          'Turso get'
        );
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch (err) {
        console.error('❌ خطأ Turso (get):', err);
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    if (this.useTurso) {
      try {
        const c = await this.ensureTursoClient();
        const result = await withTimeout(
          c.execute({ sql, args: params }),
          TURSO_OP_TIMEOUT_MS,
          'Turso all'
        );
        return result.rows;
      } catch (err) {
        console.error('❌ خطأ Turso (all):', err);
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async transaction(callback) {
    if (this.useTurso) {
      try {
        const c = await this.ensureTursoClient();
        await withTimeout(c.execute('BEGIN TRANSACTION'), TURSO_OP_TIMEOUT_MS, 'Turso BEGIN');

        try {
          const result = await callback();
          await withTimeout(c.execute('COMMIT'), TURSO_OP_TIMEOUT_MS, 'Turso COMMIT');
          return result;
        } catch (err) {
          try {
            await withTimeout(c.execute('ROLLBACK'), TURSO_OP_TIMEOUT_MS, 'Turso ROLLBACK');
          } catch (rollbackErr) {
            console.error('❌ خطأ Turso (ROLLBACK):', rollbackErr);
          }
          throw err;
        }
      } catch (err) {
        console.error('❌ خطأ في Transaction:', err);
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);

          callback().then(result => {
            this.db.run('COMMIT', (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
              } else {
                resolve(result);
              }
            });
          }).catch(err => {
            this.db.run('ROLLBACK', () => reject(err));
          });
        });
      });
    });
  }

  async tableExists(tableName) {
    const row = await this.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [tableName]
    );
    return !!row;
  }

  async getTableColumns(tableName) {
    const exists = await this.tableExists(tableName);
    if (!exists) return [];
    const rows = await this.all(`PRAGMA table_info(${tableName})`);
    return Array.isArray(rows) ? rows.map(row => String(row.name || '').trim()) : [];
  }

  async addColumnIfMissing(tableName, columnName, columnSql) {
    const columns = await this.getTableColumns(tableName);
    const hasColumn = columns.some(col => col.toLowerCase() === String(columnName).toLowerCase());
    if (hasColumn) return false;

    await this.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
    console.log(`✅ تمت إضافة العمود ${tableName}.${columnName}`);
    return true;
  }

  async initializeTables() {
    const sqlCommands = [
      `CREATE TABLE IF NOT EXISTS ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_city TEXT,
        customer_district TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        shipping_cost REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        shipped_at DATETIME
      )`,

      `CREATE TABLE IF NOT EXISTS ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_image TEXT,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        slug TEXT UNIQUE,
        sku TEXT UNIQUE,
        description TEXT DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        image_url TEXT DEFAULT '',
        stock INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        product_type TEXT DEFAULT '',
        vendor TEXT DEFAULT '',
        category TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        seo_title TEXT DEFAULT '',
        seo_description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        sort_mode TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'active',
        theme_template TEXT DEFAULT 'default-collection',
        seo_title TEXT DEFAULT '',
        seo_description TEXT DEFAULT '',
        online_store INTEGER NOT NULL DEFAULT 1,
        pos_excluded INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS collection_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, product_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_order_number ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(order_number)`,
      `CREATE INDEX IF NOT EXISTS idx_order_status ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_created_at ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}(order_id)`,

      `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`,
      `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,

      `CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON product_images(sort_order)`,

      `CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status)`,
      `CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON collection_products(collection_id)`,
      `CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON collection_products(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_collection_products_sort_order ON collection_products(sort_order)`
    ];

    for (const sql of sqlCommands) {
      try {
        await this.run(sql);
      } catch (err) {
        const message = String(err.message || '').toLowerCase();
        if (!message.includes('already exists')) {
          console.warn('⚠️ تحذير:', err.message);
        }
      }
    }

    const migrations = [
      ['products', 'product_type', `TEXT DEFAULT ''`],
      ['products', 'vendor', `TEXT DEFAULT ''`],
      ['products', 'category', `TEXT DEFAULT ''`],
      ['products', 'tags', `TEXT DEFAULT ''`],
      ['products', 'seo_title', `TEXT DEFAULT ''`],
      ['products', 'seo_description', `TEXT DEFAULT ''`],

      ['collections', 'sort_mode', `TEXT NOT NULL DEFAULT 'manual'`],
      ['collections', 'status', `TEXT NOT NULL DEFAULT 'active'`],
      ['collections', 'theme_template', `TEXT DEFAULT 'default-collection'`],
      ['collections', 'seo_title', `TEXT DEFAULT ''`],
      ['collections', 'seo_description', `TEXT DEFAULT ''`],
      ['collections', 'online_store', `INTEGER NOT NULL DEFAULT 1`],
      ['collections', 'pos_excluded', `INTEGER NOT NULL DEFAULT 1`]
    ];

    for (const [tableName, columnName, columnSql] of migrations) {
      try {
        await this.addColumnIfMissing(tableName, columnName, columnSql);
      } catch (err) {
        const message = String(err.message || '').toLowerCase();
        if (
          !message.includes('duplicate column') &&
          !message.includes('already exists') &&
          !message.includes('duplicate') &&
          !message.includes('no such table')
        ) {
          console.warn(`⚠️ تحذير migration ${tableName}.${columnName}:`, err.message);
        }
      }
    }

    console.log('✅ تم تهيئة الجداول بنجاح');
  }
}

module.exports = new DatabaseManager();