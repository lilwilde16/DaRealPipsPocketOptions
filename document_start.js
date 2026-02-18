
// === MONEY PRINTER - HARDENED EARLY BOOTSTRAP ===
(function () {
  if (window.__MPB_ENGINE_INJECTED__) return;
  window.__MPB_ENGINE_INJECTED__ = true;

  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("web_accessible_resources.js");
  s.onload = function () {
    try { this.remove(); } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
