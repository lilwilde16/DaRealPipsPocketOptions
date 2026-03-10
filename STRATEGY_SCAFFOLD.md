Strategy Scaffold

This project now exposes a runtime strategy registry in the page:

window.MPBStrategyHub

What it gives you
- Register custom strategies as separate modules.
- Enable/disable them without editing core bot code.
- Select them from the strategy dropdown.
- Attach runtime handlers for function-calling tests.

Built-in strategies kept active
- signals
- candles
- martin

Custom strategy naming
- Custom strategies use value format: custom:<id>
- Example id: custom:ema-breakout

Quick start
1. Open PocketOption page with extension loaded.
2. Open browser console.
3. Register a strategy module:

window.MPBStrategyHub.register({
  id: 'ema-breakout',
  name: 'EMA Breakout',
  description: 'Test scaffold strategy',
  version: '0.1.0',
  enabled: true,
  config: {
    fast: 9,
    slow: 21,
    timeframe: '1m'
  }
});

4. Add runtime handler (for tests):

window.MPBStrategyHub.on('ema-breakout', {
  onSettings: function (settings) {
    console.log('settings update', settings);
  },
  onNewDeal: function (event) {
    console.log('new deal event', event);
  },
  onRobotDeals: function (robotDeals) {
    console.log('robot deals', robotDeals);
  },
  onToggleRequest: function (meta) {
    console.log('start/stop clicked', meta);
  }
});

5. Select strategy:

window.MPBStrategyHub.select('custom:ema-breakout');

Useful API
- window.MPBStrategyHub.register(def)
- window.MPBStrategyHub.update(id, patch)
- window.MPBStrategyHub.remove(id)
- window.MPBStrategyHub.enable(id)
- window.MPBStrategyHub.disable(id)
- window.MPBStrategyHub.list()
- window.MPBStrategyHub.get(id)
- window.MPBStrategyHub.select(value)
- window.MPBStrategyHub.on(id, handler)
- window.MPBStrategyHub.off(id)
- window.MPBStrategyHub.active()

Notes
- Module metadata is persisted in localStorage key: mpb.strategy.modules.v1
- Runtime handlers are in-memory and should be reattached after reload.
- This scaffold is designed to prepare strategy modules and function-calling tests without reintroducing extra UI noise.
