// db/migrate.js - سكربت migrations آمن بدون فقد البيانات
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { SYSTEM_CONFIG } = require('../config/system');

const DB_PATH = path.join(__dirname, '..', SYSTEM_CONFIG.DATABASE_CONFIG.NAME);

class DatabaseMigration {
  constructor() {
    this.db = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ خطأ في فتح قاعدة البيانات:', err);
          reject(err);
        } else {
          console.log('✅ تم الاتصال بقاعدة البيانات');
          resolve();
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * الحصول على معلومات الجدول
   */
  getTableInfo(tableName) {
    return new Promise((resolve, reject) => {
      this.db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) reject(err);
        else resolve(columns || []);
      });
    });
  }

  /**
   * فحص الأعمدة الموجودة
   */
  async checkColumns(tableName) {
    try {
      const columns = await this.getTableInfo(tableName);
      const columnNames = columns.map(col => col.name);

      console.log('\n📋 الأعمدة الموجودة حالياً في جدول ' + tableName + ':');
      columns.forEach(col => {
        console.log(`   ├─ ${col.name} (${col.type})`);
      });

      return columnNames;
    } catch (error) {
      console.error('❌ خطأ في فحص الأعمدة:', error);
      throw error;
    }
  }

  /**
   * إضافة عمود إذا كان غير موجود
   */
  async addColumnIfNotExists(tableName, columnName, columnDefinition) {
    try {
      const columns = await this.getTableInfo(tableName);
      const columnExists = columns.some(col => col.name === columnName);

      if (columnExists) {
        console.log(`   ✅ العمود ${columnName} موجود بالفعل`);
        return false;
      }

      console.log(`   ⏳ إضافة العمود ${columnName}...`);
      await this.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`   ✅ تم إضافة العمود ${columnName} بنجاح`);
      return true;
    } catch (error) {
      console.error(`❌ خطأ في إضافة العمود ${columnName}:`, error);
      throw error;
    }
  }

  /**
   * تشغيل migrations
   */
  async migrate() {
    try {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║            🔧 فحص وإصلاح قاعدة البيانات      ║');
      console.log('╚════════════════════════════════════════════════╝\n');

      // فحص وجود الجداول
      const existingColumns = await this.checkColumns(SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS);

      // الأعمدة المطلوبة
      const requiredColumns = {
        order_number: 'TEXT UNIQUE NOT NULL',
        customer_name: 'TEXT NOT NULL',
        customer_email: 'TEXT NOT NULL',
        customer_phone: 'TEXT NOT NULL',
        customer_address: 'TEXT NOT NULL',
        customer_city: 'TEXT',
        customer_district: 'TEXT',
        subtotal: 'REAL NOT NULL DEFAULT 0',
        shipping_cost: 'REAL NOT NULL DEFAULT 0',
        total: 'REAL NOT NULL DEFAULT 0',
        status: "TEXT DEFAULT 'pending'",
        notes: 'TEXT',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        completed_at: 'DATETIME',
        shipped_at: 'DATETIME'
      };

      // البحث عن الأعمدة الناقصة
      const missingColumns = [];
      for (const [colName, colDef] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(colName)) {
          missingColumns.push({ name: colName, definition: colDef });
        }
      }

      if (missingColumns.length === 0) {
        console.log('\n✅ جميع الأعمدة موجودة! قاعدة البيانات سليمة.');
        return { success: true, added: 0, message: 'لا توجد تغييرات مطلوبة' };
      }

      console.log('\n⚠️ الأعمدة الناقصة:');
      missingColumns.forEach(col => {
        console.log(`   └─ ❌ ${col.name}`);
      });

      console.log('\n🔄 جاري إضافة الأعمدة الناقصة...\n');

      // إضافة الأعمدة الناقصة
      for (const col of missingColumns) {
        await this.addColumnIfNotExists(
          SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS,
          col.name,
          col.definition
        );
      }

      // التحقق من جدول order_items
      console.log('\n📋 فحص جدول order_items...');
      try {
        const itemsColumns = await this.checkColumns(SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS);

        const requiredItemsColumns = {
          order_id: 'INTEGER NOT NULL',
          product_id: 'TEXT NOT NULL',
          product_name: 'TEXT NOT NULL',
          product_price: 'REAL NOT NULL',
          quantity: 'INTEGER NOT NULL DEFAULT 1',
          subtotal: 'REAL NOT NULL'
        };

        const missingItemsColumns = [];
        for (const [colName, colDef] of Object.entries(requiredItemsColumns)) {
          if (!itemsColumns.includes(colName)) {
            missingItemsColumns.push({ name: colName, definition: colDef });
          }
        }

        if (missingItemsColumns.length === 0) {
          console.log('✅ جدول order_items سليم');
        } else {
          console.log('\n⚠️ إضافة الأعمدة الناقصة في order_items...\n');
          for (const col of missingItemsColumns) {
            await this.addColumnIfNotExists(
              SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS,
              col.name,
              col.definition
            );
          }
        }
      } catch (err) {
        console.log('ℹ️ جدول order_items قد لا يكون موجوداً بعد, سيتم إنشاؤه من الـ init');
      }

      // إنشاء الـ indexes
      console.log('\n📊 إنشاء الـ indexes للأداء...');
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_order_number ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(order_number)`,
        `CREATE INDEX IF NOT EXISTS idx_order_status ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(status)`,
        `CREATE INDEX IF NOT EXISTS idx_order_created_at ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}(order_id)`
      ];

      for (const indexSql of indexes) {
        try {
          await this.run(indexSql);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('خطأ في إنشاء index:', err);
          }
        }
      }

      console.log('✅ تم إنشاء الـ indexes');

      console.log('\n╔════════════════════════════════════════════════╗');
      console.log(`║  ✅ تم إصلاح قاعدة البيانات بنجاح!             ║`);
      console.log(`║  ✔️ تمت إضافة ${missingColumns.length} أعمدة            ║`);
      console.log('╚════════════════════════════════════════════════╝\n');

      return {
        success: true,
        added: missingColumns.length,
        columns: missingColumns.map(c => c.name)
      };
    } catch (error) {
      console.error('\n❌ خطأ في عملية الـ migration:', error);
      throw error;
    }
  }
}

/**
 * تشغيل الـ migration
 */
async function runMigration() {
  const migration = new DatabaseMigration();

  try {
    await migration.open();
    const result = await migration.migrate();
    await migration.close();

    if (result.success) {
      console.log('✅ انتهت عملية الـ migration بنجاح!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ فشلت عملية الـ migration:', error);
    await migration.close();
    process.exit(1);
  }
}

// تشغيل إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runMigration();
}

module.exports = DatabaseMigration;
