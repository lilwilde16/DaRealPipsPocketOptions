(function initMPBMarketListener() {
  if (window.MPBMarketListener) {
    return;
  }

  var bridge = window.MPBWebSocketBridge;
  if (!bridge) {
    return;
  }

  var listeners = {};
  var pendingEventName = '';

  function on(event, handler) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(handler);
    return function unsubscribe() {
      off(event, handler);
    };
  }

  function off(event, handler) {
    var list = listeners[event] || [];
    var idx = list.indexOf(handler);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
  }

  function emit(event, payload) {
    var list = listeners[event] || [];
    for (var i = 0; i < list.length; i += 1) {
      try {
        list[i](payload);
      } catch (err) {
        // Listener errors should not block market stream processing.
      }
    }
  }

  function eventNameFromMessage(payload) {
    if (Array.isArray(payload) && typeof payload[0] === 'string') {
      return payload[0];
    }
    if (payload && typeof payload === 'object') {
      return payload.event || payload.type || payload.name || '';
    }
    return '';
  }

  function extractServerEvent(payload) {
    var eventName = eventNameFromMessage(payload);
    var body = Array.isArray(payload) ? payload[1] : payload;
    return {
      eventName: eventName,
      body: body,
      raw: payload
    };
  }

  function extractOrderOpen(serverEvent) {
    if (serverEvent.eventName !== 'successopenOrder') {
      return null;
    }

    var body = serverEvent.body || {};
    if (body && typeof body === 'object' && body.order && typeof body.order === 'object') {
      body = body.order;
    }

    return {
      id: body.id || body.order_id || body.deal_id,
      amount: Number(body.amount || body.sum || body.stake || body.value),
      asset: body.asset || body.pair || body.symbol || body.instrument,
      raw: body
    };
  }

  function extractOrderClose(serverEvent) {
    if (serverEvent.eventName !== 'successcloseOrder') {
      return null;
    }

    var body = serverEvent.body || {};
    var deals = [];

    if (Array.isArray(body.deals)) {
      deals = body.deals;
    } else if (Array.isArray(body.orders)) {
      deals = body.orders;
    } else if (Array.isArray(body)) {
      deals = body;
    } else if (body && typeof body === 'object' && body.deal && typeof body.deal === 'object') {
      deals = [body.deal];
    } else if (body && typeof body === 'object' && body.order && typeof body.order === 'object') {
      deals = [body.order];
    } else if (body && typeof body === 'object') {
      var hasSingleDealShape =
        typeof body.id !== 'undefined' ||
        typeof body.order_id !== 'undefined' ||
        typeof body.deal_id !== 'undefined';
      if (hasSingleDealShape) {
        deals = [body];
      }
    }

    return deals.map(function mapClose(deal) {
      var profit =
        Number(deal.profit);

      if (!isFinite(profit)) {
        profit = Number(deal.pnl);
      }
      if (!isFinite(profit)) {
        profit = Number(deal.result);
      }
      if (!isFinite(profit)) {
        profit = Number(deal.close_profit);
      }

      return {
        id: deal.id || deal.order_id || deal.deal_id,
        amount: Number(deal.amount || deal.sum || deal.stake || deal.value),
        profit: isFinite(profit) ? profit : 0,
        command: typeof deal.command !== 'undefined' ? deal.command : deal.action,
        asset: deal.asset || deal.pair || deal.symbol || deal.instrument,
        raw: deal
      };
    });
  }

  function classify(serverEvent) {
    var name = serverEvent.eventName;
    if (!name) {
      return 'unknown';
    }
    if (name === 'updateStream') {
      return 'market.stream';
    }
    if (name === 'updateHistoryNew') {
      return 'market.history';
    }
    if (name === 'updateAssets') {
      return 'market.assets';
    }
    if (name === 'successupdateBalance') {
      return 'account.balance';
    }
    if (name === 'updateOpenedDeals') {
      return 'orders.opened_count';
    }
    if (name === 'successopenOrder') {
      return 'orders.open_confirm';
    }
    if (name === 'successcloseOrder') {
      return 'orders.close_confirm';
    }
    if (name === 'upsignals' || name === 'signals/load' || name === 'signals/update' || name === 'updateSignalForecast') {
      return 'signals.update';
    }
    return 'unknown';
  }

  function isKnownServerEventName(name) {
    return name === 'updateStream' ||
      name === 'updateHistoryNew' ||
      name === 'updateAssets' ||
      name === 'successupdateBalance' ||
      name === 'updateOpenedDeals' ||
      name === 'successopenOrder' ||
      name === 'successcloseOrder' ||
      name === 'upsignals' ||
      name === 'signals/load' ||
      name === 'signals/update' ||
      name === 'updateSignalForecast';
  }

  bridge.on('inbound.parsed', function onInbound(ctx) {
    var payload = ctx && ctx.parsed;
    var serverEvent = extractServerEvent(payload);
    var usedPendingFallback = false;

    if (serverEvent.eventName && isKnownServerEventName(serverEvent.eventName)) {
      pendingEventName = serverEvent.eventName;
    } else if (!serverEvent.eventName && pendingEventName) {
      // Some broker messages carry the event type in one frame and payload in another.
      serverEvent.eventName = pendingEventName;
      usedPendingFallback = true;
    }

    var category = classify(serverEvent);

    emit('server.event', {
      category: category,
      eventName: serverEvent.eventName,
      body: serverEvent.body,
      raw: payload
    });

    var openOrder = extractOrderOpen(serverEvent);
    if (openOrder) {
      emit('order.open', openOrder);
    }

    var closed = extractOrderClose(serverEvent);
    if (closed && closed.length) {
      emit('order.close', closed);
    }

    if (usedPendingFallback) {
      pendingEventName = '';
    }
  });

  window.MPBMarketListener = {
    on: on,
    off: off,
    extractServerEvent: extractServerEvent,
    extractOrderOpen: extractOrderOpen,
    extractOrderClose: extractOrderClose
  };
})();
