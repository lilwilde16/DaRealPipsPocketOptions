(function initMPBMACrossoverStrategy() {
  if (window.MPBMACrossoverStrategy) {
    return;
  }

  var market = window.MPBMarketListener;
  var execution = window.MPBExecutionEngine;
  var ui = window.MPBUIBridge;

  if (!market || !execution || !ui) {
    return;
  }

  var pricesByAsset = {};
  var lastRelationByAsset = {};
  var lastSignalAtByAsset = {};
  var lastTickFingerprintByAsset = {};
  var status = {
    ticks: 0,
    signals: 0,
    lastAsset: '',
    lastPrice: null,
    lastSignalAt: 0,
    lastSignalDir: '',
    feedAliveAt: 0
  };

  var cfg = {
    fastPeriod: 9,
    slowPeriod: 21,
    amount: 1,
    pair: '',
    cooldownMs: 8000
  };

  function normalizeDir(direction) {
    var d = String(direction || '').toLowerCase();
    if (d === 'up' || d === 'call' || d === 'buy') return 'call';
    if (d === 'down' || d === 'put' || d === 'sell') return 'put';
    return d;
  }

  function postInfo(text) {
    window.postMessage({ belobot: true, info_text: text }, window.location.href);
  }

  function postStatus() {
    window.postMessage({
      belobot: true,
      act: 'maStatus',
      status: {
        ticks: status.ticks,
        signals: status.signals,
        lastAsset: status.lastAsset,
        lastPrice: status.lastPrice,
        lastSignalAt: status.lastSignalAt,
        lastSignalDir: status.lastSignalDir,
        feedAliveAt: status.feedAliveAt,
        config: {
          fastPeriod: cfg.fastPeriod,
          slowPeriod: cfg.slowPeriod,
          amount: cfg.amount,
          pair: cfg.pair,
          cooldownMs: cfg.cooldownMs
        }
      }
    }, window.location.href);
  }

  function isEnabled() {
    var state = ui.getState();
    if (!state || !state.settings) return false;
    return !!state.armed && !!state.settings.started && String(state.settings.strategy || '') === 'ma_crossover';
  }

  function refreshConfig() {
    var state = ui.getState();
    var settings = state && state.settings ? state.settings : {};

    var f = Number(settings.maFast);
    var s = Number(settings.maSlow);
    var a = Number(settings.maAmount);
    var c = Number(settings.maCooldownMs);

    if (isFinite(f) && f >= 2) cfg.fastPeriod = Math.floor(f);
    if (isFinite(s) && s >= 3) cfg.slowPeriod = Math.floor(s);
    if (cfg.slowPeriod <= cfg.fastPeriod) cfg.slowPeriod = cfg.fastPeriod + 1;
    if (isFinite(a) && a > 0) cfg.amount = Math.max(0.35, Math.round(a * 100) / 100);
    if (typeof settings.maPair === 'string') cfg.pair = settings.maPair.trim();
    if (isFinite(c) && c >= 1000) cfg.cooldownMs = Math.floor(c);
  }

  function pushPrice(asset, price) {
    if (!pricesByAsset[asset]) pricesByAsset[asset] = [];
    var arr = pricesByAsset[asset];
    arr.push(price);
    if (arr.length > Math.max(cfg.slowPeriod + 10, 80)) {
      arr.shift();
    }
  }

  function sma(arr, n) {
    if (!Array.isArray(arr) || arr.length < n || n <= 0) return null;
    var sum = 0;
    for (var i = arr.length - n; i < arr.length; i++) {
      sum += Number(arr[i]) || 0;
    }
    return sum / n;
  }

  function shouldTradeAsset(asset) {
    if (!cfg.pair) return true;
    var a = String(asset || '').toLowerCase();
    var p = String(cfg.pair || '').toLowerCase();
    return a === p || a.indexOf(p) >= 0 || p.indexOf(a) >= 0;
  }

  function tradeFromCross(asset, relation) {
    var now = Date.now();
    var lastTs = Number(lastSignalAtByAsset[asset]) || 0;
    if (now - lastTs < cfg.cooldownMs) return;

    var direction = relation === 'above' ? 'call' : 'put';

    execution.placeSignalTrade({
      asset: asset,
      direction: normalizeDir(direction),
      amount: cfg.amount,
      strategyTag: 'ma-crossover'
    });

    lastSignalAtByAsset[asset] = now;
    status.signals += 1;
    status.lastSignalAt = now;
    status.lastSignalDir = direction;
    postInfo('MA crossover signal: ' + asset + ' ' + direction + ' @ ' + cfg.amount.toFixed(2));
    postStatus();
  }

  function onTick(asset, price, ts) {
    if (!shouldTradeAsset(asset)) return;

    var tickTs = Number(ts) || Date.now();
    var fp = String(tickTs) + '|' + String(price);
    if (lastTickFingerprintByAsset[asset] === fp) {
      return;
    }
    lastTickFingerprintByAsset[asset] = fp;

    status.ticks += 1;
    status.feedAliveAt = Date.now();
    status.lastAsset = asset;
    status.lastPrice = Number(price) || 0;

    pushPrice(asset, price);

    var arr = pricesByAsset[asset];
    var fast = sma(arr, cfg.fastPeriod);
    var slow = sma(arr, cfg.slowPeriod);
    if (!isFinite(fast) || !isFinite(slow)) return;

    var relation = fast >= slow ? 'above' : 'below';
    var prev = lastRelationByAsset[asset] || null;
    lastRelationByAsset[asset] = relation;

    if (!prev || prev === relation) return;
    if (!isEnabled()) return;

    tradeFromCross(asset, relation);
  }

  function extractTicks(payload) {
    var out = [];

    function add(asset, ts, price) {
      var p = Number(price);
      if (!asset || !isFinite(p)) return;
      out.push({ asset: String(asset), ts: Number(ts) || Date.now(), price: p });
    }

    if (!payload) return out;

    if (Array.isArray(payload)) {
      if (typeof payload[0] === 'string' && payload[0] === 'updateStream' && Array.isArray(payload[1])) {
        var rows = payload[1];
        for (var i = 0; i < rows.length; i++) {
          var row1 = rows[i];
          if (Array.isArray(row1) && row1.length >= 3) {
            add(row1[0], row1[1], row1[2]);
          } else if (row1 && typeof row1 === 'object') {
            add(row1.asset || row1.pair || row1.symbol, row1.ts || row1.time || row1.timestamp, row1.price || row1.value || row1.close);
          }
        }
        return out;
      }

      for (var j = 0; j < payload.length; j++) {
        var row = payload[j];
        if (Array.isArray(row) && row.length >= 3) {
          add(row[0], row[1], row[2]);
        } else if (row && typeof row === 'object') {
          add(row.asset || row.pair || row.symbol, row.ts || row.time || row.timestamp, row.price || row.value || row.close);
        }
      }
      return out;
    }

    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.stream)) {
        return extractTicks(payload.stream);
      }
      if (Array.isArray(payload.data)) {
        return extractTicks(payload.data);
      }
      add(payload.asset || payload.pair || payload.symbol, payload.ts || payload.time || payload.timestamp, payload.price || payload.value || payload.close);
    }

    return out;
  }

  function handleTicks(ticks) {
    if (!Array.isArray(ticks) || !ticks.length) return;
    refreshConfig();
    for (var i = 0; i < ticks.length; i++) {
      onTick(ticks[i].asset, ticks[i].price, ticks[i].ts);
    }
  }

  market.on('server.event', function onServerEvent(ev) {
    if (!ev || ev.category !== 'market.stream') return;
    handleTicks(extractTicks(ev.body));
  });

  if (window.MPBWebSocketBridge && typeof window.MPBWebSocketBridge.on === 'function') {
    window.MPBWebSocketBridge.on('inbound.parsed', function onBridgeParsed(ctx) {
      var parsed = ctx && typeof ctx.parsed !== 'undefined' ? ctx.parsed : null;
      var ticks = extractTicks(parsed);
      if (ticks.length) {
        handleTicks(ticks);
      }
    });
  }

  setInterval(refreshConfig, 1500);
  setInterval(postStatus, 5000);

  window.MPBMACrossoverStrategy = {
    getConfig: function getConfig() {
      return {
        fastPeriod: cfg.fastPeriod,
        slowPeriod: cfg.slowPeriod,
        amount: cfg.amount,
        pair: cfg.pair,
        cooldownMs: cfg.cooldownMs
      };
    },
    getStatus: function getStatus() {
      return {
        ticks: status.ticks,
        signals: status.signals,
        lastAsset: status.lastAsset,
        lastPrice: status.lastPrice,
        lastSignalAt: status.lastSignalAt,
        lastSignalDir: status.lastSignalDir,
        feedAliveAt: status.feedAliveAt
      };
    }
  };
})();
