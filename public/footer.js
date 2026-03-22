(function () {
  const FOOTER_STYLES_ID = 'site-footer-shared-styles';

  function injectFooterStyles() {
    if (document.getElementById(FOOTER_STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = FOOTER_STYLES_ID;
    style.textContent = `
      .site-footer{
        margin-top: 48px;
        background:
          linear-gradient(180deg, #6a1d84 0%, #5b1675 100%);
        color: #fff;
        position: relative;
        overflow: hidden;
      }

      .site-footer__topline{
        height: 26px;
        background: #5a1674;
        border-top: 1px solid rgba(255,255,255,.03);
        box-shadow: inset 0 -10px 0 rgba(54, 4, 67, .78);
      }

      .site-footer__inner{
        max-width: 1200px;
        margin: 0 auto;
        padding: 52px 20px 34px;
        text-align: center;
      }

      .site-footer__site-link{
        display: inline-block;
        color: #fff;
        text-decoration: underline;
        text-underline-offset: 6px;
        font-size: clamp(26px, 3.8vw, 38px);
        font-weight: 500;
        margin-bottom: 26px;
      }

      .site-footer__company{
        font-size: clamp(24px, 3vw, 46px);
        font-weight: 500;
        line-height: 1.3;
        margin-bottom: 10px;
        letter-spacing: .02em;
      }

      .site-footer__rights{
        font-size: clamp(21px, 2.4vw, 40px);
        line-height: 1.5;
        margin-bottom: 44px;
      }

      .site-footer__newsletter-title{
        font-size: clamp(28px, 3vw, 54px);
        font-weight: 700;
        line-height: 1.35;
        margin-bottom: 30px;
      }

      .site-footer__newsletter{
        max-width: 1080px;
        margin: 0 auto 34px;
        display: grid;
        grid-template-columns: 96px 1fr;
        align-items: stretch;
        border: 8px solid rgba(255,255,255,.9);
        border-radius: 34px;
        overflow: hidden;
        background: rgba(91, 22, 117, .55);
        box-shadow:
          0 12px 30px rgba(79, 10, 101, .35),
          inset 0 0 0 1px rgba(255,255,255,.06);
      }

      .site-footer__newsletter-btn{
        border: 0;
        background: transparent;
        color: #fff;
        font-size: clamp(42px, 4vw, 66px);
        cursor: pointer;
      }

      .site-footer__newsletter-input{
        min-width: 0;
        border: 0;
        outline: none;
        background: transparent;
        color: #fff;
        font-size: clamp(28px, 3vw, 52px);
        padding: 22px 28px;
        text-align: right;
      }

      .site-footer__newsletter-input::placeholder{
        color: rgba(255,255,255,.88);
      }

      .site-footer__social{
        display: flex;
        justify-content: center;
        align-items: center;
        gap: clamp(16px, 2vw, 34px);
        flex-wrap: wrap;
        padding: 22px 10px 8px;
      }

      .site-footer__social a{
        width: 58px;
        height: 58px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s ease;
      }

      .site-footer__social a:hover{
        transform: translateY(-2px) scale(1.04);
      }

      .site-footer__social img{
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .site-footer__bottom{
        border-top: 1px solid rgba(255,255,255,.10);
        padding: 26px 20px 34px;
        text-align: center;
      }

      .site-footer__copyright{
        color: rgba(255,255,255,.92);
        font-size: clamp(19px, 2.1vw, 34px);
        line-height: 1.6;
        margin-bottom: 26px;
      }

      .site-footer__links{
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        gap: 18px 18px;
        flex-wrap: wrap;
      }

      .site-footer__links a{
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 74px;
        padding: 10px 28px;
        border-radius: 999px;
        font-size: clamp(18px, 2vw, 28px);
        font-weight: 700;
        background:
          linear-gradient(180deg, rgba(197,138,255,.55) 0%, rgba(165,101,227,.4) 100%);
        border: 2px solid rgba(233, 202, 255, .7);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.45),
          0 8px 18px rgba(53, 4, 68, .18);
        backdrop-filter: blur(4px);
      }

      .site-footer__links a:hover{
        transform: translateY(-1px);
      }

      @media (max-width: 768px){
        .site-footer__inner{
          padding: 38px 16px 26px;
        }

        .site-footer__site-link{
          font-size: 24px;
          margin-bottom: 20px;
        }

        .site-footer__company{
          font-size: 20px;
        }

        .site-footer__rights{
          font-size: 18px;
          margin-bottom: 30px;
        }

        .site-footer__newsletter-title{
          font-size: 24px;
          margin-bottom: 20px;
        }

        .site-footer__newsletter{
          grid-template-columns: 74px 1fr;
          border-width: 6px;
          border-radius: 26px;
          margin-bottom: 24px;
        }

        .site-footer__newsletter-btn{
          font-size: 34px;
        }

        .site-footer__newsletter-input{
          font-size: 20px;
          padding: 18px 18px;
        }

        .site-footer__social a{
          width: 48px;
          height: 48px;
        }

        .site-footer__copyright{
          font-size: 16px;
          margin-bottom: 20px;
        }

        .site-footer__links{
          gap: 14px 12px;
        }

        .site-footer__links a{
          min-height: 56px;
          padding: 8px 20px;
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadFooter() {
    const mountPoint = document.getElementById('site-footer');
    if (!mountPoint) return;

    try {
      const response = await fetch('./footer.html', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load footer.html');
      }

      const html = await response.text();
      injectFooterStyles();
      mountPoint.innerHTML = html;
    } catch (error) {
      console.error('Footer load error:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', loadFooter);
})();