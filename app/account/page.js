"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountPage() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      if (!token) {
        setLoading(false);
        return;
      }

      // محاكاة تحميل بيانات العميل - سيتم ربطها بـ Shopify لاحقاً
      setTimeout(() => {
        setCustomer({
          firstName: "أحمد",
          lastName: "محمد",
          email: "ahmed@example.com",
          orders: []
        });
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    setCustomer(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل بيانات الحساب...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <section style={{ maxWidth: 600, margin: "3rem auto", textAlign: "center" }}>
        <h1 style={{ color: "#9422af", marginBottom: 24 }}>حسابي</h1>
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/login"
            style={{
              background: "#9422af",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "1.1rem",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            تسجيل الدخول
          </Link>
        </div>
        <div style={{ color: "#888", marginTop: 40 }}>
          بعد تسجيل الدخول ستتمكن من رؤية طلباتك وتحديث معلوماتك الشخصية.
        </div>
      </section>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#9422af" }}>مرحباً، {customer.firstName}!</h1>
        <button onClick={handleLogout} style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer"
        }}>
          تسجيل الخروج
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* معلومات الحساب */}
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: 8,
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ marginBottom: "1rem", color: "#495057" }}>معلومات الحساب</h2>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>الاسم:</strong> {customer.firstName} {customer.lastName}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>البريد الإلكتروني:</strong> {customer.email}
          </div>
        </div>

        {/* روابط سريعة */}
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: 8,
          border: "1px solid #e9ecef"
        }}>
          <h2 style={{ marginBottom: "1rem", color: "#495057" }}>روابط سريعة</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Link href="/collections" style={{ color: "#9422af", textDecoration: "none" }}>🛍️ تسوق المنتجات</Link>
            <Link href="/cart" style={{ color: "#9422af", textDecoration: "none" }}>🛒 عربة التسوق</Link>
            <Link href="/search" style={{ color: "#9422af", textDecoration: "none" }}>🔍 البحث في المنتجات</Link>
          </div>
        </div>
      </div>

      {/* قائمة الطلبات */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "#495057" }}>طلباتي الأخيرة</h2>
        
        <div style={{ 
          textAlign: "center", 
          padding: "3rem",
          backgroundColor: "#f8f9fa",
          borderRadius: 8,
          color: "#666"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
          <div style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>لم تقم بأي طلبات بعد</div>
          <div style={{ marginBottom: "1.5rem" }}>ابدأ التسوق الآن واستمتع بمنتجاتنا المميزة!</div>
          <Link 
            href="/collections"
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#9422af",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            تسوق الآن
          </Link>
        </div>
      </div>
    </div>
  );
}