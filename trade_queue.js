(function initTradeQueueModule(ns) {
  ns.modules = ns.modules || {};

  function nowTs() {
    return Date.now();
  }

  function normalizeDirection(value) {
    var raw = String(value || '').toLowerCase();
    if (raw === 'buy' || raw === 'call' || raw === 'up' || raw === 'long') return 'call';
    if (raw === 'sell' || raw === 'put' || raw === 'down' || raw === 'short') return 'put';
    return raw || 'call';
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function TradeQueue(opts) {
    var options = opts || {};
    this.debug = !!options.debug;
    this.pendingQueue = [];
  }

  TradeQueue.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][TradeQueue] ' + message, payload || '');
  };

  TradeQueue.prototype._normalizeTrade = function _normalizeTrade(trade) {
    var input = trade || {};
    var normalized = {
      asset: input.asset || input.pair || input.symbol || null,
      direction: normalizeDirection(input.direction || input.action),
      amount: Number(input.amount),
      expiry: typeof input.expiry === 'undefined' ? input.duration : input.expiry,
      mode: input.mode || input.accountMode || null,
      strategyTag: input.strategyTag || input.reason || null,
      timestamp: input.timestamp || nowTs(),
      meta: input.meta || {},
    };

    if (!normalized.asset) {
      throw new Error('enqueueTrade requires asset/pair/symbol');
    }
    if (!isFinite(normalized.amount) || normalized.amount <= 0) {
      throw new Error('enqueueTrade requires a positive numeric amount');
    }

    return normalized;
  };

  TradeQueue.prototype.enqueueTrade = function enqueueTrade(trade) {
    var normalized = this._normalizeTrade(trade);
    this.pendingQueue.push(normalized);
    this._log('Enqueued trade', normalized);
    return clone(normalized);
  };

  TradeQueue.prototype.peekTrade = function peekTrade() {
    if (!this.pendingQueue.length) return null;
    return clone(this.pendingQueue[0]);
  };

  TradeQueue.prototype.consumeTrade = function consumeTrade() {
    if (!this.pendingQueue.length) return null;
    var nextTrade = this.pendingQueue.shift();
    this._log('Consumed trade', nextTrade);
    return clone(nextTrade);
  };

  TradeQueue.prototype.prependTrade = function prependTrade(trade) {
    if (!trade) return null;
    var normalized = this._normalizeTrade(trade);
    this.pendingQueue.unshift(normalized);
    this._log('Prepended trade back to queue', normalized);
    return clone(normalized);
  };

  TradeQueue.prototype.clearTrades = function clearTrades() {
    var count = this.pendingQueue.length;
    this.pendingQueue = [];
    this._log('Cleared trades, removed count=' + count);
  };

  TradeQueue.prototype.size = function size() {
    return this.pendingQueue.length;
  };

  ns.modules.TradeQueue = TradeQueue;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
