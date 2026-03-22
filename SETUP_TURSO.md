# إعداد Turso لبيئة الإنتاج على Vercel

## الخطوات:

### 1. إنشاء حساب Turso
```bash
# زيارة https://turso.tech/
# إنشاء حساب مجاني
```

### 2. إنشاء قاعدة بيانات جديدة
```bash
# تثبيت Turso CLI
npm install -g @turso/cli

# تسجيل الدخول
turso auth signup  # أو turso auth login

# إنشاء قاعدة بيانات جديدة
turso db create smartkids-prod

# الحصول على connection string
turso db show smartkids-prod --url
turso db tokens create smartkids-prod
```

### 3. إضافة متغيرات البيئة إلى Vercel

في Vercel dashboard:
1. Project Settings → Environment Variables
2. أضف هذين المتغيرين:

```
DATABASE_URL=<البديل من turso db show --url>
DATABASE_AUTH_TOKEN=<البديل من turso db tokens create>
```

### 4. نسخ البيانات من SQLite محليًا (اختياري)
```bash
# إذا كنت تريد نقل البيانات الموجودة:
turso db shell smartkids-prod < orders_dump.sql
```

### 5. نشر الكود إلى Vercel
```bash
git add package.json server.js db/turso-manager.js
git commit -m "Add Turso database support for production"
git push origin main
```

Vercel ستقوم تلقائيًا بـ redeploy مع variables الجديدة.

## الخيارات الأخرى:

### Neon (PostgreSQL)
```
DATABASE_URL=postgresql://user:pass@host/dbname
```

### Supabase (PostgreSQL)
```
DATABASE_URL=postgresql://...
```

## ملاحظات:

- ✅ SQLite يبقى يعمل محليًا (بدون DATABASE_URL)
- ✅ Turso يستخدم SQLite syntax (نفس الـ queries)
- ✅ الـ migrations تحدث تلقائيًا عند التشغيل الأول
- ⚠️ احذر من مشاركة DATABASE_AUTH_TOKEN

## اختبار الاتصال:

```bash
# محليًا:
npm start

# سيستخدم SQLite من orders.db

# على Vercel:
# ستكون DATABASE_URL موجودة
# سيستخدم Turso تلقائيًا
```
