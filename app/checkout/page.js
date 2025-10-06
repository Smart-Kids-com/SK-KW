"use client";
import { useState, useEffect } from "react";
import { formatKWD } from "@/lib/shopify";
import Link from "next/link";

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        setCart([]);
      }
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return sum + (price * quantity);
  }, 0);
  
  const shipping = subtotal >= 20 ? 0 : 2;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setLoading(true);
    setTimeout(() => {
      alert('تم إرسال طلبك بنجاح! سنتواصل معك قريباً لتأكيد الطلب.');
      localStorage.removeItem('cart');
      window.location.href = '/';
    }, 2000);
  };

  if (cart.length === 0) {
    return (
      <main style={{
        maxWidth: "600px",
        margin: "2rem auto",
        padding: "2rem",
        textAlign: "center",
        direction: "rtl",
        fontFamily: "'Amiri', serif"
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: "3rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🛒</div>
          <h1 style={{ color: "#2d3748", marginBottom: "1rem" }}>السلة فارغة</h1>
          <p style={{ color: "#718096", marginBottom: "2rem" }}>
            يجب إضافة منتجات إلى السلة قبل المتابعة للدفع
          </p>
          <Link 
            href="/collections"
            style={{
              display: "inline-block",
              padding: "1rem 2rem",
              backgroundColor: "#9422af",
              color: "white",
              textDecoration: "none",
              borderRadius: 12,
              fontWeight: 600
            }}
          >
            تصفح المنتجات
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      direction: "rtl",
      fontFamily: "'Amiri', serif",
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      padding: "clamp(1rem, 3vw, 2rem)"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{
            fontSize: "clamp(2rem, 4vw, 2.5rem)",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "0.5rem"
          }}>
            💳 إتمام الطلب
          </h1>
          <p style={{ color: "#718096", fontSize: "1.1rem" }}>
            مراجعة طلبك قبل التأكيد
          </p>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: "clamp(1.5rem, 3vw, 2rem)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          marginBottom: "2rem"
        }}>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "1.5rem",
            borderBottom: "2px solid #9422af",
            paddingBottom: "0.5rem"
          }}>
            🛍️ المنتجات المطلوبة
          </h2>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            {cart.map((item, index) => (
              <div key={index} style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                borderRadius: 12,
                backgroundColor: "#f8f9fa",
                flexWrap: "wrap"
              }}>
                <div style={{
                  width: "clamp(60px, 15vw, 80px)",
                  height: "clamp(60px, 15vw, 80px)",
                  backgroundColor: "white",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 8
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "2rem" }}>🎁</span>
                  )}
                </div>
                <div style={{ 
                  flex: 1, 
                  minWidth: "200px"
                }}>
                  <div style={{
                    fontWeight: 600,
                    color: "#2d3748",
                    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
                    marginBottom: "0.5rem"
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    color: "#718096",
                    fontSize: "0.9rem"
                  }}>
                    العدد: {item.quantity}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: "#9422af",
                  fontSize: "clamp(1rem, 2.5vw, 1.1rem)"
                }}>
                  {formatKWD(parseFloat(item.price || 0) * parseInt(item.quantity || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: "clamp(1.5rem, 3vw, 2rem)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          marginBottom: "2rem"
        }}>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "1.5rem",
            borderBottom: "2px solid #9422af",
            paddingBottom: "0.5rem"
          }}>
            📊 ملخص الفاتورة
          </h2>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
              fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
              color: "#4a5568"
            }}>
              <span>المجموع الفرعي:</span>
              <span>{formatKWD(subtotal)}</span>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
              fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
              color: "#4a5568"
            }}>
              <span>رسوم الشحن:</span>
              <span>{shipping === 0 ? 'مجاني 🎉' : formatKWD(shipping)}</span>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "clamp(1.2rem, 3vw, 1.4rem)",
              fontWeight: 700,
              color: "#2d3748",
              paddingTop: "1rem",
              borderTop: "2px solid #e2e8f0"
            }}>
              <span>المجموع النهائي:</span>
              <span style={{ color: "#9422af" }}>{formatKWD(total)}</span>
            </div>
          </div>

          {shipping === 0 && (
            <div style={{
              backgroundColor: "#d4edda",
              padding: "1rem",
              borderRadius: 8,
              marginBottom: "2rem",
              color: "#155724",
              textAlign: "center",
              fontSize: "clamp(0.9rem, 2vw, 1rem)"
            }}>
              <strong>🚚 تهانينا! حصلت على توصيل مجاني</strong>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: "100%",
              padding: "clamp(1rem, 3vw, 1.25rem)",
              backgroundColor: loading ? "#cbd5e0" : "#9422af",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: "clamp(1.1rem, 2.5vw, 1.2rem)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#7c1d8a";
                e.target.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#9422af";
                e.target.style.transform = "translateY(0)";
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: "clamp(20px, 4vw, 24px)",
                  height: "clamp(20px, 4vw, 24px)",
                  border: "3px solid #ffffff50",
                  borderTop: "3px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                جاري المعالجة...
              </>
            ) : (
              <>
                ✅ تأكيد الطلب والدفع
              </>
            )}
          </button>

          <p style={{
            textAlign: "center",
            fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
            color: "#718096",
            marginTop: "1.5rem",
            lineHeight: "1.6"
          }}>
            سيتم التواصل معك خلال 24 ساعة لتأكيد الطلب وتحديد موعد التسليم
            <br />
            <Link href="/policies/terms-of-service" style={{ color: "#9422af" }}>شروط الخدمة</Link>
            {" | "}
            <Link href="/policies/privacy-policy" style={{ color: "#9422af" }}>سياسة الخصوصية</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
