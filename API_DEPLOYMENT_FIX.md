# API Routing Fix for Vercel Deployment ✅

## المشكلة
عند فتح https://smartkidskw.com/api/orders كان يظهر الموقع الرئيسي (front-end) بدلاً من JSON، مما يدل على أن الـ API routes لم تكن موجهة بشكل صحيح على Vercel.

## السبب الجذري
1. **vercel.json** كانت تعامل المشروع كـ static site فقط (`outputDirectory: "public"`)
2. لا توجد configuration في Vercel لتوجيه `/api/*` requests إلى backend
3. لا وجود لـ serverless function entry point (`api/index.js`)

## الحل المطبق

### 1️⃣ إنشاء `api/index.js` (Serverless Function)
```
api/
  └── index.js          ← Express app serving as Vercel serverless function
```

**المميزات:**
- Express app يتم load مباشرة من قبل Vercel
- Database initialization مع error handling
- جميع API routes من routes/orders.js
- Health check endpoint: `/api/health`

### 2️⃣ تحديث `vercel.json`
**التغييرات الرئيسية:**
- أزلنا: `buildCommand` و `outputDirectory: "public"`
- أضفنا: `"framework": "nodejs"` و `"nodejs": "18.x"`
- أضفنا: `rewrites` لتوجيه `/api/**` → `/api` (serverless function)
- حدثنا: headers لـ API routes لضمان `Content-Type: application/json`

```json
"rewrites": [
  {
    "source": "/api/(.*)",
    "destination": "/api"
  }
]
```

### 3️⃣ تصحيح `routes/orders.js`
```javascript
// BEFORE: ❌ محاولة إدراج في أعمدة غير موجودة
(order_id, product_id, product_name, product_price, quantity, subtotal)

// AFTER: ✅ استخدام أسماء الأعمدة الصحيحة
(order_id, product_id, product_name, price, quantity)
```

## البنية الجديدة

```
smartkidskw.com/
├── api/
│   └── index.js              ← Serverless backend
├── public/
│   ├── index.html            ← Static frontend
│   ├── checkout.html
│   └── ... (static files)
├── routes/
│   └── orders.js             ← API routes (imported by api/index.js)
├── db/
│   ├── init.js
│   └── migrate.js
├── vercel.json               ← Updated routing config
└── orders.db                 ← SQLite database
```

## التوجيه على الإنتاج
- `/` → Public static files (index.html)
- `/api/orders` → Serverless function
- `/api/orders/stats/summary` → Serverless function
- `/api/orders/track/:orderNumber` → Serverless function
- `/checkout` → Static file (checkout.html)
- `/track` → Static file (track.html)

## النتيجة المتوقعة
✅ `https://smartkidskw.com/api/orders` يرجع JSON (API response)
✅ `https://smartkidskw.com/api/orders/stats/summary` يرجع JSON
✅ `https://smartkidskw.com/` يرجع front-end static site

## ملاحظات مهمة

### Database على Vercel
- `orders.db` موجود في الـ git repo وسيتم deploy معه
- ⚠️ Vercel يستخدم ephemeral filesystem - أي تغييرات في البيانات ستُفقد بعد re-deploy
- **الحل المستقبلي:** استخدام قاعدة بيانات سحابية (PostgreSQL/MongoDB)

### الاختبار المحلي
- `server.js` يبقى يعمل محليًا مع `npm start`
- `api/index.js` يمكن اختباره محليًا قبل الـ deploy

### الـ Build
- Vercel تكتشف `api/` folder تلقائيًا كـ serverless functions
- لا يوجد build command معقد - كل شيء جاهز للإنتاج

## الخطوات التالية
1. ✅ تم commit و push التغييرات
2. ⏳ Vercel سيقوم بـ redeploy تلقائيًا
3. 🔍 توقع 2-5 دقائق لانتهاء الـ deployment
4. ✅ اختبر: `https://smartkidskw.com/api/health`

---

**تاريخ التحديث:** 22-03-2026
**الملفات المعدلة:**
- ✅ `api/index.js` (جديد)
- ✅ `vercel.json`
- ✅ `routes/orders.js`
