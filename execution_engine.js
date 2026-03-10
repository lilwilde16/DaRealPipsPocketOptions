(function initMPBExecutionEngine() {
  if (window.MPBExecutionEngine) {
    return;
  }

  var bridge = window.MPBWebSocketBridge;
  var queue = window.MPBTradeQueue;
  var tracker = window.MPBOrderTracker;

  if (!bridge || !queue || !tracker) {
    return;
  }

  var armed = false;
  var debug = false;
  var waitingForSiteOrder = false;
  var runtimeLog = [];

  function log(event, payload) {
    if (runtimeLog.length > 300) {
      runtimeLog.shift();
    }
    runtimeLog.push({ ts: new Date().toISOString(), event: event, payload: payload || null });
    if (debug) {
      console.debug('[MPB Execution]', event, payload || '');
    }
  }

  function normalizeDirection(direction) {
    var d = String(direction || '').toLowerCase();
    if (d === 'up' || d === 'call' || d === 'buy') {
      return 'call';
    }
    if (d === 'down' || d === 'put' || d === 'sell') {
      return 'put';
    }
    return d;
  }

  function isObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function findByPath(root, path) {
    var curr = root;
    for (var i = 0; i < path.length; i += 1) {
      if (!curr || !hasOwn(curr, path[i])) {
        return null;
      }
      curr = curr[path[i]];
    }
    return curr;
  }

  function updateFirstExistingKey(root, keys, value) {
    if (!isObject(root) && !Array.isArray(root)) {
      return false;
    }

    if (Array.isArray(root)) {
      for (var i = 0; i < root.length; i += 1) {
        var arrItem = root[i];
        if (updateFirstExistingKey(arrItem, keys, value)) {
          return true;
        }
      }
      return false;
    }

    for (var k = 0; k < keys.length; k += 1) {
      if (hasOwn(root, keys[k])) {
        root[keys[k]] = value;
        return true;
      }
    }

    var propKeys = Object.keys(root);
    for (var p = 0; p < propKeys.length; p += 1) {
      var next = root[propKeys[p]];
      if (isObject(next) || Array.isArray(next)) {
        if (updateFirstExistingKey(next, keys, value)) {
          return true;
        }
      }
    }

    return false;
  }

  function eventName(payload) {
    if (Array.isArray(payload) && typeof payload[0] === 'string') {
      return payload[0];
    }
    if (isObject(payload)) {
      return payload.event || payload.type || payload.name || '';
    }
    return '';
  }

  function getTradeBody(payload) {
    if (Array.isArray(payload) && isObject(payload[1])) {
      return payload[1];
    }
    if (isObject(payload)) {
      return payload;
    }
    return null;
  }

  function countPresentKeys(obj, keys) {
    if (!obj || typeof obj !== 'object') {
      return 0;
    }
    var count = 0;
    for (var i = 0; i < keys.length; i += 1) {
      if (hasOwn(obj, keys[i])) {
        count += 1;
      }
    }
    return count;
  }

  function isTradeRequest(payload) {
    if (!payload) {
      return false;
    }

    var name = String(eventName(payload) || '').toLowerCase();
    var body = getTradeBody(payload);

    var knownNonTrade = {
      updatestream: true,
      updatehistorynew: true,
      updateassets: true,
      successupdatebalance: true,
      updateopeneddeals: true,
      successcloseorder: true,
      successopenorder: true,
      upsignals: true,
      'signals/load': true,
      'signals/update': true,
      updatesignalforecast: true
    };

    if (name.indexOf('openorder') >= 0 || name.indexOf('trade') >= 0 || name.indexOf('deal') >= 0) {
      return true;
    }

    if (name && knownNonTrade[name]) {
      return false;
    }

    if (body) {
      var amountScore = countPresentKeys(body, ['amount', 'sum', 'stake', 'value']);
      var assetScore = countPresentKeys(body, ['asset', 'pair', 'symbol', 'instrument']);
      var sideScore = countPresentKeys(body, ['action', 'direction', 'side', 'command']);
      if ((amountScore + assetScore + sideScore) >= 2) {
        return true;
      }
    }

    if (Array.isArray(payload) && isObject(payload[1])) {
      var p = payload[1];
      if ((hasOwn(p, 'amount') || hasOwn(p, 'sum') || hasOwn(p, 'stake')) &&
          (hasOwn(p, 'asset') || hasOwn(p, 'pair') || hasOwn(p, 'symbol'))) {
        return true;
      }
    }

    if (isObject(payload) &&
        (hasOwn(payload, 'amount') || hasOwn(payload, 'sum') || hasOwn(payload, 'stake')) &&
        (hasOwn(payload, 'asset') || hasOwn(payload, 'pair') || hasOwn(payload, 'symbol'))) {
      return true;
    }

    return false;
  }

  function rewriteTradeRequest(payload, queuedTrade) {
    var rewritten = deepClone(payload);
    var normalizedDirection = normalizeDirection(queuedTrade.direction);
    var body = getTradeBody(rewritten);

    if (!body || typeof body !== 'object') {
      return rewritten;
    }

    function setOrInsert(keys, fallbackKey, value) {
      var changed = updateFirstExistingKey(body, keys, value);
      if (!changed && fallbackKey) {
        body[fallbackKey] = value;
      }
    }

    setOrInsert(['asset', 'pair', 'symbol', 'instrument'], 'asset', queuedTrade.asset);

    if (normalizedDirection) {
      setOrInsert(['action', 'direction', 'side'], 'action', normalizedDirection);
      if (normalizedDirection === 'call') {
        setOrInsert(['command'], 'command', 0);
      } else if (normalizedDirection === 'put') {
        setOrInsert(['command'], 'command', 1);
      }
    }

    setOrInsert(['amount', 'sum', 'stake', 'value'], 'amount', queuedTrade.amount);

    if (queuedTrade.mode) {
      var mode = String(queuedTrade.mode).toLowerCase();
      if (mode === 'demo') {
        setOrInsert(['isDemo', 'demo'], 'isDemo', 1);
      }
      if (mode === 'live' || mode === 'real') {
        setOrInsert(['isDemo', 'demo'], 'isDemo', 0);
      }
      setOrInsert(['accountMode', 'mode'], 'mode', queuedTrade.mode);
    }

    if (typeof queuedTrade.expiry !== 'undefined' && queuedTrade.expiry !== null) {
      setOrInsert(['expiry', 'duration', 'expiration', 'timeframe'], 'duration', queuedTrade.expiry);
    }

    return rewritten;
  }

  function findNativeTradeFunction() {
    var candidates = [
      ['App', 'openOrder'],
      ['App', 'trade', 'openOrder'],
      ['App', 'trade', 'createOrder'],
      ['PO', 'trade', 'open'],
      ['PocketOption', 'trade', 'open']
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var fn = findByPath(window, candidates[i]);
      if (typeof fn === 'function') {
        return fn;
      }
    }
    return null;
  }

  function clickButtonForDirection(direction) {
    var norm = normalizeDirection(direction);
    var selectors = norm === 'put' ? [
      '.btn-put:first-child',
      '.btn-put',
      '[data-test*="put"]',
      '[class*="put"][role="button"]',
      'button[class*="put"]'
    ] : [
      '.btn-call:first-child',
      '.btn-call',
      '[data-test*="call"]',
      '[class*="call"][role="button"]',
      'button[class*="call"]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var el = document.querySelector(selectors[i]);
      if (el && typeof el.click === 'function') {
        el.click();
        return true;
      }
    }

    return false;
  }

  function triggerNativeOrderFlow(trade) {
    var fn = findNativeTradeFunction();

    if (fn) {
      try {
        fn();
        log('native.trigger.fn', { ok: true });
        return true;
      } catch (err) {
        log('native.trigger.fn_error', { error: String(err) });
      }
    }

    var clicked = clickButtonForDirection(trade ? trade.direction : 'call');
    log('native.trigger.click', { ok: clicked });
    return clicked;
  }

  function enqueueTrade(trade) {
    var item = queue.enqueueTrade(trade);
    log('queue.enqueue', item);
    return item;
  }

  function placeSignalTrade(trade) {
    var item = enqueueTrade(trade);
    waitingForSiteOrder = true;
    triggerNativeOrderFlow(item);
    return item;
  }

  function placeQueuedTradeNow() {
    var item = queue.peekTrade();
    if (!item) {
      return false;
    }
    waitingForSiteOrder = true;
    return triggerNativeOrderFlow(item);
  }

  bridge.registerOutboundInterceptor(function outboundRewrite(ctx) {
    if (!armed) {
      return undefined;
    }

    var candidate = queue.peekTrade();
    if (!candidate) {
      return undefined;
    }

    if (!ctx.parseMeta || !ctx.parseMeta.ok) {
      log('rewrite.skip.parse_fail', {});
      return undefined;
    }

    if (!isTradeRequest(ctx.parsed)) {
      return undefined;
    }

    if (!waitingForSiteOrder) {
      return undefined;
    }

    var consumed = queue.consumeTrade();
    var rewrittenPayload = rewriteTradeRequest(ctx.parsed, consumed);
    var rewrittenRaw = bridge.serializePayload(rewrittenPayload, ctx.parseMeta);

    waitingForSiteOrder = false;
    tracker.registerPendingTrade({
      queueTrade: consumed,
      raw: rewrittenPayload
    });

    log('rewrite.success', {
      queueTradeId: consumed.id,
      asset: consumed.asset,
      direction: consumed.direction,
      amount: consumed.amount
    });

    return rewrittenRaw;
  });

  function setArmed(value) {
    armed = !!value;
    if (!armed) {
      waitingForSiteOrder = false;
    }
    log('armed.set', { armed: armed });
  }

  function setDebug(value) {
    debug = !!value;
  }

  window.MPBExecutionEngine = {
    enqueueTrade: enqueueTrade,
    placeSignalTrade: placeSignalTrade,
    placeQueuedTradeNow: placeQueuedTradeNow,
    triggerNativeOrderFlow: triggerNativeOrderFlow,
    isTradeRequest: isTradeRequest,
    rewriteTradeRequest: rewriteTradeRequest,
    setArmed: setArmed,
    setDebug: setDebug,
    getRuntimeLog: function getRuntimeLog() {
      return runtimeLog.slice();
    }
  };
})();
