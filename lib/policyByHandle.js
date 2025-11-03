// lib/policyByHandle.js

/**
 * يدعم لغتين (ar/en) مع فول-باك محلي سريع، ثم Shopify عند الحاجة.
 * يحافظ على التوافق مع التواقيع القديمة:
 *   - getPolicyByHandle(handle)         // كانت ترجع محلي فقط
 *   - getAllPolicies()
 * ويضيف تواقيع موجهة للغة:
 *   - getPolicyByHandleLang(handle, locale)  // 'ar' أو 'en'
 *   - getAllPoliciesLang(locale)
 *   - getAllPoliciesShopify(locale)          // Async
 *   - getPolicyByHandleShopify(handle, locale) // Async
 */

let fetchShopifyGraphQL = null;
try {
  ({ fetchShopifyGraphQL } = require('@/lib/shopify'));
} catch {
  fetchShopifyGraphQL = null;
}

/* -----------------------------
   Normalize
------------------------------*/
function normalizePolicyHandle(input = '') {
  const h = String(input || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  const clean = h.startsWith('policies/') ? h.slice('policies/'.length) : h;

  if (['privacy', 'privacy-policy', 'policy-privacy'].includes(clean)) return 'privacy-policy';
  if (['refund', 'refund-policy', 'returns', 'return-policy'].includes(clean)) return 'refund-policy';
  if (['terms', 'tos', 'terms-of-service', 'terms-and-conditions'].includes(clean)) return 'terms-of-service';
  if (['shipping', 'shipping-policy', 'delivery'].includes(clean)) return 'shipping-policy';
  if (['contact', 'contact-information', 'contact-info'].includes(clean)) return 'contact-information';

  return clean;
}

/* -----------------------------
   Local (SYNC) content (AR/EN)
------------------------------*/

const localPoliciesAR = {
  'privacy-policy': {
    title: 'سياسة الخصوصية',
    content: `
      <h2>سياسة الخصوصية</h2>
      <p>نحن ملتزمون باحترام خصوصيتك وحماية معلوماتك الشخصية. يمكنك تصفح موقعنا دون الإفصاح عن هويتك. في بعض الحالات (مثل الشراء) قد نطلب منك تزويدنا باسمك وعنوانك ورقم هاتفك وبريدك الإلكتروني وغير ذلك.</p>
      <p>يجمع موقع Smart Kids Kuwait بعض المعلومات الضرورية ويشاركها مع خدمات طرف ثالث مثل Google وMeta لتحسين الإعلانات. وتشمل هذه المعلومات:</p>
      <ul>
        <li><strong>بيانات حساب المستخدم:</strong> عنوان البريد الإلكتروني، والبيانات المقدمة من أطراف ثالثة مثل Google وMeta، أو بيانات سبق تقديمها عبر ميزة "تسجيل الدخول".</li>
        <li><strong>المعلومات الشخصية للمستخدم:</strong> اسم المستخدم والجنس.</li>
        <li><strong>معلومات اتصال غير شخصية:</strong> بيانات حول اتصال المستخدم، مدة الاستخدام، الصفحات/النوافذ التي يتم الوصول إليها وأوقات الخروج. تُستخدم لتحسين الموقع والخدمات الإعلانية.</li>
      </ul>
      <p>لن نشارك معلوماتك — بما فيها معلومات التعريف الشخصية — مع أي طرف ثالث بغرض التواصل معك حول منتجات أو خدمات طرف ثالث.</p>
    `,
  },
  'refund-policy': {
    title: 'سياسة الاسترجاع والاستبدال',
    content: `
      <h2>سياسة الاسترجاع والاستبدال</h2>
      <p><strong>ضمان الجودة:</strong> جميع منتجاتنا مطابقة للوصف ونقوم بفحص كل طلب بعناية قبل الشحن. نلتزم بتقديم منتجات عالية الجودة لأطفالكم.</p>
      <p><strong>فحص المنتج عند التسليم:</strong> يرجى فحص المنتجات فور استلام الطلب. في حال وجود ضرر أو عيب مصنعي، نرجو إبلاغنا خلال 24 ساعة من التسليم وسنقوم بالاستبدال.</p>
      <h3>سياسة الإرجاع</h3>
      <ul>
        <li><strong>الإطار الزمني:</strong> يمكنك إرجاع المنتج خلال 7 أيام من تاريخ التسليم.</li>
        <li><strong>حالة المنتج:</strong> يجب أن يكون بحالته الأصلية غير مستخدم ومع التغليف الأصلي.</li>
        <li><strong>تكلفة الإرجاع:</strong> تُخصم 2 دينار كويتي (تكلفة الشحن والإرجاع) من مبلغ الاسترداد.</li>
        <li><strong>مدة الاسترداد:</strong> يتم رد المبلغ خلال 7 أيام عمل بعد استلامنا المنتج المرتجع.</li>
      </ul>
      <h3>طريقة الإرجاع</h3>
      <ol>
        <li>راسلنا عبر البريد: kuwait-info@smart-kids.me</li>
        <li>اذكر رقم الطلب وسبب الإرجاع</li>
        <li>سيتواصل معك ممثلنا لترتيب الاستلام</li>
      </ol>
      <p><strong>ملاحظة مهمة:</strong> يرجى عدم رفض استلام الطلب عند التسليم، فقد يسبب ذلك تأخيرًا في معالجة طلبك.</p>
      <p><strong>حقوقك:</strong> هذه السياسة متوافقة مع قوانين حماية المستهلك في دولة الكويت.</p>
    `,
  },
  'terms-of-service': {
    title: 'شروط الخدمة',
    content: `
      <h2>شروط الخدمة</h2>
      <ol>
        <li><strong>قبول الشروط:</strong> باستخدامك موقع Smart Kids Kuwait فإنك توافق على هذه الشروط. إن لم توافق، يرجى عدم استخدام الموقع.</li>
        <li><strong>استخدام الموقع:</strong>
          <ul>
            <li>يجب أن تكون 18 عامًا أو أكثر لإجراء عمليات الشراء.</li>
            <li>يُحظر استخدام الموقع لأي أغراض غير قانونية.</li>
            <li>نحتفظ بحق رفض تقديم الخدمة لأي شخص ولأي سبب.</li>
          </ul>
        </li>
        <li><strong>المنتجات والأسعار:</strong>
          <ul>
            <li>جميع الأسعار بالدينار الكويتي وقد تتغير دون إشعار.</li>
            <li>نسعى للدقة في أوصاف المنتجات والأسعار.</li>
            <li>نحتفظ بحق إلغاء الطلبات في حالة أخطاء التسعير.</li>
          </ul>
        </li>
        <li><strong>الطلبات والدفع:</strong>
          <ul>
            <li>جميع الطلبات خاضعة للتأكيد والقبول.</li>
            <li>الدفع عند التسليم أو عبر الطرق المتاحة.</li>
            <li>نحتفظ بحق رفض أو إلغاء الطلبات.</li>
          </ul>
        </li>
        <li><strong>الشحن والتسليم:</strong>
          <ul>
            <li>نشحن داخل الكويت فقط.</li>
            <li>أوقات التسليم تقديرية وقد تختلف.</li>
            <li>تنتقل المخاطرة إلى العميل عند التسليم.</li>
          </ul>
        </li>
        <li><strong>الإرجاع والاستبدال:</strong> يرجى الرجوع إلى سياسة الإرجاع المنفصلة. جميع الإرجاعات خاضعة لشروطنا.</li>
        <li><strong>المسؤولية:</strong> غير مسؤولين عن الأضرار غير المباشرة. تقتصر مسؤوليتنا على قيمة المنتج المشتَرى.</li>
        <li><strong>الملكية الفكرية:</strong> جميع المحتويات محمية بحقوق النشر. يُحظر النسخ أو الاستخدام دون إذن.</li>
        <li><strong>تعديل الشروط:</strong> نحتفظ بحق تعديل الشروط في أي وقت وتصبح نافذة عند نشرها.</li>
        <li><strong>القانون الحاكم:</strong> تخضع هذه الشروط لقوانين دولة الكويت، وتسوى أي نزاعات وفق القانون الكويتي.</li>
      </ol>
      <p><strong>التواصل:</strong> kuwait-info@smart-kids.me</p>
    `,
  },
  'shipping-policy': {
    title: 'سياسة الشحن',
    content: `
      <h2>سياسة الشحن</h2>
      <h3>1) نطاق الشحن</h3>
      <ul>
        <li>نشحن داخل الكويت فقط.</li>
        <li>شحن مجاني للطلبات التي تتجاوز 20.000 د.ك.</li>
      </ul>
      <h3>2) وقت المعالجة</h3>
      <ul>
        <li>يتم تجهيز الطلبات خلال 1–2 يوم عمل.</li>
        <li>الطلبات في العطل/نهاية الأسبوع تُجهز في أول يوم عمل تالٍ.</li>
      </ul>
      <h3>3) وقت التسليم</h3>
      <ul>
        <li>التسليم القياسي: 7–10 أيام عمل.</li>
        <li>قد تتأثر المدد في المواسم المزدحمة والعطلات.</li>
      </ul>
      <h3>4) طريقة التسليم</h3>
      <ul>
        <li>الدفع عند الاستلام متاح.</li>
        <li>سيتواصل شريك التوصيل لترتيب الوقت.</li>
        <li>يرجى التأكد من وجود شخص للاستلام.</li>
      </ul>
      <h3>5) عنوان التسليم</h3>
      <ul>
        <li>تزويدنا بعنوان دقيق وكامل.</li>
        <li>لسنا مسؤولين عن التأخير بسبب العناوين الخاطئة.</li>
        <li>تعديل العنوان بعد تأكيد الطلب قد يسبب تأخيرًا.</li>
      </ul>
      <h3>6) تتبع الطلب</h3>
      <ul>
        <li>ستصلك رسالة تأكيد عبر البريد الإلكتروني.</li>
        <li>معلومات التتبع تُزوَّد عند توفرها.</li>
      </ul>
      <h3>7) فشل التسليم</h3>
      <ul>
        <li>عند تعذر التسليم لعدم تواجد المستلم قد تُطبّق رسوم إضافية.</li>
        <li>يرجى عدم رفض الاستلام لتجنب تأخير المعالجة.</li>
      </ul>
      <h3>8) العناصر التالفة</h3>
      <ul>
        <li>يرجى فحص الطلب عند الاستلام.</li>
        <li>أبلغ عن أي تلف خلال 24 ساعة.</li>
        <li>سنقوم بالاستبدال دون تكلفة إضافية.</li>
      </ul>
      <h3>9) قيود الشحن</h3>
      <ul>
        <li>قد تكون بعض المناطق النائية أطول زمنًا للتسليم.</li>
        <li>نحتفظ بحق استخدام طرق شحن بديلة عند الحاجة.</li>
      </ul>
      <p><strong>للاستفسار عن الشحن:</strong> kuwait-info@smart-kids.me</p>
    `,
  },
  'contact-information': {
    title: 'معلومات التواصل',
    content: `
      <h2>معلومات التواصل</h2>
      <p><strong>Smart-Kids.me — الأطفال المبتكرون الكويت</strong><br/>شريككم الموثوق لمنتجات الأطفال المبتكرة.</p>
      <h3>بيانات التواصل</h3>
      <ul>
        <li><strong>البريد الإلكتروني:</strong> kuwait-info@smart-kids.me</li>
        <li><strong>الهاتف:</strong> +965 600035393</li>
        <li><strong>العنوان:</strong> مجمع إم سكوير، الدور الرابع، المرقاب ق3، مدينة الكويت، العاصمة، الكويت — الرمز البريدي 15003</li>
      </ul>
      <h3>ساعات العمل</h3>
      <ul>
        <li>السبت–الخميس: 9:00 ص – 12:00 م</li>
        <li>الجمعة: 2:00 م – 12:00 ص</li>
        <li>نرد على رسائل واتساب في جميع الأوقات.</li>
      </ul>
      <h3>خدمة العملاء</h3>
      <p>للطلبات والإرجاع والاستفسارات العامة، تواصل معنا عبر البريد أو الهاتف. نرد على جميع الاستفسارات خلال 24 ساعة.</p>
      <h3>طرق التواصل</h3>
      <ul>
        <li>الأسرع عبر البريد: kuwait-info@smart-kids.me</li>
        <li>الاتصال: +965 600035393 خلال ساعات العمل</li>
        <li>يرجى تضمين رقم الطلب في الاستفسارات المتعلقة بالطلبات</li>
      </ul>
    `,
  },
};

const localPoliciesEN = {
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `
      <h2>Privacy Policy</h2>
      <p>We are committed to respecting your privacy and protecting your personal information. You can browse our website without identifying yourself. In some cases (such as purchases), we may ask for your name, address, phone number, email, etc.</p>
      <p>The Smart Kids Kuwait website collects certain necessary data and shares it with third parties such as Google and Meta to improve advertising services. This includes:</p>
      <ul>
        <li><strong>User account data:</strong> your email address, data provided by third parties (Google/Meta), or data previously provided via "Sign In".</li>
        <li><strong>User personal information:</strong> your username and gender.</li>
        <li><strong>Non-personal connection data:</strong> connection details, session duration, accessed windows/pages, and exit times, used to improve the site and ads.</li>
      </ul>
      <p>We will never share your information — including personally identifiable information — with any third party for the purpose of contacting you about third-party products or services.</p>
    `,
  },
  'refund-policy': {
    title: 'Return and Exchange Policy',
    content: `
      <h2>Return and Exchange Policy</h2>
      <p><strong>Quality Guarantee:</strong> All our products are guaranteed to be of high quality as described, and we carefully verify each order before shipping.</p>
      <p><strong>Product Inspection Upon Delivery:</strong> Upon receiving your order, please inspect the products immediately. If there is any damage or manufacturing defect, notify us within 24 hours and we will replace the product.</p>
      <h3>Return Policy</h3>
      <ul>
        <li><strong>Time Frame:</strong> Return within 7 days of delivery.</li>
        <li><strong>Product Condition:</strong> Original condition, unused, with original packaging.</li>
        <li><strong>Return Cost:</strong> 2 KWD (shipping & return) deducted from refund.</li>
        <li><strong>Refund Period:</strong> Within 7 business days after we receive the return.</li>
      </ul>
      <h3>How to Return</h3>
      <ol>
        <li>Contact: kuwait-info@smart-kids.me</li>
        <li>Mention order number and reason</li>
        <li>We’ll arrange pickup</li>
      </ol>
      <p><strong>Important:</strong> Please do not refuse delivery as it may delay processing.</p>
      <p><strong>Your Rights:</strong> This policy complies with consumer protection laws in Kuwait.</p>
    `,
  },
  'terms-of-service': {
    title: 'Terms of Service',
    content: `
      <h2>Terms of Service</h2>
      <ol>
        <li><strong>Acceptance of Terms:</strong> By using the Smart Kids Kuwait website, you agree to these terms.</li>
        <li><strong>Use of Website:</strong>
          <ul>
            <li>18+ to make purchases.</li>
            <li>No illegal use.</li>
            <li>We may refuse service to anyone.</li>
          </ul>
        </li>
        <li><strong>Products and Pricing:</strong>
          <ul>
            <li>Prices in KWD; subject to change.</li>
            <li>We strive for accuracy.</li>
            <li>Orders may be cancelled for pricing errors.</li>
          </ul>
        </li>
        <li><strong>Orders and Payment:</strong>
          <ul>
            <li>All orders subject to confirmation.</li>
            <li>COD or available methods.</li>
            <li>We may refuse/cancel orders.</li>
          </ul>
        </li>
        <li><strong>Shipping and Delivery:</strong>
          <ul>
            <li>Kuwait only.</li>
            <li>Times are estimates.</li>
            <li>Risk transfers on delivery.</li>
          </ul>
        </li>
        <li><strong>Returns and Exchanges:</strong> See separate return policy.</li>
        <li><strong>Liability:</strong> No indirect damages; liability limited to product value.</li>
        <li><strong>Intellectual Property:</strong> Content is protected; no copying without permission.</li>
        <li><strong>Modification of Terms:</strong> We may modify at any time; effective upon posting.</li>
        <li><strong>Governing Law:</strong> Laws of Kuwait apply.</li>
      </ol>
      <p><strong>Contact:</strong> kuwait-info@smart-kids.me</p>
    `,
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    content: `
      <h2>Shipping Policy</h2>
      <h3>1) Shipping Coverage</h3>
      <ul>
        <li>Kuwait only.</li>
        <li>Free shipping on orders above 20.000 KWD.</li>
      </ul>
      <h3>2) Processing Time</h3>
      <ul>
        <li>1–2 business days to process.</li>
        <li>Weekend/holiday orders process next business day.</li>
      </ul>
      <h3>3) Delivery Time</h3>
      <ul>
        <li>Standard: 7–10 business days.</li>
        <li>May vary in peak seasons/holidays.</li>
      </ul>
      <h3>4) Delivery Method</h3>
      <ul>
        <li>Cash on Delivery available.</li>
        <li>Carrier will contact to arrange time.</li>
        <li>Ensure someone is available to receive.</li>
      </ul>
      <h3>5) Delivery Address</h3>
      <ul>
        <li>Provide accurate, complete address.</li>
        <li>We’re not responsible for delays due to incorrect addresses.</li>
        <li>Changes after confirmation may cause delays.</li>
      </ul>
      <h3>6) Order Tracking</h3>
      <ul>
        <li>Email confirmation provided.</li>
        <li>Tracking info when available.</li>
      </ul>
      <h3>7) Failed Delivery</h3>
      <ul>
        <li>Additional charges may apply if customer unavailable.</li>
        <li>Do not refuse delivery to avoid processing delays.</li>
      </ul>
      <h3>8) Damaged Items</h3>
      <ul>
        <li>Inspect upon delivery.</li>
        <li>Report within 24 hours.</li>
        <li>We’ll arrange a replacement at no extra cost.</li>
      </ul>
      <h3>9) Shipping Restrictions</h3>
      <ul>
        <li>Remote areas may take longer.</li>
        <li>We may use alternative methods when necessary.</li>
      </ul>
      <p><strong>Contact for shipping inquiries:</strong> kuwait-info@smart-kids.me</p>
    `,
  },
  'contact-information': {
    title: 'Contact Information',
    content: `
      <h2>Contact Information</h2>
      <p><strong>Smart-Kids.me — Smart Kids Kuwait</strong><br/>Your trusted partner for innovative children's products.</p>
      <h3>Contact Details</h3>
      <ul>
        <li><strong>Email:</strong> kuwait-info@smart-kids.me</li>
        <li><strong>Phone:</strong> +965 600035393</li>
        <li><strong>Address:</strong> M Square Complex, Floor 4, Al Mirqab Block 3, Kuwait City, Al Asimah, Kuwait – Postal Code: 15003</li>
      </ul>
      <h3>Business Hours</h3>
      <ul>
        <li>Saturday – Thursday: 9:00 AM – 12:00 PM</li>
        <li>Friday: 2:00 PM – 12:00 AM</li>
        <li>We respond to WhatsApp messages at all times.</li>
      </ul>
      <h3>Customer Service</h3>
      <p>For orders, returns, product inquiries, and general questions, contact us via email or phone. We respond within 24 hours.</p>
      <h3>How to Reach Us</h3>
      <ul>
        <li>Email us at <strong>kuwait-info@smart-kids.me</strong> for the fastest response.</li>
        <li>Call <strong>+965 600035393</strong> during business hours.</li>
        <li>Include your order number for order-related inquiries.</li>
      </ul>
    `,
  },
};

