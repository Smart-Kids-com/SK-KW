(function () {
  const FOOTER_STYLES_ID = 'site-footer-shared-styles';

  function injectFooterStyles() {
    if (document.getElementById(FOOTER_STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = FOOTER_STYLES_ID;
    style.textContent = `
      .site-footer{
        margin-top: 32px;
        color: #fff;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 118, 226, .14), transparent 30%),
          radial-gradient(circle at 84% 18%, rgba(98, 147, 255, .10), transparent 32%),
          linear-gradient(180deg, #65177c 0%, #5a0f6c 52%, #50085f 100%);
        border-top: 1px solid rgba(255,255,255,.10);
        isolation: isolate;
      }

      .site-footer::before{
        content:"";
        position:absolute;
        inset: 0;
        pointer-events:none;
        z-index:0;
        background:
          linear-gradient(135deg, rgba(255,255,255,.035), transparent 42%),
          linear-gradient(315deg, rgba(255,255,255,.028), transparent 48%);
        opacity: .70;
      }

      .site-footer::after{
        content:"";
        position:absolute;
        left: 50%;
        bottom: -190px;
        width: 650px;
        height: 300px;
        transform: translateX(-50%);
        border-radius: 999px;
        pointer-events:none;
        z-index:0;
        background:
          radial-gradient(circle at 50% 42%, rgba(185, 68, 232, .14), transparent 62%);
        filter: blur(20px);
        opacity: .58;
      }

      .site-footer__topline{
        height: 6px;
        background:
          linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
        border-top: 1px solid rgba(255,255,255,.04);
        position: relative;
        z-index: 1;
      }

      .site-footer__inner{
        max-width: 1120px;
        margin: 0 auto;
        padding: 24px 18px 16px;
        text-align: center;
        position: relative;
        z-index: 1;
      }

      .site-footer__site-link{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 0 16px;
        color: rgba(255,255,255,.94);
        text-decoration: none;
        font-size: clamp(14px, 2.3vw, 18px);
        font-weight: 900;
        margin-bottom: 13px;
        border-radius: 999px;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.14);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.14),
          0 8px 20px rgba(34, 0, 54, .14);
      }

      .site-footer__company{
        max-width: 760px;
        margin: 0 auto 6px;
        font-size: clamp(16px, 2.35vw, 22px);
        font-weight: 900;
        line-height: 1.35;
        letter-spacing: .02em;
        color: #fff;
        text-shadow: 0 4px 16px rgba(33, 0, 52, .22);
      }

      .site-footer__rights{
        font-size: clamp(13px, 2vw, 16px);
        line-height: 1.5;
        margin-bottom: 18px;
        color: rgba(255,255,255,.80);
      }

      .site-footer__newsletter-title{
        font-size: clamp(18px, 2.8vw, 24px);
        font-weight: 900;
        line-height: 1.35;
        margin-bottom: 15px;
        color: #fff;
        text-shadow: 0 4px 16px rgba(33, 0, 52, .24);
      }

      .site-footer__newsletter{
        max-width: 720px;
        margin: 0 auto 18px;
        display: grid;
        grid-template-columns: 58px 1fr;
        align-items: stretch;
        border: 2px solid rgba(255,255,255,.16);
        border-radius: 20px;
        overflow: hidden;
        background: rgba(255,255,255,.075);
        box-shadow:
          0 12px 28px rgba(35, 0, 55, .18),
          inset 0 1px 0 rgba(255,255,255,.11);
      }

      .site-footer__newsletter-btn{
        border: 0;
        background: rgba(255,255,255,.055);
        color: #fff;
        font-size: 28px;
        cursor: pointer;
      }

      .site-footer__newsletter-input{
        min-width: 0;
        border: 0;
        outline: none;
        background: transparent;
        color: #fff;
        font-size: 17px;
        padding: 13px 17px;
        text-align: right;
      }

      .site-footer__newsletter-input::placeholder{
        color: rgba(255,255,255,.72);
      }

      .site-footer__social{
        display: grid;
        grid-template-columns: repeat(6, 44px);
        justify-content: center;
        align-items: center;
        gap: 11px;
        padding: 4px 10px 0;
        margin: 0 auto;
      }

      .site-footer__social a{
        width: 44px;
        height: 44px;
        border-radius: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s ease, background .2s ease, border-color .2s ease;
        background:
          linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.055));
        border: 1px solid rgba(255,255,255,.14);
        box-shadow:
          0 10px 22px rgba(28, 0, 48, .16),
          inset 0 1px 0 rgba(255,255,255,.14);
      }

      .site-footer__social a:hover{
        transform: translateY(-2px) scale(1.04);
        background:
          linear-gradient(145deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
        border-color: rgba(255,255,255,.22);
      }

      .site-footer__social img{
        width: 24px;
        height: 24px;
        object-fit: contain;
        display: block;
      }

      .site-footer__bottom{
        border-top: 1px solid rgba(255,255,255,.09);
        padding: 16px 18px 22px;
        text-align: center;
        position: relative;
        z-index: 1;
        background: transparent;
      }

      .site-footer__copyright{
        color: rgba(255,255,255,.80);
        font-size: clamp(12.5px, 2vw, 16px);
        line-height: 1.55;
        margin-bottom: 15px;
      }

      .site-footer__links{
        max-width: 980px;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        gap: 9px;
        flex-wrap: wrap;
      }

      .site-footer__links a{
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 7px 14px;
        border-radius: 999px;
        font-size: clamp(12.5px, 2vw, 14px);
        font-weight: 800;
        background:
          linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.06));
        border: 1px solid rgba(255,255,255,.18);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.16),
          0 8px 18px rgba(35, 0, 55, .14);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform .2s ease, border-color .2s ease, background .2s ease;
      }

      .site-footer__links a:hover{
        transform: translateY(-1px);
        border-color: rgba(255,255,255,.28);
        background:
          linear-gradient(145deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
      }

      @media (max-width: 768px){
        .site-footer{
          margin-top: 28px;
        }

        .site-footer__topline{
          height: 5px;
        }

        .site-footer__inner{
          padding: 20px 14px 14px;
        }

        .site-footer__site-link{
          min-height: 32px;
          padding: 0 13px;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .site-footer__company{
          font-size: 16px;
          max-width: 330px;
          margin-bottom: 5px;
        }

        .site-footer__rights{
          font-size: 13px;
          margin-bottom: 15px;
        }

        .site-footer__newsletter-title{
          font-size: 18px;
          margin: 0 auto 14px;
          max-width: 340px;
        }

        .site-footer__newsletter{
          grid-template-columns: 52px 1fr;
          border-radius: 17px;
          margin-bottom: 16px;
        }

        .site-footer__newsletter-btn{
          font-size: 25px;
        }

        .site-footer__newsletter-input{
          font-size: 15px;
          padding: 11px 13px;
        }

        .site-footer__social{
          grid-template-columns: repeat(3, 42px);
          gap: 11px 15px;
          padding-top: 3px;
          max-width: 186px;
        }

        .site-footer__social a{
          width: 42px;
          height: 42px;
          border-radius: 14px;
        }

        .site-footer__social img{
          width: 22px;
          height: 22px;
        }

        .site-footer__bottom{
          padding: 14px 12px 18px;
        }

        .site-footer__copyright{
          font-size: 12.5px;
          margin-bottom: 14px;
        }

        .site-footer__links{
          max-width: 360px;
          gap: 8px;
        }

        .site-footer__links a{
          min-height: 36px;
          padding: 7px 12px;
          font-size: 12.5px;
        }
      }

      @media (max-width: 390px){
        .site-footer__links{
          max-width: 330px;
          gap: 7px;
        }

        .site-footer__links a{
          font-size: 12px;
          padding: 7px 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const SOCIAL_MAP = [
    { key: 'snapchatUrl',   label: 'Snapchat',  img: '/icon-snapchat.webp'  },
    { key: 'pinterestUrl',  label: 'Pinterest', img: '/icon-pinterest.webp' },
    { key: 'tiktokUrl',     label: 'TikTok',    img: '/icon-tiktok.webp'    },
    { key: 'youtubeUrl',    label: 'YouTube',   img: '/icon-youtube.webp'   },
    { key: 'instagramUrl',  label: 'Instagram', img: '/icon-instagram.webp' },
    { key: 'facebookUrl',   label: 'Facebook',  img: '/icon-facebook.webp'  },
  ];

  function applyThemeToFooter(mountPoint, settings) {
    if (!settings) return;

    function safeUrl(val) {
      const s = String(val || '').trim();
      return /^https?:\/\//i.test(s) ? s : null;
    }

    const activeSocials = SOCIAL_MAP
      .map(s => ({ ...s, url: safeUrl(settings[s.key]) }))
      .filter(s => s.url);

    if (activeSocials.length > 0) {
      const socialContainer = mountPoint.querySelector('.site-footer__social');
      if (socialContainer) {
        socialContainer.innerHTML = '';
        activeSocials.forEach(s => {
          const a = document.createElement('a');
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.setAttribute('aria-label', s.label);

          const img = document.createElement('img');
          img.src = s.img;
          img.alt = s.label;

          a.appendChild(img);
          socialContainer.appendChild(a);
        });
      }
    }

    if (settings.footerCompany) {
      const el = mountPoint.querySelector('.site-footer__company');
      if (el) el.textContent = settings.footerCompany;
    }

    if (settings.footerCopyright) {
      const el = mountPoint.querySelector('.site-footer__copyright');
      if (el) el.textContent = settings.footerCopyright;
    }

    const siteUrl = safeUrl(settings.footerSiteUrl);
    if (siteUrl) {
      const el = mountPoint.querySelector('.site-footer__site-link');
      if (el) {
        el.href = siteUrl;
        el.textContent = siteUrl.replace(/^https?:\/\//, '');
      }
    }

    if (settings.footerSocialTitle) {
      const el = mountPoint.querySelector('.site-footer__newsletter-title');
      if (el) el.textContent = settings.footerSocialTitle;
    }
  }

  async function loadFooter() {
    const mountPoint = document.getElementById('site-footer');
    if (!mountPoint) return;

    try {
      const response = await fetch('./footer.html', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load footer.html');

      const html = await response.text();

      injectFooterStyles();
      mountPoint.innerHTML = html;

      try {
        const settingsRes = await fetch('/api/theme/settings', { cache: 'no-store' });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData && settingsData.success) {
            applyThemeToFooter(mountPoint, settingsData.data || {});
          }
        }
      } catch {
        // Keep static footer on theme API error
      }
    } catch (error) {
      console.error('Footer load error:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', loadFooter);
})();