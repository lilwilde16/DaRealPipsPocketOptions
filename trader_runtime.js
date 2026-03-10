(function initMPBTraderRuntime() {
  if (window.MPBTraderRuntime) {
    return;
  }

  var bridge = window.MPBWebSocketBridge;
  var market = window.MPBMarketListener;
  var queue = window.MPBTradeQueue;
  var execution = window.MPBExecutionEngine;
  var tracker = window.MPBOrderTracker;
  var ui = window.MPBUIBridge;

  if (!bridge || !market || !queue || !execution || !tracker || !ui) {
    return;
  }

  function getSnapshot() {
    return {
      armed: ui.getState().armed,
      settings: ui.getState().settings,
      pendingQueue: queue.listTrades(),
      tracker: tracker.getSnapshot(),
      socketLog: bridge.getSocketLog(),
      executionLog: execution.getRuntimeLog()
    };
  }

  function placeSignalTrade(signalTrade) {
    return execution.placeSignalTrade(signalTrade);
  }

  function enqueueTrade(trade) {
    return execution.enqueueTrade(trade);
  }

  function triggerNativeOrderFlow(trade) {
    return execution.triggerNativeOrderFlow(trade);
  }

  function setArmed(value) {
    ui.setArmed(value);
    var state = ui.getState();
    state.settings.started = !!value;
    ui.postRobotSettings();
    return state;
  }

  function setDebug(value) {
    ui.setDebug(value);
    execution.setDebug(value);
    bridge.setDebug(value);
  }

  // Strategy hook entrypoint:
  // dispatchEvent(new CustomEvent('mpb:strategy-signal', { detail: tradePayload }))
  window.addEventListener('mpb:strategy-signal', function onSignal(evt) {
    var detail = evt && evt.detail ? evt.detail : null;
    if (!detail) {
      return;
    }
    execution.placeSignalTrade(detail);
  });

  window.MPBTraderRuntime = {
    enqueueTrade: enqueueTrade,
    placeSignalTrade: placeSignalTrade,
    triggerNativeOrderFlow: triggerNativeOrderFlow,
    placeQueuedTradeNow: execution.placeQueuedTradeNow,
    setArmed: setArmed,
    setDebug: setDebug,
    getSnapshot: getSnapshot,
    helpers: {
      tryParseSocketPayload: bridge.tryParseSocketPayload,
      isTradeRequest: execution.isTradeRequest,
      rewriteTradeRequest: execution.rewriteTradeRequest,
      extractServerEvent: market.extractServerEvent,
      extractOrderOpen: market.extractOrderOpen,
      extractOrderClose: market.extractOrderClose
    }
  };

  window.postMessage({
    belobot: true,
    info_text: 'MPB modular trader runtime ready'
  }, window.location.href);
})();
