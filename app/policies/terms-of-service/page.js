"use client";
import { useState, useEffect } from "react";
import { getShopPolicies } from "@/lib/shopify";

export default function TermsOfServicePage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policies = await getShopPolicies();
      setPolicy(policies?.termsOfService);
    } catch (error) {
      console.error('Error loading terms of service:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل شروط الخدمة...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
        شروط الخدمة
      </h1>

      {policy ? (
        <div style={{ 
          backgroundColor: "white", 
          padding: "2rem", 
          borderRadius: 8, 
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          lineHeight: "1.8"
        }}>
          <div dangerouslySetInnerHTML={{ __html: policy.body }} />
        </div>
      ) : (
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "2rem", 
          borderRadius: 8,
          lineHeight: "1.8"
        }}>
          <h2>شروط الخدمة - SK Smart Kids</h2>
          
          <h3>1. القبول بالشروط</h3>
          <p>باستخدام موقع SK Smart Kids، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

          <h3>2. استخدام الموقع</h3>
          <p>يمكنك استخدام موقعنا للأغراض التالية:</p>
          <ul>
            <li>تصفح وشراء المنتجات التعليمية</li>
            <li>إنشاء حساب شخصي</li>
            <li>قراءة المحتوى التعليمي</li>
          </ul>

          <h3>3. المنتجات والأسعار</h3>
          <ul>
            <li>جميع الأسعار بالدينار الكويتي (KWD)</li>
            <li>نحتفظ بالحق في تغيير الأسعار دون إشعار مسبق</li>
            <li>صور المنتجات للتوضيح فقط</li>
            <li>نضمن جودة جميع منتجاتنا التعليمية</li>
          </ul>

          <h3>4. الطلبات والدفع</h3>
          <ul>
            <li>جميع الطلبات تخضع للموافقة والتوفر</li>
            <li>نقبل الدفع بالبطاقات الائتمانية والخصم المباشر</li>
            <li>يتم تأكيد الطلبات عبر البريد الإلكتروني</li>
          </ul>

          <h3>5. الشحن والتوصيل</h3>
          <ul>
            <li>نشحن إلى جميع مناطق الكويت</li>
            <li>مدة التوصيل: 1-3 أيام عمل</li>
            <li>الشحن مجاني للطلبات فوق 25 دينار كويتي</li>
          </ul>

          <h3>6. الإرجاع والاستبدال</h3>
          <ul>
            <li>يمكن إرجاع المنتجات خلال 14 يوم</li>
            <li>يجب أن تكون المنتجات في حالتها الأصلية</li>
            <li>تكلفة الإرجاع على المشتري</li>
          </ul>

          <h3>7. الملكية الفكرية</h3>
          <p>جميع المحتويات في الموقع محمية بحقوق الطبع والنشر لصالح SK Smart Kids.</p>

          <h3>8. المسؤولية</h3>
          <p>نحن غير مسؤولين عن:</p>
          <ul>
            <li>أي أضرار غير مباشرة</li>
            <li>فقدان البيانات أو الأرباح</li>
            <li>انقطاع الخدمة</li>
          </ul>

          <h3>9. التعديلات</h3>
          <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. التعديلات تدخل حيز التنفيذ فور نشرها.</p>

          <h3>10. الاتصال</h3>
          <p>للاستفسارات حول شروط الخدمة:</p>
          <ul>
            <li>البريد الإلكتروني: info@smartkidskw.com</li>
            <li>الهاتف: +965 1234 5678</li>
          </ul>

          <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
            آخر تحديث: أكتوبر 2025
          </p>
        </div>
      )}
    </div>
  );
}