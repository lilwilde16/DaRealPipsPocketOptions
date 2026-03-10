# MPB Modular Trader Runtime

## 1) Flow summary

The runtime follows this exact pattern:

1. Strategy decides an entry.
2. Strategy enqueues intended trade (local FIFO queue).
3. Execution engine triggers site-native order flow (native function if available, else click site button).
4. Outbound WebSocket send payload is intercepted.
5. If payload is a trade packet and queue has a trade and runtime is armed:
   - rewrite only existing trade fields in the site-generated packet
   - send modified payload through original flow
   - consume one queued trade
6. Server responses are parsed for open/close confirmations.
7. Order tracker updates pending/open/closed state from those confirmations.

## 2) Modules and exact functions

- websocket_bridge.js
  - on(event, handler)
  - off(event, handler)
  - setDebug(enabled)
  - tryParseSocketPayload(raw)
  - serializePayload(parsedValue, parseMeta)
  - registerOutboundInterceptor(interceptor)
  - getSocketLog()

- market_listener.js
  - on(event, handler)
  - off(event, handler)
  - extractServerEvent(message)
  - extractOrderOpen(message)
  - extractOrderClose(message)

- trade_queue.js
  - enqueueTrade(trade)
  - peekTrade()
  - consumeTrade()
  - clearTrades()
  - listTrades()
  - size()
  - subscribe(handler)

- execution_engine.js
  - enqueueTrade(trade)
  - placeSignalTrade(trade)
  - placeQueuedTradeNow()
  - triggerNativeOrderFlow(trade)
  - isTradeRequest(payload)
  - rewriteTradeRequest(payload, queuedTrade)
  - setArmed(value)
  - setDebug(value)
  - getRuntimeLog()

- order_tracker.js
  - registerPendingTrade(pending)
  - getSnapshot()
  - clear()
  - subscribe(handler)

- ui_bridge.js
  - getState()
  - setArmed(value)
  - postRobotSettings()
  - setDebug(value)

- trader_runtime.js
  - enqueueTrade(trade)
  - placeSignalTrade(trade)
  - triggerNativeOrderFlow(trade)
  - placeQueuedTradeNow()
  - setArmed(value)
  - setDebug(value)
  - getSnapshot()
  - helpers.tryParseSocketPayload(raw)
  - helpers.isTradeRequest(payload)
  - helpers.rewriteTradeRequest(payload, queuedTrade)
  - helpers.extractServerEvent(message)
  - helpers.extractOrderOpen(message)
  - helpers.extractOrderClose(message)

## 3) Where to plug strategy signal logic

Preferred integration point:

- Dispatch a page event:

```js
window.dispatchEvent(new CustomEvent('mpb:strategy-signal', {
  detail: {
    asset: 'EURUSD_otc',
    direction: 'call',
    amount: 2,
    expiry: 60,
    mode: 'demo',
    strategyTag: 'my-strategy'
  }
}));
```

Or call runtime directly:

```js
window.MPBTraderRuntime.placeSignalTrade({
  asset: 'EURUSD_otc',
  direction: 'put',
  amount: 3,
  expiry: 60,
  mode: 'live',
  strategyTag: 'breakout-v2'
});
```

## 4) Where to plug entry-adjustment logic

Use one of these extension points:

- Before queueing trade: modify strategy output before enqueueTrade/placeSignalTrade.
- Inside rewrite path: extend execution_engine.js rewriteTradeRequest(...) to map any additional existing packet keys.

Important: only overwrite keys that already exist in site packet structure.

## 5) Sample enqueue trade call

```js
window.MPBTraderRuntime.enqueueTrade({
  asset: 'GBPUSD',
  direction: 'call',
  amount: 5,
  expiry: 60,
  mode: 'demo',
  strategyTag: 'manual-test'
});

window.MPBTraderRuntime.placeQueuedTradeNow();
```

## 6) Sample rewrite outgoing packet implementation

```js
var samplePayload = [
  'openOrder',
  {
    asset: 'EURUSD',
    action: 'call',
    amount: 1,
    isDemo: 1,
    duration: 60
  }
];

var queuedTrade = {
  asset: 'USDJPY_otc',
  direction: 'put',
  amount: 4,
  expiry: 120,
  mode: 'live'
};

var rewritten = window.MPBTraderRuntime.helpers.rewriteTradeRequest(samplePayload, queuedTrade);
console.log(rewritten);
```
