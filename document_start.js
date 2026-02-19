
// === MONEY PRINTER BOT - EARLY BOOTSTRAP ===
// This script runs at document_start (before DOM is ready) to inject the bot engine
// into the page context as early as possible. This ensures WebSocket interception
// is in place before the trading platform establishes its connections.

(function () {
  // Guard against multiple injections
  if (window.__MPB_ENGINE_INJECTED__) return;
  window.__MPB_ENGINE_INJECTED__ = true;

  // Create and inject the main bot engine script
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("web_accessible_resources.js");
  
  // Clean up script tag after loading to reduce DOM footprint
  s.onload = function () {
    try { this.remove(); } catch (e) {}
  };
  
  // Append to head or documentElement (whichever is available first)
  (document.head || document.documentElement).appendChild(s);
})();
