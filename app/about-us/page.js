// app/about-us/page.js
// Server Component — يعرض صفحة "من نحن" بنفس التفاصيل التي ارسلتها

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CSS = `
  :root{
    --brand:#10b981; --ink:#0f172a; --muted:#475569; --bg:#ffffff; --soft:#f7f7fb; --card:#ffffff;
    --radius:20px; --shadow:0 16px 40px rgba(2,10,28,.08); --border:1px solid rgba(15,23,42,.08);
    --gold:#FFC033; --purple1:#4a2f86; --purple2:#6c50b5; --lav1:#cfc9ff; --lav2:#bdb7ff;
  }
  body{font-family:Amiri, serif}
  .about-wrap{max-width:1100px; margin:24px auto 56px; padding:0 16px}
  .hero{background:linear-gradient(180deg,#fff,#fafafe); border:var(--border); border-radius:24px; box-shadow:var(--shadow); padding:28px; display:grid; gap:18px}
  .hero h1{margin:0; font-size:2.2rem; font-weight:800; color:var(--purple1); line-height:1.25}
  .hero p{margin:0; color:#334155; font-size:1.1rem}
  .stats{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px}
  .stat{background:#fff; border:var(--border); border-radius:16px; box-shadow:var(--shadow); padding:18px; text-align:center}
  .stat strong{display:block; font-size:1.6rem; color:#0f172a}
  .stat span{color:#64748b; font-size:.95rem}

  .section{margin-top:28px; background:#fff; border:var(--border); border-radius:20px; box-shadow:var(--shadow); overflow:hidden}
  .section .head{padding:18px 20px; background:linear-gradient(180deg,#f7f7fb,#ffffff); border-bottom:var(--border)}
  .section .head h2{margin:0; font-size:1.4rem; color:#0f172a}
  .section .body{padding:20px; color:#1f2937; line-height:1.9; font-size:1.05rem}

  .grid-2{display:grid; grid-template-columns:1fr 1fr; gap:18px}
  .card{background:#fff; border:var(--border); border-radius:16px; box-shadow:var(--shadow); padding:18px}
  .card h3{margin:0 0 6px; color:#0f172a; font-size:1.15rem}
  .card p{margin:0; color:#334155}

  .cta{margin-top:22px; display:flex; gap:12px; flex-wrap:wrap}
  .btn{display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:0 20px; border-radius:9999px; font-weight:800; text-decoration:none; transition:.15s ease; cursor:pointer}
  .btn-primary{color:var(--gold); background:linear-gradient(180deg,var(--purple2),var(--purple1)); box-shadow:0 8px 24px rgba(76,48,150,.35)}
  .btn-outline{background:#fff; color:#4f46e5; border:2px solid #4f46e5}
  .btn:hover{transform:translateY(-2px)}

  .list{margin:0; padding:0 1.1rem; color:#0f172a}
  .list li{margin:.35rem 0}
  .note{background:#fff7ed; border:1px solid #fed7aa; color:#7c2d12; padding:12px 14px; border-radius:14px}

  @media (max-width:900px){
    .grid-2{grid-template-columns:1fr}
    .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
    .hero h1{font-size:1.8rem}
  }
  @media (max-width:600px){
    .stats{grid-template-columns:1fr}
  }
`;

const HTML = `
  <div class="about-wrap" dir="rtl">
    <section class="hero">
      <h1>عن SK Smart Kids</h1>
      <p>نحن نبتكر محتوى تعليمي ممتع باللغة العربية والإنجليزية للأطفال، عبر قصص تفاعلية، حقائب تعلم، كتب ناطقة، ومنتجات تُحفّز حب القراءة والتعلّم باللعب.</p>
      <div class="stats">
        <div class="stat"><strong>+29</strong><span>كتابًا مُحببًا للصغار</span></div>
        <div class="stat"><strong>+22</strong><span>كتابًا ناطقًا بالقلم</span></div>
        <div class="stat"><strong>+12</strong><span>قصصًا تفاعلية بالحركة</span></div>
      </div>
      <div class="cta">
        <a href="/collections/all" class="btn btn-primary">تسوّق الآن</a>
        <a href="https://wa.me/96550424642" target="_blank" rel="noopener" class="btn btn-outline">تواصل واتساب</a>
      </div>
    </section>

    <section class="section">
      <div class="head"><h2>رسالتنا</h2></div>
      <div class="body">
        نُقدّم تجربة تعلّمٍ ذاتية تفاعلية تُشجِّع الطفل على الاستكشاف، الاستماع، والنطق، من خلال محتويات ثرية تمزج بين الصوتيات والصور والحركة.
      </div>
    </section>

    <section class="section">
      <div class="head"><h2>ماذا نقدّم؟</h2></div>
      <div class="body grid-2">
        <div class="card">
          <h3>قصصي الصوتية</h3>
          <p>مكتبة صوتية ممتعة تُثري المفردات وتنمّي مهارات الاستماع.</p>
        </div>
        <div class="card">
          <h3>كتب ناطقة بالقلم</h3>
          <p>قلم قارئ مع كتب تعليمية تدعم التعلم الذاتي والقراءة المتدرجة.</p>
        </div>
        <div class="card">
          <h3>قصص ثلاثية الأبعاد</h3>
          <p>صفحات مُتحركة تُحوّل القراءة إلى مغامرة مُشوّقة.</p>
        </div>
        <div class="card">
          <h3>عروض تعليمية متكاملة</h3>
          <p>حِزم تعليمية منتقاة تغطي مهارات القراءة، الكلمات، والأصوات.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="head"><h2>قيمنا</h2></div>
      <div class="body">
        <ul class="list">
          <li>لغة عربية سليمة ومحتوى تربوي أصيل.</li>
          <li>بساطة في العرض مع جودة في التصميم والطباعة.</li>
          <li>تعلم باللعب عبر الصوت والحركة والتجربة.</li>
          <li>احترام وقت الأهل وتقديم أدلة استخدام واضحة.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="head"><h2>تواصل</h2></div>
      <div class="body">
        <div class="note">
          لأي استفسار، راسلنا مباشرة عبر واتساب: <strong><a href="https://wa.me/96550424642" target="_blank" rel="noopener">+965 50424642</a></strong>
        </div>
      </div>
    </section>
  </div>
`;

export default function AboutUsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  );
}
