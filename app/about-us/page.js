// app/about-us/page.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HTML = `
<style>
  :root{
    --brand:#10b981; --ink:#0f172a; --muted:#475569; --bg:#ffffff; --soft:#f7f7fb; --card:#ffffff;
    --radius:20px; --shadow:0 16px 40px rgba(2,10,28,.08); --border:1px solid rgba(15,23,42,.08);
  }
  ,:before,*:after{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.8 system-ui,-apple-system,BlinkMacSystemFont,"cairo",Roboto,"Noto Kufi Arabic","Noto Naskh Arabic","Helvetica Neue",Arial,sans-serif}
  img{max-width:100%;height:auto;display:block}

  .wrap{max-width:1600px;margin:auto;padding:clamp(12px,2vw,28px)}
  .hero{position:relative;border-radius:calc(var(--radius) + 8px);overflow:hidden;padding:clamp(28px,3.5vw,56px);
    background:radial-gradient(1200px 480px at 120% -10%, rgba(16,185,129,.18) 0%, transparent 60%),
               radial-gradient(900px 380px at -10% 110%, rgba(16,185,129,.18) 0%, transparent 55%),
               linear-gradient(135deg,#f8fafc,#eefcf7);
    border:var(--border);box-shadow:var(--shadow)}
  .hero-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:36px;align-items:center}
  .kicker{color:var(--brand);font-weight:1000;letter-spacing:.05em}
  h1{margin:.2em 0 .4em;font-size:clamp(26px,3vw,40px);line-height:1.15}
  .lead{color:var(--muted);font-size:clamp(16px,2.2vw,19px)}
  .hero .ph{border-radius:20px}
  .btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;justify-content:center}
  .btn{background:var(--brand);color:#fff;border:none;border-radius:12px;padding:12px 18px;font-weight:700;
       text-decoration:none;display:inline-flex;gap:8px;align-items:center;transition:.3s}
  .btn:hover{opacity:.9;transform:scale(1.03)}
  .btn.ghost{background:transparent;color:var(--brand);border:2px solid var(--brand)}

  /* STATS */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin:34px 0 8px}
  .stat{background:var(--card);border:var(--border);border-radius:18px;padding:22px;text-align:center;
        box-shadow:var(--shadow);display:grid;gap:12px;align-content:start}
  .stat .pic{width:100%;aspect-ratio:1/1;border-radius:14px;overflow:hidden;display:grid;place-items:center;background:#f5fffb}
  .stat .pic img{width:100%;height:100%;object-fit:contain}
  .stat b{display:block;font-size:clamp(22px,2.8vw,32px);color:var(--brand);margin-top:2px}
  .stat span{color:var(--muted);font-size:clamp(14px,1.6vw,16px);line-height:1.6}

  .section{margin:52px 0}
  .section h2{font-size:clamp(22px,3.3vw,32px);margin:0 0 18px}
  .grid3{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .card{background:var(--card);border:var(--border);border-radius:16px;padding:20px;box-shadow:var(--shadow)}
  .section .card > .icon {
    width:44px;height:44px;border-radius:12px;
    background:linear-gradient(135deg,var(--brand),#34d399);
    display:grid;place-items:center;color:#fff;font-weight:900;margin-bottom:10px;
  }

  .timeline{position:relative;padding:8px 0}
  .timeline:before{content:"";position:absolute;inset-inline-start:17px;top:0;bottom:0;width:2px;background:linear-gradient(var(--brand),#34d399);opacity:.25}
  .step{display:grid;grid-template-columns:34px 1fr;gap:14px;margin-bottom:14px}
  .dot{width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid var(--brand);display:grid;place-items:center;font-weight:800;color:var(--brand)}

  .gallery{display:grid;grid-template-columns:2fr 1fr;gap:16px}
  .gallery .ph{aspect-ratio:16/9;border-radius:16px}
  .gallery .stack{display:grid;grid-template-rows:1fr 1fr;gap:16px}

  .team{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .member{background:var(--card);border:var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
  .member .ph{aspect-ratio:1/1}
  .member .meta{padding:14px}
  .meta h3{margin:0;font-size:18px}
  .meta p{margin:.3em 0 0;color:var(--muted);font-size:14px}

  .cta{background:linear-gradient(135deg,var(--brand),#34d399);color:#fff;border-radius:20px;padding:28px;display:grid;gap:10px;align-items:center}
  .cta .row{display:flex;flex-wrap:wrap;gap:12px}

  .ph{
    background:radial-gradient(circle at 10% 10%, rgba(255,255,255,.75), transparent 40%), linear-gradient(135deg,#e2f7ee,#f5fffb);
    border:2px dashed rgba(16,185,129,.35);display:grid;place-items:center;color:#089981;font-weight:700;text-align:center}
  .ph > img{display:block;width:100%;height:auto;border-radius:inherit}

  @media (max-width:1180px){ .hero-grid{grid-template-columns:1fr} }
  @media (max-width:980px){ .stats{grid-template-columns:repeat(2,1fr)} .grid3{grid-template-columns:1fr 1fr} }
  @media (max-width:560px){ .grid3{grid-template-columns:1fr} }
</style>

<div class="wrap" dir="rtl" style="text-align:right">
  <!-- HERO -->
  <section class="hero">
    <div class="hero-grid">
      <div>
        <h1 class="kicker" style="text-align:right;"><span style="color:#00b320;"><strong>من نحن!</strong></span></h1>
        <div class="kicker" style="text-align:left;"><br><strong>قِصَصٌ تُربّي وتُلهم</strong><br></div>
        <h2 style="text-align:right;">
          <span style="color:#0d6328;">نُقَدِّمُ مُحْتَوًى تَعْلِيمِيًّا مُمتِعًا لِلأَطْفَالِ</span><br>
          <span style="color:#0d6328;">نَوَّعْنَا التَّعْلِيمَ فَابْتَكَرْنَا الْمُتْعَةَ</span>
        </h2>
        <h6 class="lead" style="text-align:right;"><strong>في الأطفال المبتكرون <span style="color:#08280e;">نؤمن أن القراءة رحلة تبدأ بسؤال صغير. نقدّم منتجات تعليمية مبتكرة وترفيهية للأطفال، بتركيز على تنمية المهارات اللغوية والحركية والعقلية، ومحتوى عربيّ عالي الجودة يُنمّي الفضول والخيال، ويُسعد الأطفال والأهل معًا.</span></strong></h6>
        <div class="ph"><img decoding="async" alt="بانر المتجر" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Store__png.jpg?v=1757870508"></div>
        <div class="btns">
          <a href="https://smart-kids.me" class="btn">تسوّق الآن</a>
          <a href="https://smart-kids.me/policies/contact-information" class="btn ghost">تواصل معنا</a>
        </div>
      </div>
    </div>
  </section>

  <!-- الإحصائيات -->
  <section class="hero" style="margin-top:24px;">
    <div class="hero-grid">
      <div><br></div>
      <div class="stats">
        <div class="stat">
          <div class="pic"><img alt="منتجات تعليمية" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/educational-products_png.png?v=1758068293"></div>
          <b>+300</b> <span>منتج تعليمي متنوع</span>
        </div>
        <div class="stat">
          <div class="pic"><img alt="قراء سعداء" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/happy-readers_png.png?v=1758068288"></div>
          <b>+25K</b> <span>قارئ صغير سعيد</span>
        </div>
        <div class="stat">
          <div class="pic"><img alt="تقييمات المتجر" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/store-reviews_png.png?v=1758068262"></div>
          <b>4.9★</b> <span>تقييمات المتجر</span>
        </div>
        <div class="stat">
          <div class="pic"><img alt="توصيل الكويت" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/kuwait-delivery_png.png?v=1758068267"></div>
          <b>التوصيل</b> <span>لكل مدن الكويت</span>
        </div>
      </div>
    </div>
  </section>

  <!-- VALUES -->
  <section class="section">
    <h2>قيمنا</h2>
    <div class="grid3">
      <div class="card">
        <div class="icon">1</div>
        <h3><span>جودة مادية وتصميمية</span></h3>
        <p class="muted"><strong><span>ورق متين، طباعة زاهية، وتجربة استخدام مدروسة تناسب أيدي الصغار.</span></strong></p>
      </div>
      <div class="card">
        <div class="icon">2</div>
        <h3><span>محتوى عربي أصيل</span></h3>
        <p><strong>قصص وأنشطة باللغة العربية تُحاكي واقع الطفل وتُعزّز لغته وهويته.</strong></p>
      </div>
      <div class="card">
        <div class="icon">3</div>
        <h3><span>تعلم تفاعلي ممتع</span></h3>
        <p><strong>مجموعات وأنشطة تساعد على التعلّم باللعب وتنمية المهارات خطوة بخطوة.</strong></p>
      </div>
    </div>
  </section>

  <!-- STORY / TIMELINE -->
  <section class="section">
    <h2><span><strong>حكاية الأطفال المبتكرون</strong></span></h2>
    <div class="card">
      <div class="timeline">
        <div class="step">
          <div class="dot">1</div>
          <div>
            <h3>البداية</h3>
            <p class="muted">بدأت حكايتنا من شغفٍ بسيط: نوفر لأطفالنا كتبًا ممتعة وهادفة تجمع بين المتعة والمعرفة.</p>
          </div>
        </div>
        <div class="step">
          <div class="dot">2</div>
          <div>
            <h3>التوسع</h3>
            <p class="muted">جمعنا أفضل الإصدارات التربوية والقصص المصوّرة والأنشطة التفاعلية، بعناية تناسب كل عمر وتدعم العربية والإنجليزية.</p>
          </div>
        </div>
        <div class="step">
          <div class="dot">3</div>
          <div>
            <h3>اليوم</h3>
            <p class="muted">ومع كل طفل يفتح كتابًا من عندنا، نكبر حلمًا بأن تصبح القراءة عادة يومية وصديقًا يرافقهم في اكتشاف العالم.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- GALLERY + CTA -->
  <section class="section">
    <h2>نبذه عن منتجاتنا</h2>
    <p><img alt="صورة صفحة من نحن للمنتجات الإسلامية" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Islamic-sets-about-us-image.png?v=1757932164"></p>
    <h2>من مستودعنا</h2>
    <p><img alt="" src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Untitled_design_png.png?v=1758078545"></p>
    <h2><br></h2>

    <section class="section">
      <div class="cta">
        <h2 style="margin:0;">جاهزين نختار سوي أول كتاب؟</h2>
        <p style="margin:0 0 8px;">تواصل معنا على واتساب لأي استفسار أو ساعدنا نرشّح لك المناسب لعمر طفلك.</p>
        <div class="row">
          <a class="btn" href="https://wa.me/" rel="noopener" target="_blank">تحدث معنا الآن</a>
          <a class="btn ghost" href="https://smart-kids.me/policies/contact-information">معلومات التواصل</a>
        </div>
      </div>
    </section>
  </section>

  <!-- FOOT -->
  <section class="section" style="margin-bottom:18px;">
    <div class="card" style="display:grid;gap:12px;">
      <b><br></b>
      <div class="ph" style="aspect-ratio:16/7;border-radius:12px;overflow:hidden;">
        <img src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Logo_smart_kids-of-header-tag.png?v=1756574543" alt="شعار الموقع" style="width:100%;height:auto;">
      </div>
      <p class="muted" style="margin:0;"><br></p>
      <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn ghost" href="mailto:Kuwait-info@smart-kids.me">Kuwait-info@smart-kids.me</a>
        <a class="btn ghost" href="/policies/shipping-policy">سياسة الشحن</a>
        <a class="btn ghost" href="/policies/refund-policy">الاسترجاع والاستبدال</a>
      </div>
    </div>
  </section>
</div>
`;

export default function AboutUsPage() {
  return <div dangerouslySetInnerHTML={{ __html: HTML }} />;
}