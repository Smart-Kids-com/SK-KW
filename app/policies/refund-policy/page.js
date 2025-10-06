"use client";
import { useState, useEffect } from "react";
import { getShopPolicies } from "@/lib/shopify";

export default function RefundPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policies = await getShopPolicies();
      setPolicy(policies?.refundPolicy);
    } catch (error) {
      console.error('Error loading refund policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل سياسة الإرجاع...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
        سياسة الإرجاع والاستبدال 🔄
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
          <h2>سياسة الإرجاع والاستبدال - SK Smart Kids</h2>
          
          <div style={{ 
            backgroundColor: "#d4edda", 
            padding: "1rem", 
            borderRadius: 8, 
            border: "1px solid #c3e6cb",
            margin: "1rem 0"
          }}>
            <p><strong>✅ ضمان رضا العملاء 100%</strong></p>
            <p>نحن ملتزمون بضمان رضاكم الكامل عن منتجاتنا التعليمية</p>
          </div>

          <h3>⏰ المدة الزمنية</h3>
          <ul>
            <li>🕐 <strong>14 يوم</strong> من تاريخ الاستلام للإرجاع</li>
            <li>🕐 <strong>7 أيام</strong> للاستبدال</li>
            <li>📅 احتساب المدة من تاريخ التوصيل</li>
          </ul>

          <h3>✅ شروط الإرجاع</h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "1rem",
            margin: "1rem 0"
          }}>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: 8, border: "1px solid #ddd" }}>
              <h4 style={{ color: "#28a745", margin: "0 0 0.5rem 0" }}>✅ يمكن إرجاعها</h4>
              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                <li>منتجات في العبوة الأصلية</li>
                <li>لم يتم فتحها أو استخدامها</li>
                <li>مع الفاتورة الأصلية</li>
                <li>الكتب غير المكتوب عليها</li>
              </ul>
            </div>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: 8, border: "1px solid #ddd" }}>
              <h4 style={{ color: "#dc3545", margin: "0 0 0.5rem 0" }}>❌ لا يمكن إرجاعها</h4>
              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                <li>المنتجات المستخدمة</li>
                <li>الكتب المكتوب عليها</li>
                <li>منتجات النظافة الشخصية</li>
                <li>العروض الخاصة</li>
              </ul>
            </div>
          </div>

          <h3>🔄 عملية الإرجاع</h3>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: 8, border: "1px solid #ddd" }}>
            <h4>الخطوات:</h4>
            <ol>
              <li><strong>اتصل بنا:</strong> تواصل مع خدمة العملاء</li>
              <li><strong>املأ النموذج:</strong> نموذج طلب الإرجاع</li>
              <li><strong>احزم المنتج:</strong> في العبوة الأصلية</li>
              <li><strong>الشحن:</strong> سنرسل لك شركة الشحن</li>
              <li><strong>المعالجة:</strong> 3-5 أيام عمل للمراجعة</li>
              <li><strong>الاسترداد:</strong> خلال 7-10 أيام عمل</li>
            </ol>
          </div>

          <h3>💰 طرق الاسترداد</h3>
          <ul>
            <li>💳 <strong>بطاقة ائتمان:</strong> 5-7 أيام عمل</li>
            <li>🏦 <strong>تحويل بنكي:</strong> 3-5 أيام عمل</li>
            <li>💵 <strong>نقداً:</strong> عند الإرجاع في المتجر</li>
            <li>🎁 <strong>رصيد متجر:</strong> فوري</li>
          </ul>

          <h3>🚚 تكلفة الإرجاع</h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "1rem",
            margin: "1rem 0"
          }}>
            <div style={{ backgroundColor: "#d4edda", padding: "1rem", borderRadius: 8, border: "1px solid #c3e6cb" }}>
              <h4 style={{ color: "#155724", margin: "0 0 0.5rem 0" }}>📦 مجاني</h4>
              <ul style={{ margin: 0 }}>
                <li>منتج معيب أو خاطئ</li>
                <li>خطأ من جانبنا</li>
                <li>جودة غير مطابقة</li>
              </ul>
            </div>
            <div style={{ backgroundColor: "#fff3cd", padding: "1rem", borderRadius: 8, border: "1px solid #ffeaa7" }}>
              <h4 style={{ color: "#856404", margin: "0 0 0.5rem 0" }}>💰 على العميل</h4>
              <ul style={{ margin: 0 }}>
                <li>تغيير في الرأي</li>
                <li>طلب خاطئ من العميل</li>
                <li>عدم الحاجة للمنتج</li>
              </ul>
            </div>
          </div>

          <h3>🔄 الاستبدال</h3>
          <p>يمكن استبدال المنتجات في الحالات التالية:</p>
          <ul>
            <li>حجم أو لون مختلف</li>
            <li>منتج معيب</li>
            <li>منتج غير مطابق للوصف</li>
          </ul>

          <h3>⚠️ حالات خاصة</h3>
          <div style={{ backgroundColor: "#f8d7da", padding: "1rem", borderRadius: 8, border: "1px solid #f5c6cb" }}>
            <p><strong>لا يمكن إرجاع أو استبدال:</strong></p>
            <ul>
              <li>المنتجات بعد انتهاء فترة الإرجاع</li>
              <li>المنتجات التالفة بسبب سوء الاستخدام</li>
              <li>المنتجات المخصصة أو المطبوعة حسب الطلب</li>
            </ul>
          </div>

          <h3>📞 خدمة العملاء</h3>
          <p>لطلب الإرجاع أو الاستبدال:</p>
          <ul>
            <li>📧 البريد الإلكتروني: returns@smartkidskw.com</li>
            <li>📱 الهاتف: +965 1234 5678</li>
            <li>💬 الواتساب: +965 50424642</li>
            <li>🕐 أوقات العمل: الأحد - الخميس 9:00 ص - 6:00 م</li>
          </ul>

          <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
            آخر تحديث: أكتوبر 2025
          </p>
        </div>
      )}
    </div>
  );
}