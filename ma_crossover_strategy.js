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
    return String(asset || '') === cfg.pair;
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
    postInfo('MA crossover signal: ' + asset + ' ' + direction + ' @ ' + cfg.amount.toFixed(2));
  }

  function onTick(asset, price) {
    if (!shouldTradeAsset(asset)) return;
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

  market.on('server.event', function onServerEvent(ev) {
    refreshConfig();

    if (!ev || ev.category !== 'market.stream') return;
    var body = ev.body;
    if (!Array.isArray(body)) return;

    for (var i = 0; i < body.length; i++) {
      var row = body[i];
      if (!Array.isArray(row) || row.length < 3) continue;
      var asset = row[0];
      var price = Number(row[2]);
      if (!asset || !isFinite(price)) continue;
      onTick(asset, price);
    }
  });

  setInterval(refreshConfig, 1500);

  window.MPBMACrossoverStrategy = {
    getConfig: function getConfig() {
      return {
        fastPeriod: cfg.fastPeriod,
        slowPeriod: cfg.slowPeriod,
        amount: cfg.amount,
        pair: cfg.pair,
        cooldownMs: cfg.cooldownMs
      };
    }
  };
})();
