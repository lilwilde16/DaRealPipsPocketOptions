(function initMPBStrategyRunner() {
  if (window.MPBStrategyRunner) {
    return;
  }

  var candleEngine = window.MPBCandleEngine;
  if (!candleEngine) {
    return;
  }

  var listeners = {};
  var stats = {
    checks: 0,
    signals: 0,
    lastAsset: '',
    lastSignalAt: 0
  };

  function on(event, handler) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(handler);
    return function unsubscribe() {
      off(event, handler);
    };
  }

  function off(event, handler) {
    var list = listeners[event] || [];
    var idx = list.indexOf(handler);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
  }

  function emit(event, payload) {
    var list = listeners[event] || [];
    for (var i = 0; i < list.length; i += 1) {
      try {
        list[i](payload);
      } catch (err) {
        // Listener errors should not break strategy checks.
      }
    }
  }

  function isBullish(candle) {
    return Array.isArray(candle) && candle.length >= 2 && Number(candle[1]) > Number(candle[0]);
  }

  function isBearish(candle) {
    return Array.isArray(candle) && candle.length >= 2 && Number(candle[1]) < Number(candle[0]);
  }

  function isPinBar(candle) {
    if (!Array.isArray(candle) || candle.length < 4) {
      return false;
    }

    var open = Number(candle[0]);
    var close = Number(candle[1]);
    var high = Number(candle[2]);
    var low = Number(candle[3]);

    if (!isFinite(open) || !isFinite(close) || !isFinite(high) || !isFinite(low)) {
      return false;
    }

    var body = Math.abs(close - open);
    var upperWick = high - Math.max(open, close);
    var lowerWick = Math.min(open, close) - low;

    return upperWick > body * 2 || lowerWick > body * 2;
  }

  function signalTimestampSec(asset) {
    var latest = candleEngine.getLatestCandle(asset);
    if (latest && isFinite(Number(latest.ts))) {
      return Number(latest.ts);
    }
    return Math.floor(Date.now() / 1000);
  }

  function runSignalCheck(asset) {
    var normalizedAsset = candleEngine.resolveAsset ? candleEngine.resolveAsset(asset) : String(asset || '');
    if (!normalizedAsset) {
      return null;
    }

    var recent = candleEngine.getLastCandles(normalizedAsset, 3);
    stats.checks += 1;

    if (!Array.isArray(recent) || recent.length < 2) {
      return null;
    }

    var last = recent[recent.length - 1];
    var prev = recent[recent.length - 2];

    var direction = '';
    var reason = '';

    if (isPinBar(last)) {
      var open = Number(last[0]);
      var close = Number(last[1]);
      var high = Number(last[2]);
      var low = Number(last[3]);
      var upperWick = high - Math.max(open, close);
      var lowerWick = Math.min(open, close) - low;
      direction = lowerWick > upperWick ? 'call' : 'put';
      reason = 'pinbar';
    } else if (isBullish(last) && isBearish(prev)) {
      direction = 'call';
      reason = 'bullish-reversal';
    } else if (isBearish(last) && isBullish(prev)) {
      direction = 'put';
      reason = 'bearish-reversal';
    }

    if (!direction) {
      return null;
    }

    var signal = {
      asset: normalizedAsset,
      direction: direction,
      strategy: 'candle-engine-basic',
      reason: reason,
      ts: signalTimestampSec(normalizedAsset)
    };

    candleEngine.recordSignal(normalizedAsset, signal);

    stats.signals += 1;
    stats.lastAsset = normalizedAsset;
    stats.lastSignalAt = Date.now();

    emit('signal', signal);

    window.dispatchEvent(new CustomEvent('mpb:candle-signal', {
      detail: signal
    }));

    window.postMessage({
      belobot: true,
      act: 'candleSignal',
      signal: signal
    }, window.location.href);

    return signal;
  }

  window.MPBStrategyRunner = {
    runSignalCheck: runSignalCheck,
    isBullish: isBullish,
    isBearish: isBearish,
    isPinBar: isPinBar,
    on: on,
    off: off,
    getStats: function getStats() {
      return {
        checks: stats.checks,
        signals: stats.signals,
        lastAsset: stats.lastAsset,
        lastSignalAt: stats.lastSignalAt
      };
    }
  };
})();
