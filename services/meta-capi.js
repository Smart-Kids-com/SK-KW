'use strict';

const crypto = require('crypto');

const META_PIXEL_ID = String(process.env.META_PIXEL_ID || '').trim();
const META_CAPI_TOKEN = String(process.env.META_CAPI_TOKEN || '').trim();
const META_GRAPH_API_VERSION = String(process.env.META_GRAPH_API_VERSION || 'v25.0').trim();
const META_TEST_EVENT_CODE = String(process.env.META_TEST_EVENT_CODE || '').trim();

function safeText(value) {
  return String(value ?? '').trim();
}

function sha256(value) {
  const normalized = safeText(value);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizeEmail(value) {
  return safeText(value).toLowerCase();
}

function normalizePhone(value) {
  let digits = safeText(value).replace(/\D/g, '');

  // Kuwait local mobile numbers are commonly stored as 8 digits.
  // Meta matching works best with country code included, digits only.
  if (digits.length === 8) {
    digits = `965${digits}`;
  }

  return digits;
}

function parseCookies(req) {
  const header = safeText(req?.headers?.cookie);
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (!key) return acc;

    try {
      acc[key] = decodeURIComponent(value);
    } catch (_) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

function getClientIp(req) {
  const forwarded = safeText(req?.headers?.['x-forwarded-for']);
  const realIp = safeText(req?.headers?.['x-real-ip']);
  const socketIp = safeText(req?.socket?.remoteAddress);
  const reqIp = safeText(req?.ip);

  const value = forwarded
    ? forwarded.split(',')[0].trim()
    : (realIp || reqIp || socketIp);

  return value.replace(/^::ffff:/, '');
}

function getEventSourceUrl(req) {
  return (
    safeText(req?.headers?.referer) ||
    safeText(req?.headers?.referrer) ||
    safeText(req?.headers?.origin) ||
    'https://smartkidskw.com'
  );
}

function buildPurchaseEventId(order) {
  const orderNumber = safeText(order?.order_number);
  return orderNumber ? `purchase_${orderNumber}` : '';
}

function buildUserData(req, order) {
  const cookies = parseCookies(req);

  const emailHash = sha256(normalizeEmail(order?.customer_email));
  const phoneHash = sha256(normalizePhone(order?.customer_phone));
  const clientIp = getClientIp(req);
  const clientUserAgent = safeText(req?.headers?.['user-agent']);
  const fbp = safeText(cookies._fbp);
  const fbc = safeText(cookies._fbc);

  const userData = {};

  if (emailHash) userData.em = [emailHash];
  if (phoneHash) userData.ph = [phoneHash];
  if (clientIp) userData.client_ip_address = clientIp;
  if (clientUserAgent) userData.client_user_agent = clientUserAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  return userData;
}

function buildContents(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  return items
    .map((item) => {
      const id = safeText(item?.product_id ?? item?.id ?? item?.productId);
      const quantity = Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1);
      const itemPrice = Math.max(
        0,
        Number(item?.price ?? item?.product_price ?? item?.unit_price ?? 0) || 0
      );

      if (!id) return null;

      return {
        id,
        quantity,
        item_price: itemPrice
      };
    })
    .filter(Boolean);
}

function buildPurchasePayload(req, order) {
  const eventId = buildPurchaseEventId(order);

  if (!eventId) {
    throw new Error('Meta CAPI: missing order_number');
  }

  const contents = buildContents(order);
  const contentIds = contents.map((item) => item.id);

  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: getEventSourceUrl(req),
    user_data: buildUserData(req, order),
    custom_data: {
      currency: 'KWD',
      value: Math.max(0, Number(order?.total || 0) || 0),
      order_id: safeText(order?.order_number),
      content_type: 'product',
      content_ids: contentIds,
      contents
    }
  };

  const payload = { data: [event] };

  if (META_TEST_EVENT_CODE) {
    payload.test_event_code = META_TEST_EVENT_CODE;
  }

  return payload;
}

async function sendMetaPurchase({ req, order }) {
  // Local development or environments where CAPI is intentionally disabled.
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
    return {
      skipped: true,
      reason: 'META_PIXEL_ID or META_CAPI_TOKEN is missing'
    };
  }

  if (typeof fetch !== 'function') {
    throw new Error('Meta CAPI requires Node.js 18+ with global fetch support');
  }

  const payload = buildPurchasePayload(req, order);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const endpoint =
      `https://graph.facebook.com/${encodeURIComponent(META_GRAPH_API_VERSION)}/` +
      `${encodeURIComponent(META_PIXEL_ID)}/events?access_token=${encodeURIComponent(META_CAPI_TOKEN)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseText = await response.text();

    let responseBody = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch (_) {
      responseBody = null;
    }

    if (!response.ok) {
      const metaMessage =
        safeText(responseBody?.error?.message) ||
        `HTTP ${response.status}`;

      throw new Error(`Meta CAPI request failed: ${metaMessage}`);
    }

    return {
      success: true,
      eventId: payload.data[0].event_id,
      eventsReceived: Number(responseBody?.events_received || 0)
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Meta CAPI request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendMetaPurchase,
  buildPurchaseEventId
};
