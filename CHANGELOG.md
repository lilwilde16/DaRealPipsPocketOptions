# Changelog

All notable changes to the Money Printer Bot extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-02-24

### Fixed
- **Money Printer icon (`#robot_icon`) now correctly opens the native PocketOption robot modal** (`#sub-menu-robot-modal`). Clicking the icon triggers the native modal, reveals it if hidden, and dispatches the `mpb-icon-clicked` custom event so dependent UI can mount.
- **Removed CSS rules that hid `.mpb-header` and `.mpb-tile`** in `overlay.js`, which were blocking the modal tiles from being visible as the primary control surface.
- **Removed duplicate `.mpb-header{display:none!important}` rule** in `web_accessible_resources.js` that suppressed the header bar.

### Added
- **System Check tile** (`#mpb-sys-check`): appears in the `#mpb-slot` slot of the robot modal **only after the Money Printer icon is clicked**.
  - "Run System Check" button performs the following checks and displays pass/fail results:
    1. **Engine injected** — verifies `window.__MPB_ENGINE_INJECTED__` from `document_start.js`.
    2. **Trading pairs selected** — reads `localStorage.mpb_selected_pairs`; warns clearly when empty (bot will not trade).
    3. **Data stream heartbeat** — detects whether any `belobot` postMessage events have been received from the WebSocket proxy.
    4. **Required DOM nodes** — checks that `#sub-menu-robot-modal` and `#ss_button` are present in the page.
- **Demo-only test trade (Option B)**:
  - "Place Demo Test Trade ($1)" button shown **only when demo mode is detected** after running the System Check.
  - Requires an **explicit two-click confirmation** (second click within 5 seconds); times out otherwise with no trade placed.
  - An additional demo-mode guard is applied immediately before the trade signal is dispatched; the button cannot place trades on real accounts.
  - Sends a `belobot` postMessage (`mpb_demo_test_trade`) to the engine with `amount: 1` and `isDemo: true`.

## [2.4.0] - 2026-02-23

### Added
- **Binary Continuation Strategy (M1)** (`binaryContinuation`): A new dual-timeframe continuation strategy using M5 for trend filtering and M1 for precision entry.
  - **M5 Trend Filter** (all three conditions required):
    - BUY allowed: price above EMA 200, EMA 200 sloping up, RSI(14) > 55
    - SELL allowed: price below EMA 200, EMA 200 sloping down, RSI(14) < 45
    - If neither condition is met, no trade is taken
  - **M1 Entry Signals**:
    - BUY: price above 20 EMA, D+ > D− (DMI), bullish candle close, close above previous candle high → CALL, 1-minute expiry
    - SELL: price below 20 EMA, D− > D+, bearish candle close, close below previous candle low → PUT, 1-minute expiry
  - **Indicator implementations** included in the bot engine: EMA (any period), RSI, DMI (D+/D− via Directional Movement Index), M5 candle aggregation from M1 rate data
  - **UI**: New `Binary Continuation M1 (EMA/DMI)` option injected into the strategy dropdown; new **Binary Continuation M1 — Settings** tile for configuring the cooldown period
  - **Guardrails documented** (user-visible via settings tile note): do not trade during sideways chop, low-volatility sessions, major news releases, or when price is far extended from 20 EMA; only trade continuation after small pullbacks

- **Per-pair martingale state for Binary Continuation** (Option C: unlimited pairs, one chain per pair):
  - Each selected pair maintains independent martingale state: `bcStep` (doubles count), `bcNextAmt`, `bcWait` (fresh-signal gate), `bcStopped` (session halted), `bcCooldown` (timestamp for pause)
  - **Fresh-signal gate**: after a loss the bot does NOT immediately double — it waits until all M5+M1 entry conditions trigger again on that pair, then applies the doubled amount on that fresh signal only
  - **Maximum 4 doubles**: after the 4th consecutive loss the pair's session is stopped (`bcStopped = true`)
  - **Cooldown pause**: after 3 consecutive losses a configurable cooldown starts (default 10 minutes, set via the new settings tile; range 1–60 minutes); the bot resumes scanning that pair once the cooldown expires and then waits for the next fresh signal
  - **Win resets all state**: on a winning trade, step, wait flag, stopped flag, and cooldown are all cleared for that pair
  - State is stored in `userInfo.martinState[pair]` using `bc`-prefixed fields, fully independent from the existing `martin`/`useMartin` fields, so all existing strategies are unaffected
  - `bcCooldownMinutes` (default 10) added to the bot settings object; persisted via `localStorage` (`mpb_bc_cooldown_min`)

## [2.3.0] - 2026-02-20

### Added
- **Pair-Selection UI**: New "Trading Pairs" tile in the bot modal lets users explicitly choose which pairs (including OTC variants) the bot is allowed to scan and trade.
  - Toggle individual pair pills (Forex majors, crosses, Gold/Silver, and OTC versions)
  - Quick-action buttons: Select All, Clear All, Live Only, OTC Only
  - A warning message is shown when no pairs are selected, reminding the user that the bot will not trade
  - Selections persist via `localStorage` (`mpb_selected_pairs`) and are synced to the bot engine via `postMessage` on load
- **Explicit pair-selection requirement enforced across all strategies**: `checkDial()` now blocks trading for any pair that is not in `selected_pairs`, regardless of which strategy is active (signals, candles, CCI, pinBar, RSI Binary, martin/useMartin). An empty `selected_pairs` list means no trading occurs.
- `selected_pairs: []` added to default bot settings object (empty = no pairs allowed until user selects)

## [2.2.0] - 2026-02-20

### Added
- **RSI Binary Strategy**: New `rsiBinary` strategy mirroring the TradingView "RSI Binary Strategy" Pine Script
  - RSI length: 6, Oversold: 13, Overbought: 82, Hold: 3 bars (pyramiding=0)
  - CALL (up) on RSI crossunder below 13 (oversold); PUT (down) on RSI crossover above 82 (overbought)
  - Enforces a 3-bar (180 second) hold period after entry to prevent overlapping trades
  - Per-asset RSI state (`rsi_prev`) tracked in `checkRate` for crossover/crossunder detection
  - RSI Binary option injected into the native strategy select dropdown via DOM observer
  - Integrated into the `checkDial`/`updateStream` flow alongside existing strategies

## [2.1.10] - 2026-02-19

### Added
- Comprehensive README with installation and usage instructions
- MIT License for open-source distribution
- Contributing guidelines (CONTRIBUTING.md)
- .gitignore file for development environment
- Inline code documentation for better maintainability
- CHANGELOG to track version history

### Documentation
- Detailed feature list and configuration options
- Project structure documentation
- Development setup instructions
- Disclaimer and risk warnings

### Infrastructure
- Chrome Extension Manifest V3 compliance
- Multi-platform support (Pocket Option domains)
- WebSocket integration for real-time trading

## [Earlier Versions]

### [2.1.0] - [Date Unknown]
- Multiple trading strategies (Signals, Candles, CCI, Pin Bar)
- Martingale progression system
- Dark neon UI theme
- Real-time PnL tracking
- Stop Loss / Take Profit controls
- Demo and Real account support
- OTC market trading

---

For detailed changes, see the [commit history](https://github.com/lilwilde16/DaRealPipsPocketOptions/commits).
