// db/turso-manager.js - إدارة قاعدة البيانات (Turso في الإنتاج، SQLite محليًا)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('libsql');
const { SYSTEM_CONFIG } = require('../config/system');

const USE_TURSO = !!process.env.DATABASE_URL;
const DB_PATH = path.join(__dirname, '..', SYSTEM_CONFIG.DATABASE_CONFIG.NAME);

let client = null;

class DatabaseManager {
  constructor() {
    this.db = null;
    this.useTurso = USE_TURSO;
  }

  /**
   * فتح الاتصال بقاعدة البيانات
   */
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

  /**
   * إغلاق الاتصال
   */
  async close() {
    if (this.useTurso) {
      if (client) {
        client = null;
      }
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

  /**
   * تنفيذ استعلام مخصص
   */
  async run(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql: sql,
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

  /**
   * الحصول على صف واحد
   */
  async get(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql: sql,
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

  /**
   * الحصول على جميع الصفوف
   */
  async all(sql, params = []) {
    if (this.useTurso) {
      try {
        const result = await client.execute({
          sql: sql,
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

  /**
   * Transaction
   */
  async transaction(callback) {
    if (this.useTurso) {
      // Turso transactions
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

  /**
   * إنشاء الجداول
   */
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

      `CREATE INDEX IF NOT EXISTS idx_order_number ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(order_number)`,
      `CREATE INDEX IF NOT EXISTS idx_order_status ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_created_at ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}(order_id)`
    ];

    for (const sql of sqlCommands) {
      try {
        await this.run(sql);
        console.log('✅ تم تنفيذ أمر إنشاء جدول');
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already')) {
          console.warn('⚠️ تحذير:', err.message);
        }
      }
    }
    
    console.log('✅ تم تهيئة الجداول بنجاح');
  }
}

module.exports = new DatabaseManager();
