(function initMPBUIBridge() {
  if (window.MPBUIBridge) {
    return;
  }

  var execution = window.MPBExecutionEngine;
  var queue = window.MPBTradeQueue;
  var tracker = window.MPBOrderTracker;

  if (!execution || !queue || !tracker) {
    return;
  }

  var state = {
    armed: false,
    debug: false,
    settings: {
      strategy: 'ma_crossover',
      min_profit: 80,
      delay: 0,
      deals_limit: 10,
      take_profit: {
        percent: 20,
        sum: 0
      },
      signals: [2, 2, 1, 0, 0, 0],
      use_otc: true,
      started: false,
      martinSteps: [2, 2, 2, 2],
      useMartin: false,
      maFast: 9,
      maSlow: 21,
      maAmount: 1,
      maPair: '',
      maCooldownMs: 8000
    }
  };

  function log() {
    if (state.debug) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[MPB UI]');
      console.debug.apply(console, args);
    }
  }

  function postRobotSettings() {
    window.postMessage({
      belobot: true,
      act: 'robotSettings',
      settings: state.settings
    }, window.location.href);
  }

  function postInfo(text) {
    window.postMessage({
      belobot: true,
      info_text: text
    }, window.location.href);
  }

  function normalizeSettingsPatch(patch) {
    if (!patch || typeof patch !== 'object') {
      return {};
    }
    var next = {};
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key === 'take_profit') {
        state.settings.take_profit.percent = Number(patch[key]);
      } else {
        next[key] = patch[key];
      }
    }
    return next;
  }

  function applySettingsPatch(patch) {
    var normalized = normalizeSettingsPatch(patch);
    var keys = Object.keys(normalized);
    for (var i = 0; i < keys.length; i += 1) {
      state.settings[keys[i]] = normalized[keys[i]];
    }
  }

  function setArmed(value) {
    state.armed = !!value;
    execution.setArmed(state.armed);
  }

  function handleStartStop() {
    state.settings.started = !state.settings.started;
    setArmed(state.settings.started);

    if (!state.settings.started) {
      queue.clearTrades();
    }

    postRobotSettings();
    log('start_stop', { started: state.settings.started });
  }

  function handleMessage(evt) {
    var d = evt && evt.data;
    if (!d || !d.belobot) {
      return;
    }

    var act = d.act;

    if (act === 'readState') {
      postRobotSettings();
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'setState') {
      applySettingsPatch(d.settings || {});
      postRobotSettings();
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'start_stop') {
      handleStartStop();
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'enqueueTrade') {
      try {
        var queued = execution.enqueueTrade(d.trade || {});
        postInfo('Trade queued #' + queued.id + ' (' + queued.asset + ' ' + queued.direction + ' ' + queued.amount + ')');
      } catch (err) {
        postInfo('Queue error: ' + String(err));
      }
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'placeQueuedTradeNow') {
      var ok = execution.placeQueuedTradeNow();
      postInfo(ok ? 'Queued trade trigger sent.' : 'No queued trade found.');
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'placeSignalTrade') {
      try {
        var placed = execution.placeSignalTrade(d.trade || {});
        postInfo('Signal trade sent #' + placed.id + ' (' + placed.asset + ' ' + placed.direction + ' ' + placed.amount + ')');
      } catch (err) {
        postInfo('Signal trade error: ' + String(err));
      }
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'clearQueuedTrades') {
      var cleared = queue.clearTrades();
      postInfo('Cleared queued trades: ' + cleared);
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'setArmed') {
      setArmed(!!d.armed);
      state.settings.started = state.armed;
      postRobotSettings();
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'runtimeSnapshot') {
      window.postMessage({
        belobot: true,
        act: 'runtimeSnapshot',
        snapshot: {
          armed: state.armed,
          started: !!state.settings.started,
          queueSize: queue.size(),
          queuedTrades: queue.listTrades(),
          tracker: tracker.getSnapshot()
        }
      }, window.location.href);
      evt.stopImmediatePropagation();
      return;
    }

    if (act === 'setDebug') {
      state.debug = !!d.enabled;
      execution.setDebug(state.debug);
      if (window.MPBWebSocketBridge) {
        window.MPBWebSocketBridge.setDebug(state.debug);
      }
      evt.stopImmediatePropagation();
      return;
    }
  }

  window.addEventListener('message', handleMessage, true);

  tracker.subscribe(function onTrackerEvent(eventName, payload) {
    if (eventName === 'order.open') {
      postInfo('Order opened #' + payload.id + ' [' + payload.strategyTag + ']');
      window.postMessage({
        belobot: true,
        act: 'trackerOrderOpen',
        order: payload
      }, window.location.href);
    }
    if (eventName === 'order.close') {
      var pnl = Number(payload.profit) || 0;
      var sign = pnl > 0 ? '+' : '';
      postInfo('Order closed #' + payload.id + ' pnl ' + sign + pnl.toFixed(2) + ' [' + (payload.strategyTag || 'unknown') + ']');
      window.postMessage({
        belobot: true,
        act: 'trackerOrderClose',
        order: payload
      }, window.location.href);
    }
  });

  window.MPBUIBridge = {
    getState: function getState() {
      return {
        armed: state.armed,
        settings: JSON.parse(JSON.stringify(state.settings))
      };
    },
    setArmed: setArmed,
    postRobotSettings: postRobotSettings,
    setDebug: function setDebug(value) {
      state.debug = !!value;
      execution.setDebug(state.debug);
      if (window.MPBWebSocketBridge) {
        window.MPBWebSocketBridge.setDebug(state.debug);
      }
    }
  };

  postRobotSettings();
})();
