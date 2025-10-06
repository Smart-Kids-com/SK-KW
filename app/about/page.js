"use client";

export default function AboutUsPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", padding: "1rem" }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: "center", 
        padding: "3rem 2rem",
        backgroundColor: "#9422af",
        color: "white",
        borderRadius: 12,
        marginBottom: "3rem"
      }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
          من نحن؟ 🌟
        </h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.9 }}>
          SK Smart Kids - رائدون في التعليم الذكي للأطفال
        </p>
      </div>

      {/* Story Section */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#9422af", marginBottom: "1.5rem", textAlign: "center" }}>
          قصتنا 📖
        </h2>
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "2rem", 
          borderRadius: 12,
          lineHeight: "1.8"
        }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            بدأت رحلة <strong>SK Smart Kids</strong> من إيماننا العميق بأن كل طفل يستحق أفضل تعليم ممكن. 
            نحن مجموعة من المعلمين وأولياء الأمور المتحمسين الذين يؤمنون بقوة التعلم الذكي والممتع.
          </p>
          <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            منذ تأسيسنا، كرسنا جهودنا لتطوير وتوفير أفضل المواد التعليمية والألعاب الذكية 
            التي تساعد الأطفال على التعلم بطريقة ممتعة وفعالة.
          </p>
          <p style={{ fontSize: "1.1rem" }}>
            اليوم، نفخر بخدمة آلاف الأسر في الكويت ومنطقة الخليج، ونساعد الأطفال على 
            بناء مستقبل أكثر إشراقاً من خلال التعليم الذكي.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "2rem",
        marginBottom: "3rem"
      }}>
        <div style={{ 
          backgroundColor: "white", 
          padding: "2rem", 
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>رسالتنا</h3>
          <p style={{ lineHeight: "1.6" }}>
            تمكين الأطفال من خلال توفير أدوات التعلم الذكية والمبتكرة التي تحفز حب 
            المعرفة والاستطلاع، وتساعدهم على بناء مهارات القرن الواحد والعشرين.
          </p>
        </div>
        
        <div style={{ 
          backgroundColor: "white", 
          padding: "2rem", 
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔮</div>
          <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>رؤيتنا</h3>
          <p style={{ lineHeight: "1.6" }}>
            أن نكون الخيار الأول للأسر في المنطقة للحصول على أفضل المواد التعليمية، 
            وأن نساهم في بناء جيل واعٍ ومبدع قادر على مواجهة تحديات المستقبل.
          </p>
        </div>
      </div>

      {/* Values */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
          قيمنا 💎
        </h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "1.5rem"
        }}>
          <div style={{ 
            backgroundColor: "#e8f5e8", 
            padding: "1.5rem", 
            borderRadius: 12,
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🌟</div>
            <h4 style={{ color: "#155724", marginBottom: "0.5rem" }}>الجودة</h4>
            <p style={{ fontSize: "0.9rem", margin: 0 }}>نلتزم بأعلى معايير الجودة في جميع منتجاتنا</p>
          </div>
          
          <div style={{ 
            backgroundColor: "#e8f4fd", 
            padding: "1.5rem", 
            borderRadius: 12,
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤝</div>
            <h4 style={{ color: "#0c5460", marginBottom: "0.5rem" }}>الثقة</h4>
            <p style={{ fontSize: "0.9rem", margin: 0 }}>نبني علاقات طويلة الأمد مع عملائنا</p>
          </div>
          
          <div style={{ 
            backgroundColor: "#fff3cd", 
            padding: "1.5rem", 
            borderRadius: 12,
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🚀</div>
            <h4 style={{ color: "#856404", marginBottom: "0.5rem" }}>الابتكار</h4>
            <p style={{ fontSize: "0.9rem", margin: 0 }}>نبحث دائماً عن حلول تعليمية جديدة ومبتكرة</p>
          </div>
          
          <div style={{ 
            backgroundColor: "#f8d7da", 
            padding: "1.5rem", 
            borderRadius: 12,
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>❤️</div>
            <h4 style={{ color: "#721c24", marginBottom: "0.5rem" }}>الشغف</h4>
            <p style={{ fontSize: "0.9rem", margin: 0 }}>نحب ما نفعله ونؤمن بأهمية التعليم</p>
          </div>
        </div>
      </div>

      {/* What We Offer */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
          ما نقدمه 🎁
        </h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "2rem"
        }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
            <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>📚 المواد التعليمية</h3>
            <ul style={{ lineHeight: "1.6" }}>
              <li>كتب تفاعلية ومصورة</li>
              <li>مواد مونتيسوري التعليمية</li>
              <li>قصص تربوية وتعليمية</li>
              <li>برامج تعليمية رقمية</li>
            </ul>
          </div>
          
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
            <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>🧸 الألعاب التعليمية</h3>
            <ul style={{ lineHeight: "1.6" }}>
              <li>ألعاب تنمية المهارات</li>
              <li>ألعاب الذكاء والمنطق</li>
              <li>ألعاب الإبداع والفنون</li>
              <li>ألعاب التعلم التفاعلي</li>
            </ul>
          </div>
          
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
            <h3 style={{ color: "#9422af", marginBottom: "1rem" }}>🎧 المحتوى الصوتي</h3>
            <ul style={{ lineHeight: "1.6" }}>
              <li>قصص صوتية تفاعلية</li>
              <li>أناشيد تعليمية</li>
              <li>برامج تعلم اللغات</li>
              <li>محتوى ديني للأطفال</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div style={{ 
        backgroundColor: "#9422af",
        color: "white",
        padding: "3rem 2rem",
        borderRadius: 12,
        marginBottom: "3rem",
        textAlign: "center"
      }}>
        <h2 style={{ marginBottom: "2rem" }}>لماذا تختارنا؟ 🏆</h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "2rem"
        }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
            <h4>جودة مضمونة</h4>
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>جميع منتجاتنا مختبرة ومعتمدة</p>
          </div>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🚚</div>
            <h4>توصيل سريع</h4>
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>توصيل مجاني للطلبات فوق 25 دينار</p>
          </div>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
            <h4>دعم 24/7</h4>
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>فريق دعم مخصص لمساعدتك</p>
          </div>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔄</div>
            <h4>ضمان الاسترداد</h4>
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>ضمان استرداد لمدة 14 يوم</p>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "2rem", 
        borderRadius: 12,
        textAlign: "center"
      }}>
        <h2 style={{ color: "#9422af", marginBottom: "1.5rem" }}>تواصل معنا 📞</h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "1rem"
        }}>
          <div>
            <strong>📧 البريد الإلكتروني:</strong><br/>
            info@smartkidskw.com
          </div>
          <div>
            <strong>📱 الهاتف:</strong><br/>
            +965 1234 5678
          </div>
          <div>
            <strong>💬 الواتساب:</strong><br/>
            +965 50424642
          </div>
          <div>
            <strong>📍 العنوان:</strong><br/>
            الكويت، الكويت
          </div>
        </div>
      </div>
    </div>
  );
}