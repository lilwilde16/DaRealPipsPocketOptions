/**
 * Money Printer Bot — AutoTrader Core Module
 *
 * This module documents and implements the two mechanisms the bot uses to
 * place orders on Pocket Option, plus the martingale step logic extracted
 * from the original files.
 *
 * HOW ORDER SENDING WORKS
 * ───────────────────────
 * Pocket Option communicates via a Socket.IO-style WebSocket where every
 * outgoing frame is a text string in the form:
 *
 *   42["openOrder", { asset, action, amount, time, option_type, … }]
 *   ^^  prefix (Socket.IO packet type 4 + namespace 2)
 *
 * The bot uses two complementary paths to inject a trade:
 *
 * PATH A — WebSocket send-interceptor (used by the engine's deal queue)
 *   1. The bot overrides `window.WebSocket` and patches `ws.send()` on every
 *      new socket instance.
 *   2. When a strategy fires it calls `engine.deal(pair, direction, amount)`,
 *      which pushes { pair, dir, sum } onto `engine.userInfo.futureDeals`.
 *   3. The next time *any* outgoing message is sent on the same socket (e.g.
 *      a heartbeat or a legitimate user trade), the overridden `ws.send()`
 *      intercepts it.  If the frame is a JSON array (starts at index 2 with
 *      '[') AND there are queued deals, the interceptor:
 *        a. Parses the JSON body.
 *        b. Pops the top deal from futureDeals.
 *        c. Overwrites asset / action / amount in the parsed frame.
 *        d. Re-serialises and calls `ws.oldSend()` (the original send).
 *   4. A `newDeal` postMessage is also fired so the auto-trade handler in
 *      web_accessible_resources.js can proactively trigger a send immediately
 *      rather than waiting for the next organic platform message.
 *
 * PATH B — Direct send via wsFinder (used by test trades and this module)
 *   `window.__wsFinder.sendDirectTrade(pair, amount)` builds a complete
 *   openOrder frame using the last captured payload as a template, updates
 *   asset / action / amount, and sends via `ws.oldSend` to bypass the
 *   interceptor's deal-queue logic entirely.  All test/manual trades go
 *   through this path.
 *
 * HOW MARTINGALE STEPS WORK (original files)
 * ──────────────────────────────────────────
 * The original "Money Printer AutoBot.zip" code uses these rules:
 *
 *   martinSteps = [2, 2, 2, 2, 2, 2, 2, 2, 2]   ← multipliers per step
 *   startSum    = the amount recorded when the FIRST trade of a chain is sent
 *
 *   getNextMartingaleStep(baseAmount, currentAmount):
 *     Walk the multiplier chain starting from baseAmount.
 *     When the accumulated step value equals currentAmount, return
 *     floor(currentStep * martinSteps[step] * 100) / 100.
 *     If no match is found, return 2 × baseAmount as a safe fallback.
 *
 *   On successcloseOrder (trade closed):
 *     if (strategy === 'martin' || useMartin) {
 *       if (profit < 0) {               // LOSS  → step up & re-trade
 *         nextAmt = getNextMartingaleStep(startSum, trade.amount)
 *         deal(asset, sameDirection, nextAmt)   ← immediately re-queues
 *       }
 *       if (profit === 0) {             // BREAK-EVEN → re-trade same size
 *         deal(asset, sameDirection, trade.amount)
 *       }
 *       // profit > 0 (WIN) → do nothing, chain resets naturally
 *     }
 *
 * HOW MARTINGALE STEPS WORK (current implementation)
 * ────────────────────────────────────────────────────
 * The current code stores per-pair state in `userInfo.martinState[pair]`:
 *   { step: 0, nextAmount: null }
 *
 *   On loss:  step < 5  → nextAmount = floor(trade.amount * 2 * 100) / 100,
 *                                       step++
 *             step >= 5 → reset: step = 0, nextAmount = null
 *   On win:               reset: step = 0, nextAmount = null
 *
 *   In deal(): if useMartin && martinState[pair].nextAmount exists,
 *              that amount is used instead of the base amount.
 *
 * The key behavioural difference:
 *   Original  → immediately re-queues a trade on every loss (continuous chain)
 *   Current   → stores nextAmount; applies it only when the next strategy
 *               signal fires for that pair (fresh-signal gate)
 *
 * @version 1.0.0
 */

