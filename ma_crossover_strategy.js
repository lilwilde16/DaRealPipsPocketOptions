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
  var assetLabelsByKey = {};
  var lastRelationByAsset = {};
  var lastSignalAtByAsset = {};
  var lastTickFingerprintByAsset = {};
  var diagnostics = {
    serverEvents: 0,
    streamEvents: 0,
    historyEvents: 0,
    lastEventName: '',
    lastEventAt: 0,
    inboundParsedFrames: 0,
    inboundTickFrames: 0,
    extractedTicks: 0,
    historyRowsIngested: 0,
    historyRejectedByScan: 0,
    lastHistoryAsset: '',
    lastHistoryAt: 0
  };
  var status = {
    ticks: 0,
    signals: 0,
    lastAsset: '',
    lastPrice: null,
    lastSignalAt: 0,
    lastSignalDir: '',
    lastAssetKey: '',
    feedAliveAt: 0,
    historyPoints: 0,
    historyAssets: 0,
    historyUpdatedAt: 0,
    historySummary: []
  };

  var cfg = {
    fastPeriod: 9,
    slowPeriod: 21,
    amount: 1,
    pair: '',
    scanPairsText: '',
    tradePairsText: '',
    scanPairsList: [],
    tradePairsList: [],
    cooldownMs: 8000
  };

  function normalizeDir(direction) {
    var d = String(direction || '').toLowerCase();
    if (d === 'up' || d === 'call' || d === 'buy') return 'call';
    if (d === 'down' || d === 'put' || d === 'sell') return 'put';
    return d;
  }

  function assetKey(asset) {
    return String(asset || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function normalizeEpochMs(rawTs) {
    var n = Number(rawTs);
    if (!isFinite(n) || n <= 0) return Date.now();

    // ns/us precision from some feeds.
    if (n >= 1e18) return Math.round(n / 1000000);
    if (n >= 1e15) return Math.round(n / 1000);

    // Seconds epoch (common in broker stream payloads).
    if (n < 1e11) return Math.round(n * 1000);

    return Math.round(n);
  }

  function rememberAssetLabel(rawAsset) {
    var raw = String(rawAsset || '').trim();
    var key = assetKey(raw);
    if (!key) return '';
    if (raw && !assetLabelsByKey[key]) {
      assetLabelsByKey[key] = raw;
    }
    return key;
  }

  function resolveAssetKey(rawAsset) {
    var key = rememberAssetLabel(rawAsset);
    if (!key) return '';
    if (historyByAsset[key] || pricesByAsset[key]) return key;

    var keys = Object.keys(historyByAsset);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === key || keys[i].indexOf(key) >= 0 || key.indexOf(keys[i]) >= 0) {
        return keys[i];
      }
    }
    return key;
  }

  function postInfo(text) {
    window.postMessage({ belobot: true, info_text: text }, window.location.href);
  }

  function parsePairList(text) {
    var out = [];
    var seen = {};
    var tokens = String(text || '').split(/[\s,;\n\t]+/);
    for (var i = 0; i < tokens.length; i++) {
      var raw = String(tokens[i] || '').trim();
      if (!raw) continue;
      var key = assetKey(raw);
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push({ key: key, raw: raw });
      if (!assetLabelsByKey[key]) {
        assetLabelsByKey[key] = raw;
      }
    }
    return out;
  }

  function firstPairText(list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[0].raw || assetLabelsByKey[list[0].key] || list[0].key;
  }

  function matchesPairList(asset, list) {
    if (!Array.isArray(list) || !list.length) return true;
    var k = assetKey(asset);
    if (!k) return false;
    for (var i = 0; i < list.length; i++) {
      var f = list[i] && list[i].key ? list[i].key : '';
      if (!f) continue;
      if (k === f || k.indexOf(f) >= 0 || f.indexOf(k) >= 0) {
        return true;
      }
    }
    return false;
  }

  function postStatus() {
    var assets = Object.keys(historyByAsset);
    var points = 0;
    var summary = [];
    for (var i = 0; i < assets.length; i++) {
      var key = assets[i];
      var arr = historyByAsset[key] || [];
      var count = arr.length;
      points += count;
      summary.push({
        key: key,
        asset: assetLabelsByKey[key] || key,
        points: count,
        lastTs: count ? normalizeEpochMs(arr[count - 1].ts) : 0
      });
    }

    summary.sort(function sortByPoints(a, b) {
      if (b.points !== a.points) return b.points - a.points;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });

    status.historyAssets = assets.length;
    status.historyPoints = points;
    status.historySummary = summary.slice(0, 12);

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
        lastAssetKey: status.lastAssetKey,
        feedAliveAt: status.feedAliveAt,
        historyPoints: status.historyPoints,
        historyAssets: status.historyAssets,
        historyUpdatedAt: status.historyUpdatedAt,
        historySummary: status.historySummary,
        config: {
          fastPeriod: cfg.fastPeriod,
          slowPeriod: cfg.slowPeriod,
          amount: cfg.amount,
          pair: cfg.pair,
          scanPairs: cfg.scanPairsText,
          tradePairs: cfg.tradePairsText,
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
    var singlePair = typeof settings.maPair === 'string' ? settings.maPair.trim() : '';
    var scanPairsText = typeof settings.maScanPairs === 'string' ? settings.maScanPairs.trim() : '';
    var tradePairsText = typeof settings.maTradePairs === 'string' ? settings.maTradePairs.trim() : '';

    if (!scanPairsText && !tradePairsText && singlePair) {
      scanPairsText = singlePair;
      tradePairsText = singlePair;
    } else if (!tradePairsText && scanPairsText) {
      tradePairsText = scanPairsText;
    }

    if (isFinite(f) && f >= 2) cfg.fastPeriod = Math.floor(f);
    if (isFinite(s) && s >= 3) cfg.slowPeriod = Math.floor(s);
    if (cfg.slowPeriod <= cfg.fastPeriod) cfg.slowPeriod = cfg.fastPeriod + 1;
    if (isFinite(a) && a > 0) cfg.amount = Math.max(0.35, Math.round(a * 100) / 100);
    if (singlePair) {
      cfg.pair = singlePair;
    } else {
      cfg.pair = firstPairText(parsePairList(tradePairsText)) || firstPairText(parsePairList(scanPairsText)) || '';
    }
    cfg.scanPairsText = scanPairsText;
    cfg.tradePairsText = tradePairsText;
    cfg.scanPairsList = parsePairList(scanPairsText);
    cfg.tradePairsList = parsePairList(tradePairsText);
    if (isFinite(c) && c >= 1000) cfg.cooldownMs = Math.floor(c);
  }

  function pushPrice(asset, price) {
    var key = rememberAssetLabel(asset);
    if (!key) return;
    if (!pricesByAsset[key]) pricesByAsset[key] = [];
    var arr = pricesByAsset[key];
    arr.push(price);
    if (arr.length > Math.max(cfg.slowPeriod + 10, 80)) {
      arr.shift();
    }
  }

  function pushHistoryPoint(asset, ts, close) {
    var key = rememberAssetLabel(asset);
    if (!key) return;
    if (!historyByAsset[key]) historyByAsset[key] = [];
    var arr = historyByAsset[key];
    var t = normalizeEpochMs(ts);
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
    if (!shouldScanAsset(asset)) {
      diagnostics.historyRejectedByScan += 1;
      return;
    }

    var candles = Array.isArray(payload.candles) ? payload.candles : [];
    var history = Array.isArray(payload.history) ? payload.history : [];
    var ingested = 0;

    for (var i = 0; i < candles.length; i++) {
      var cRow = candles[i];
      if (!Array.isArray(cRow) || cRow.length < 2) continue;
      var cTs = Number(cRow[0]) || 0;
      var cClose = rowToCandleClose(cRow);
      if (cTs && isFinite(cClose)) {
        pushHistoryPoint(String(asset), cTs * 1000, cClose);
        ingested += 1;
      }
    }

    for (var j = 0; j < history.length; j++) {
      var hRow = history[j];
      if (!Array.isArray(hRow) || hRow.length < 2) continue;
      var hTs = Number(hRow[0]) || 0;
      var hClose = Number(hRow[1]);
      if (hTs && isFinite(hClose)) {
        pushHistoryPoint(String(asset), hTs * 1000, hClose);
        ingested += 1;
      }
    }

    if (ingested > 0) {
      diagnostics.historyRowsIngested += ingested;
      diagnostics.lastHistoryAsset = String(asset);
      diagnostics.lastHistoryAt = Date.now();
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
    if (cfg.tradePairsList.length) {
      return matchesPairList(asset, cfg.tradePairsList);
    }
    if (cfg.pair) {
      return matchesPairList(asset, [{ key: assetKey(cfg.pair), raw: cfg.pair }]);
    }
    return true;
  }

  function shouldScanAsset(asset) {
    if (cfg.scanPairsList.length) {
      return matchesPairList(asset, cfg.scanPairsList);
    }
    if (cfg.pair) {
      return matchesPairList(asset, [{ key: assetKey(cfg.pair), raw: cfg.pair }]);
    }
    return true;
  }

  function tradeFromCross(asset, relation) {
    var key = resolveAssetKey(asset);
    if (!key) return;
    var now = Date.now();
    var lastTs = Number(lastSignalAtByAsset[key]) || 0;
    if (now - lastTs < cfg.cooldownMs) return;

    var direction = relation === 'above' ? 'call' : 'put';

    execution.placeSignalTrade({
      asset: assetLabelsByKey[key] || key,
      direction: normalizeDir(direction),
      amount: cfg.amount,
      strategyTag: 'ma-crossover'
    });

    lastSignalAtByAsset[key] = now;
    status.signals += 1;
    status.lastSignalAt = now;
    status.lastSignalDir = direction;
    postInfo('MA crossover signal: ' + (assetLabelsByKey[key] || key) + ' ' + direction + ' @ ' + cfg.amount.toFixed(2));
    postStatus();
  }

  function onTick(asset, price, ts) {
    var key = resolveAssetKey(asset);
    if (!key) return;
    var resolvedAsset = assetLabelsByKey[key] || key;
    if (!shouldScanAsset(resolvedAsset)) return;

    var tickTs = normalizeEpochMs(ts);
    var fp = String(tickTs) + '|' + String(price);
    if (lastTickFingerprintByAsset[key] === fp) {
      return;
    }
    lastTickFingerprintByAsset[key] = fp;

    status.ticks += 1;
    status.feedAliveAt = Date.now();
    status.lastAsset = resolvedAsset;
    status.lastAssetKey = key;
    status.lastPrice = Number(price) || 0;

    pushPrice(key, price);
    pushHistoryPoint(key, tickTs, price);

    var arr = pricesByAsset[key];
    var fast = sma(arr, cfg.fastPeriod);
    var slow = sma(arr, cfg.slowPeriod);
    if (!isFinite(fast) || !isFinite(slow)) return;

    var relation = fast >= slow ? 'above' : 'below';
    var prev = lastRelationByAsset[key] || null;
    lastRelationByAsset[key] = relation;

    if (!prev || prev === relation) return;
    if (!isEnabled()) return;
    if (!shouldTradeAsset(resolvedAsset)) return;

    tradeFromCross(key, relation);
  }

  function extractTicks(payload) {
    var out = [];

    function add(asset, ts, price) {
      var p = Number(price);
      if (!asset || !isFinite(p)) return;
      out.push({ asset: String(asset), ts: normalizeEpochMs(ts), price: p });
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
    diagnostics.extractedTicks += ticks.length;
    refreshConfig();
    for (var i = 0; i < ticks.length; i++) {
      onTick(ticks[i].asset, ticks[i].price, ticks[i].ts);
    }
  }

  function runChartProbe(params) {
    refreshConfig();

    var requestedAsset = (params && params.asset) ? String(params.asset) : '';
    if (!requestedAsset) {
      requestedAsset = cfg.pair || firstPairText(cfg.tradePairsList) || firstPairText(cfg.scanPairsList) || status.lastAsset || '';
    }

    var fromTs = Number(params && params.fromTs);
    var toTs = Number(params && params.toTs);
    if (!isFinite(fromTs)) fromTs = null;
    if (!isFinite(toTs)) toTs = null;
    if (fromTs !== null && toTs !== null && fromTs > toTs) {
      var t = fromTs;
      fromTs = toTs;
      toTs = t;
    }

    var minPointsRequired = Math.max(6, cfg.slowPeriod + 1);
    var allAssets = Object.keys(historyByAsset);
    var targetKey = resolveAssetKey(requestedAsset);
    if ((!targetKey || !historyByAsset[targetKey]) && allAssets.length) {
      targetKey = allAssets[0];
    }

    var seriesRaw = historyByAsset[targetKey] || [];
    var seriesNorm = seriesRaw.map(function normalizePoint(point) {
      if (!point) return null;
      return {
        ts: normalizeEpochMs(point.ts),
        close: Number(point.close)
      };
    }).filter(function keepValid(point) {
      return !!point && isFinite(point.close);
    }).sort(function sortByTs(a, b) {
      return a.ts - b.ts;
    });

    var inWindow = seriesNorm.filter(function keepInRange(point) {
      if (fromTs !== null && point.ts < fromTs) return false;
      if (toTs !== null && point.ts > toTs) return false;
      return true;
    });

    var nowMs = Date.now();
    var latestTs = seriesNorm.length ? Number(seriesNorm[seriesNorm.length - 1].ts) || 0 : 0;
    var ageMs = latestTs ? Math.max(0, nowMs - latestTs) : Number.POSITIVE_INFINITY;

    var bridgeChecks = {
      hasBridge: !!(window.MPBWebSocketBridge && window.MPBWebSocketBridge.patched),
      parseFailed: 0,
      socketOpen: 0,
      socketClose: 0,
      socketErrors: 0
    };

    if (window.MPBWebSocketBridge && typeof window.MPBWebSocketBridge.getSocketLog === 'function') {
      var logs = window.MPBWebSocketBridge.getSocketLog();
      for (var i = 0; i < logs.length; i++) {
        var ev = logs[i] && logs[i].event ? String(logs[i].event) : '';
        if (ev === 'inbound.parse_failed') bridgeChecks.parseFailed += 1;
        if (ev === 'socket.open') bridgeChecks.socketOpen += 1;
        if (ev === 'socket.close') bridgeChecks.socketClose += 1;
        if (ev === 'socket.error') bridgeChecks.socketErrors += 1;
      }
    }

    var domChecks = {
      canvasCount: document.querySelectorAll('canvas').length,
      chartNodeCount: document.querySelectorAll('[id*="chart"], [class*="chart"]').length,
      quoteNodeCount: document.querySelectorAll('[data-price], [class*="price"]').length
    };

    var chartGlobals = [];
    var globalCandidates = ['TradingView', 'LightweightCharts', 'tvWidget', '__NUXT__'];
    for (var j = 0; j < globalCandidates.length; j++) {
      if (typeof window[globalCandidates[j]] !== 'undefined') {
        chartGlobals.push(globalCandidates[j]);
      }
    }

    var connected = bridgeChecks.hasBridge && (diagnostics.streamEvents > 0 || diagnostics.historyEvents > 0 || diagnostics.extractedTicks > 0);
    var hasChartData = seriesNorm.length > 0 || status.historyPoints > 0;
    var backtestReadyNoFilter = seriesNorm.length >= minPointsRequired;
    var backtestReadyWithWindow = inWindow.length >= minPointsRequired;
    var isFresh = latestTs ? ageMs <= 120000 : false;

    var recommendations = [];
    if (!connected) {
      recommendations.push('No active market feed detected. Keep the trading tab open and wait for live ticks.');
    }
    if (connected && !hasChartData) {
      recommendations.push('Feed is connected but no parsed chart points were stored yet. Verify scan pair filters and wait 10-20 seconds.');
    }
    if (hasChartData && !backtestReadyNoFilter) {
      recommendations.push('Need at least ' + minPointsRequired + ' points for MA ' + cfg.fastPeriod + '/' + cfg.slowPeriod + ', but only ' + seriesNorm.length + ' points are available.');
    }
    if (backtestReadyNoFilter && !backtestReadyWithWindow) {
      recommendations.push('Current From/To date filter excludes usable points. Clear date filters or use the data range shown below.');
    }
    if (hasChartData && !isFresh) {
      recommendations.push('Data looks stale. Latest point age is ' + Math.round(ageMs / 1000) + 's; switch pair/timeframe or refresh chart.');
    }
    if (!recommendations.length) {
      recommendations.push('Backtest data pipeline is ready for this asset.');
    }

    var checks = [
      {
        id: 'bridge',
        ok: bridgeChecks.hasBridge,
        detail: bridgeChecks.hasBridge ? 'WebSocket bridge patched.' : 'WebSocket bridge is not available.'
      },
      {
        id: 'stream_events',
        ok: diagnostics.streamEvents > 0,
        detail: 'Stream events seen: ' + diagnostics.streamEvents
      },
      {
        id: 'history_events',
        ok: diagnostics.historyEvents > 0,
        detail: 'History events seen: ' + diagnostics.historyEvents
      },
      {
        id: 'ticks_extracted',
        ok: diagnostics.extractedTicks > 0,
        detail: 'Ticks extracted from payloads: ' + diagnostics.extractedTicks
      },
      {
        id: 'history_points',
        ok: status.historyPoints > 0,
        detail: 'History points stored: ' + status.historyPoints + ' across ' + status.historyAssets + ' assets'
      },
      {
        id: 'asset_window_points',
        ok: backtestReadyWithWindow,
        detail: 'Target asset points in selected window: ' + inWindow.length + ' (need >= ' + minPointsRequired + ')'
      },
      {
        id: 'timestamp_scale',
        ok: seriesNorm.length ? (new Date(seriesNorm[0].ts).getUTCFullYear() >= 2010) : false,
        detail: seriesNorm.length
          ? ('First/last point UTC years: ' + new Date(seriesNorm[0].ts).getUTCFullYear() + '/' + new Date(seriesNorm[seriesNorm.length - 1].ts).getUTCFullYear())
          : 'No normalized points for resolved asset'
      },
      {
        id: 'dom_chart_presence',
        ok: domChecks.canvasCount > 0 || domChecks.chartNodeCount > 0,
        detail: 'DOM chart hints: canvas=' + domChecks.canvasCount + ', chartNodes=' + domChecks.chartNodeCount + ', quoteNodes=' + domChecks.quoteNodeCount
      },
      {
        id: 'backtest_points_full',
        ok: backtestReadyNoFilter,
        detail: 'Resolved asset points: ' + seriesNorm.length + ' (need >= ' + minPointsRequired + ')'
      },
      {
        id: 'data_freshness',
        ok: isFresh,
        detail: latestTs
          ? ('Latest point age: ' + Math.round(ageMs / 1000) + 's')
          : 'No latest point timestamp'
      }
    ];

    return {
      requestedAsset: requestedAsset || '',
      requestedAssetKey: assetKey(requestedAsset),
      resolvedAsset: targetKey ? (assetLabelsByKey[targetKey] || targetKey) : '',
      resolvedAssetKey: targetKey || '',
      selectedFromTs: fromTs,
      selectedToTs: toTs,
      minPointsRequired: minPointsRequired,
      pointsForResolvedAsset: seriesNorm.length,
      pointsInWindow: inWindow.length,
      firstPointTs: seriesNorm.length ? Number(seriesNorm[0].ts) || 0 : 0,
      lastPointTs: seriesNorm.length ? Number(seriesNorm[seriesNorm.length - 1].ts) || 0 : 0,
      ageMs: isFinite(ageMs) ? ageMs : null,
      verdict: {
        connected: connected,
        hasChartData: hasChartData,
        backtestReadyNoFilter: backtestReadyNoFilter,
        backtestReadyWithWindow: backtestReadyWithWindow,
        freshData: isFresh,
        ready: connected && hasChartData && backtestReadyNoFilter
      },
      recommendations: recommendations,
      historySummary: status.historySummary.slice(),
      chartGlobals: chartGlobals,
      bridgeChecks: bridgeChecks,
      diagnostics: {
        serverEvents: diagnostics.serverEvents,
        streamEvents: diagnostics.streamEvents,
        historyEvents: diagnostics.historyEvents,
        lastEventName: diagnostics.lastEventName,
        lastEventAt: diagnostics.lastEventAt,
        inboundParsedFrames: diagnostics.inboundParsedFrames,
        inboundTickFrames: diagnostics.inboundTickFrames,
        extractedTicks: diagnostics.extractedTicks,
        historyRowsIngested: diagnostics.historyRowsIngested,
        historyRejectedByScan: diagnostics.historyRejectedByScan,
        lastHistoryAsset: diagnostics.lastHistoryAsset,
        lastHistoryAt: diagnostics.lastHistoryAt
      },
      checks: checks,
      overallOk: connected && hasChartData && backtestReadyNoFilter,
      probedAt: Date.now()
    };
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

    var requestedAsset = (params && params.asset) ? String(params.asset) : '';
    if (!requestedAsset) {
      requestedAsset = cfg.pair || firstPairText(cfg.tradePairsList) || firstPairText(cfg.scanPairsList) || status.lastAsset || '';
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
    var targetKey = resolveAssetKey(requestedAsset);
    if (!targetKey || !historyByAsset[targetKey]) {
      var requestedKey = assetKey(requestedAsset);
      for (var i = 0; i < allAssets.length; i++) {
        if (allAssets[i] === requestedKey || allAssets[i].indexOf(requestedKey) >= 0 || requestedKey.indexOf(allAssets[i]) >= 0) {
          targetKey = allAssets[i];
          break;
        }
      }
    }
    if ((!targetKey || !historyByAsset[targetKey]) && allAssets.length) {
      targetKey = allAssets[0];
    }

    var seriesRaw = historyByAsset[targetKey] || [];
    var series = seriesRaw.map(function normalizePoint(point) {
      if (!point) return null;
      return {
        ts: normalizeEpochMs(point.ts),
        close: Number(point.close)
      };
    }).filter(function filterTs(point) {
      if (!point || !isFinite(point.close)) return false;
      if (fromTs !== null && point.ts < fromTs) return false;
      if (toTs !== null && point.ts > toTs) return false;
      return true;
    }).sort(function sortByTs(a, b) {
      return a.ts - b.ts;
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
      requestedAsset: requestedAsset || '',
      requestedAssetKey: assetKey(requestedAsset),
      asset: targetKey ? (assetLabelsByKey[targetKey] || targetKey) : '',
      assetKey: targetKey || '',
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
      availableAssets: allAssets.map(function mapAsset(key) {
        var arr = historyByAsset[key] || [];
        return {
          key: key,
          asset: assetLabelsByKey[key] || key,
          points: arr.length,
          lastTs: arr.length ? normalizeEpochMs(arr[arr.length - 1].ts) : 0
        };
      }).sort(function sortAssets(a, b) {
        if (b.points !== a.points) return b.points - a.points;
        return (b.lastTs || 0) - (a.lastTs || 0);
      }).slice(0, 12),
      scanPairs: cfg.scanPairsText,
      tradePairs: cfg.tradePairsText,
      recentSignals: signals.slice(Math.max(0, signals.length - 20))
    };
  }

  market.on('server.event', function onServerEvent(ev) {
    if (!ev) return;
    diagnostics.serverEvents += 1;
    diagnostics.lastEventName = String(ev.eventName || ev.category || '');
    diagnostics.lastEventAt = Date.now();

    if (ev.category === 'market.stream') {
      diagnostics.streamEvents += 1;
      handleTicks(extractTicks(ev.body));
      return;
    }
    if (ev.category === 'market.history') {
      diagnostics.historyEvents += 1;
      refreshConfig();
      ingestHistoryPayload(ev.body);
      return;
    }
  });

  if (window.MPBWebSocketBridge && typeof window.MPBWebSocketBridge.on === 'function') {
    window.MPBWebSocketBridge.on('inbound.parsed', function onBridgeParsed(ctx) {
      diagnostics.inboundParsedFrames += 1;
      var parsed = ctx && typeof ctx.parsed !== 'undefined' ? ctx.parsed : null;
      var ticks = extractTicks(parsed);
      if (ticks.length) {
        diagnostics.inboundTickFrames += 1;
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
      return;
    }

    if (d.act === 'maChartProbeRun') {
      var probe = runChartProbe(d.params || {});
      window.postMessage({
        belobot: true,
        act: 'maChartProbeResult',
        result: probe
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
        scanPairs: cfg.scanPairsText,
        tradePairs: cfg.tradePairsText,
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
        lastAssetKey: status.lastAssetKey,
        feedAliveAt: status.feedAliveAt,
        historyPoints: status.historyPoints,
        historyAssets: status.historyAssets,
        historyUpdatedAt: status.historyUpdatedAt,
        historySummary: Array.isArray(status.historySummary) ? status.historySummary.slice() : []
      };
    },
    runChartProbe: runChartProbe,
    runMarketBacktest: runMarketBacktest,
    getHistoryAssets: function getHistoryAssets() {
      return Object.keys(historyByAsset);
    }
  };
})();
