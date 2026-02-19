
/**
 * Money Printer Bot - Early Bootstrap Script
 * 
 * This script runs at document_start to inject the core bot engine
 * before the page loads. This ensures the bot is ready when the
 * Pocket Option platform initializes.
 * 
 * @see web_accessible_resources.js - The main bot logic injected here
 */

// === MONEY PRINTER - HARDENED EARLY BOOTSTRAP ===
(function () {
  // Prevent double injection
  if (window.__MPB_ENGINE_INJECTED__) return;
  window.__MPB_ENGINE_INJECTED__ = true;

  // Create and inject the main bot script
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("web_accessible_resources.js");
  s.onload = function () {
    try { this.remove(); } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
