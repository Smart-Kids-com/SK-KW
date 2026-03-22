# 🏗️ معمارية النظام - System Architecture

## نظام إدارة الطلبات المتقدم

---

## 📐 البنية الكلية

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 المتصفح (Browser)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. لوحة الإدارة (admin-enhanced.html)                   │  │
│  │  2. صفحة التتبع (track.html)                              │  │
│  │  3. صفحات أخرى (cart, checkout, etc)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕️ HTTP/AJAX
┌─────────────────────────────────────────────────────────────────┐
│                  🖥️ خادم Node.js (server.js)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Express.js                                               │  │
│  │ ├─ Routes: /api/orders                                   │  │
│  │ ├─ Middleware: CORS, bodyParser                          │  │
│  │ └─ Static Files: /public                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕️                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes Handler (routes/orders.js)                        │  │
│  │ ├─ GET    /api/orders (List)                             │  │
│  │ ├─ GET    /api/orders/:id (Read)                         │  │
│  │ ├─ POST   /api/orders (Create)                           │  │
│  │ ├─ PUT    /api/orders/:id (Update)                       │  │
│  │ ├─ DELETE /api/orders/:id (Delete)                       │  │
│  │ ├─ GET    /api/orders/track/:orderNumber (Track)         │  │
│  │ └─ GET    /api/orders/stats/summary (Statistics)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕️                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Database Manager (db/init.js)                            │  │
│  │ ├─ open()                                                │  │
│  │ ├─ initializeTables()                                    │  │
│  │ ├─ run() - INSERT/UPDATE/DELETE                          │  │
│  │ ├─ get() - SELECT one                                    │  │
│  │ ├─ all() - SELECT all                                    │  │
│  │ └─ transaction() - Multi-query                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕️ SQL
┌─────────────────────────────────────────────────────────────────┐
│                    💾 قاعدة البيانات SQLite                     │
│                        (orders.db)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Table: orders                                            │  │
│  │ ├─ id (PRIMARY KEY)                                      │  │
│  │ ├─ order_number (UNIQUE)                                 │  │
│  │ ├─ customer_* (name, email, phone, address)              │  │
│  │ ├─ subtotal, shipping_cost, total                        │  │
│  │ ├─ status (pending/processing/shipped/completed)         │  │
│  │ ├─ notes                                                 │  │
│  │ └─ timestamps (created_at, updated_at, etc)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Table: order_items                                       │  │
│  │ ├─ id (PRIMARY KEY)                                      │  │
│  │ ├─ order_id (FOREIGN KEY)                                │  │
│  │ ├─ product_* (id, name, price)                           │  │
│  │ ├─ quantity                                              │  │
│  │ └─ subtotal                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 هيكل المجلدات

```
SK-KW/
│
├── 📁 db/
│   └── init.js                    # مدير قاعدة البيانات
│
├── 📁 routes/
│   └── orders.js                  # API endpoints
│
├── 📁 public/
│   ├── index.html                 # الصفحة الرئيسية
│   ├── admin.html                 # لوحة إدارة أساسية
│   ├── admin-enhanced.html        # لوحة إدارة متقدمة ⭐
│   ├── track.html                 # صفحة التتبع ⭐
│   ├── cart.html                  # سلة المشتريات
│   ├── checkout.html              # الدفع
│   └── ... (صفحات أخرى)
│
├── 📁 config/
│   └── system.js                  # إعدادات النظام والـ helpers
│
├── 📁 scripts/
│   └── test-api.js                # اختبار API endpoints
│
├── 📝 server.js                   # الخادم الرئيسي ⭐
├── 📝 package.json                # المكتبات والـ scripts ⭐
├── 📝 orders.db                   # قاعدة البيانات ⭐
│
├── 📖 GETTING_STARTED.md          # البدء السريع
├── 📖 SETUP_AND_RUN.md            # دليل التثبيت المفصل
├── 📖 API_DOCUMENTATION.md        # توثيق API
├── 📖 COMPLETION_SUMMARY.md       # ملخص الإنجاز
│
└── 🚀 start-system-windows.bat    # تشغيل سريع على Windows
   🚀 start-system.sh              # تشغيل سريع على Mac/Linux
```

---

## 🔄 تدفق الطلب (Request Flow)

### 1️⃣ **إنشاء طلب جديد**

```
1. المستخدم يملأ نموذج الطلب
   ↓
2. JavaScript يرسل POST /api/orders
   ↓
3. server.js يستقبل الطلب
   ↓
4. routes/orders.js يتحقق من البيانات
   ↓
5. db/init.js ينشئ Record في orders table
   ↓
6. db/init.js ينشئ Records في order_items table
   ↓
7. النظام يرد برقم الطلب الجديد ORD-XXXX-XXXX
   ↓
8. الللواجهة تعرض رسالة النجاح
```

### 2️⃣ **عرض الطلبات**

```
1. المستخدم يفتح لوحة الإدارة
   ↓
2. JavaScript يرسل GET /api/orders?status=pending
   ↓
3. server.js يستقبل الطلب
   ↓
4. routes/orders.js يبني استعلام SQL
   ↓
5. db/init.js ينفذ الاستعلام على SQLite
   ↓
6. النتائج ترجع إلى الـ routes
   ↓
7. JSON response يعود للواجهة
   ↓
8. الجدول يتحدث مع البيانات الجديدة
```

### 3️⃣ **تحديث حالة الطلب**

