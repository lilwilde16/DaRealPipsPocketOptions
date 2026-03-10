
// === MONEY PRINTER - HARDENED EARLY BOOTSTRAP ===
(function () {
  if (window.__MPB_ENGINE_INJECTED__) return;

  // Skip auth pages where trading scripts should never run.
  if (/\/(login|register|registration|sign-up|sign-in)(\/|$)/i.test(window.location.pathname)) {
    return;
  }

  window.__MPB_ENGINE_INJECTED__ = true;
  document.documentElement.dataset.mpbEngineInjected = '1';

  var scripts = [
    "src/utils/wsFinder.js",
    "src/autoTrader.js",
    "web_accessible_resources.js",
    "websocket_bridge.js",
    "market_listener.js",
    "trade_queue.js",
    "order_tracker.js",
    "execution_engine.js",
    "ui_bridge.js",
    "trader_runtime.js"
  ];

  function injectSequential(index) {
    if (index >= scripts.length) return;

    var el = document.createElement("script");
    el.src = chrome.runtime.getURL(scripts[index]);
    el.onload = function () {
      try {
        this.remove();
      } catch (e) {}
      injectSequential(index + 1);
    };
    el.onerror = function () {
      console.warn("[MPB] Failed to inject script:", scripts[index]);
      try {
        this.remove();
      } catch (e) {}
      injectSequential(index + 1);
    };

    (document.head || document.documentElement).appendChild(el);
  }

  injectSequential(0);
})();
