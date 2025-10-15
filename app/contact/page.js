"use client";
import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // محاكاة إرسال الرسالة
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      
      // إخفاء رسالة النجاح بعد 5 ثوانٍ
      setTimeout(() => setSuccess(false), 5000);
    }, 1000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: "1rem" }}>
      {/* Header */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "3rem",
        padding: "2rem",
        backgroundColor: "#9422af",
        color: "white",
        borderRadius: 12
      }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          تواصل معنا 📞
        </h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.9 }}>
          نحن هنا لمساعدتك! لا تتردد في التواصل معنا
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
        {/* Contact Form */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "2rem", 
          borderRadius: 12, 
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ color: "#9422af", marginBottom: "1.5rem" }}>أرسل لنا رسالة ✉️</h2>
          
          {success && (
            <div style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: "1rem",
              borderRadius: 8,
              marginBottom: "1rem",
              border: "1px solid #c3e6cb"
            }}>
              ✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                الاسم الكامل *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "1rem"
                }}
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: "1rem"
                  }}
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: "1rem"
                  }}
                  placeholder="+965 1234 5678"
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                الموضوع *
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "1rem"
                }}
              >
                <option value="">اختر الموضوع</option>
                <option value="order">استفسار عن طلب</option>
                <option value="product">استفسار عن منتج</option>
                <option value="technical">مشكلة تقنية</option>
                <option value="suggestion">اقتراح أو شكوى</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                الرسالة *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: "1rem",
                  resize: "vertical"
                }}
                placeholder="اكتب رسالتك هنا..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: loading ? "#ccc" : "#9422af",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s"
              }}
            >
              {loading ? "جاري الإرسال..." : "إرسال الرسالة 📤"}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div>
          {/* Contact Details */}
          <div style={{ 
            backgroundColor: "white", 
            padding: "2rem", 
            borderRadius: 12, 
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            marginBottom: "2rem"
          }}>
            <h2 style={{ color: "#9422af", marginBottom: "1.5rem" }}>معلومات التواصل 📋</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  backgroundColor: "#9422af", 
                  color: "white", 
                  borderRadius: "50%", 
                  width: "40px", 
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  📧
                </div>
                <div>
                  <strong>البريد الإلكتروني</strong><br/>
                  <a href="mailto:kuwait-info@smart-kids.me" style={{ color: "#9422af", textDecoration: "none" }}>
                    kuwait-info@smart-kids.me
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  backgroundColor: "#9422af", 
                  color: "white", 
                  borderRadius: "50%", 
                  width: "40px", 
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  📱
                </div>
                <div>
                  <strong>الهاتف</strong><br/>
                  <a href="tel:+96512345678" style={{ color: "#9422af", textDecoration: "none" }}>
                    +965 1234 5678
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  backgroundColor: "#25D366", 
                  color: "white", 
                  borderRadius: "50%", 
                  width: "40px", 
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  💬
                </div>
                <div>
                  <strong>الواتساب</strong><br/>
                  <a href="https://wa.me/96550424642" style={{ color: "#25D366", textDecoration: "none" }}>
                    +965 50424642
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  backgroundColor: "#9422af", 
                  color: "white", 
                  borderRadius: "50%", 
                  width: "40px", 
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  📍
                </div>
                <div>
                  <strong>العنوان</strong><br/>
                  الكويت، الكويت
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div style={{ 
            backgroundColor: "white", 
            padding: "2rem", 
            borderRadius: 12, 
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            marginBottom: "2rem"
          }}>
            <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>أوقات العمل ⏰</h3>
            <div style={{ lineHeight: "1.8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span><strong>الأحد - الخميس:</strong></span>
                <span>9:00 ص - 9:00 م</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span><strong>الجمعة:</strong></span>
                <span>2:00 م - 9:00 م</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>السبت:</strong></span>
                <span>2:00 م - 9:00 م</span>
              </div>
            </div>
          </div>

          {/* FAQ Link */}
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "1.5rem", 
            borderRadius: 12,
            textAlign: "center"
          }}>
            <h4 style={{ color: "#9422af", marginBottom: "0.5rem" }}>الأسئلة الشائعة ❓</h4>
            <p style={{ marginBottom: "1rem", color: "#666" }}>
              قد تجد إجابة سؤالك في قسم الأسئلة الشائعة
            </p>
            <a 
              href="/faq" 
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#9422af",
                color: "white",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: "600"
              }}
            >
              عرض الأسئلة الشائعة
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}