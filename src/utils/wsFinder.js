// === MPB: wsFinder — persistent WebSocket finder utility ===
// Provides reliable direct-send for openOrder frames used by the Test menu.
// Runs in page context (IIFE) and exposes window.__wsFinder.
// Compatible with existing globals: window.__mpbDetectedTradeSockets,
// window.__mpbLastOpenOrderPayload, window.__mpbTradeWs, window.__mpbWsPool.
(function () {
  if (window.__wsFinder) return;

  // Trade endpoint substrings used to identify relevant WebSocket URLs.
  var TRADE_ENDPOINTS = ['po.market', 'demo-api', 'events-po', 'socket.io'];

  function _matchesTradeEndpoint(url) {
    if (typeof url !== 'string') return false;
    for (var i = 0; i < TRADE_ENDPOINTS.length; i++) {
      if (url.indexOf(TRADE_ENDPOINTS[i]) !== -1) return true;
    }
    return false;
  }

  /**
   * wrapSocket — ensures a socket has oldSend for direct bypass of the engine
   * interceptor and records it in __mpbDetectedTradeSockets when its URL matches
   * a known trade endpoint.
   * @param {WebSocket} ws
   * @returns {WebSocket} the same socket (for convenience chaining)
   */
  function wrapSocket(ws) {
    if (!ws || ws.__wsFinderWrapped || ws.oldSend) return ws;
    ws.__wsFinderWrapped = true;
    // Capture the current prototype send as oldSend so sendDirectTrade can
    // bypass any higher-level engine interceptors while still going through
    // the prototype monitoring hooks.
    ws.oldSend = WebSocket.prototype.send.bind(ws);
    window.__mpbDetectedTradeSockets = window.__mpbDetectedTradeSockets || [];
    if (_matchesTradeEndpoint(ws.url) &&
        window.__mpbDetectedTradeSockets.indexOf(ws) === -1) {
      window.__mpbDetectedTradeSockets.push(ws);
    }
    return ws;
  }

  /**
   * collectCandidates — returns all non-closed WebSocket candidates in
   * priority order: __mpbTradeWs, __mpbWs, __mpbWsPool (newest first),
   * __mpbDetectedTradeSockets (newest first).
   * @returns {WebSocket[]}
   */
  function collectCandidates() {
    var seen = [];
    var results = [];
    function _add(ws) {
      if (ws && typeof ws.send === 'function' &&
          ws.readyState !== 3 /* CLOSED */ &&
          seen.indexOf(ws) === -1) {
        seen.push(ws);
        results.push(ws);
      }
    }
    _add(window.__mpbTradeWs);
    _add(window.__mpbWs);
    var pool = window.__mpbWsPool || [];
    for (var i = pool.length - 1; i >= 0; i--) _add(pool[i]);
    var detected = window.__mpbDetectedTradeSockets || [];
    for (var j = detected.length - 1; j >= 0; j--) _add(detected[j]);
    return results;
  }

  /**
   * pickLiveSocket — returns the best WebSocket for an immediate trade send.
   * Prefers OPEN sockets with oldSend (engine-wrapped), then any OPEN socket,
   * then falls back to the first non-closed candidate.
   * @returns {WebSocket|null}
   */
  function pickLiveSocket() {
    var candidates = collectCandidates();
    // Prefer OPEN + oldSend (engine-wrapped sockets that support direct bypass)
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].readyState === 1 /* OPEN */ && candidates[i].oldSend) {
        return candidates[i];
      }
    }
    // Any OPEN socket
    for (var j = 0; j < candidates.length; j++) {
      if (candidates[j].readyState === 1 /* OPEN */) {
        return candidates[j];
      }
    }
    // Non-closed fallback
    return candidates.length ? candidates[0] : null;
  }

  /**
   * detectOptionType — infers the option type from the socket URL.
   * @param {WebSocket} ws
   * @returns {'digital'|'binary'}
   */
  function detectOptionType(ws) {
    var url = (ws && ws.url) ? ws.url : '';
    return url.indexOf('digital') !== -1 ? 'digital' : 'binary';
  }

  function _buildPayload(pair, amount) {
    var last = window.__mpbLastOpenOrderPayload;
    if (typeof last === 'string' && last.length > 4 &&
        last[0] === '4' && last[1] === '2') {
      try {
        var parsed = JSON.parse(last.slice(2));
        if (Array.isArray(parsed) && parsed[1] && typeof parsed[1] === 'object') {
          parsed[1].asset  = pair;
          parsed[1].action = 'call';
          parsed[1].amount = amount;
          parsed[1].isDemo = 1;
          if (!parsed[1].time) parsed[1].time = 60;
          return '42' + JSON.stringify(parsed);
        }
      } catch (_) {}
    }
    return '42' + JSON.stringify([
      'openOrder',
      {asset: pair, action: 'call', amount: amount, isDemo: 1, time: 60}
    ]);
  }

  /**
   * sendDirectTrade — sends an openOrder frame directly to the live socket.
   * Uses ws.oldSend when available to bypass the engine deal-queue interceptor
   * and send the fully-formed payload immediately.
   * Keeps isDemo:1 so it is always a demo trade.
   * @param {string} pair    Asset pair, e.g. 'EURUSD_otc'
   * @param {number} [amount=1]  Trade amount in USD
   * @returns {{ok: boolean, reason?: string, ws?: WebSocket, payload?: string, requestId?: number, url?: string}}
   */
  function sendDirectTrade(pair, amount) {
    var ws = pickLiveSocket();
    if (!ws) {
      console.warn('[wsFinder] sendDirectTrade: no live socket found');
      return {ok: false, reason: 'no live socket'};
    }
    if (ws.readyState !== 1 /* OPEN */) {
      console.warn('[wsFinder] sendDirectTrade: socket not OPEN (readyState=' +
        ws.readyState + ')');
      return {ok: false, reason: 'socket not OPEN', readyState: ws.readyState};
    }
    var amt = (amount !== null && amount !== undefined) ? amount : 1;
    // Generate a unique numeric requestId using a per-session counter + timestamp component.
    // The counter avoids collisions for rapid back-to-back calls within the same millisecond.
    window.__mpbWsFinderReqCounter = (window.__mpbWsFinderReqCounter || 0) + 1;
    var requestId = (Date.now() % 1000000000) * 10000 + (window.__mpbWsFinderReqCounter % 10000);
    var payload = _buildPayload(pair, amt);
    try {
      // Prefer oldSend to bypass the engine's deal-queue interceptor.
      // oldSend still routes through prototype monitoring hooks so
      // __mpbTradeWs / __mpbLastOpenOrderPayload are updated as expected.
      var sendFn = ws.oldSend || ws.send;
      sendFn.call(ws, payload);
      // Record in the pending-by-requestId map for later correlation.
      window.__mpbPendingByRequestId = window.__mpbPendingByRequestId || {};
      window.__mpbPendingByRequestId[requestId] = {
        pair: pair, amount: amt, ts: Date.now(), raw: payload
      };
      // Update shared globals so other parts of the engine stay in sync.
      window.__mpbLastOpenOrderPayload = payload;
      window.__mpbTradeWs = ws;
      console.log('[wsFinder] sendDirectTrade: sent pair=' + pair +
        ' amount=' + amt + ' requestId=' + requestId);
      return {ok: true, ws: ws, payload: payload, requestId: requestId, url: ws.url || ''};
    } catch (err) {
      console.error('[wsFinder] sendDirectTrade error:', err);
      return {ok: false, reason: (err && err.message) || String(err)};
    }
  }

  // Expose API on window for in-page use.
  window.__wsFinder = {
    wrapSocket:        wrapSocket,
    collectCandidates: collectCandidates,
    pickLiveSocket:    pickLiveSocket,
    detectOptionType:  detectOptionType,
    sendDirectTrade:   sendDirectTrade
  };

  // Persistent constructor monitor — intercepts future WebSocket instances so
  // they are wrapped and tracked in __mpbDetectedTradeSockets.  Runs after the
  // engine's own constructor override, so it wraps the engine-wrapped version.
  // Marks itself with __wsFinderMonitor to avoid installing twice.
  (function _installConstructorMonitor() {
    if (!window.WebSocket || window.WebSocket.__wsFinderMonitor) return;
    var _PrevWS = window.WebSocket;
    function _MonitorWS(url, protocols) {
      var ws = protocols ? new _PrevWS(url, protocols) : new _PrevWS(url);
      wrapSocket(ws);
      return ws;
    }
    // Preserve static properties (CONNECTING/OPEN/CLOSING/CLOSED = 0/1/2/3).
    _MonitorWS.prototype = _PrevWS.prototype;
    _MonitorWS.CONNECTING = 0;
    _MonitorWS.OPEN       = 1;
    _MonitorWS.CLOSING    = 2;
    _MonitorWS.CLOSED     = 3;
    _MonitorWS.__wsFinderMonitor = true;
    try { window.WebSocket = _MonitorWS; } catch (_) {}
  })();

  // Auto-wrap any sockets already present in __mpbWsPool and __mpbTradeWs so
  // sendDirectTrade can use oldSend immediately without waiting for new traffic.
  (function _wrapExisting() {
    var pool = window.__mpbWsPool || [];
    for (var i = 0; i < pool.length; i++) wrapSocket(pool[i]);
    if (window.__mpbTradeWs) wrapSocket(window.__mpbTradeWs);
  })();

  // Support CommonJS environments (unit tests, Node tooling).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.__wsFinder;
  }

  console.log('[wsFinder] installed — window.__wsFinder ready');
})();
