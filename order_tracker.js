(function initOrderTrackerModule(ns) {
  ns.modules = ns.modules || {};

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function OrderTracker(opts) {
    var options = opts || {};
    this.debug = !!options.debug;

    this.pendingQueue = [];
    this.openOrders = new Map();
    this.closedOrders = [];
    this.socketLog = [];

    this._unsubscribers = [];
  }

  OrderTracker.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][OrderTracker] ' + message, payload || '');
  };

  OrderTracker.prototype.attachMarketListener = function attachMarketListener(listener) {
    if (!listener || typeof listener.on !== 'function') {
      throw new Error('OrderTracker.attachMarketListener requires a MarketListener');
    }

    this.detachAll();

    var self = this;
    this._unsubscribers.push(
      listener.on('order_open', function (evt) {
        self._onOrderOpen(evt);
      })
    );
    this._unsubscribers.push(
      listener.on('order_close', function (evt) {
        self._onOrderClose(evt);
      })
    );
  };

  OrderTracker.prototype.detachAll = function detachAll() {
    for (var i = 0; i < this._unsubscribers.length; i++) {
      try {
        this._unsubscribers[i]();
      } catch (err) {
        this._log('unsubscribe failed', err);
      }
    }
    this._unsubscribers = [];
  };

  OrderTracker.prototype.appendSocketLog = function appendSocketLog(entry) {
    var row = entry || {};
    this.socketLog.push({
      timestamp: row.timestamp || Date.now(),
      direction: row.direction || 'unknown',
      eventName: row.eventName || null,
      detail: row.detail || null,
    });

    if (this.socketLog.length > 300) {
      this.socketLog = this.socketLog.slice(this.socketLog.length - 300);
    }
  };

  OrderTracker.prototype.registerPendingSubmission = function registerPendingSubmission(tradeIntent) {
    if (!tradeIntent) return;

    this.pendingQueue.push({
      trade: clone(tradeIntent),
      submittedAt: Date.now(),
    });

    this._log('Queued pending submission', tradeIntent);
  };

  OrderTracker.prototype._onOrderOpen = function _onOrderOpen(event) {
    var open = event && event.orderOpen;
    if (!open || !open.orderId) return;

    var pending = this.pendingQueue.length ? this.pendingQueue.shift() : null;
    var pendingTrade = pending ? pending.trade : null;

    var record = {
      orderId: open.orderId,
      asset: open.asset || (pendingTrade ? pendingTrade.asset : null),
      direction: open.direction || (pendingTrade ? pendingTrade.direction : null),
      amount: open.amount || (pendingTrade ? pendingTrade.amount : null),
      strategyTag: pendingTrade ? pendingTrade.strategyTag : null,
      openedAt: event.timestamp || Date.now(),
      rawOpen: open.raw || null,
    };

    this.openOrders.set(String(record.orderId), record);
    this._log('Open order confirmed', record);
  };

  OrderTracker.prototype._onOrderClose = function _onOrderClose(event) {
    var closes = (event && event.orderClose) || [];
    if (!Array.isArray(closes) || !closes.length) return;

    for (var i = 0; i < closes.length; i++) {
      var close = closes[i];
      var id = String(close.orderId);
      var existing = this.openOrders.get(id) || null;

      var closedRecord = {
        orderId: close.orderId,
        asset: close.asset || (existing ? existing.asset : null),
        direction: close.direction || (existing ? existing.direction : null),
        amount: close.amount || (existing ? existing.amount : null),
        strategyTag: existing ? existing.strategyTag : null,
        openedAt: existing ? existing.openedAt : null,
        closedAt: event.timestamp || Date.now(),
        pnl: close.pnl,
        rawClose: close.raw || null,
      };

      this.openOrders.delete(id);
      this.closedOrders.push(closedRecord);
      this._log('Close order confirmed', closedRecord);
    }
  };

  OrderTracker.prototype.getSnapshot = function getSnapshot() {
    return {
      pendingQueue: clone(this.pendingQueue),
      openOrders: Array.from(this.openOrders.values()).map(clone),
      closedOrders: clone(this.closedOrders),
      socketLog: clone(this.socketLog),
    };
  };

  ns.modules.OrderTracker = OrderTracker;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
