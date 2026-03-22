// db/init.js - تهيئة قاعدة البيانات وإنشاء الجداول
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { SYSTEM_CONFIG } = require('../config/system');

const DB_PATH = path.join(__dirname, '..', SYSTEM_CONFIG.DATABASE_CONFIG.NAME);

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  /**
   * فتح الاتصال بقاعدة البيانات
   */
  open() {
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

  /**
   * إغلاق الاتصال
   */
  close() {
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

  /**
   * إنشاء جداول قاعدة البيانات
   */
  initializeTables() {
    return new Promise((resolve, reject) => {
      // قائمة الأوامر SQL
      const sqlCommands = [
        // جدول الطلبات الرئيسي
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

        // جدول عناصر الطلب
        `CREATE TABLE IF NOT EXISTS ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          product_price REAL NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(id) ON DELETE CASCADE
        )`,

        // إنشاء فهارس (indexes) لتحسين الأداء
        `CREATE INDEX IF NOT EXISTS idx_order_number ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(order_number)`,
        `CREATE INDEX IF NOT EXISTS idx_order_status ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(status)`,
        `CREATE INDEX IF NOT EXISTS idx_order_created_at ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}(order_id)`
      ];

      // تنفيذ الأوامر بالتسلسل
      let commandIndex = 0;

      const executeNextCommand = () => {
        if (commandIndex >= sqlCommands.length) {
          console.log('✅ تم تهيئة الجداول بنجاح');
          resolve();
          return;
        }

        const sql = sqlCommands[commandIndex];
        this.db.run(sql, (err) => {
          if (err) {
            console.error('❌ خطأ في تنفيذ الأمر:', sql, err);
            reject(err);
          } else {
            console.log(`✅ تم تنفيذ الأمر ${commandIndex + 1}/${sqlCommands.length}`);
            commandIndex++;
            executeNextCommand();
          }
        });
      };

      executeNextCommand();
    });
  }

  /**
   * تنفيذ استعلام مخصص مع معاملات آمنة
   */
  run(sql, params = []) {
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

  /**
   * الحصول على صف واحد
   */
  get(sql, params = []) {
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

  /**
   * الحصول على جميع الصفوف
   */
  all(sql, params = []) {
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

  /**
   * تنفيذ عدة أوامر معاً (transaction)
   */
  transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }

          callback()
            .then(() => {
              this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            })
            .catch((err) => {
              this.db.run('ROLLBACK', () => {
                reject(err);
              });
            });
        });
      });
    });
  }
}

// إنشاء وتصدير المدير
const dbManager = new DatabaseManager();

module.exports = dbManager;
