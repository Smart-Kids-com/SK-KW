"use client";
import { useState, useEffect } from "react";
import { getShopPolicies } from "@/lib/shopify";

export default function ShippingPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policies = await getShopPolicies();
      setPolicy(policies?.shippingPolicy);
    } catch (error) {
      console.error('Error loading shipping policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل سياسة الشحن...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
        سياسة الشحن والتوصيل 🚚
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
          <h2>سياسة الشحن والتوصيل - SK Smart Kids</h2>
          
          <h3>🌍 مناطق التوصيل</h3>
          <p>نقوم بالتوصيل إلى:</p>
          <ul>
            <li>✅ جميع مناطق الكويت</li>
            <li>✅ المناطق السكنية والتجارية</li>
            <li>✅ الجامعات والمدارس</li>
          </ul>

          <h3>⏰ أوقات التوصيل</h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "1rem",
            margin: "1rem 0"
          }}>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: 8, border: "1px solid #ddd" }}>
              <h4 style={{ color: "#9422af", margin: "0 0 0.5rem 0" }}>التوصيل العادي</h4>
              <p>📅 1-3 أيام عمل</p>
              <p>💰 2.5 دينار كويتي</p>
            </div>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: 8, border: "1px solid #ddd" }}>
              <h4 style={{ color: "#9422af", margin: "0 0 0.5rem 0" }}>التوصيل السريع</h4>
              <p>📅 24 ساعة</p>
              <p>💰 5 دينار كويتي</p>
            </div>
          </div>

          <h3>🆓 الشحن المجاني</h3>
          <div style={{ 
            backgroundColor: "#d4edda", 
            padding: "1rem", 
            borderRadius: 8, 
            border: "1px solid #c3e6cb",
            margin: "1rem 0"
          }}>
            <p><strong>🎉 شحن مجاني للطلبات أكثر من 25 دينار كويتي!</strong></p>
          </div>

          <h3>📦 تحضير الطلبات</h3>
          <ul>
            <li>⚡ تحضير الطلبات خلال 24 ساعة</li>
            <li>📱 إشعار SMS عند شحن الطلب</li>
            <li>📧 رقم التتبع عبر البريد الإلكتروني</li>
            <li>📞 تأكيد التوصيل قبل الوصول</li>
          </ul>

          <h3>🕐 أوقات العمل</h3>
          <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: 8, border: "1px solid #ddd" }}>
            <p><strong>الأحد - الخميس:</strong> 9:00 ص - 9:00 م</p>
            <p><strong>الجمعة - السبت:</strong> 2:00 م - 9:00 م</p>
          </div>

          <h3>📋 شروط التوصيل</h3>
          <ul>
            <li>يجب وجود شخص لاستلام الطلب</li>
            <li>التحقق من الطلب قبل التوقيع</li>
            <li>الدفع عند الاستلام متاح</li>
            <li>حفظ فاتورة الشراء لضمان الخدمة</li>
          </ul>

          <h3>🚫 حالات خاصة</h3>
          <div style={{ backgroundColor: "#fff3cd", padding: "1rem", borderRadius: 8, border: "1px solid #ffeaa7" }}>
            <p><strong>قد يتأخر التوصيل في الحالات التالية:</strong></p>
            <ul>
              <li>الأعياد والإجازات الرسمية</li>
              <li>الظروف الجوية السيئة</li>
              <li>المناطق النائية</li>
            </ul>
          </div>

          <h3>📞 خدمة العملاء</h3>
          <p>لأي استفسار حول التوصيل:</p>
          <ul>
            <li>📧 البريد الإلكتروني: shipping@smartkidskw.com</li>
            <li>📱 الهاتف: +965 1234 5678</li>
            <li>💬 الواتساب: +965 50424642</li>
          </ul>

          <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
            آخر تحديث: أكتوبر 2025
          </p>
        </div>
      )}
    </div>
  );
}