function selectLocalBucket(locale = 'en') {
  return (String(locale).toLowerCase() === 'ar') ? localPoliciesAR : localPoliciesEN;
}

export function getAllPoliciesLang(locale = 'en') {
  return selectLocalBucket(locale);
}
export function getPolicyByHandleLang(handle, locale = 'en') {
  const h = normalizePolicyHandle(handle);
  const bucket = selectLocalBucket(locale);
  return bucket[h] || null;
}

/* -----------------------------
   Back-compat (SYNC)
------------------------------*/
export function getPolicyByHandle(handle) {
  // التوافق القديم: يرجّع من النسخة العربية الافتراضية (مواقعك بالعربية)
  return getPolicyByHandleLang(handle, 'ar');
}
export function getAllPolicies() {
  return getAllPoliciesLang('ar');
}
export default getPolicyByHandle;

/* -----------------------------
   Shopify (ASYNC)
------------------------------*/

const SHOPIFY_POLICIES_QUERY = `
  query ShopPolicies($language: LanguageCode!, $contactHandle: String!) @inContext(language: $language) {
    shop {
      privacyPolicy  { title body }
      refundPolicy   { title body }
      termsOfService { title body }
      shippingPolicy { title body }
    }
    contactPage: page(handle: $contactHandle) { title body }
  }
`;

