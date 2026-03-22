# دليل التثبيت والتشغيل - Setup & Running Guide

## 🎯 نظام إدارة الطلبات المتقدم - Smart Kids Kuwait

نظام متكامل لإدارة الطلبات والمبيعات باستخدام Node.js و SQLite مع واجهة قوية وعربية كاملة.

---

## 📋 المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- **Node.js** (الإصدار 14 أو أحدث) - [تحميل](https://nodejs.org)
- **npm** (يأتي مع Node.js)

للتحقق من التثبيت:
```bash
node --version
npm --version
```

---

## 🚀 خطوات التثبيت والتشغيل

### 1️⃣ تثبيت المكتبات المطلوبة

افتح Terminal في مجلد المشروع واكتب:

```bash
npm install
```

هذا سيثبت جميع المكتبات المطلوبة:
- `express` - إطار العمل الرئيسي
- `sqlite3` - قاعدة البيانات
- `body-parser` - معالجة البيانات
- `cors` - السماح بالطلبات من نطاقات مختلفة
- `dotenv` - إدارة متغيرات البيئة

### 2️⃣ إنشاء ملف البيئة

انسخ `.env.example` إلى `.env`:

```bash
# على Windows (PowerShell)
copy .env.example .env

# أو على Mac/Linux
cp .env.example .env
```

تحقق من محتوى `.env` وعدلها حسب احتياجك.

### 3️⃣ تشغيل الخادم

**الطريقة الأولى - الطريقة الموصى بها (مع Express):**

```bash
npm start
```

أو:

```bash
node server-api.js
```

**الطريقة الثانية - الخادم البسيط (بدون API):**

```bash
npm run dev
```

أو:

```bash
node simple-server.js
```

### 4️⃣ الوصول إلى التطبيق

عند ظهور رسالة النجاح، افتح المتصفح وادخل:

```
http://localhost:3000
```

---

## 🌐 الروابط الرئيسية

بعد التشغيل، ستتمكن من الوصول إلى:

| الرابط | الوصف |
|--------|--------|
| `http://localhost:3000/` | الصفحة الرئيسية |
| `http://localhost:3000/cart` | سلة المشتريات |
| `http://localhost:3000/checkout` | الدفع والطلب |
| `http://localhost:3000/admin` | لوحة الإدارة الأساسية |
| `http://localhost:3000/admin-enhanced` | لوحة الإدارة المتقدمة ⭐ |
| `http://localhost:3000/track` | تتبع الطلبات |

---

## 🔌 API Endpoints

يمكنك استخدام Postman أو أي أداة API لاختبار الـ endpoints:

### الطلبات (Orders)

#### 1. الحصول على جميع الطلبات
```
GET /api/orders
```

**Parameters (Optional):**
- `status` - تصفية حسب الحالة (pending, processing, shipped, completed, cancelled)
- `limit` - عدد الطلبات (افتراضي: 50)
- `offset` - الإزاحة (افتراضي: 0)
- `sort` - الترتيب حسب (افتراضي: created_at)
- `order` - الاتجاه (ASC أو DESC)

**مثال:**
```
GET /api/orders?status=pending&limit=10&sort=total&order=DESC
```

#### 2. الحصول على طلب واحد
```
GET /api/orders/:id
```

**مثال:**
```
GET /api/orders/1
```

#### 3. تتبع الطلب برقمه
```
GET /api/orders/track/:orderNumber
```

**مثال:**
```
GET /api/orders/track/ORD-12345678-XXXX
```

#### 4. إنشاء طلب جديد
```
POST /api/orders
Content-Type: application/json

{
  "customerName": "أحمد محمد",
  "customerEmail": "ahmed@email.com",
  "customerPhone": "+965-98765432",
  "customerAddress": "شارع المدينة 123",
  "customerCity": "الكويت",
  "customerDistrict": "الجابرية",
  "items": [
    {
      "name": "اسم المنتج",
      "price": 15.500,
      "quantity": 2,
      "productId": "product_12345"
    }
  ],
  "notes": "ملاحظات إضافية"
}
```

**الرد الناجح (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "id": 1,
    "order_number": "ORD-12345678-XXXX",
    "customer_name": "أحمد محمد",
    ...
  }
}
```

#### 5. تحديث الطلب
```
PUT /api/orders/:id
Content-Type: application/json

