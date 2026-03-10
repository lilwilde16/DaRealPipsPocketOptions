
// === MONEY PRINTER - HARDENED EARLY BOOTSTRAP ===
(function () {
  if (window.__MPB_ENGINE_INJECTED__) return;
  window.__MPB_ENGINE_INJECTED__ = true;

  var scripts = [
    "web_accessible_resources.js",
    "websocket_bridge.js",
    "trade_queue.js",
    "market_listener.js",
    "order_tracker.js",
    "execution_engine.js",
    "ui_bridge.js",
    "trader_runtime.js",
    "ma_crossover_strategy.js"
  ];

  function injectNext(index) {
    if (index >= scripts.length) {
      return;
    }

    var s = document.createElement("script");
    s.src = chrome.runtime.getURL(scripts[index]);
    s.onload = function () {
      try { this.remove(); } catch (e) {}
      injectNext(index + 1);
    };
    s.onerror = function () {
      injectNext(index + 1);
    };
    (document.head || document.documentElement).appendChild(s);
  }

  injectNext(0);
})();