/** يجلب كل السياسات + صفحة contact-information من Shopify بلغة محددة */
export async function getAllPoliciesShopify(locale = 'AR') {
  if (!fetchShopifyGraphQL) return getAllPoliciesLang(locale);

  try {
    const data = await fetchShopifyGraphQL(SHOPIFY_POLICIES_QUERY, {
      language: String(locale).toUpperCase() === 'AR' ? 'AR' : 'EN',
      contactHandle: 'contact-information',
    });

    const shop = data?.shop || {};
    const page = data?.contactPage || null;

    const out = {};
    const fallback = selectLocalBucket(locale);

    if (shop.privacyPolicy?.body) {
      out['privacy-policy'] = {
        title: shop.privacyPolicy.title || fallback['privacy-policy'].title,
        content: shop.privacyPolicy.body || '',
      };
    }
    if (shop.refundPolicy?.body) {
      out['refund-policy'] = {
        title: shop.refundPolicy.title || fallback['refund-policy'].title,
        content: shop.refundPolicy.body || '',
      };
    }
    if (shop.termsOfService?.body) {
      out['terms-of-service'] = {
        title: shop.termsOfService.title || fallback['terms-of-service'].title,
        content: shop.termsOfService.body || '',
      };
    }
    if (shop.shippingPolicy?.body) {
      out['shipping-policy'] = {
        title: shop.shippingPolicy.title || fallback['shipping-policy'].title,
        content: shop.shippingPolicy.body || '',
      };
    }
    if (page?.body) {
      out['contact-information'] = {
        title: page.title || fallback['contact-information'].title,
        content: page.body || '',
      };
    }

    // لو فاضي نرجّع المحلي
    return Object.keys(out).length ? out : fallback;
  } catch (e) {
    console.error('[policyByHandle] Shopify fetch failed:', e);
    return getAllPoliciesLang(locale);
  }
}

/** سياسة واحدة من Shopify مع فول-باك محلي */
export async function getPolicyByHandleShopify(handle, locale = 'AR') {
  const h = normalizePolicyHandle(handle);
  const all = await getAllPoliciesShopify(locale);
  return all[h] || null;
}

/* -----------------------------
   (اختياري) صفحات عامة من Shopify (About/Contact-Us)
------------------------------*/
const PAGE_BY_HANDLE_QUERY = `
  query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
    page(handle: $handle) { title body }
  }
`;
export async function getPageByHandleShopify(handle, locale = 'AR') {
  if (!fetchShopifyGraphQL) return null;
  try {
    const data = await fetchShopifyGraphQL(PAGE_BY_HANDLE_QUERY, {
      language: String(locale).toUpperCase() === 'AR' ? 'AR' : 'EN',
      handle,
    });
    return data?.page || null;
  } catch (e) {
    console.error('[policyByHandle] getPageByHandleShopify failed:', e);
    return null;
  }
}
