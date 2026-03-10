(function initMPBMarketListener() {
  if (window.MPBMarketListener) {
    return;
  }

  var bridge = window.MPBWebSocketBridge;
  if (!bridge) {
    return;
  }

  var listeners = {};

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
    return {
      id: body.id,
      amount: Number(body.amount),
      asset: body.asset,
      raw: body
    };
  }

  function extractOrderClose(serverEvent) {
    if (serverEvent.eventName !== 'successcloseOrder') {
      return null;
    }
    var body = serverEvent.body || {};
    var deals = Array.isArray(body.deals) ? body.deals : [];
    return deals.map(function mapClose(deal) {
      return {
        id: deal.id,
        amount: Number(deal.amount),
        profit: Number(deal.profit),
        command: deal.command,
        asset: deal.asset,
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

  bridge.on('inbound.parsed', function onInbound(ctx) {
    var payload = ctx && ctx.parsed;
    var serverEvent = extractServerEvent(payload);
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
  });

  window.MPBMarketListener = {
    on: on,
    off: off,
    extractServerEvent: extractServerEvent,
    extractOrderOpen: extractOrderOpen,
    extractOrderClose: extractOrderClose
  };
})();
