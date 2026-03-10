(function initExecutionEngineModule(ns) {
  ns.modules = ns.modules || {};
  ns.utils = ns.utils || {};

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function normalizeDirection(input) {
    var raw = String(input || '').toLowerCase();
    if (raw === 'call' || raw === 'buy' || raw === 'up' || raw === 'long') return 'call';
    if (raw === 'put' || raw === 'sell' || raw === 'down' || raw === 'short') return 'put';
    return raw || 'call';
  }

  function containsAny(name, words) {
    var lower = String(name || '').toLowerCase();
    for (var i = 0; i < words.length; i++) {
      if (lower.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function deepClonePayload(payload) {
    try {
      return JSON.parse(JSON.stringify(payload));
    } catch (err) {
      return payload;
    }
  }

  function findPrimaryTradeObject(payloadData) {
    if (!payloadData) return null;

    if (Array.isArray(payloadData)) {
      for (var i = 0; i < payloadData.length; i++) {
        var row = payloadData[i];
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          if (
            Object.prototype.hasOwnProperty.call(row, 'amount') ||
            Object.prototype.hasOwnProperty.call(row, 'asset') ||
            Object.prototype.hasOwnProperty.call(row, 'action') ||
            Object.prototype.hasOwnProperty.call(row, 'direction') ||
            Object.prototype.hasOwnProperty.call(row, 'side')
          ) {
            return row;
          }
        }
      }
      return null;
    }

    if (payloadData && typeof payloadData === 'object') {
      if (payloadData.data && typeof payloadData.data === 'object') return payloadData.data;
      return payloadData;
    }

    return null;
  }

  function isTradeRequest(payloadData) {
    if (!payloadData) return false;

    if (Array.isArray(payloadData)) {
      var eventName = typeof payloadData[0] === 'string' ? payloadData[0] : '';
      if (containsAny(eventName, ['order', 'trade', 'deal', 'open'])) return true;

      var possibleObject = findPrimaryTradeObject(payloadData);
      if (!possibleObject) return false;

      return (
        (Object.prototype.hasOwnProperty.call(possibleObject, 'amount') ||
          Object.prototype.hasOwnProperty.call(possibleObject, 'stake') ||
          Object.prototype.hasOwnProperty.call(possibleObject, 'investment')) &&
        (Object.prototype.hasOwnProperty.call(possibleObject, 'asset') ||
          Object.prototype.hasOwnProperty.call(possibleObject, 'pair') ||
          Object.prototype.hasOwnProperty.call(possibleObject, 'symbol'))
      );
    }

    if (payloadData && typeof payloadData === 'object') {
      var hasAmount =
        Object.prototype.hasOwnProperty.call(payloadData, 'amount') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'stake') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'investment');
      var hasPair =
        Object.prototype.hasOwnProperty.call(payloadData, 'asset') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'pair') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'symbol');
      var hasDirection =
        Object.prototype.hasOwnProperty.call(payloadData, 'action') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'direction') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'side') ||
        Object.prototype.hasOwnProperty.call(payloadData, 'command');
      return hasAmount && hasPair && hasDirection;
    }

    return false;
  }

  function rewriteTradeRequest(payloadData, queuedTrade) {
    var clonedPayload = deepClonePayload(payloadData);
    var target = findPrimaryTradeObject(clonedPayload);
    if (!target) {
      return {
        rewritten: false,
        payloadData: clonedPayload,
        reason: 'trade-object-not-found',
      };
    }

    var direction = normalizeDirection(queuedTrade.direction || queuedTrade.action);

    var assetFields = ['asset', 'pair', 'symbol'];
    var amountFields = ['amount', 'stake', 'investment'];
    var directionFields = ['action', 'direction', 'side'];
    var modeFields = ['isDemo', 'demo', 'accountMode', 'mode'];
    var expiryFields = ['expiry', 'expiration', 'duration', 'dealTime', 'time'];

    var changed = false;

    var i;
    for (i = 0; i < assetFields.length; i++) {
      if (Object.prototype.hasOwnProperty.call(target, assetFields[i])) {
        target[assetFields[i]] = queuedTrade.asset;
        changed = true;
      }
    }

    for (i = 0; i < amountFields.length; i++) {
      if (Object.prototype.hasOwnProperty.call(target, amountFields[i])) {
        target[amountFields[i]] = queuedTrade.amount;
        changed = true;
      }
    }

    for (i = 0; i < directionFields.length; i++) {
      if (Object.prototype.hasOwnProperty.call(target, directionFields[i])) {
        target[directionFields[i]] = direction;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(target, 'command')) {
      target.command = direction === 'call' ? 0 : 1;
      changed = true;
    }

    if (queuedTrade.mode !== null && typeof queuedTrade.mode !== 'undefined') {
      for (i = 0; i < modeFields.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(target, modeFields[i])) continue;

        if (modeFields[i] === 'isDemo' || modeFields[i] === 'demo') {
          target[modeFields[i]] = String(queuedTrade.mode).toLowerCase() === 'demo' ? 1 : 0;
        } else {
          target[modeFields[i]] = queuedTrade.mode;
        }
        changed = true;
      }
    }

    if (queuedTrade.expiry !== null && typeof queuedTrade.expiry !== 'undefined') {
      for (i = 0; i < expiryFields.length; i++) {
        if (Object.prototype.hasOwnProperty.call(target, expiryFields[i])) {
          target[expiryFields[i]] = queuedTrade.expiry;
          changed = true;
        }
      }
    }

    if (queuedTrade.strategyTag && Object.prototype.hasOwnProperty.call(target, 'strategyTag')) {
      target.strategyTag = queuedTrade.strategyTag;
      changed = true;
    }

    if (!changed) {
      return {
        rewritten: false,
        payloadData: clonedPayload,
        reason: 'no-supported-fields-present',
      };
    }

    return {
      rewritten: true,
      payloadData: clonedPayload,
    };
  }

  function ExecutionEngine(opts) {
    var options = opts || {};

    this.debug = !!options.debug;
    this.bridge = options.bridge;
    this.tradeQueue = options.tradeQueue;
    this.orderTracker = options.orderTracker;
    this.uiBridge = options.uiBridge || null;

    this.armed = false;

    if (!this.bridge || !this.tradeQueue) {
      throw new Error('ExecutionEngine requires bridge and tradeQueue');
    }

    this._outboundUnsub = this.bridge.onOutbound(this._onOutboundSend.bind(this));
  }

  ExecutionEngine.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][ExecutionEngine] ' + message, payload || '');
  };

  ExecutionEngine.prototype.setArmed = function setArmed(nextValue) {
    this.armed = !!nextValue;
    this._log('Armed state changed', { armed: this.armed });
  };

  ExecutionEngine.prototype.enqueueTrade = function enqueueTrade(trade) {
    return this.tradeQueue.enqueueTrade(trade);
  };

  ExecutionEngine.prototype.receiveSignal = function receiveSignal(signal) {
    var queued = this.tradeQueue.enqueueTrade(signal);
    this._log('Signal accepted and queued', queued);

    if (this.armed) {
      this.triggerNativeOrderFlow(queued);
    }

    return queued;
  };

  ExecutionEngine.prototype._clickTradeButton = function _clickTradeButton(direction) {
    var normalized = normalizeDirection(direction);
    var selectorList =
      normalized === 'call'
        ? ['.btn-call:first-child', '.btn-call', '[data-test*="call" i]', '[class*="call" i]']
        : ['.btn-put:first-child', '.btn-put', '[data-test*="put" i]', '[class*="put" i]'];

    for (var i = 0; i < selectorList.length; i++) {
      var button = document.querySelector(selectorList[i]);
      if (!button) continue;
      button.click();
      this._log('Triggered native flow by button click', {
        selector: selectorList[i],
        direction: normalized,
      });
      return true;
    }

    return false;
  };

  ExecutionEngine.prototype._callNativeTradeFunction = function _callNativeTradeFunction(tradeIntent) {
    var candidates = [
      function () {
        return window.AppData && window.AppData.trader && window.AppData.trader.openOrder;
      },
      function () {
        return window.App && window.App.openOrder;
      },
      function () {
        return window.Trading && window.Trading.openOrder;
      },
    ];

    for (var i = 0; i < candidates.length; i++) {
      try {
        var fn = candidates[i]();
        if (typeof fn !== 'function') continue;

        fn.call(null, {
          action: normalizeDirection(tradeIntent.direction),
          amount: tradeIntent.amount,
          asset: tradeIntent.asset,
        });

        this._log('Triggered native flow by function call', {
          candidateIndex: i,
        });
        return true;
      } catch (err) {
        this._log('Native function candidate failed', err);
      }
    }

    return false;
  };

  ExecutionEngine.prototype.triggerNativeOrderFlow = function triggerNativeOrderFlow(tradeIntent) {
    var nextTrade = tradeIntent || this.tradeQueue.peekTrade();
    if (!nextTrade) {
      this._log('No queued trade available to trigger native flow');
      return false;
    }

    if (!this.armed) {
      this._log('Engine not armed, native flow blocked');
      return false;
    }

    if (this._callNativeTradeFunction(nextTrade)) return true;
    if (this._clickTradeButton(nextTrade.direction)) return true;

    this._log('Could not trigger native flow (no native fn/button found)');
    return false;
  };

  ExecutionEngine.prototype._onOutboundSend = function _onOutboundSend(ctx) {
    if (!this.armed) return null;

    var parsed = ctx.parsed;
    if (!parsed || !parsed.ok) {
      this._log('Outbound parse failed, passthrough', { reason: parsed ? parsed.reason : 'no-parsed' });
      return null;
    }

    if (!isTradeRequest(parsed.data)) {
      return null;
    }

    var queuedTrade = this.tradeQueue.consumeTrade();
    if (!queuedTrade) {
      this._log('Trade packet detected but queue is empty, passthrough');
      return null;
    }

    var rewrite = rewriteTradeRequest(parsed.data, queuedTrade);
    if (!rewrite.rewritten) {
      this._log('Trade packet matched but rewrite skipped, restoring queue', rewrite.reason);
      this.tradeQueue.prependTrade(queuedTrade);
      return null;
    }

    var finalPayload;
    try {
      finalPayload = parsed.serialize(rewrite.payloadData);
    } catch (err) {
      this._log('Serialization failed, restoring queue and passthrough', err);
      this.tradeQueue.prependTrade(queuedTrade);
      return null;
    }

    if (this.orderTracker && typeof this.orderTracker.registerPendingSubmission === 'function') {
      this.orderTracker.registerPendingSubmission(queuedTrade);
    }

    this._log('Outbound trade packet rewritten and queued trade consumed', queuedTrade);

    return {
      payload: finalPayload,
    };
  };

  ExecutionEngine.prototype.isTradeRequest = isTradeRequest;
  ExecutionEngine.prototype.rewriteTradeRequest = rewriteTradeRequest;

  ns.utils.isTradeRequest = isTradeRequest;
  ns.utils.rewriteTradeRequest = rewriteTradeRequest;
  ns.modules.ExecutionEngine = ExecutionEngine;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
