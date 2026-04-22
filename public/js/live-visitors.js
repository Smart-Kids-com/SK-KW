(function () {
  const VISITOR_ID_KEY = 'store_visitor_id';
  const HEARTBEAT_INTERVAL = 30000;
  const HEARTBEAT_URL = '/api/admin-dashboard/heartbeat';
  const LEAVE_URL = '/api/admin-dashboard/leave';
  let heartbeatTimer = null;

  function getStoreVisitorId() {
    let id = localStorage.getItem(VISITOR_ID_KEY);

    if (!id) {
      id = `store_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }

    return id;
  }

  function getVisitorPayload() {
    return {
      visitorId: getStoreVisitorId(),
      page: location.pathname + location.search,
      source: 'storefront'
    };
  }

  async function sendStoreHeartbeat() {
    try {
      await fetch(HEARTBEAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(getVisitorPayload()),
        keepalive: true,
        credentials: 'same-origin'
      });
    } catch (_) {}
  }

  function sendStoreLeave() {
    try {
      const data = JSON.stringify(getVisitorPayload());

      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(LEAVE_URL, blob);
        return;
      }

      fetch(LEAVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: data,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(() => {});
    } catch (_) {}
  }

  function startHeartbeat() {
    sendStoreHeartbeat();

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    heartbeatTimer = setInterval(sendStoreHeartbeat, HEARTBEAT_INTERVAL);
  }

  window.addEventListener('beforeunload', sendStoreLeave);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      sendStoreLeave();
    } else if (document.visibilityState === 'visible') {
      sendStoreHeartbeat();
    }
  });

  startHeartbeat();
})();