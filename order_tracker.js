(function initMPBOrderTracker() {
  if (window.MPBOrderTracker) {
    return;
  }

  var market = window.MPBMarketListener;
  if (!market) {
    return;
  }

  var pendingQueue = [];
  var openOrders = {};
  var closedOrders = [];
  var listeners = [];

  function emit(event, payload) {
    for (var i = 0; i < listeners.length; i += 1) {
      try {
        listeners[i](event, payload);
      } catch (err) {
        // Tracker listeners are non-blocking.
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

  function registerPendingTrade(pending) {
    pendingQueue.push({
      queueTrade: pending.queueTrade || null,
      rewrittenAt: Date.now(),
      strategyTag: pending.queueTrade ? pending.queueTrade.strategyTag : 'unknown',
      raw: pending.raw || null
    });
    emit('pending.register', pendingQueue[pendingQueue.length - 1]);
  }

  function pushRobotDealsUpdate() {
    var profits = closedOrders.map(function mapProfit(order) {
      return Number(order.profit) || 0;
    });

    window.postMessage({
      belobot: true,
      robotDeals: {
        opened: Object.keys(openOrders),
        closed: profits
      }
    }, window.location.href);
  }

  market.on('order.open', function onOrderOpen(openData) {
    var pending = pendingQueue.length ? pendingQueue.shift() : null;
    var key = String(openData.id);

    openOrders[key] = {
      id: openData.id,
      amount: openData.amount,
      asset: openData.asset,
      openedAt: Date.now(),
      strategyTag: pending && pending.strategyTag ? pending.strategyTag : 'unknown',
      queueTrade: pending ? pending.queueTrade : null
    };

    emit('order.open', openOrders[key]);
    pushRobotDealsUpdate();
  });

  market.on('order.close', function onOrderClose(closeDeals) {
    for (var i = 0; i < closeDeals.length; i += 1) {
      var deal = closeDeals[i];
      var key = String(deal.id);
      var open = openOrders[key] || null;

      var profit = Number(deal.profit);
      if (!isFinite(profit) && deal.raw && typeof deal.raw === 'object') {
        profit = Number(deal.raw.pnl);
      }
      if (!isFinite(profit) && deal.raw && typeof deal.raw === 'object') {
        profit = Number(deal.raw.result);
      }
      if (!isFinite(profit) && deal.raw && typeof deal.raw === 'object') {
        profit = Number(deal.raw.close_profit);
      }

      var closed = {
        id: deal.id,
        amount: deal.amount,
        profit: isFinite(profit) ? profit : 0,
        command: deal.command,
        asset: deal.asset,
        closedAt: Date.now(),
        strategyTag: open && open.strategyTag ? open.strategyTag : 'unknown'
      };

      closedOrders.push(closed);
      if (openOrders[key]) {
        delete openOrders[key];
      }
      emit('order.close', closed);
    }

    pushRobotDealsUpdate();
  });

  function getSnapshot() {
    return {
      pendingQueue: pendingQueue.slice(),
      openOrders: Object.keys(openOrders).map(function mapOpen(k) { return openOrders[k]; }),
      closedOrders: closedOrders.slice()
    };
  }

  function clear() {
    pendingQueue = [];
    openOrders = {};
    closedOrders = [];
    pushRobotDealsUpdate();
    emit('tracker.clear', {});
  }

  window.MPBOrderTracker = {
    registerPendingTrade: registerPendingTrade,
    getSnapshot: getSnapshot,
    clear: clear,
    subscribe: subscribe
  };
})();
