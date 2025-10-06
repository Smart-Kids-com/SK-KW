"use client";
import { useState, useEffect } from "react";
import { getShopPolicies } from "@/lib/shopify";

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policies = await getShopPolicies();
      setPolicy(policies?.privacyPolicy);
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل سياسة الخصوصية...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
        سياسة الخصوصية
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
          <h2>سياسة الخصوصية - SK Smart Kids</h2>
          
          <h3>1. المعلومات التي نجمعها</h3>
          <p>نحن في SK Smart Kids نجمع المعلومات التالية:</p>
          <ul>
            <li>المعلومات الشخصية مثل الاسم والبريد الإلكتروني</li>
            <li>عنوان الشحن ومعلومات الدفع</li>
            <li>سجل المشتريات والطلبات</li>
            <li>معلومات الجهاز وملفات تعريف الارتباط</li>
          </ul>

          <h3>2. كيف نستخدم معلوماتك</h3>
          <p>نستخدم معلوماتك في:</p>
          <ul>
            <li>معالجة الطلبات والمدفوعات</li>
            <li>إرسال تحديثات الطلبات</li>
            <li>تحسين خدماتنا ومنتجاتنا</li>
            <li>التواصل معك بشأن العروض الخاصة</li>
          </ul>

          <h3>3. مشاركة المعلومات</h3>
          <p>نحن لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع:</p>
          <ul>
            <li>شركات الشحن لتوصيل طلباتك</li>
            <li>معالجات الدفع لمعالجة المدفوعات</li>
            <li>مقدمي الخدمات التقنية</li>
          </ul>

          <h3>4. أمان البيانات</h3>
          <p>نحن نتخذ إجراءات أمنية صارمة لحماية معلوماتك الشخصية باستخدام تشفير SSL وأنظمة الأمان المتقدمة.</p>

          <h3>5. حقوقك</h3>
          <p>لديك الحق في:</p>
          <ul>
            <li>الوصول إلى معلوماتك الشخصية</li>
            <li>تصحيح المعلومات غير الصحيحة</li>
            <li>طلب حذف معلوماتك</li>
            <li>إلغاء الاشتراك في الرسائل التسويقية</li>
          </ul>

          <h3>6. الاتصال بنا</h3>
          <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا:</p>
          <ul>
            <li>البريد الإلكتروني: info@smartkidskw.com</li>
            <li>الهاتف: +965 1234 5678</li>
            <li>العنوان: الكويت</li>
          </ul>

          <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
            آخر تحديث: أكتوبر 2025
          </p>
        </div>
      )}
    </div>
  );
}