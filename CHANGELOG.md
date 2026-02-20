# Changelog

All notable changes to the Money Printer Bot extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
