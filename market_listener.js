(function initMarketListenerModule(ns) {
  ns.modules = ns.modules || {};

  var EVENT_MAP = {
    updateStream: 'market_stream',
    updateHistory: 'candle_history',
    updateHistoryNew: 'candle_history',
    updateAssets: 'asset_update',
    successupdateBalance: 'balance_update',
    updateBalance: 'balance_update',
    successopenOrder: 'order_open',
    successcloseOrder: 'order_close',
    updateOpenedDeals: 'opened_deals_update',
    upsignals: 'signal_update',
    'signals/load': 'signal_update',
    'signals/update': 'signal_update',
    updateSignalForecast: 'signal_update',
  };

  function normalizeServerEventName(name) {
    return String(name || '').trim();
  }

  function inferServerEvent(payloadData) {
    if (Array.isArray(payloadData) && typeof payloadData[0] === 'string') {
      return {
        name: normalizeServerEventName(payloadData[0]),
        payload: payloadData[1],
        args: payloadData.slice(1),
      };
    }

    if (payloadData && typeof payloadData === 'object') {
      if (typeof payloadData.event === 'string') {
        return {
          name: normalizeServerEventName(payloadData.event),
          payload: payloadData.payload || payloadData.data || payloadData,
          args: payloadData.args || [],
        };
      }

      if (typeof payloadData.type === 'string') {
        return {
          name: normalizeServerEventName(payloadData.type),
          payload: payloadData.payload || payloadData.data || payloadData,
          args: payloadData.args || [],
        };
      }
    }

    return {
      name: '',
      payload: payloadData,
      args: [],
    };
  }

  function extractOrderOpen(message) {
    if (!message || !message.payload) return null;

    var payload = message.payload;
    var order = payload;

    if (Array.isArray(payload) && payload.length > 0) {
      order = payload[0];
    }

    if (!order || typeof order !== 'object') return null;

    var orderId = order.id || order.orderId || order.deal_id || order.position_id || null;
    if (!orderId) return null;

    return {
      orderId: orderId,
      asset: order.asset || order.pair || order.symbol || null,
      direction: order.action || order.direction || order.side || order.command || null,
      amount: order.amount || order.stake || order.investment || null,
      raw: order,
    };
  }

  function extractOrderClose(message) {
    if (!message || !message.payload) return [];

    var payload = message.payload;
    var rows = [];

    if (Array.isArray(payload)) {
      rows = payload;
    } else if (payload.deals && Array.isArray(payload.deals)) {
      rows = payload.deals;
    } else if (payload.orders && Array.isArray(payload.orders)) {
      rows = payload.orders;
    } else if (typeof payload === 'object') {
      rows = [payload];
    }

    var result = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var orderId = row.id || row.orderId || row.deal_id || row.position_id || null;
      if (!orderId) continue;
      result.push({
        orderId: orderId,
        pnl: row.profit || row.pnl || row.result || 0,
        asset: row.asset || row.pair || row.symbol || null,
        direction: row.action || row.direction || row.side || row.command || null,
        amount: row.amount || row.stake || row.investment || null,
        raw: row,
      });
    }

    return result;
  }

  function MarketListener(opts) {
    var options = opts || {};
    this.debug = !!options.debug;
    this.listeners = {};
    this.unsubInbound = null;
  }

  MarketListener.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][MarketListener] ' + message, payload || '');
  };

  MarketListener.prototype.on = function on(eventName, handler) {
    var key = String(eventName || 'unknown');
    if (typeof handler !== 'function') return function noop() {};

    this.listeners[key] = this.listeners[key] || [];
    this.listeners[key].push(handler);

    var self = this;
    return function unsubscribe() {
      self.listeners[key] = (self.listeners[key] || []).filter(function (fn) {
        return fn !== handler;
      });
    };
  };

  MarketListener.prototype._emit = function _emit(eventName, payload) {
    var handlers = this.listeners[eventName] || [];
    for (var i = 0; i < handlers.length; i++) {
      try {
        handlers[i](payload);
      } catch (err) {
        this._log('Listener failed for event=' + eventName, err);
      }
    }
  };

  MarketListener.prototype.extractServerEvent = function extractServerEvent(parsed) {
    if (!parsed || !parsed.ok) {
      return {
        name: '',
        payload: null,
        args: [],
      };
    }

    return inferServerEvent(parsed.data);
  };

  MarketListener.prototype.handleInbound = function handleInbound(inboundCtx) {
    var serverEvent = this.extractServerEvent(inboundCtx.parsed);
    var eventName = normalizeServerEventName(serverEvent.name);
    var normalizedType = EVENT_MAP[eventName] || 'unknown';

    var normalized = {
      type: normalizedType,
      eventName: eventName,
      payload: serverEvent.payload,
      args: serverEvent.args,
      raw: inboundCtx.raw,
      parsed: inboundCtx.parsed,
      timestamp: inboundCtx.timestamp || Date.now(),
    };

    if (normalizedType === 'order_open') {
      normalized.orderOpen = extractOrderOpen(serverEvent);
    }

    if (normalizedType === 'order_close') {
      normalized.orderClose = extractOrderClose(serverEvent);
    }

    this._log('Inbound message classified as ' + normalizedType, {
      eventName: eventName,
    });

    this._emit('inbound', normalized);
    this._emit(normalizedType, normalized);
  };

  MarketListener.prototype.attachBridge = function attachBridge(webSocketBridge) {
    if (!webSocketBridge || typeof webSocketBridge.onInbound !== 'function') {
      throw new Error('MarketListener.attachBridge requires a valid WebSocketBridge');
    }

    if (this.unsubInbound) this.unsubInbound();
    var self = this;
    this.unsubInbound = webSocketBridge.onInbound(function (ctx) {
      self.handleInbound(ctx);
    });
  };

  MarketListener.prototype.extractOrderOpen = extractOrderOpen;
  MarketListener.prototype.extractOrderClose = extractOrderClose;

  ns.modules.MarketListener = MarketListener;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
