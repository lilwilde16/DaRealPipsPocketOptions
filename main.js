/**
 * Money Printer Bot - Extension service worker.
 *
 * Responsibilities:
 * - Lifecycle hooks (install/update/startup)
 * - Small runtime messaging API for diagnostics and storage reads/writes
 * - Keep action badge/title in a known default state
 *
 * @version 2.5.0
 */

(() => {
  'use strict';

  const STORAGE_PREFIX = 'mpb_';

  function log(event, details) {
    const payload = details ? ` ${JSON.stringify(details)}` : '';
    console.log(`[MPB][bg] ${event}${payload}`);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeStoragePatch(patch) {
    if (!isObject(patch)) return {};
    const clean = {};

    for (const [key, value] of Object.entries(patch)) {
      if (!key || typeof key !== 'string') continue;
      if (!key.startsWith(STORAGE_PREFIX)) continue;
      clean[key] = value;
    }

    return clean;
  }

  async function setDefaultActionState() {
    try {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Money Printer Bot' });
    } catch (error) {
      log('setDefaultActionState_failed', { message: error?.message || String(error) });
    }
  }

  chrome.runtime.onInstalled.addListener(async (details) => {
    log('onInstalled', { reason: details.reason, previousVersion: details.previousVersion || null });

    const version = chrome.runtime.getManifest().version;
    await chrome.storage.local.set({
      mpb_meta_version: version,
      mpb_meta_last_install_reason: details.reason,
      mpb_meta_last_installed_at: Date.now(),
    });

    await setDefaultActionState();
  });

  chrome.runtime.onStartup.addListener(async () => {
    log('onStartup');
    await setDefaultActionState();
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!isObject(msg) || msg.scope !== 'mpb-bg') {
      return false;
    }

    const tabId = sender?.tab?.id ?? null;

    if (msg.type === 'ping') {
      sendResponse({ ok: true, pong: true, tabId, ts: Date.now() });
      return true;
    }

    if (msg.type === 'get-storage') {
      const keys = Array.isArray(msg.keys) ? msg.keys.filter((k) => typeof k === 'string') : null;
      chrome.storage.local.get(keys, (result) => {
        sendResponse({ ok: true, data: result || {} });
      });
      return true;
    }

    if (msg.type === 'set-storage') {
      const patch = sanitizeStoragePatch(msg.patch);
      chrome.storage.local.set(patch, () => {
        sendResponse({ ok: true, updated: Object.keys(patch) });
      });
      return true;
    }

    sendResponse({ ok: false, error: `Unsupported message type: ${String(msg.type)}` });
    return true;
  });
})();
