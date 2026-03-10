(function initTraderRuntime(ns) {
  ns.modules = ns.modules || {};

  function createNoop() {}

  function bootTraderRuntime(options) {
    if (ns.runtime && ns.runtime.initialized) return ns.runtime;

    var opts = options || {};
    var debug = !!opts.debug;

    var WebSocketBridge = ns.modules.WebSocketBridge;
    var MarketListener = ns.modules.MarketListener;
    var TradeQueue = ns.modules.TradeQueue;
    var ExecutionEngine = ns.modules.ExecutionEngine;
    var OrderTracker = ns.modules.OrderTracker;
    var UIBridge = ns.modules.UIBridge;

    if (
      !WebSocketBridge ||
      !MarketListener ||
      !TradeQueue ||
      !ExecutionEngine ||
      !OrderTracker ||
      !UIBridge
    ) {
      throw new Error('Trader runtime modules missing. Ensure all module files are loaded first.');
    }

    var bridge = new WebSocketBridge({ debug: debug });
    var market = new MarketListener({ debug: debug });
    var queue = new TradeQueue({ debug: debug });
    var ui = new UIBridge({ debug: debug, logPanelEnabled: true });
    var tracker = new OrderTracker({ debug: debug });

    var engine = new ExecutionEngine({
      debug: debug,
      bridge: bridge,
      tradeQueue: queue,
      orderTracker: tracker,
      uiBridge: ui,
    });

    market.attachBridge(bridge);
    tracker.attachMarketListener(market);

    ui.on('armed', function (evt) {
      engine.setArmed(!!(evt && evt.armed));
    });

    market.on('inbound', function (evt) {
      tracker.appendSocketLog({
        direction: 'inbound',
        eventName: evt.eventName,
        detail: evt.type,
        timestamp: evt.timestamp,
      });

      if (debug) {
        ui.pushLog('inbound: ' + evt.type + ' (' + (evt.eventName || 'unknown') + ')');
      }
    });

    bridge.onOutbound(function (ctx) {
      tracker.appendSocketLog({
        direction: 'outbound',
        eventName: (ctx.parsed && ctx.parsed.ok && Array.isArray(ctx.parsed.data) && ctx.parsed.data[0]) || null,
        detail: 'send',
        timestamp: Date.now(),
      });
      return null;
    });

    bridge.onSocket(function (socket, context) {
      if (!context || !context.type) return;
      ui.pushLog('socket ' + context.type + ': ' + (socket.url || 'unknown'));
    });

    bridge.patchWindowWebSocket();

    var runtime = {
      initialized: true,
      debug: debug,
      bridge: bridge,
      marketListener: market,
      tradeQueue: queue,
      executionEngine: engine,
      orderTracker: tracker,
      uiBridge: ui,
      start: function start() {
        ui.setStarted(true);
        ui.setArmed(true);
        return this;
      },
      stop: function stop() {
        ui.setArmed(false);
        ui.setStarted(false);
        return this;
      },
      setArmed: function setArmed(armed) {
        ui.setArmed(!!armed);
        return this;
      },
      enqueueTrade: function enqueueTrade(tradeIntent) {
        return queue.enqueueTrade(tradeIntent);
      },
      placeSignalTrade: function placeSignalTrade(tradeIntent) {
        return engine.receiveSignal(tradeIntent);
      },
      triggerNativeOrderFlow: function triggerNativeOrderFlow() {
        return engine.triggerNativeOrderFlow();
      },
      snapshot: function snapshot() {
        return {
          queue: {
            pendingQueue: queue.pendingQueue.slice(),
          },
          tracker: tracker.getSnapshot(),
          ui: ui.getState(),
        };
      },
      destroy: function destroy() {
        try {
          this.stop();
          tracker.detachAll();
          bridge.unpatchWindowWebSocket();
        } catch (err) {
          if (debug) console.warn('[MPB][Runtime] destroy failed', err);
        }
      },
    };

    ns.runtime = runtime;
    window.MPBTraderRuntime = runtime;

    if (debug) {
      console.log('[MPB][Runtime] Trader runtime initialized', runtime);
    }

    return runtime;
  }

  ns.boot = bootTraderRuntime;

  try {
    bootTraderRuntime({ debug: true });
  } catch (err) {
    console.warn('[MPB][Runtime] boot failed', err);
    ns.runtime = ns.runtime || {
      initialized: false,
      start: createNoop,
      stop: createNoop,
      setArmed: createNoop,
      enqueueTrade: createNoop,
      placeSignalTrade: createNoop,
      triggerNativeOrderFlow: createNoop,
      snapshot: function snapshotFail() {
        return { error: 'runtime-not-initialized' };
      },
      destroy: createNoop,
    };
  }
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
