
// === MONEY PRINTER - HARDENED EARLY BOOTSTRAP ===
// This script runs at document_start, before the page DOM is fully loaded.
// It injects the core trading logic early to intercept WebSocket connections.
(function () {
  // Prevent double injection
  if (window.__MPB_ENGINE_INJECTED__) return;
  window.__MPB_ENGINE_INJECTED__ = true;

  // Inject web_accessible_resources.js into the page context
  // This allows the extension to access the page's WebSocket and trade data
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("web_accessible_resources.js");
  s.onload = function () {
    try { this.remove(); } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
