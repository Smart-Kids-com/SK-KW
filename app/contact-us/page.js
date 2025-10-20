// app/contact-us/page.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

  const HTML = `
    <!-- Contact Us — Smart Kids Kuwait -->
<section dir="rtl" lang="ar" style="--brand:#9422af;--ink:#0f172a;--muted:#475569;--ok:#25D366;--card:#fff;--bg:#f8f9fa;--shadow:0 10px 30px rgba(0,0,0,.08);--radius:14px;">
  <style>
    .sk-wrap{max-width:1100px;margin:auto;padding:clamp(12px,2vw,28px);font:400 16px/1.8 system-ui,-apple-system,"Cairo","Noto Kufi Arabic",Arial}
    .sk-hero{background:linear-gradient(135deg,#f7f0fb,#fff);border-radius:var(--radius);box-shadow:var(--shadow);padding:28px;border:1px solid #eee}
    .sk-hero h1{margin:.2em 0 .3em;font-size:clamp(24px,3.2vw,34px);color:var(--ink)}
    .sk-hero p{color:var(--muted);margin:0}
    .sk-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:24px;margin-top:22px}
    .sk-card{background:var(--card);border:1px solid #eee;border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)}
    .sk-card h2,.sk-card h3{margin:0 0 12px;color:var(--ink);font-size:clamp(18px,2.5vw,22px)}
    .sk-row{display:flex;gap:12px;align-items:flex-start;margin:10px 0}
    .sk-badge{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;font-size:18px;font-weight:700}
    .sk-badge.mail{background:var(--brand)} .sk-badge.tel{background:var(--brand)} .sk-badge.wa{background:var(--ok)}
    .sk-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
    .sk-btn{display:inline-block;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700;border:2px solid transparent;transition:.2s}
    .sk-btn.primary{background:var(--brand);color:#fff}
    .sk-btn.primary:hover{opacity:.92}
    .sk-btn.ghost{background:#fff;color:var(--brand);border-color:var(--brand)}
    .sk-list{display:grid;gap:8px;color:var(--muted)}
    .sk-hours{display:grid;gap:6px}
    .sk-hours div{display:flex;justify-content:space-between;border-bottom:1px dashed #eee;padding:6px 0;color:var(--ink)}
    .sk-cta{background:linear-gradient(135deg,var(--brand),#b15ed2);color:#fff;border-radius:var(--radius);padding:18px;margin-top:22px}
    @media (max-width:900px){.sk-grid{grid-template-columns:1fr}}
  </style>

  <div class="sk-wrap">
    <!-- HERO -->
    <div class="sk-hero" aria-label="قسم الترحيب بالتواصل">
      <h1>تواصل معنا</h1>
      <p><strong>فريق الأطفال المبتكرون الكويت</strong> يسعد بتواصلكم في أي وقت.</p>
      <div class="sk-actions" style="margin-top:14px">
        <a class="sk-btn primary" href="https://wa.me/96550424642" target="_blank" rel="noopener">تواصل عبر الواتساب</a>
        <a class="sk-btn ghost" href="mailto:kuwait-info@smart-kids.me">أرسل إيميل</a>
        <a class="sk-btn ghost" href="tel:+96550424642">اتصل بنا</a>
      </div>
    </div>

    <!-- GRID -->
    <div class="sk-grid" style="margin-top:18px">
      <!-- Left: Details -->
      <div class="sk-card" aria-label="معلومات التواصل">
        <h2>📞 معلومات التواصل</h2>

        <div class="sk-row">
          <div class="sk-badge" style="background:var(--brand)">🏪</div>
          <div>
            <strong>اسم المتجر:</strong><br>
            Smart Kids Kuwait — الأطفال المبتكرون الكويت
          </div>
        </div>

        <div class="sk-row">
          <div class="sk-badge tel">📱</div>
          <div>
            <strong>الهاتف/الواتساب:</strong><br>
            <a href="tel:+96550424642" style="color:var(--ink);text-decoration:none">+965 5042 4642</a>
            &nbsp;|&nbsp;
            <a href="https://wa.me/96550424642" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none">WhatsApp</a>
          </div>
        </div>

        <div class="sk-row">
          <div class="sk-badge mail">📧</div>
          <div>
            <strong>البريد الإلكتروني:</strong><br>
            <a href="mailto:kuwait-info@smart-kids.me" style="color:var(--brand);text-decoration:none">kuwait-info@smart-kids.me</a>
          </div>
        </div>

        <div class="sk-row">
          <div class="sk-badge" style="background:var(--brand)">📍</div>
          <div>
            <strong>العنوان:</strong><br>
            M Square Complex, Floor 4, Al Mirqab Block 3,<br>
            Kuwait City, Al Asimah, Kuwait — Postal Code: 15003
          </div>
        </div>

        <div class="sk-row">
          <div class="sk-badge" style="background:var(--brand)">🌐</div>
          <div>
            <strong>الموقع الإلكتروني:</strong><br>
            <a href="https://smartkidskw.com" target="_blank" rel="noopener" style="color:var(--brand);text-decoration:none">smartkidskw.com</a>
          </div>
        </div>
      </div>
      <!-- End Left: Details -->
    </div>
  </div>
</section>
`;

export default function ContactUsPage() {
  return <div dangerouslySetInnerHTML={{ __html: HTML }} />;
}