```
1. المسؤول ينقر "تحديث الحالة"
   ↓
2. JavaScript يرسل PUT /api/orders/1 {status: 'processing'}
   ↓
3. route handler يتحقق من الحالة الجديدة
   ↓
4. db/init.js ينفذ UPDATE على الـ database
   ↓
5. إذا كانت shipped: إضافة shipped_at timestamp
   ↓
6. إذا كانت completed: إضافة completed_at timestamp
   ↓
7. الرد مع البيانات المحدثة
   ↓
8. الواجهة تحديث الصف في الجدول
```

### 4️⃣ **تتبع الطلب**

```
1. العميل يدخل رقم الطلب ORD-XXXX
   ↓
2. JavaScript يرسل GET /api/orders/track/ORD-XXXX
   ↓
3. db/init.js يبحث عن الطلب برقمه
   ↓
4. يجلب الطلب مع جميع عناصره
   ↓
5. يرد مع statusLabel و statusColor
   ↓
6. الصفحة تعرض Timeline حسب الحالة
   ↓
7. العميل يرى: الحالة الحالية + التاريخ + المنتجات
```

---

## 🎯 حالات الطلب (Order States)

```
┌─────────────────────────────────────────┐
│            🎯 حالات الطلب               │
└─────────────────────────────────────────┘
         │
    ┌────▼────┐
    │ pending  │  ⏳ في الانتظار
    └────┬────┘
         │
    ┌────▼────────────┐
    │ processing      │  ⚙️ قيد التجهيز
    └────┬────────────┘
         │
    ┌────▼────────┐
    │ shipped     │  📦 تم الشحن
    └────┬────────┘
         │
    ┌────▼─────────┐
    │ completed    │  ✅ مكتمل
    └──────────────┘

[أي وقت]
    │
    ▼
┌──────────────┐
│ cancelled   │  ❌ ملغي
└──────────────┘
```

---

## 📊 علاقات قاعدة البيانات

```
┌─────────────────────┐
│     ORDERS TABLE    │
│                     │
│ id (PK)             │
│ order_number (UQ)   │
│ customer_name       │
│ customer_email      │
│ customer_phone      │
│ customer_address    │
│ customer_city       │
│ customer_district   │
│ subtotal            │
│ shipping_cost       │
│ total               │
│ status              │
│ notes               │
│ created_at (IDX)    │
│ updated_at          │
│ shipped_at          │
│ completed_at        │
└─────────┬───────────┘
          │ 1
          │ (one-to-many)
          │ order_id (FK)
          │ many
┌─────────▼───────────────┐
│  ORDER_ITEMS TABLE      │
│                         │
│ id (PK)                 │
│ order_id (FK)           │
│ product_id              │
│ product_name            │
│ product_price           │
│ quantity                │
│ subtotal                │
└─────────────────────────┘
```

---

## 🔐 نقاط الأمان

```
Frontend (Browser)
├─ Input validation ✅
├─ Error handling ✅
└─ XSS prevention ✅
                  │
                  ▼ HTTPS (في production)
API Layer
├─ CORS validation ✅
├─ Input validation ✅
├─ Rate limiting (recommended) ⚠️
└─ Authentication (recommended) ⚠️
                  │
                  ▼
Database Layer
├─ Parameterized queries ✅
├─ SQL injection prevention ✅
├─ Data validation ✅
└─ Foreign keys ✅
```

---

## ⚡ الأداء

### Indexes المضافة:
```sql
CREATE INDEX idx_order_number ON orders(order_number)
CREATE INDEX idx_order_status ON orders(status)
CREATE INDEX idx_order_created_at ON orders(created_at)
CREATE INDEX idx_order_items_order_id ON order_items(order_id)
```

### Pagination:
```
Page size: حتى 50 طلب افتراضياً
Offset: دعم multi-page browsing
```

---

## 📈 الإحصائيات

```
GET /api/orders/stats/summary

Returns:
├─ totalOrders: عدد الطلبات الكلي
├─ ordersByStatus: توزيع حسب الحالة
├─ totalRevenue: إجمالي المبيعات
└─ averageOrderValue: متوسط قيمة الطلب
```

---

## 🚀 تسلسل التشغيل

```
1. npm install
   ├─ تحميل المكتبات
   └─ إنشاء node_modules
   
2. npm start
   ├─ تشغيل server.js
   ├─ فتح قاعدة البيانات
   ├─ تهيئة الجداول
   ├─ بدء Express server
   └─ الاستماع على port 3000

3. المستخدم يفتح http://localhost:3000
   ├─ تحميل الملفات الثابتة
   ├─ تحميل JavaScript
   └─ ربط مع API

4. النظام جاهز للاستخدام ✅
```

---

## 🔗 التكامل

```
┌──────────────┐
│   Frontend   │ (HTML/CSS/JS)
│  Components  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│   API Layer              │ (Express Routes)
│ ├─ POST /api/orders      │
│ ├─ PUT /api/orders/:id   │
│ └─ GET /api/orders/:id   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   Business Logic         │ (DB Manager)
│ ├─ Validation           │
│ ├─ Processing          │
│ └─ Error Handling      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   SQLite Database        │
│ ├─ orders.db           │
│ ├─ orders table        │
│ └─ order_items table   │
└──────────────────────────┘
```

---

## 📝 ملخص المعمارية

✅ **3-Tier Architecture**
- Frontend (HTML/CSS/JS)
- Backend (Express + SQLite)
- Database (SQLite)

✅ **RESTful API**
- 7 endpoints
- CRUD operations
- Statistics

✅ **Database**
- 2 tables
- Foreign keys
- Indexes

✅ **Security**
- Parameterized queries
- Input validation
- Error handling

✅ **Performance**
- Pagination
- Indexes
- Transactions

---

**🎉 معمارية قوية وقابلة للتطوير!**