(function () {
  'use strict';

  if (window.__mpbAutoTrader) return;

  // ─── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Normalise a direction string to the value the WS frame expects.
   * Accepts 'up'/'down' (engine shorthand) or 'call'/'put' (frame value).
   * @param {string} direction
   * @returns {'call'|'put'}
   */
  function _normalizeDirection(direction) {
    if (direction === 'up' || direction === 'call') return 'call';
    if (direction === 'down' || direction === 'put') return 'put';
    return 'call'; // safe default
  }

  /**
   * Resolve the best available WebSocket for order execution.
   * Priority: wsFinder (if available) → __mpbTradeWs → __mpbWs → pool.
   * @returns {WebSocket|null}
   */
  function _resolveWs() {
    if (window.__wsFinder && typeof window.__wsFinder.pickLiveSocket === 'function') {
      return window.__wsFinder.pickLiveSocket();
    }
    if (window.__mpbTradeWs && window.__mpbTradeWs.readyState === 1) return window.__mpbTradeWs;
    if (window.__mpbWs && window.__mpbWs.readyState === 1) return window.__mpbWs;
    var pool = window.__mpbWsPool || [];
    for (var i = pool.length - 1; i >= 0; i--) {
      if (pool[i] && pool[i].readyState === 1) return pool[i];
    }
    return null;
  }

  /**
   * Build a complete openOrder WebSocket frame by cloning and mutating the
   * last captured real trade payload (so option_type, time, etc. are correct).
   * Falls back to a minimal hardcoded frame when no prior payload exists.
   *
   * @param {string} pair      Asset symbol, e.g. 'EURUSD_otc'
   * @param {'call'|'put'} direction
   * @param {number} amount    Trade amount in USD
   * @param {boolean} [isDemo] Override isDemo flag. When omitted, uses the engine's
   *                           current account type (real or demo).
   * @returns {string}  Socket.IO text frame ready to pass to ws.send()
   */
  function _buildFrame(pair, direction, amount, isDemo) {
    var demo;
    if (isDemo === false || isDemo === 0) {
      demo = 0;
    } else if (isDemo === true || isDemo === 1) {
      demo = 1;
    } else {
      // Default: use engine account type, fall back to demo for safety
      demo = (window.__mpbEngine && window.__mpbEngine.userInfo &&
              typeof window.__mpbEngine.userInfo.isDemo === 'boolean')
        ? (window.__mpbEngine.userInfo.isDemo ? 1 : 0) : 1;
    }
    var last = window.__mpbLastOpenOrderPayload;
    if (typeof last === 'string' && last.length > 4 &&
        last[0] === '4' && last[1] === '2') {
      try {
        var parsed = JSON.parse(last.slice(2));
        if (Array.isArray(parsed) && parsed[1] && typeof parsed[1] === 'object') {
          parsed[1].asset  = pair;
          parsed[1].action = direction;
          parsed[1].amount = amount;
          parsed[1].isDemo = demo;
          if (!parsed[1].time) parsed[1].time = 60;
          return '42' + JSON.stringify(parsed);
        }
      } catch (_) {}
    }
    return '42' + JSON.stringify([
      'openOrder',
      { asset: pair, action: direction, amount: amount, isDemo: demo, time: 60, option_type: 100 }
    ]);
  }

  // ─── Martingale logic ───────────────────────────────────────────────────────

  /**
   * Per-pair martingale state map.
   * Each entry: { step: number, nextAmount: number|null }
   * @type {Object.<string, {step:number, nextAmount:number|null}>}
   */
  var _martinState = {};

  /**
   * Original getNextMartingaleStep algorithm extracted from the zip.
   * Walks the multiplier chain from baseAmount until it finds currentAmount,
   * then returns the next step value.
   *
   * @param {number}   baseAmount     The opening trade amount (startSum).
   * @param {number}   currentAmount  The most recent trade's amount.
   * @param {number[]} martinSteps    Array of per-step multipliers.
   * @returns {number} Next martingale step amount.
   */
  function getNextMartingaleStep(baseAmount, currentAmount, martinSteps) {
    var steps = martinSteps || [2, 2, 2, 2, 2, 2, 2, 2, 2];
    var s = baseAmount;
    for (var i = 0; i < steps.length; i++) {
      if (Math.abs(currentAmount - s) < 0.01) {
        return Math.floor(s * steps[i] * 100) / 100;
      }
      s = Math.floor(steps[i] * s * 100) / 100;
    }
    return 2 * baseAmount; // fallback: double the base
  }

  /**
   * Record a trade result and update the per-pair martingale state.
   * Call this from your successcloseOrder handler.
   *
   * Behaviour mirrors the current engine (state-based, fresh-signal gate):
   *   Loss  → double the amount for the next signal (max 5 doublings, then reset)
   *   Win   → reset state
   *
   * @param {string} pair
   * @param {number} profit   Signed P&L returned by the broker.
   * @param {number} amount   The amount staked on the closed trade.
   */
  function onTradeClose(pair, profit, amount) {
    if (!_martinState[pair]) _martinState[pair] = { step: 0, nextAmount: null };
    var ms = _martinState[pair];

    if (profit < 0) {
      if (ms.step < 5) {
        ms.nextAmount = Math.floor(amount * 2 * 100) / 100;
        ms.step++;
      } else {
        ms.step = 0;
        ms.nextAmount = null;
      }
    } else {
      ms.step = 0;
      ms.nextAmount = null;
    }

    console.log('[AutoTrader] martingale state for ' + pair + ':', JSON.stringify(ms));
  }

  /**
   * Get the amount that should be used for the next trade on this pair.
   * Returns nextAmount if a martingale step is pending, otherwise the
   * caller-supplied base amount.
   *
   * @param {string} pair
   * @param {number} baseAmount  Default trade size.
   * @returns {number}
   */
  function getMartingaleAmount(pair, baseAmount) {
    var ms = _martinState[pair];
    if (ms && ms.nextAmount) return ms.nextAmount;
    return baseAmount;
  }

  /**
   * Reset the martingale state for a specific pair (or all pairs when omitted).
   * @param {string} [pair]
   */
  function resetMartingale(pair) {
    if (pair) {
      _martinState[pair] = { step: 0, nextAmount: null };
    } else {
      _martinState = {};
    }
  }

  /**
   * Return a snapshot of the current martingale state.
   * @param {string} [pair]  If given, returns only that pair's state.
   * @returns {Object}
   */
  function getMartingaleState(pair) {
    if (pair) return _martinState[pair] || { step: 0, nextAmount: null };
    return JSON.parse(JSON.stringify(_martinState));
  }

  // ─── Order sending ──────────────────────────────────────────────────────────

  /**
   * Send an order directly via the live WebSocket, bypassing the engine's
   * deal-queue interceptor.  Uses `ws.oldSend` when available (same as wsFinder).
   *
   * This is PATH B described in the header comment.  Use it for:
   *   - Manual/test trades
   *   - Autotrader-initiated trades where you want immediate execution
   *
   * Note: wsFinder's sendDirectTrade always sends as 'call'.  When direction
   * is 'put', this function uses the fallback path which builds the frame
   * manually so the correct direction is preserved.
   *
   * @param {string}  pair       Asset symbol, e.g. 'EURUSD_otc'
   * @param {'call'|'put'|'up'|'down'} direction
   * @param {number}  [amount=1] Trade amount in USD
   * @param {boolean} [isDemo]   When omitted, uses the engine's current account type
   *                             (real or demo).  Pass true/false to override.
   * @returns {{ ok: boolean, reason?: string, payload?: string, readyState?: number }}
   */
  function sendOrder(pair, direction, amount, isDemo) {
    var dir = _normalizeDirection(direction);
    var amt = (amount !== undefined && amount !== null) ? amount : 1;

    // Delegate 'call' trades to wsFinder when available — it has the most
    // robust socket selection and request-ID tracking logic.  'put' trades
    // skip wsFinder because its sendDirectTrade always sends 'call'.
    if (dir === 'call' &&
        window.__wsFinder && typeof window.__wsFinder.sendDirectTrade === 'function') {
      // wsFinder now respects engine account type (isDemo flag from engine.userInfo.isDemo).
      var res = window.__wsFinder.sendDirectTrade(pair, amt);
      if (!res.ok) {
        console.warn('[AutoTrader] sendOrder via wsFinder failed:', res.reason);
      }
      return res;
    }

    // Fallback: build the frame ourselves and send directly.
    var ws = _resolveWs();
    if (!ws) {
      console.warn('[AutoTrader] sendOrder: no live WebSocket found');
      return { ok: false, reason: 'no live socket' };
    }
    if (ws.readyState !== 1 /* OPEN */) {
      console.warn('[AutoTrader] sendOrder: socket not OPEN (readyState=' + ws.readyState + ')');
      return { ok: false, reason: 'socket not OPEN', readyState: ws.readyState };
    }

    var payload = _buildFrame(pair, dir, amt, isDemo);

    try {
      var sendFn = ws.oldSend || ws.send;
      sendFn.call(ws, payload);
      window.__mpbTradeWs = ws;
      window.__mpbLastOpenOrderPayload = payload;
      console.log('[AutoTrader] sendOrder: sent pair=' + pair +
        ' dir=' + dir + ' amount=' + amt);
      return { ok: true, payload: payload };
    } catch (err) {
      console.error('[AutoTrader] sendOrder error:', err);
      return { ok: false, reason: (err && err.message) || String(err) };
    }
  }

  /**
   * Queue a deal into the engine's futureDeals list and fire a `newDeal`
   * postMessage so the auto-trade handler in web_accessible_resources.js
   * picks it up immediately.
   *
   * This is PATH A described in the header comment.  Use it when you want
   * the engine's send-interceptor to handle the actual WS frame mutation
   * (preserving all original frame fields except asset / action / amount).
   *
   * @param {string} pair
   * @param {'call'|'put'|'up'|'down'} direction  Both notations accepted.
   * @param {number} [amount]  Omit to let the engine use the last startSum.
   */
  function queueDeal(pair, direction, amount) {
    var eng = window.__mpbEngine;
    if (!eng) {
      console.warn('[AutoTrader] queueDeal: engine not ready (window.__mpbEngine missing)');
      return;
    }

    var dir = _normalizeDirection(direction);

    // Apply martingale override when the engine has useMartin enabled.
    // Only override when no explicit amount was provided by the caller.
    var finalAmount = amount;
    if ((eng.settings.useMartin || eng.settings.strategy === 'martin') &&
        (finalAmount === undefined || finalAmount === null)) {
      var ms = _martinState[pair];
      if (ms && ms.nextAmount) finalAmount = ms.nextAmount;
    }

    // 'dur' is the field name expected by the engine's send-interceptor;
    // it stores the WS action value ('call' or 'put').
    eng.userInfo.futureDeals.push({ pair: pair, dur: dir, sum: finalAmount });

    // Set the nextDealTime cooldown for this pair.
    var delay = (eng.settings.delay || 0);
    var nextDealTime = new Date();
    nextDealTime.setSeconds(nextDealTime.getSeconds() + delay);
    if (eng.rates[pair]) eng.rates[pair].nextDealTime = nextDealTime;

    // Signal the auto-trade handler to dispatch immediately.
    window.postMessage({ belobot: true, act: 'newDeal' }, window.location.href);
    console.log('[AutoTrader] queueDeal: queued pair=' + pair + ' dir=' + dir +
      (finalAmount !== undefined && finalAmount !== null ? ' amount=' + finalAmount : ''));
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  window.__mpbAutoTrader = {
    /**
     * Send an order immediately via the live WebSocket (PATH B).
     * Safe to call at any time — falls back gracefully when no socket is open.
     */
    sendOrder: sendOrder,

    /**
     * Queue a deal into the engine's deal list (PATH A).
     * Requires the main engine (`window.__mpbEngine`) to be initialised.
     */
    queueDeal: queueDeal,

    /**
     * Update martingale state after a trade closes.
     * Call this from your `successcloseOrder` handler with the trade result.
     */
    onTradeClose: onTradeClose,

    /**
     * Return the amount to use for the next trade on a pair, applying any
     * pending martingale step.  Falls back to baseAmount when no step is due.
     */
    getMartingaleAmount: getMartingaleAmount,

    /**
     * Reset martingale state.  Omit pair to reset all pairs at once.
     */
    resetMartingale: resetMartingale,

    /**
     * Inspect the current martingale state (read-only snapshot).
     */
    getMartingaleState: getMartingaleState,

    /**
     * Original step-chain algorithm from the zip.  Useful if you want the
     * original behaviour where each step uses a configurable multiplier array
     * rather than a fixed ×2.
     */
    getNextMartingaleStep: getNextMartingaleStep,
  };

  // Support CommonJS environments (unit tests, Node tooling).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.__mpbAutoTrader;
  }

  console.log('[AutoTrader] installed — window.__mpbAutoTrader ready');
})();
