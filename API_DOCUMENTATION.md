# توثيق API كاملة - Complete API Documentation

## نظام إدارة الطلبات - Order Management System

---

## 📌 معلومات عامة

**Base URL:** `http://localhost:3000/api/orders`

**Content-Type:** `application/json`

**Language:** Arabic (RTL)

**Database:** SQLite (orders.db)

---

## 🔐 الأمان والصحة

> ⚠️ **تنبيه:** في الإنتاج، أضف:
> - Authentication و Authorization
> - HTTPS instead of HTTP
> - Rate Limiting
> - Input Validation
> - CORS Configuration

---

## 📚 API Endpoints

### 1️⃣ الحصول على جميع الطلبات

**Endpoint:**
```
GET /api/orders
```

**Parameters (اختياري):**
| Parameter | Type | Default | وصف |
|-----------|------|---------|-----|
| `status` | string | - | تصفية حسب الحالة |
| `limit` | number | 50 | عدد النتائج |
| `offset` | number | 0 | الإزاحة (pagination) |
| `sort` | string | created_at | ترتيب حسب |
| `order` | string | DESC | ASC أو DESC |

**الحالات المقبولة:**
- `pending` - في الانتظار
- `processing` - قيد التجهيز
- `shipped` - تم الشحن
- `completed` - مكتمل
- `cancelled` - ملغي

**أمثلة:**
```bash
# جيب جميع الطلبات
GET /api/orders

# الطلبات المعلقة فقط
GET /api/orders?status=pending

# الطلبات المكتملة مع أعلى أسعار أولاً
GET /api/orders?status=completed&sort=total&order=DESC&limit=20

# الطلبات من 10 إلى 20
GET /api/orders?limit=10&offset=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-12345678-ABCD",
      "customer_name": "أحمد محمد",
      "customer_email": "ahmed@email.com",
      "customer_phone": "+965-98765432",
      "customer_address": "شارع المدينة 123",
      "customer_city": "الكويت",
      "customer_district": "الجابرية",
      "subtotal": 31.000,
      "shipping_cost": 0,
      "total": 31.000,
      "status": "pending",
      "notes": "تسليم في الصباح",
      "created_at": "2024-03-22T10:30:45.000Z",
      "updated_at": "2024-03-22T10:30:45.000Z",
      "shipped_at": null,
      "completed_at": null
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "totalPages": 1
  }
}
```

---

### 2️⃣ الحصول على طلب واحد بـ ID

**Endpoint:**
```
GET /api/orders/:id
```

**Parameters:**
- `id` (required) - معرف الطلب

**مثال:**
```bash
GET /api/orders/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-12345678-ABCD",
    "customer_name": "أحمد محمد",
    "customer_email": "ahmed@email.com",
    "customer_phone": "+965-98765432",
    "customer_address": "شارع المدينة 123",
    "customer_city": "الكويت",
    "customer_district": "الجابرية",
    "subtotal": 31.000,
    "shipping_cost": 0,
    "total": 31.000,
    "status": "pending",
    "notes": "تسليم في الصباح",
    "created_at": "2024-03-22T10:30:45.000Z",
    "updated_at": "2024-03-22T10:30:45.000Z",
    "shipped_at": null,
    "completed_at": null,
    "items": [
      {
        "id": 1,
        "order_id": 1,
        "product_id": "prod_123",
        "product_name": "كتاب تعليمي",
        "product_price": 15.500,
        "quantity": 2,
        "subtotal": 31.000
      }
    ]
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "الطلب غير موجود"
}
```

---

### 3️⃣ تتبع الطلب برقمه

**Endpoint:**
```
GET /api/orders/track/:orderNumber
```

**Parameters:**
- `orderNumber` (required) - رقم الطلب (مثال: ORD-12345678-ABCD)

