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
  var historyByAsset = {};
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
    feedAliveAt: 0,
    historyPoints: 0,
    historyAssets: 0,
    historyUpdatedAt: 0
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
    var assets = Object.keys(historyByAsset);
    var points = 0;
    for (var i = 0; i < assets.length; i++) {
      points += (historyByAsset[assets[i]] || []).length;
    }
    status.historyAssets = assets.length;
    status.historyPoints = points;

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
        historyPoints: status.historyPoints,
        historyAssets: status.historyAssets,
        historyUpdatedAt: status.historyUpdatedAt,
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

  function pushHistoryPoint(asset, ts, close) {
    if (!asset) return;
    if (!historyByAsset[asset]) historyByAsset[asset] = [];
    var arr = historyByAsset[asset];
    var t = Number(ts) || Date.now();
    var c = Number(close);
    if (!isFinite(c)) return;

    var n = arr.length;
    if (n > 0 && arr[n - 1].ts === t) {
      arr[n - 1].close = c;
    } else if (n > 0 && arr[n - 1].ts > t) {
      var replaced = false;
      for (var i = n - 1; i >= 0; i--) {
        if (arr[i].ts === t) {
          arr[i].close = c;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        arr.push({ ts: t, close: c });
        arr.sort(function sortByTs(a, b) { return a.ts - b.ts; });
      }
    } else {
      arr.push({ ts: t, close: c });
    }

    if (arr.length > 10000) {
      arr.splice(0, arr.length - 10000);
    }

    status.historyUpdatedAt = Date.now();
  }

  function rowToCandleClose(row) {
    if (!Array.isArray(row) || row.length < 2) return null;
    if (row.length >= 3 && isFinite(Number(row[2]))) return Number(row[2]);
    if (isFinite(Number(row[1]))) return Number(row[1]);
    return null;
  }

  function ingestHistoryPayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    var asset = payload.asset || payload.pair || payload.symbol;
    if (!asset) return;

    var candles = Array.isArray(payload.candles) ? payload.candles : [];
    var history = Array.isArray(payload.history) ? payload.history : [];

    for (var i = 0; i < candles.length; i++) {
      var cRow = candles[i];
      if (!Array.isArray(cRow) || cRow.length < 2) continue;
      var cTs = Number(cRow[0]) || 0;
      var cClose = rowToCandleClose(cRow);
      if (cTs && isFinite(cClose)) {
        pushHistoryPoint(String(asset), cTs * 1000, cClose);
      }
    }

    for (var j = 0; j < history.length; j++) {
      var hRow = history[j];
      if (!Array.isArray(hRow) || hRow.length < 2) continue;
      var hTs = Number(hRow[0]) || 0;
      var hClose = Number(hRow[1]);
      if (hTs && isFinite(hClose)) {
        pushHistoryPoint(String(asset), hTs * 1000, hClose);
      }
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
    pushHistoryPoint(asset, tickTs, price);

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

  function smaAt(series, endIndex, period) {
    if (!Array.isArray(series) || endIndex < 0 || period <= 0) return null;
    if (endIndex - period + 1 < 0) return null;
    var sum = 0;
    for (var i = endIndex - period + 1; i <= endIndex; i++) {
      sum += Number(series[i].close) || 0;
    }
    return sum / period;
  }

  function runMarketBacktest(params) {
    refreshConfig();

    var asset = (params && params.asset) ? String(params.asset) : '';
    if (!asset) {
      asset = cfg.pair || status.lastAsset || '';
    }

    var fast = Math.max(2, Math.floor(Number(params && params.fastPeriod) || cfg.fastPeriod));
    var slow = Math.max(fast + 1, Math.floor(Number(params && params.slowPeriod) || cfg.slowPeriod));
    var base = Math.max(0.35, Number(params && params.baseAmount) || cfg.amount);
    var payoutPct = Math.max(1, Number(params && params.payoutPct) || 92);
    var payout = payoutPct / 100;
    var lookback = Math.max(10, Math.floor(Number(params && params.lookback) || 200));
    var fromTs = Number(params && params.fromTs);
    var toTs = Number(params && params.toTs);
    if (!isFinite(fromTs)) fromTs = null;
    if (!isFinite(toTs)) toTs = null;
    if (fromTs !== null && toTs !== null && fromTs > toTs) {
      var temp = fromTs;
      fromTs = toTs;
      toTs = temp;
    }

    var allAssets = Object.keys(historyByAsset);
    var targetAsset = asset;
    if (!targetAsset && allAssets.length) {
      targetAsset = allAssets[0];
    }

    var seriesRaw = historyByAsset[targetAsset] || [];
    var series = seriesRaw.filter(function filterTs(point) {
      if (!point) return false;
      if (fromTs !== null && point.ts < fromTs) return false;
      if (toTs !== null && point.ts > toTs) return false;
      return true;
    });

    if (series.length > lookback) {
      series = series.slice(series.length - lookback);
    }

    var wins = 0;
    var losses = 0;
    var draws = 0;
    var pnl = 0;
    var signals = [];
    var prevRel = null;

    for (var i = slow; i < series.length - 1; i++) {
      var fastNow = smaAt(series, i, fast);
      var slowNow = smaAt(series, i, slow);
      if (!isFinite(fastNow) || !isFinite(slowNow)) continue;

      var rel = fastNow >= slowNow ? 'above' : 'below';
      if (prevRel === null) {
        prevRel = rel;
        continue;
      }
      if (rel === prevRel) {
        continue;
      }

      var dir = rel === 'above' ? 'call' : 'put';
      var entry = Number(series[i].close) || 0;
      var exit = Number(series[i + 1].close) || entry;
      var diff = exit - entry;
      var win = (dir === 'call' && diff > 0) || (dir === 'put' && diff < 0);
      var draw = diff === 0;
      var profit = 0;

      if (draw) {
        draws += 1;
      } else if (win) {
        wins += 1;
        profit = base * payout;
      } else {
        losses += 1;
        profit = -base;
      }

      pnl += profit;
      signals.push({
        ts: Number(series[i + 1].ts) || Date.now(),
        direction: dir,
        entry: entry,
        exit: exit,
        profit: profit
      });

      prevRel = rel;
    }

    var sample = signals.length;
    var accuracyBase = wins + losses;
    var accuracy = accuracyBase ? (wins / accuracyBase) * 100 : 0;

    return {
      strategy: 'ma-crossover',
      asset: targetAsset || '',
      fastPeriod: fast,
      slowPeriod: slow,
      baseAmount: base,
      payoutPct: payoutPct,
      lookback: lookback,
      fromTs: fromTs,
      toTs: toTs,
      pointsUsed: series.length,
      sampleSize: sample,
      wins: wins,
      losses: losses,
      draws: draws,
      accuracy: accuracy,
      pnl: pnl,
      firstTs: series.length ? series[0].ts : Date.now(),
      lastTs: series.length ? series[series.length - 1].ts : Date.now(),
      recentSignals: signals.slice(Math.max(0, signals.length - 20))
    };
  }

  market.on('server.event', function onServerEvent(ev) {
    if (!ev) return;
    if (ev.category === 'market.stream') {
      handleTicks(extractTicks(ev.body));
      return;
    }
    if (ev.category === 'market.history') {
      ingestHistoryPayload(ev.body);
      return;
    }
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

  window.addEventListener('message', function onMessage(evt) {
    var d = evt && evt.data ? evt.data : null;
    if (!d || !d.belobot) return;

    if (d.act === 'maBacktestRun') {
      var result = runMarketBacktest(d.params || {});
      window.postMessage({
        belobot: true,
        act: 'maBacktestResult',
        result: result
      }, window.location.href);
    }
  }, true);

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
        feedAliveAt: status.feedAliveAt,
        historyPoints: status.historyPoints,
        historyAssets: status.historyAssets,
        historyUpdatedAt: status.historyUpdatedAt
      };
    },
    runMarketBacktest: runMarketBacktest,
    getHistoryAssets: function getHistoryAssets() {
      return Object.keys(historyByAsset);
    }
  };
})();
