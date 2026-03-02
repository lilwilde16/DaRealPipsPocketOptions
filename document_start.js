
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

  // Only run on trading/cabinet pages — skip login, register, and other auth pages
  if (/\/(login|register|registration|sign-up|sign-in)(\/|$)/i.test(window.location.pathname)) return;

  window.__MPB_ENGINE_INJECTED__ = true;
  // Also set a DOM attribute so page-context code can detect injection across isolated worlds
  document.documentElement.dataset.mpbEngineInjected = '1';

  // Inject wsFinder utility into page context before the main bot script so
  // window.__wsFinder is available when the engine's event handlers fire.
  const wf = document.createElement('script');
  wf.src = chrome.runtime.getURL('src/utils/wsFinder.js');
  wf.onload = function () { try { this.remove(); } catch (e) {} };
  (document.head || document.documentElement).appendChild(wf);

  // Create and inject the main bot script
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("web_accessible_resources.js");
  s.onload = function () {
    try { this.remove(); } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
