(function initMPBCandleEngine() {
  if (window.MPBCandleEngine) {
    return;
  }

  var rates = {};
  var listeners = {};
  var aliases = {};

  var stats = {
    historyLoads: 0,
    streamUpdates: 0,
    candlesWritten: 0,
    lastAsset: '',
    lastUpdateSec: 0
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
        // Listener errors should not break feed processing.
      }
    }
  }

  function normalizeEpochSec(rawTime) {
    var n = Number(rawTime);
    if (!isFinite(n) || n <= 0) {
      return Math.floor(Date.now() / 1000);
    }

    if (n >= 1e18) return Math.floor(n / 1000000000); // ns -> s
    if (n >= 1e15) return Math.floor(n / 1000000);    // us -> s
    if (n >= 1e12) return Math.floor(n / 1000);       // ms -> s
    if (n > 1e11) return Math.floor(n / 1000);        // ms-ish -> s
    return Math.floor(n);                              // already s
  }

  function minuteBucketSec(epochSec) {
    return Math.floor(epochSec / 60) * 60;
  }

  function canonicalAsset(asset) {
    return String(asset || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function resolveAsset(asset) {
    var raw = String(asset || '').trim();
    var canon = canonicalAsset(raw);
    if (!canon) {
      return '';
    }
    if (!aliases[canon]) {
      aliases[canon] = raw || canon;
    }
    return aliases[canon];
  }

  function getAssetRecord(asset) {
    var key = resolveAsset(asset);
    if (!key) {
      return null;
    }
    return rates[key] || null;
  }

  function ensureAsset(asset) {
    var key = resolveAsset(asset);
    if (!key) {
      return null;
    }

    if (!rates[key]) {
      rates[key] = {
        rates: {},
        signals: {},
        lastUpdate: 0
      };
    }

    return rates[key];
  }

  function parseHistoryRow(row) {
    if (Array.isArray(row)) {
      if (row.length < 2) {
        return null;
      }

      var ts = normalizeEpochSec(row[0]);
      var open = Number(row[1]);
      var close = row.length > 2 ? Number(row[2]) : Number(row[1]);
      var high = row.length > 3 ? Number(row[3]) : Math.max(open, close);
      var low = row.length > 4 ? Number(row[4]) : Math.min(open, close);

      if (!isFinite(open)) open = close;
      if (!isFinite(close)) close = open;
      if (!isFinite(open) || !isFinite(close)) return null;
      if (!isFinite(high)) high = Math.max(open, close);
      if (!isFinite(low)) low = Math.min(open, close);

      high = Math.max(high, open, close);
      low = Math.min(low, open, close);

      return {
        ts: minuteBucketSec(ts),
        candle: [open, close, high, low]
      };
    }

    if (row && typeof row === 'object') {
      var t = normalizeEpochSec(row.ts || row.time || row.timestamp || row.date);
      var o = Number(row.open);
      var c = Number(typeof row.close !== 'undefined' ? row.close : (typeof row.price !== 'undefined' ? row.price : row.value));
      var h = Number(row.high);
      var l = Number(row.low);

      if (!isFinite(o)) o = c;
      if (!isFinite(c)) c = o;
      if (!isFinite(o) || !isFinite(c)) return null;
      if (!isFinite(h)) h = Math.max(o, c);
      if (!isFinite(l)) l = Math.min(o, c);

      h = Math.max(h, o, c);
      l = Math.min(l, o, c);

      return {
        ts: minuteBucketSec(t),
        candle: [o, c, h, l]
      };
    }

    return null;
  }

  function loadHistory(asset, candles) {
    var entry = ensureAsset(asset);
    if (!entry || !Array.isArray(candles)) {
      return 0;
    }

    var loaded = 0;
    for (var i = 0; i < candles.length; i += 1) {
      var parsed = parseHistoryRow(candles[i]);
      if (!parsed) {
        continue;
      }

      entry.rates[parsed.ts] = parsed.candle;
      if (parsed.ts > entry.lastUpdate) {
        entry.lastUpdate = parsed.ts;
      }
      loaded += 1;
    }

    if (loaded > 0) {
      stats.historyLoads += 1;
      stats.candlesWritten += loaded;
      stats.lastAsset = resolveAsset(asset);
      stats.lastUpdateSec = entry.lastUpdate;
      emit('history.loaded', {
        asset: resolveAsset(asset),
        loaded: loaded
      });
    }

    return loaded;
  }

  function updateCandle(asset, price, time) {
    var entry = ensureAsset(asset);
    var p = Number(price);
    if (!entry || !isFinite(p)) {
      return null;
    }

    var epochSec = normalizeEpochSec(time);
    var minuteTimestamp = minuteBucketSec(epochSec);
    var candle = entry.rates[minuteTimestamp];

    if (!candle) {
      candle = [p, p, p, p];
      entry.rates[minuteTimestamp] = candle;
      stats.candlesWritten += 1;
    } else {
      candle[1] = p;
      if (p > candle[2]) candle[2] = p;
      if (p < candle[3]) candle[3] = p;
    }

    entry.lastUpdate = Math.max(entry.lastUpdate, epochSec);

    stats.streamUpdates += 1;
    stats.lastAsset = resolveAsset(asset);
    stats.lastUpdateSec = entry.lastUpdate;

    emit('candle.updated', {
      asset: resolveAsset(asset),
      timestamp: minuteTimestamp,
      candle: candle.slice()
    });

    return candle.slice();
  }

  function sortedTimestamps(asset) {
    var entry = getAssetRecord(asset);
    if (!entry) {
      return [];
    }

    return Object.keys(entry.rates)
      .map(function toNum(v) { return Number(v); })
      .filter(function finite(v) { return isFinite(v); })
      .sort(function asc(a, b) { return a - b; });
  }

  function getLastCandles(asset, count) {
    var entry = getAssetRecord(asset);
    if (!entry) {
      return [];
    }

    var timestamps = sortedTimestamps(asset);
    if (!timestamps.length) {
      return [];
    }

    var n = Math.max(1, Math.floor(Number(count) || 1));
    var start = Math.max(0, timestamps.length - n);
    var out = [];

    for (var i = start; i < timestamps.length; i += 1) {
      var ts = timestamps[i];
      var candle = entry.rates[ts];
      if (Array.isArray(candle) && candle.length >= 4) {
        out.push([Number(candle[0]), Number(candle[1]), Number(candle[2]), Number(candle[3])]);
      }
    }

    return out;
  }

  function getLatestCandle(asset) {
    var timestamps = sortedTimestamps(asset);
    if (!timestamps.length) {
      return null;
    }

    var entry = getAssetRecord(asset);
    var ts = timestamps[timestamps.length - 1];
    var c = entry.rates[ts];
    if (!Array.isArray(c) || c.length < 4) {
      return null;
    }

    return {
      ts: ts,
      open: Number(c[0]),
      close: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3])
    };
  }

  function getCandles(asset, options) {
    var entry = getAssetRecord(asset);
    if (!entry) {
      return [];
    }

    var opts = options || {};
    var fromTs = isFinite(Number(opts.fromTs)) ? normalizeEpochSec(opts.fromTs) : null;
    var toTs = isFinite(Number(opts.toTs)) ? normalizeEpochSec(opts.toTs) : null;
    var limit = isFinite(Number(opts.limit)) ? Math.max(1, Math.floor(Number(opts.limit))) : 0;

    var timestamps = sortedTimestamps(asset);
    var out = [];
    for (var i = 0; i < timestamps.length; i += 1) {
      var ts = timestamps[i];
      if (fromTs !== null && ts < fromTs) continue;
      if (toTs !== null && ts > toTs) continue;

      var c = entry.rates[ts];
      if (!Array.isArray(c) || c.length < 4) continue;

      out.push({
        ts: ts,
        open: Number(c[0]),
        close: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        volume: 1,
        closed: true
      });
    }

    if (limit > 0 && out.length > limit) {
      out = out.slice(out.length - limit);
    }

    return out;
  }

  function recordSignal(asset, signal) {
    var entry = ensureAsset(asset);
    if (!entry || !signal || typeof signal !== 'object') {
      return false;
    }

    var ts = minuteBucketSec(normalizeEpochSec(signal.ts || entry.lastUpdate || Date.now()));
    if (!entry.signals[ts]) {
      entry.signals[ts] = [];
    }
    entry.signals[ts].push(JSON.parse(JSON.stringify(signal)));

    emit('signal.recorded', {
      asset: resolveAsset(asset),
      timestamp: ts,
      signal: signal
    });

    return true;
  }

  function getSnapshot() {
    var assets = Object.keys(rates).map(function mapAsset(asset) {
      var entry = rates[asset];
      var count = Object.keys(entry.rates).length;
      return {
        asset: asset,
        candles: count,
        lastTs: Number(entry.lastUpdate) || 0
      };
    }).sort(function sortAssets(a, b) {
      if (b.candles !== a.candles) return b.candles - a.candles;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });

    return {
      assets: assets,
      stats: {
        historyLoads: stats.historyLoads,
        streamUpdates: stats.streamUpdates,
        candlesWritten: stats.candlesWritten,
        lastAsset: stats.lastAsset,
        lastUpdateSec: stats.lastUpdateSec
      }
    };
  }

  window.MPBCandleEngine = {
    rates: rates,
    ensureAsset: ensureAsset,
    loadHistory: loadHistory,
    updateCandle: updateCandle,
    getLastCandles: getLastCandles,
    recordSignal: recordSignal,
    getCandles: getCandles,
    getLatestCandle: getLatestCandle,
    getSnapshot: getSnapshot,
    on: on,
    off: off,
    normalizeEpochSec: normalizeEpochSec,
    resolveAsset: resolveAsset
  };
})();
