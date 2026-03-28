// db/turso-manager.js - إدارة قاعدة البيانات (Turso في الإنتاج، SQLite محليًا)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@libsql/client');
const { SYSTEM_CONFIG } = require('../config/system');

const USE_TURSO = !!process.env.DATABASE_URL;
const DB_PATH = path.join(__dirname, '..', SYSTEM_CONFIG.DATABASE_CONFIG.NAME);

let client = null;

class DatabaseManager {
  constructor() {
    this.db = null;
    this.useTurso = USE_TURSO;
  }

  async open() {
    if (this.useTurso) {
      console.log('🌐 اتصال بـ Turso (إنتاج)');
      client = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN
      });
      console.log('✅ تم الاتصال بـ Turso بنجاح');
    } else {
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
  }

  async close() {
    if (this.useTurso) {
      if (client) client = null;
    } else {
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
  }

  async run(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql,
          args: params
        });
        return {
          id: result.lastInsertRowid,
          changes: result.rowsAffected
        };
      } catch (err) {
        console.error('❌ خطأ Turso:', err);
        throw err;
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              changes: this.changes
            });
          }
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql,
          args: params
        });
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch (err) {
        console.error('❌ خطأ Turso:', err);
        throw err;
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    }
  }

  async all(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql,
          args: params
        });
        return result.rows;
      } catch (err) {
        console.error('❌ خطأ Turso:', err);
        throw err;
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    }
  }

  async transaction(callback) {
    if (this.useTurso) {
      try {
        await client.execute('BEGIN TRANSACTION');
        try {
          const result = await callback();
          await client.execute('COMMIT');
          return result;
        } catch (err) {
          await client.execute('ROLLBACK');
          throw err;
        }
      } catch (err) {
        console.error('❌ خطأ في Transaction:', err);
        throw err;
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }

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
              this.db.run('ROLLBACK', () => {
                reject(err);
              });
            });
          });
        });
      });
    }
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

      `CREATE INDEX IF NOT EXISTS idx_order_number ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(order_number)`,
      `CREATE INDEX IF NOT EXISTS idx_order_status ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_created_at ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}(order_id)`,

      `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`,
      `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,
      `CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON product_images(sort_order)`
    ];

    const migrationCommands = [
      `ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN vendor TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN category TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN tags TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN seo_title TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN seo_description TEXT DEFAULT ''`
    ];

    for (const sql of sqlCommands) {
      try {
        await this.run(sql);
        console.log('✅ تم تنفيذ أمر إنشاء جدول/فهرس');
      } catch (err) {
        if (!String(err.message || '').includes('already')) {
          console.warn('⚠️ تحذير:', err.message);
        }
      }
    }

    for (const sql of migrationCommands) {
      try {
        await this.run(sql);
        console.log('✅ تم تنفيذ migration');
      } catch (err) {
        const message = String(err.message || '').toLowerCase();
        if (
          !message.includes('duplicate column') &&
          !message.includes('already exists') &&
          !message.includes('duplicate')
        ) {
          console.warn('⚠️ تحذير migration:', err.message);
        }
      }
    }

    console.log('✅ تم تهيئة الجداول بنجاح');
  }
}

module.exports = new DatabaseManager();