{
  "status": "processing",
  "notes": "تم البدء في إعداد الطلب",
  "customerPhone": "+965-98765433",
  "customerEmail": "newemail@email.com",
  "customerAddress": "عنوان جديد"
}
```

#### 6. حذف الطلب
```
DELETE /api/orders/:id
```

#### 7. الإحصائيات
```
GET /api/orders/stats/summary
```

**الرد:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 42,
    "ordersByStatus": {
      "pending": 5,
      "processing": 3,
      "shipped": 2,
      "completed": 30,
      "cancelled": 2
    },
    "totalRevenue": 1250.500,
    "averageOrderValue": 29.773
  }
}
```

---

## 🛡️ معلومات قاعدة البيانات

### الملف الرئيسي
```
orders.db
```

### الجداول

**📌 جدول orders (الطلبات)**
```sql
- id: رقم تعريفي فريد
- order_number: رقم الطلب (مثال: ORD-12345678-XXXX)
- customer_name: اسم العميل
- customer_email: البريد الإلكتروني
- customer_phone: رقم الهاتف
- customer_address: العنوان
- customer_city: المحافظة
- customer_district: المنطقة
- subtotal: الإجمالي الجزئي
- shipping_cost: تكلفة الشحن
- total: الإجمالي الكلي
- status: حالة الطلب
- notes: ملاحظات
- created_at: تاريخ الإنشاء
- updated_at: تاريخ التحديث
- shipped_at: تاريخ الشحن
- completed_at: تاريخ الاكتمال
```

**📌 جدول order_items (عناصر الطلب)**
```sql
- id: رقم تعريفي فريد
- order_id: معرف الطلب (الارتباط)
- product_id: معرف المنتج
- product_name: اسم المنتج
- product_price: سعر المنتج
- quantity: الكمية
- subtotal: الإجمالي (السعر × الكمية)
```

---

## 💾 نسخ احتياطية لقاعدة البيانات

للقيام بنسخة احتياطية من قاعدة البيانات:

```bash
# انسخ الملف orders.db إلى مكان آمن
copy orders.db orders_backup_2024-03-22.db
```

---

## 🔧 استكشاف الأخطاء

### ❌ الخطأ: "port 3000 already in use"
**الحل:** غير المنفذ في ملف `.env`:
```
PORT=3001
```

### ❌ الخطأ: "sqlite3 module not found"
**الحل:** أعد تثبيت المكتبات:
```bash
npm install --save sqlite3
```

### ❌ الخطأ: "EACCES: permission denied"
**الحل:** على Mac/Linux، استخدم `sudo`:
```bash
sudo npm start
```

### ❌ الخطأ: "Cannot find module 'dotenv'"
**الحل:**
```bash
npm install dotenv
```

---

## 📊 لوحة الإدارة المتقدمة

تتميز اللوحة بـ:

✅ عرض جميع الطلبات مع الإحصائيات
✅ البحث والتصفية المتقدمة
✅ إضافة طلبات جديدة
✅ تحديث حالة الطلبات
✅ عرض تفاصيل الطلب كاملة
✅ حذف الطلبات
✅ تصدير البيانات إلى CSV
✅ تحديث تلقائي كل 30 ثانية

---

## 🔍 تتبع الطلبات

صفحة تتبع آمنة وسهلة الاستخدام:

✅ ادخل رقم الطلب
✅ عرض حالة الطلب بـ Timeline مرئي
✅ معلومات العميل والمنتجات
✅ ملخص الفاتورة

---

## 📱 الدعم على الأجهزة المختلفة

جميع الصفحات متوافقة مع:
- 💻 أجهزة الكمبيوتر (Desktop)
- 📱 الهواتف الذكية (Mobile)
- 📲 الأجهزة اللوحية (Tablet)

---

## 🌍 الإعدادات الدولية

النظام مهيأ لـ:
- 🇰🇼 الكويت (العملة: دينار كويتي)
- 🇸🇦 السعودية
- 🇦🇪 الإمارات
- وباقي دول الخليج

---

## 📝 ملاحظات مهمة

1. **الأمان**: لا تشغل الخادم في بيئة الإنتاج بدون تفاصيل الأمان الكاملة
2. **النسخ الاحتياطية**: نسخ احتياطك لـ `orders.db` بانتظام
3. **الأداء**: استخدم CDN للملفات الثابتة في الإنتاج
4. **الترقيات**: تابع التحديثات الأمنية للمكتبات

---

## 🎓 الدعم والمساعدة

في حالة المشاكل:
1. تحقق من ملف السجلات (console output)
2. تأكد من تثبيت Node.js بشكل صحيح
3. أعد تشغيل الخادم
4. افسح الملفات المؤقتة وأعد التثبيت

---

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License

---

**🎉 بريكك! النظام جاهز للاستخدام**

لأي استفسارات: info@smartkids.com.kw
