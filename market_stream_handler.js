(function initMPBMarketStreamHandler() {
  if (window.MPBMarketStreamHandler) {
    return;
  }

  var market = window.MPBMarketListener;
  var candleEngine = window.MPBCandleEngine;

  if (!market || !candleEngine) {
    return;
  }

  var stats = {
    streamMessages: 0,
    historyMessages: 0,
    updatesApplied: 0,
    lastAction: '',
    lastAsset: '',
    lastUpdateAt: 0
  };

  function actionFromPayload(payload) {
    if (Array.isArray(payload) && typeof payload[0] === 'string') {
      return payload[0];
    }
    if (payload && typeof payload === 'object') {
      return String(payload.action || payload.event || payload.type || '');
    }
    return '';
  }

  function normalizeAction(ev) {
    var fromEvent = ev && typeof ev.eventName === 'string' ? ev.eventName : '';
    if (fromEvent) {
      return fromEvent;
    }

    var fromBody = actionFromPayload(ev && ev.body);
    if (fromBody) {
      return fromBody;
    }

    return actionFromPayload(ev && ev.raw);
  }

  function extractHistoryBundles(payload, out) {
    if (!out) out = [];
    if (!payload) return out;

    if (Array.isArray(payload)) {
      if (typeof payload[0] === 'string' && payload[0] === 'updateHistoryNew') {
        extractHistoryBundles(payload[1], out);
        return out;
      }

      for (var i = 0; i < payload.length; i += 1) {
        extractHistoryBundles(payload[i], out);
      }
      return out;
    }

    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.data)) {
        extractHistoryBundles(payload.data, out);
        return out;
      }

      var asset = payload.asset || payload.pair || payload.symbol || payload.instrument;
      if (asset && (Array.isArray(payload.candles) || Array.isArray(payload.history))) {
        out.push({
          asset: String(asset),
          candles: Array.isArray(payload.candles) ? payload.candles : [],
          history: Array.isArray(payload.history) ? payload.history : []
        });
      }
    }

    return out;
  }

  function extractStreamUpdates(payload, defaultAsset, out) {
    if (!out) out = [];
    if (!payload) return out;

    function push(asset, time, price) {
      var p = Number(price);
      if (!asset || !isFinite(p)) {
        return;
      }
      out.push({
        asset: String(asset),
        time: time,
        price: p
      });
    }

    if (Array.isArray(payload)) {
      if (typeof payload[0] === 'string' && payload[0] === 'updateStream') {
        extractStreamUpdates(payload[1], defaultAsset, out);
        return out;
      }

      for (var i = 0; i < payload.length; i += 1) {
        var row = payload[i];
        if (Array.isArray(row) && row.length >= 3) {
          push(row[0] || defaultAsset, row[1], row[2]);
        } else {
          extractStreamUpdates(row, defaultAsset, out);
        }
      }
      return out;
    }

    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.stream)) {
        extractStreamUpdates(payload.stream, defaultAsset, out);
        return out;
      }
      if (Array.isArray(payload.data)) {
        extractStreamUpdates(payload.data, defaultAsset, out);
        return out;
      }

      push(
        payload.asset || payload.pair || payload.symbol || payload.instrument || defaultAsset,
        payload.time || payload.ts || payload.timestamp,
        payload.price || payload.value || payload.close
      );
    }

    return out;
  }

  function runSignal(asset) {
    var runner = window.MPBStrategyRunner;
    if (runner && typeof runner.runSignalCheck === 'function') {
      runner.runSignalCheck(asset);
    }
  }

  function handleHistory(payload) {
    var bundles = extractHistoryBundles(payload, []);
    if (!bundles.length) {
      return;
    }

    stats.historyMessages += 1;

    for (var i = 0; i < bundles.length; i += 1) {
      var bundle = bundles[i];
      var rows = [];

      if (Array.isArray(bundle.candles) && bundle.candles.length) {
        rows = rows.concat(bundle.candles);
      }
      if (Array.isArray(bundle.history) && bundle.history.length) {
        for (var h = 0; h < bundle.history.length; h += 1) {
          rows.push(bundle.history[h]);
        }
      }

      var loaded = candleEngine.loadHistory(bundle.asset, rows);
      if (loaded > 0) {
        stats.updatesApplied += loaded;
        stats.lastAsset = bundle.asset;
        stats.lastUpdateAt = Date.now();
      }
    }
  }

  function handleStream(payload) {
    var defaultAsset = payload && payload.asset ? payload.asset : '';
    var updates = extractStreamUpdates(payload, defaultAsset, []);
    if (!updates.length) {
      return;
    }

    stats.streamMessages += 1;

    for (var i = 0; i < updates.length; i += 1) {
      var update = updates[i];
      var candle = candleEngine.updateCandle(update.asset, update.price, update.time);
      if (!candle) {
        continue;
      }

      stats.updatesApplied += 1;
      stats.lastAsset = update.asset;
      stats.lastUpdateAt = Date.now();

      runSignal(update.asset);
    }
  }

  function handleServerEvent(ev) {
    if (!ev) {
      return;
    }

    var action = normalizeAction(ev);
    stats.lastAction = action || String(ev.category || '');

    if (ev.category === 'market.history' || action === 'updateHistoryNew') {
      handleHistory(ev.body || ev.raw || null);
      return;
    }

    if (ev.category === 'market.stream' || action === 'updateStream') {
      handleStream(ev.body || ev.raw || null);
    }
  }

  market.on('server.event', handleServerEvent);

  window.MPBMarketStreamHandler = {
    handleServerEvent: handleServerEvent,
    handleHistory: handleHistory,
    handleStream: handleStream,
    extractHistoryBundles: extractHistoryBundles,
    extractStreamUpdates: extractStreamUpdates,
    getStats: function getStats() {
      return {
        streamMessages: stats.streamMessages,
        historyMessages: stats.historyMessages,
        updatesApplied: stats.updatesApplied,
        lastAction: stats.lastAction,
        lastAsset: stats.lastAsset,
        lastUpdateAt: stats.lastUpdateAt
      };
    }
  };
})();
