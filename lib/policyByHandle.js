// lib/policyByHandle.js

/**
 * يوفّر الملف نسختين:
 * 1) محلي (Sync): نفس السلوك القديم للتوافق.
 * 2) Shopify (Async): يجلب السياسات من Storefront API + صفحة contact-information كـ Page.
 *
 * ملاحظة: الديفولت ما يزال الدوال المحلية للحفاظ على التوافق مع الصفحات القديمة.
 */

let fetchShopifyGraphQL = null;
try {
  // موجودة عندك في lib/shopify.js
  ({ fetchShopifyGraphQL } = require('@/lib/shopify'));
} catch {
  fetchShopifyGraphQL = null;
}

/* -----------------------------
   Normalization Helpers
------------------------------*/
function normalizePolicyHandle(input = '') {
  const h = String(input || '')
    .replace(/^\/+|\/+$/g, '') // trim slashes
    .toLowerCase();

  // إزالة بادئة policies/ لو وُجدت
  const clean = h.startsWith('policies/') ? h.slice('policies/'.length) : h;

  // بعض الاختصارات الشائعة
  if (['privacy', 'privacy-policy', 'policy-privacy'].includes(clean)) return 'privacy-policy';
  if (['refund', 'refund-policy', 'returns', 'return-policy'].includes(clean)) return 'refund-policy';
  if (['terms', 'tos', 'terms-of-service', 'terms-and-conditions'].includes(clean)) return 'terms-of-service';
  if (['shipping', 'shipping-policy', 'delivery'].includes(clean)) return 'shipping-policy';
  if (['contact', 'contact-information', 'contact-info'].includes(clean)) return 'contact-information';

  return clean;
}

/* -----------------------------
   Local (SYNC) fallback
------------------------------*/
const localPolicies = {
  'contact-information': {
    title: 'معلومات التواصل',
    content: `
      <h2>معلومات التواصل</h2>
      <p>للتواصل معنا يرجى استخدام الوسائل التالية:</p>
      <ul>
        <li>البريد الإلكتروني: info@smart-kids.me</li>
        <li>الهاتف: +965 600035393</li>
        <li>العنوان: الكويت</li>
      </ul>
    `,
  },
  'privacy-policy': {
    title: 'سياسة الخصوصية',
    content: `
      <h2>سياسة الخصوصية</h2>
      <p>نحن في Smart Kids Kuwait نحترم خصوصيتك ونلتزم بحماية معلوماتك الشخصية.</p>
      <h3>جمع المعلومات</h3>
      <p>نقوم بجمع المعلومات الضرورية فقط لتقديم خدماتنا.</p>
      <h3>استخدام المعلومات</h3>
      <p>نستخدم معلوماتك لمعالجة طلباتك وتحسين خدماتنا.</p>
    `,
  },
  'refund-policy': {
    title: 'سياسة الاسترجاع والاستبدال',
    content: `
      <h2>سياسة الاسترجاع والاستبدال</h2>
      <p>يمكنك إرجاع المنتجات خلال 14 يوماً من تاريخ الاستلام.</p>
      <h3>شروط الإرجاع</h3>
      <ul>
        <li>المنتج في حالته الأصلية</li>
        <li>عدم فتح المنتج أو استخدامه</li>
        <li>وجود إيصال الشراء</li>
      </ul>
    `,
  },
  'shipping-policy': {
    title: 'سياسة الشحن',
    content: `
      <h2>سياسة الشحن</h2>
      <p>نقوم بالشحن إلى جميع محافظات الكويت.</p>
      <h3>أوقات التسليم</h3>
      <ul>
        <li>داخل الكويت: 1-2 يوم عمل</li>
        <li>المناطق النائية: 2-3 أيام عمل</li>
      </ul>
      <h3>رسوم الشحن</h3>
      <p>الشحن مجاني للطلبات بقيمة 20 د.ك أو أكثر.</p>
    `,
  },
  'terms-of-service': {
    title: 'شروط الخدمة',
    content: `
      <h2>شروط الخدمة</h2>
      <p>باستخدام موقعنا، فإنك توافق على هذه الشروط والأحكام.</p>
      <h3>استخدام الموقع</h3>
      <p>يُسمح لك باستخدام الموقع للأغراض الشخصية والتجارية المشروعة.</p>
      <h3>المسؤولية</h3>
      <p>نسعى لتقديم معلومات دقيقة، لكننا لا نضمن خلو الموقع من الأخطاء.</p>
    `,
  },
};

// نفس توقيعاتك القديمة (Sync)
export function getPolicyByHandle(handle) {
  const h = normalizePolicyHandle(handle);
  return localPolicies[h] || null;
}

export function getAllPolicies() {
  return localPolicies;
}

// إبقاء Default export كما هو
export default getPolicyByHandle;

/* -----------------------------
   Shopify (ASYNC) Fetchers
------------------------------*/

// ملاحظة: لا يوجد حقل contactInformation على نوع Shop.
// لذلك نجلبه عبر page(handle: "contact-information").
const SHOPIFY_POLICIES_QUERY = `
  query ShopPolicies($contactHandle: String!) {
    shop {
      privacyPolicy  { title body }
      refundPolicy   { title body }
      termsOfService { title body }
      shippingPolicy { title body }
    }
    contactPage: page(handle: $contactHandle) {
      title
      body
    }
  }
`;

/**
 * يجلب السياسات من Shopify ويعيد خريطة موحّدة بالمفاتيح القياسية.
 * يحتوي أيضاً على صفحة contact-information من خلال page(handle).
 */
export async function getAllPoliciesShopify() {
  if (!fetchShopifyGraphQL) {
    return localPolicies;
  }

  try {
    const data = await fetchShopifyGraphQL(SHOPIFY_POLICIES_QUERY, {
      contactHandle: "contact-information",
    });

    const shop = data?.shop || {};
    const page = data?.contactPage || null;

    const mapped = {};

    if (shop.privacyPolicy?.body) {
      mapped['privacy-policy'] = {
        title: shop.privacyPolicy.title || 'سياسة الخصوصية',
        content: shop.privacyPolicy.body || '',
      };
    }
    if (shop.refundPolicy?.body) {
      mapped['refund-policy'] = {
        title: shop.refundPolicy.title || 'سياسة الاسترجاع والاستبدال',
        content: shop.refundPolicy.body || '',
      };
    }
    if (shop.termsOfService?.body) {
      mapped['terms-of-service'] = {
        title: shop.termsOfService.title || 'شروط الخدمة',
        content: shop.termsOfService.body || '',
      };
    }
    if (shop.shippingPolicy?.body) {
      mapped['shipping-policy'] = {
        title: shop.shippingPolicy.title || 'سياسة الشحن',
        content: shop.shippingPolicy.body || '',
      };
    }
    return Object.keys(mapped).length ? mapped : localPolicies;
  } catch (err) {
    console.error('[policyByHandle] Shopify fetch failed:', err);
    return localPolicies;
  }
}

/**
 * يجلب سياسة واحدة من Shopify (مع fallback للمحلي).
 */
export async function getPolicyByHandleShopify(handle) {
  const h = normalizePolicyHandle(handle);
  const all = await getAllPoliciesShopify();
  return all[h] || null;
}
