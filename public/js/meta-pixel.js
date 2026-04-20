(function (window, document) {
  'use strict';

  const CONFIG = {
pixelId: '899390561983033',    currency: 'KWD',
    debug: false
  };

  function logDebug(...args) {
    if (CONFIG.debug) {
      console.log('[Meta Pixel]', ...args);
    }
  }

  function isValidPixelId(value) {
    return typeof value === 'string' && /^\d{8,20}$/.test(value.trim());
  }

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function normalizeIds(ids) {
    return toArray(ids)
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  function normalizeName(value) {
    return String(value || '').trim();
  }

  function ensureFbqLoaded() {
    if (window.fbq) return true;

    if (!isValidPixelId(CONFIG.pixelId)) {
      console.warn('[Meta Pixel] Invalid pixel id');
      return false;
    }

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    return true;
  }

  function initPixel() {
    if (!ensureFbqLoaded()) return false;

    if (window.__SMARTKIDS_PIXEL_INITIALIZED__) {
      logDebug('Pixel already initialized');
      return true;
    }

    window.fbq('init', CONFIG.pixelId);
    window.fbq('track', 'PageView');
    window.__SMARTKIDS_PIXEL_INITIALIZED__ = true;

    logDebug('Initialized with PageView');
    return true;
  }

  function track(eventName, payload = {}) {
    if (!window.fbq) {
      logDebug('fbq not ready, skipped event:', eventName, payload);
      return;
    }

    window.fbq('track', eventName, payload);
    logDebug('Tracked:', eventName, payload);
  }

  function trackCustom(eventName, payload = {}) {
    if (!window.fbq) {
      logDebug('fbq not ready, skipped custom event:', eventName, payload);
      return;
    }

    window.fbq('trackCustom', eventName, payload);
    logDebug('Tracked custom:', eventName, payload);
  }

  function trackViewContent(data = {}) {
    track('ViewContent', {
      content_ids: normalizeIds(data.id || data.ids),
      content_name: normalizeName(data.name),
      content_type: data.contentType || 'product',
      value: toNumber(data.value ?? data.price, 0),
      currency: data.currency || CONFIG.currency
    });
  }

  function trackAddToCart(data = {}) {
    track('AddToCart', {
      content_ids: normalizeIds(data.id || data.ids),
      content_name: normalizeName(data.name),
      content_type: data.contentType || 'product',
      value: toNumber(data.value ?? data.price, 0),
      currency: data.currency || CONFIG.currency,
      num_items: toNumber(data.quantity, 1)
    });
  }

  function trackInitiateCheckout(data = {}) {
    track('InitiateCheckout', {
      value: toNumber(data.value, 0),
      currency: data.currency || CONFIG.currency,
      num_items: toNumber(data.quantity ?? data.num_items, 0),
      content_ids: normalizeIds(data.ids)
    });
  }

  function trackPurchase(data = {}) {
    track('Purchase', {
      value: toNumber(data.value, 0),
      currency: data.currency || CONFIG.currency,
      num_items: toNumber(data.quantity ?? data.num_items, 0),
      content_ids: normalizeIds(data.ids),
      content_type: data.contentType || 'product'
    });
  }

  function trackSearch(data = {}) {
    track('Search', {
      search_string: normalizeName(data.searchString || data.query || '')
    });
  }

  function trackContact(data = {}) {
    track('Contact', {
      contact_channel: normalizeName(data.channel || 'website')
    });
  }

  function trackPageView() {
    track('PageView', {});
  }

  window.SmartKidsPixel = {
    config: CONFIG,
    init: initPixel,
    track,
    trackCustom,
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackSearch,
    trackContact
  };

  initPixel();
})(window, document);