**مثال:**
```bash
GET /api/orders/track/ORD-12345678-ABCD
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-12345678-ABCD",
    "customer_name": "أحمد محمد",
    "customer_email": "ahmed@email.com",
    "customer_phone": "+965-98765432",
    "customer_address": "شارع المدينة 123",
    "customer_city": "الكويت",
    "customer_district": "الجابرية",
    "subtotal": 31.000,
    "shipping_cost": 0,
    "total": 31.000,
    "status": "shipped",
    "notes": "تسليم في الصباح",
    "created_at": "2024-03-22T10:30:45.000Z",
    "updated_at": "2024-03-22T11:00:00.000Z",
    "shipped_at": "2024-03-22T11:00:00.000Z",
    "completed_at": null,
    "items": [
      {
        "id": 1,
        "order_id": 1,
        "product_id": "prod_123",
        "product_name": "كتاب تعليمي",
        "product_price": 15.500,
        "quantity": 2,
        "subtotal": 31.000
      }
    ],
    "statusLabel": "تم الشحن",
    "statusColor": "#8b5cf6"
  }
}
```

---

### 4️⃣ إنشاء طلب جديد

**Endpoint:**
```
POST /api/orders
```

**Request Body:**
```json
{
  "customerName": "أحمد محمد",
  "customerEmail": "ahmed@email.com",
  "customerPhone": "+965-98765432",
  "customerAddress": "شارع المدينة 123",
  "customerCity": "الكويت",
  "customerDistrict": "الجابرية",
  "items": [
    {
      "name": "كتاب تعليمي",
      "price": 15.500,
      "quantity": 2,
      "productId": "prod_123"
    },
    {
      "name": "قلم ملون",
      "price": 2.500,
      "quantity": 1,
      "productId": "prod_124"
    }
  ],
  "notes": "تسليم في الصباح"
}
```

**المتطلبات (Required):**
- ✅ `customerName` - اسم العميل (string)
- ✅ `customerEmail` - بريد إلكتروني صحيح (email)
- ✅ `customerPhone` - رقم هاتف كويتي صحيح (phone)
- ✅ `customerAddress` - عنوان التسليم (string)
- ✅ `items` - مصفوفة المنتجات (array)

**المتطلبات في كل منتج:**
- ✅ `name` - اسم المنتج
- ✅ `price` - السعر (رقم عشري)
- ✅ `quantity` - الكمية (رقم صحيح)

**الاختياري:**
- `productId` - معرف المنتج (سيتم توليده تلقائياً إن لم يُحدد)
- `customerCity` - المحافظة (افتراضي: الكويت)
- `customerDistrict` - المنطقة
- `notes` - ملاحظات إضافية

**Response (201 Created):**
```json
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "id": 2,
    "order_number": "ORD-87654321-DCBA",
    "customer_name": "أحمد محمد",
    "customer_email": "ahmed@email.com",
    "customer_phone": "+965-98765432",
    "customer_address": "شارع المدينة 123",
    "customer_city": "الكويت",
    "customer_district": "الجابرية",
    "subtotal": 33.000,
    "shipping_cost": 0,
    "total": 33.000,
    "status": "pending",
    "notes": "تسليم في الصباح",
    "created_at": "2024-03-22T12:00:00.000Z",
    "updated_at": "2024-03-22T12:00:00.000Z",
    "items": [
      {
        "id": 1,
        "order_id": 2,
        "product_id": "prod_123",
        "product_name": "كتاب تعليمي",
        "product_price": 15.500,
        "quantity": 2,
        "subtotal": 31.000
      },
      {
        "id": 2,
        "order_id": 2,
        "product_id": "prod_124",
        "product_name": "قلم ملون",
        "product_price": 2.500,
        "quantity": 1,
        "subtotal": 2.000
      }
    ]
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "البريد الإلكتروني غير صحيح"
}
```

---

### 5️⃣ تحديث الطلب

**Endpoint:**
```
PUT /api/orders/:id
```

**Parameters:**
- `id` (required) - معرف الطلب

**Request Body (جميع الحقول اختيارية):**
```json
{
  "status": "processing",
  "notes": "تم البدء في الإعداد",
  "customerPhone": "+965-98765433",
  "customerEmail": "newemail@email.com",
  "customerAddress": "عنوان جديد"
}
```

