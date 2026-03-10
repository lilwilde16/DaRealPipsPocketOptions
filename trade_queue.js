(function initMPBTradeQueue() {
  if (window.MPBTradeQueue) {
    return;
  }

  var queue = [];
  var listeners = [];
  var nextId = 1;

  function normalizeDirection(direction) {
    var d = String(direction || '').toLowerCase();
    if (d === 'up' || d === 'call' || d === 'buy') {
      return 'call';
    }
    if (d === 'down' || d === 'put' || d === 'sell') {
      return 'put';
    }
    return d;
  }

  function emit(event, payload) {
    for (var i = 0; i < listeners.length; i += 1) {
      try {
        listeners[i](event, payload);
      } catch (err) {
        // Queue listeners must not block queue operations.
      }
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      var idx = listeners.indexOf(fn);
      if (idx >= 0) {
        listeners.splice(idx, 1);
      }
    };
  }

  function enqueueTrade(trade) {
    var normalized = {
      id: nextId,
      asset: trade && (trade.asset || trade.pair || trade.symbol) || '',
      direction: normalizeDirection(trade && (trade.direction || trade.action)),
      amount: Number(trade && trade.amount),
      expiry: typeof (trade && trade.expiry) !== 'undefined' ? trade.expiry : null,
      mode: trade && (trade.mode || trade.accountMode) || null,
      strategyTag: trade && (trade.strategyTag || trade.reason) || 'manual',
      timestamp: trade && trade.timestamp ? trade.timestamp : Date.now()
    };

    if (!normalized.asset || !isFinite(normalized.amount) || normalized.amount <= 0) {
      throw new Error('Invalid trade payload. asset and positive amount are required.');
    }

    nextId += 1;
    queue.push(normalized);
    emit('enqueue', normalized);
    return normalized;
  }

  function peekTrade() {
    return queue.length ? queue[0] : null;
  }

  function consumeTrade() {
    var item = queue.length ? queue.shift() : null;
    if (item) {
      emit('consume', item);
    }
    return item;
  }

  function clearTrades() {
    if (!queue.length) {
      return 0;
    }
    var count = queue.length;
    queue = [];
    emit('clear', { count: count });
    return count;
  }

  function listTrades() {
    return queue.slice();
  }

  function size() {
    return queue.length;
  }

  window.MPBTradeQueue = {
    enqueueTrade: enqueueTrade,
    peekTrade: peekTrade,
    consumeTrade: consumeTrade,
    clearTrades: clearTrades,
    listTrades: listTrades,
    size: size,
    subscribe: subscribe
  };
})();
