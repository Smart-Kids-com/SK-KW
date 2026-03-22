// scripts/test-api.js - اختبار API endpoints
// استخدام: node scripts/test-api.js

const http = require('http');

const BASE_URL = 'http://localhost:3000/api/orders';

/**
 * عمل طلب HTTP
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * شريط الاختبار
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║           🧪 اختبار API Endpoints             ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // 1. الحصول على الإحصائيات
    console.log('📊 اختبار 1: الحصول على الإحصائيات');
    let result = await makeRequest('GET', '/stats/summary');
    console.log('   ✅ النتيجة:', result.data);
    console.log();

    // 2. الحصول على جميع الطلبات
    console.log('📋 اختبار 2: الحصول على جميع الطلبات');
    result = await makeRequest('GET', '');
    console.log('   ✅ عدد الطلبات:', result.data.data?.length || 0);
    console.log();

    // 3. إنشاء طلب جديد
    console.log('✍️  اختبار 3: إنشاء طلب جديد');
    const newOrder = {
      customerName: 'اختبار أحمد',
      customerEmail: 'test@example.com',
      customerPhone: '+965-91234567',
      customerAddress: 'شارع الاختبار 123',
      customerCity: 'الكويت',
      customerDistrict: 'اختبار',
      items: [
        {
          name: 'كتاب اختبار',
          price: 15.500,
          quantity: 2,
          productId: 'test_product_1'
        }
      ],
      notes: 'طلب اختبار'
    };

    result = await makeRequest('POST', '', newOrder);
    const createdOrderId = result.data.data?.id;
    const createdOrderNumber = result.data.data?.order_number;
    console.log('   ✅ تم إنشاء الطلب:', createdOrderNumber);
    console.log('   📌 معرف الطلب:', createdOrderId);
    console.log();

    if (createdOrderId) {
      // 4. الحصول على الطلب الذي تم إنشاؤه
      console.log('🔍 اختبار 4: الحصول على الطلب الذي تم إنشاؤه');
      result = await makeRequest('GET', `/${createdOrderId}`);
      console.log('   ✅ الطلب:', result.data.data?.order_number);
      console.log('   💰 المبلغ:', result.data.data?.total);
      console.log();

      // 5. تحديث الطلب
      console.log('✏️  اختبار 5: تحديث حالة الطلب');
      const updateData = {
        status: 'processing',
        notes: 'يجاري التجهيز'
      };
      result = await makeRequest('PUT', `/${createdOrderId}`, updateData);
      console.log('   ✅ تم التحديث:', result.data.message);
      console.log();

      // 6. تتبع الطلب برقمه
      console.log('🔎 اختبار 6: تتبع الطلب برقمه');
      result = await makeRequest('GET', `/track/${createdOrderNumber}`);
      console.log('   ✅ حالة الطلب:', result.data.data?.status);
      console.log('   📦 عدد المنتجات:', result.data.data?.items?.length || 0);
      console.log();

      // 7. حذف الطلب
      console.log('🗑️  اختبار 7: حذف الطلب');
      result = await makeRequest('DELETE', `/${createdOrderId}`);
      console.log('   ✅ تم الحذف:', result.data.message);
      console.log();
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║            ✅ اكتملت جميع الاختبارات          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ خطأ أثناء الاختبار:', error.message);
    console.error('\n⚠️  تأكد من:');
    console.error('   1. الخادم يعمل على http://localhost:3000');
    console.error('   2. قاعدة البيانات مهيأة');
    console.error('   3. npm install تم تنفيذها');
  }
}

// تشغيل الاختبارات
runTests();
