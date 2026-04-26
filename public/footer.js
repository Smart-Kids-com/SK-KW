(function () {
  const FOOTER_STYLES_ID = 'site-footer-shared-styles';

  function injectFooterStyles() {
    if (document.getElementById(FOOTER_STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = FOOTER_STYLES_ID;
    style.textContent = `
      .site-footer{
        margin-top: 42px;
        background:
          radial-gradient(circle at 16% 12%, rgba(255, 115, 222, .20), transparent 28%),
          radial-gradient(circle at 86% 16%, rgba(95, 147, 255, .15), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(255,255,255,.08), transparent 34%),
          linear-gradient(180deg, #5f1374 0%, #5a116e 48%, #43074f 100%);
        color: #fff;
        position: relative;
        overflow: hidden;
        border-top: 1px solid rgba(255,255,255,.12);
      }

      .site-footer::before,
      .site-footer::after{
        content:"";
        position:absolute;
        pointer-events:none;
        border-radius: 48% 52% 58% 42%;
        opacity:.58;
        filter: blur(5px);
        z-index:0;
      }

      .site-footer::before{
        width: 360px;
        height: 360px;
        right: -150px;
        top: -150px;
        background:
          radial-gradient(circle at 32% 28%, rgba(255,255,255,.32), transparent 16%),
          radial-gradient(circle at 50% 50%, rgba(202, 84, 255, .34), transparent 42%),
          radial-gradient(circle at 74% 72%, rgba(88, 145, 255, .18), transparent 48%);
      }

      .site-footer::after{
        width: 310px;
        height: 310px;
        left: -135px;
        bottom: -145px;
        background:
          radial-gradient(circle at 35% 30%, rgba(255,255,255,.24), transparent 18%),
          radial-gradient(circle at 50% 50%, rgba(255, 104, 214, .24), transparent 44%),
          radial-gradient(circle at 72% 70%, rgba(128, 93, 255, .20), transparent 50%);
      }

      .site-footer__topline{
        height: 10px;
        background:
          linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.16), rgba(255,255,255,.04));
        border-top: 1px solid rgba(255,255,255,.06);
        box-shadow: inset 0 -1px 0 rgba(255,255,255,.06);
        position: relative;
        z-index: 1;
      }

      .site-footer__inner{
        max-width: 1160px;
        margin: 0 auto;
        padding: 34px 18px 22px;
        text-align: center;
        position: relative;
        z-index: 1;
      }

      .site-footer__site-link{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 16px;
        color: rgba(255,255,255,.94);
        text-decoration: none;
        font-size: clamp(15px, 2.6vw, 20px);
        font-weight: 800;
        margin-bottom: 16px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.14);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.16),
          0 10px 24px rgba(34, 0, 54, .18);
      }

      .site-footer__company{
        font-size: clamp(16px, 2.5vw, 24px);
        font-weight: 900;
        line-height: 1.35;
        margin-bottom: 8px;
        letter-spacing: .02em;
        color: #fff;
        text-shadow: 0 4px 18px rgba(33, 0, 52, .30);
      }

      .site-footer__rights{
        font-size: clamp(14px, 2.2vw, 18px);
        line-height: 1.55;
        margin-bottom: 24px;
        color: rgba(255,255,255,.82);
      }

      .site-footer__newsletter-title{
        font-size: clamp(18px, 3vw, 26px);
        font-weight: 900;
        line-height: 1.35;
        margin-bottom: 18px;
        color: #fff;
        text-shadow: 0 4px 18px rgba(33, 0, 52, .32);
      }

      .site-footer__newsletter{
        max-width: 720px;
        margin: 0 auto 22px;
        display: grid;
        grid-template-columns: 62px 1fr;
        align-items: stretch;
        border: 2px solid rgba(255,255,255,.18);
        border-radius: 22px;
        overflow: hidden;
        background: rgba(255,255,255,.08);
        box-shadow:
          0 14px 34px rgba(35, 0, 55, .22),
          inset 0 1px 0 rgba(255,255,255,.13);
      }

      .site-footer__newsletter-btn{
        border: 0;
        background: rgba(255,255,255,.06);
        color: #fff;
        font-size: 30px;
        cursor: pointer;
      }

      .site-footer__newsletter-input{
        min-width: 0;
        border: 0;
        outline: none;
        background: transparent;
        color: #fff;
        font-size: 18px;
        padding: 14px 18px;
        text-align: right;
      }

      .site-footer__newsletter-input::placeholder{
        color: rgba(255,255,255,.75);
      }

      .site-footer__social{
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 6px 10px 2px;
      }

      .site-footer__social a{
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s ease, background .2s ease, border-color .2s ease;
        background:
          linear-gradient(145deg, rgba(255,255,255,.15), rgba(255,255,255,.06));
        border: 1px solid rgba(255,255,255,.15);
        box-shadow:
          0 12px 26px rgba(28, 0, 48, .22),
          inset 0 1px 0 rgba(255,255,255,.16);
      }

      .site-footer__social a:hover{
        transform: translateY(-2px) scale(1.04);
        background:
          linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.09));
        border-color: rgba(255,255,255,.24);
      }

      .site-footer__social img{
        width: 25px;
        height: 25px;
        object-fit: contain;
        display: block;
      }

      .site-footer__bottom{
        border-top: 1px solid rgba(255,255,255,.10);
        padding: 20px 18px 26px;
        text-align: center;
        position: relative;
        z-index: 1;
      }

      .site-footer__copyright{
        color: rgba(255,255,255,.82);
        font-size: clamp(13px, 2.1vw, 17px);
        line-height: 1.6;
        margin-bottom: 18px;
      }

      .site-footer__links{
        max-width: 980px;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .site-footer__links a{
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 8px 16px;
        border-radius: 999px;
        font-size: clamp(13px, 2.2vw, 15px);
        font-weight: 800;
        background:
          linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.07));
        border: 1px solid rgba(255,255,255,.20);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.18),
          0 10px 22px rgba(35, 0, 55, .18);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform .2s ease, border-color .2s ease, background .2s ease;
      }

      .site-footer__links a:hover{
        transform: translateY(-1px);
        border-color: rgba(255,255,255,.30);
        background:
          linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.09));
      }

      @media (max-width: 768px){
        .site-footer{
          margin-top: 34px;
        }

        .site-footer__topline{
          height: 8px;
        }

        .site-footer__inner{
          padding: 28px 14px 18px;
        }

        .site-footer__site-link{
          min-height: 36px;
          padding: 0 14px;
          font-size: 15px;
          margin-bottom: 14px;
        }

        .site-footer__company{
          font-size: 17px;
          margin-bottom: 6px;
        }

        .site-footer__rights{
          font-size: 14px;
          margin-bottom: 20px;
        }

        .site-footer__newsletter-title{
          font-size: 20px;
          margin-bottom: 16px;
        }

        .site-footer__newsletter{
          grid-template-columns: 54px 1fr;
          border-radius: 18px;
          margin-bottom: 18px;
        }

        .site-footer__newsletter-btn{
          font-size: 26px;
        }

        .site-footer__newsletter-input{
          font-size: 16px;
          padding: 12px 14px;
        }

        .site-footer__social{
          gap: 9px;
          padding-top: 4px;
        }

        .site-footer__social a{
          width: 40px;
          height: 40px;
          border-radius: 14px;
        }

        .site-footer__social img{
          width: 22px;
          height: 22px;
        }

        .site-footer__bottom{
          padding: 18px 12px 22px;
        }

        .site-footer__copyright{
          font-size: 13px;
          margin-bottom: 16px;
        }

        .site-footer__links{
          gap: 8px;
        }

        .site-footer__links a{
          min-height: 38px;
          padding: 7px 12px;
          font-size: 13px;
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