**الحقول المقبولة:**
- `status` - تحديث حالة الطلب (pending, processing, shipped, completed, cancelled)
- `notes` - تحديث الملاحظات
- `customerPhone` - تحديث الهاتف
- `customerEmail` - تحديث البريد
- `customerAddress` - تحديث العنوان

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم تحديث الطلب بنجاح",
  "data": {
    "id": 1,
    "order_number": "ORD-12345678-ABCD",
    "customer_name": "أحمد محمد",
    "customer_email": "newemail@email.com",
    "customer_phone": "+965-98765433",
    "customer_address": "عنوان جديد",
    "customer_city": "الكويت",
    "customer_district": "الجابرية",
    "subtotal": 31.000,
    "shipping_cost": 0,
    "total": 31.000,
    "status": "processing",
    "notes": "تم البدء في الإعداد",
    "created_at": "2024-03-22T10:30:45.000Z",
    "updated_at": "2024-03-22T12:30:00.000Z",
    "shipped_at": null,
    "completed_at": null,
    "items": []
  }
}
```

---

### 6️⃣ حذف الطلب

**Endpoint:**
```
DELETE /api/orders/:id
```

**Parameters:**
- `id` (required) - معرف الطلب

**مثال:**
```bash
DELETE /api/orders/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم حذف الطلب بنجاح",
  "data": {
    "deletedOrderNumber": "ORD-12345678-ABCD",
    "deletedOrderId": 1
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "الطلب غير موجود"
}
```

---

### 7️⃣ الإحصائيات والملخص

**Endpoint:**
```
GET /api/orders/stats/summary
```

**Response (200 OK):**
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
    "totalRevenue": 1234.500,
    "averageOrderValue": 29.393
  }
}
```

---

## 🧪 أمثلة عملية

### باستخدام cURL

```bash
# إنشاء طلب جديد
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "أحمد",
    "customerEmail": "ahmed@email.com",
    "customerPhone": "+965-98765432",
    "customerAddress": "شارع المدينة",
    "items": [
      {
        "name": "كتاب",
        "price": 15.5,
        "quantity": 2
      }
    ]
  }'

# تحديث الطلب
curl -X PUT http://localhost:3000/api/orders/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing",
    "notes": "جاري التجهيز"
  }'

# الحصول على الطلب
curl -X GET http://localhost:3000/api/orders/1

# حذف الطلب
curl -X DELETE http://localhost:3000/api/orders/1
```

---

### باستخدام JavaScript (Fetch API)

```javascript
// إنشاء طلب جديد
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerName: 'أحمد',
    customerEmail: 'ahmed@email.com',
    customerPhone: '+965-98765432',
    customerAddress: 'شارع المدينة',
    items: [
      { name: 'كتاب', price: 15.5, quantity: 2 }
    ]
  })
});

const data = await response.json();
console.log(data);
```

---

### باستخدام Python

```python
import requests
import json

# إنشاء طلب جديد
url = 'http://localhost:3000/api/orders'
headers = {'Content-Type': 'application/json'}
payload = {
    'customerName': 'أحمد',
    'customerEmail': 'ahmed@email.com',
    'customerPhone': '+965-98765432',
    'customerAddress': 'شارع المدينة',
    'items': [
        {'name': 'كتاب', 'price': 15.5, 'quantity': 2}
    ]
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

---

## ⚠️ رموز الأخطاء

| Code | Message | السبب |
|------|---------|-------|
| 200 | OK | الطلب نجح |
| 201 | Created | تم إنشاء الموارد بنجاح |
| 400 | Bad Request | بيانات مفقودة أو غير صحيحة |
| 404 | Not Found | الطلب غير موجود |
| 500 | Server Error | خطأ في الخادم |

---

## 🔄 معايير الحالات الانتقالية

```
pending (في الانتظار)
   ↓
processing (قيد التجهيز)
   ↓
shipped (تم الشحن)
   ↓
completed (مكتمل)

[أو] → cancelled (ملغي)
```

---

## 💡 نصائح

1. **دائماً تحقق من `success` في الرد**
2. **استخدم `limit` و `offset` للـ pagination**
3. **احفظ `order_number` للعميل**
4. **استخدم `/track/:orderNumber` من جهة العميل**
5. **نسخ احتياطية منتظمة من `orders.db`**

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تأكد من تشغيل الخادم على البورت 3000
2. تحقق من تركيب npm install
3. افحص ملفات السجل (console logs)

---

**آخر تحديث:** 2024-03-22
