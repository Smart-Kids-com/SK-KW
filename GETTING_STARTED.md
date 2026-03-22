# 🚀 البدء السريع - Quick Start

## نظام إدارة الطلبات - Smart Kids Kuwait

---

## ⚡ البدء في 3 خطوات فقط

### 1️⃣ تثبيت المكتبات

قم بفتح Terminal/PowerShell في مجلد المشروع واكتب:

```bash
npm install
```

### 2️⃣ بدء الخادم

```bash
npm start
```

### 3️⃣ افتح المتصفح

ادخل أحد الروابط:

- **لوحة الإدارة**: http://localhost:3000/admin-enhanced
- **تتبع الطلب**: http://localhost:3000/track
- **الصفحة الرئيسية**: http://localhost:3000

---

## 📚 ملفات مهمة

| الملف | الوصف |
|------|--------|
| `SETUP_AND_RUN.md` | شرح مفصل للتثبيت والتشغيل |
| `API_DOCUMENTATION.md` | توثيق API كاملة |
| `COMPLETION_SUMMARY.md` | ملخص ما تم إنجازه |
| `db/init.js` | إدارة قاعدة البيانات |
| `routes/orders.js` | API endpoints |
| `server.js` | الخادم الرئيسي |

---

## 🎯 ما الذي يمكنك فعله؟

### لوحة الإدارة (Admin Panel)
✅ عرض جميع الطلبات
✅ إضافة طلب جديد
✅ تحديث حالة الطلب
✅ تعديل بيانات العميل
✅ حذف الطلب
✅ تصدير CSV
✅ إحصائيات حية

### صفحة التتبع (Track Page)
✅ ادخل رقم الطلب
✅ عرض حالة الطلب
✅ معلومات العميل والمنتجات

### API Endpoints
```
GET    /api/orders              - جميع الطلبات
GET    /api/orders/:id          - طلب واحد
POST   /api/orders              - إنشاء طلب
PUT    /api/orders/:id          - تحديث الطلب
DELETE /api/orders/:id          - حذف الطلب
```

---

## 🆘 في حالة المشاكل

### الخطأ: "port 3000 already in use"
غير المنفذ في ملف `.env`:
```
PORT=3001
```

### الخطأ: "npm: command not found"
تأكد من تثبيت Node.js من: https://nodejs.org

### الكل شغال تمام؟
ابدأ باستكشاف الـ API:
```bash
node scripts/test-api.js
```

---

## 📞 المساعدة

📖 للمزيد من المعلومات، اقرأ: `SETUP_AND_RUN.md`

🔌 لتفاصيل API: `API_DOCUMENTATION.md`

---

**🎉 مبروك! النظام جاهز للاستخدام!**

🚀 ابدأ الآن بـ: `npm start`
