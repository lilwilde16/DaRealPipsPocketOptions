# Money Printer Bot - Pocket Options Trading Extension

![Version](https://img.shields.io/badge/version-2.4.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome Extension](https://img.shields.io/badge/chrome-extension-yellow)
![Manifest V3](https://img.shields.io/badge/manifest-v3-orange)

A Chrome browser extension designed for automated trading on Pocket Option platform using various trading strategies and signals.

## 🌟 Features

- **Multiple Trading Strategies**:
  - Signal-based trading
  - Candle pattern analysis
  - CCI (Commodity Channel Index) indicator
  - Pin bar patterns
  - RSI Binary Strategy (RSI-6, oversold 13, overbought 82, 3-bar hold)
  - **Binary Continuation Strategy (M1)** — dual-timeframe continuation strategy with EMA/DMI/RSI indicators and per-pair martingale management
  - Martingale progression system

- **Customizable Settings**:
  - Minimum profit percentage threshold
  - Deal limits and delay configuration
  - Take profit targets (percentage and sum)
  - OTC market support
  - Demo/Real account switching
  - **Pair selection**: explicitly choose which trading pairs (and OTC variants) the bot is allowed to trade

- **Advanced UI**:
  - Dark neon theme interface
  - Real-time PnL (Profit and Loss) tracking
  - Trade notifications and status indicators
  - Interactive control panel

## 📋 Requirements

- Google Chrome browser (version 88 or higher)
- Active Pocket Option account
- Chrome Developer Mode enabled

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable "Developer mode" (toggle in the top-right corner)

4. Click "Load unpacked" button

5. Select the folder containing this extension's files

6. The Money Printer Bot extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store

*Coming soon - pending Chrome Web Store submission*

## 💡 Usage

1. **Navigate to Pocket Option**: Visit one of the supported trading platforms:
   - https://pocketoption.com
   - https://platform58.po2.capital
   - https://p.finance
   - https://po.company
   - https://po1.capital
   - https://pocket-link22.co

2. **Open the Bot Interface**: Click on the extension icon or look for the bot overlay on the trading page

   > **Note**: The bot UI only appears on the cabinet/trading pages (e.g. `https://pocketoption.com/en/cabinet/…`). It will **not** inject on the login, register, or other authentication pages.

3. **Configure Settings**:
   - Choose your trading strategy
   - Set minimum profit threshold
   - Configure deal limits
   - Set take profit targets
   - Enable/disable OTC trading
   - **Select trading pairs**: In the "Trading Pairs" tile, click the pairs you want the bot to scan and trade. **At least one pair must be selected — the bot will not trade if no pairs are selected.** Use the "Select All", "Clear All", "Live Only", or "OTC Only" quick-buttons for convenience. Selections are persisted automatically.

4. **Start Trading**: Click the start button to begin automated trading

5. **Monitor Performance**: Track your trades and PnL in real-time through the bot interface

## 📊 Strategy Details

### Binary Continuation Strategy (M1)

A dual-timeframe continuation strategy designed for binary options on M1 expiry.

**Timeframes:** M5 (trend filter) + M1 (entry)

#### Step 1 — M5 Trend Filter

The strategy only trades in the direction of the M5 trend:

| Signal | Conditions (all required) |
|--------|---------------------------|
| BUY allowed | Price > EMA 200 · EMA 200 sloping up · RSI(14) > 55 |
| SELL allowed | Price < EMA 200 · EMA 200 sloping down · RSI(14) < 45 |
| No trade | Neither condition met |

#### Step 2 — M1 Entry Conditions

| Signal | Conditions (all required) |
|--------|---------------------------|
| CALL | Price above 20 EMA · D+ > D− · Bullish candle close · Close above previous high → enter at next candle open, 1-min expiry |
| PUT | Price below 20 EMA · D− > D+ · Bearish candle close · Close below previous low → enter at next candle open, 1-min expiry |

#### Per-Pair Martingale Rules

Each selected pair runs an **independent** martingale chain:

- **Win** → reset to base size, clear all loss state
- **Loss** → do NOT immediately double; wait for a new confirmed signal (all M5+M1 conditions must trigger again), then double **only** on that fresh signal
- **Maximum 4 doubles** (steps 1–4 after losses 1–4)
- After **3 consecutive losses**: pair enters a configurable cooldown (default 10 min)
- After **4 consecutive losses**: session stops for that pair; resets on next bot start

#### Built-in Guardrails (documented restrictions)

> The following conditions reduce trade quality and should be avoided. Where automatic detection is not feasible, they are listed as user-visible reminders in the settings tile:
> - **Do NOT** trade during obvious sideways chop
> - **Do NOT** trade during low-volatility sessions
> - **Do NOT** trade during or around major news releases
> - **Do NOT** trade when price is far extended from the 20 EMA
> - **Only** trade continuation setups after small pullbacks to the EMA

## ⚙️ Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Strategy | Trading strategy to use | Signals |
| Min Profit | Minimum profit percentage per trade | 80% |
| Delay | Delay between trades (seconds) | 0 |
| Deals Limit | Maximum concurrent trades | 10 |
| Take Profit | Profit target percentage | 20% |
| Use OTC | Trade in OTC markets | Enabled |
| Use Martin | Enable Martingale system | Disabled |
| Selected Pairs | Pairs the bot is allowed to trade (explicit selection required; **no trading occurs if the list is empty**) | None (must be configured) |
| BC Cooldown (min) | Binary Continuation M1: cooldown pause after 3 consecutive losses on a pair (1–60 min) | 10 |

## 📁 Project Structure

```
DaRealPipsPocketOptions/
├── manifest.json              # Extension manifest (v3)
├── main.js                    # Main extension logic
├── document_start.js          # Early bootstrap script
├── document_end.js            # Main content script (includes jQuery)
├── overlay.js                 # UI overlay loader
├── web_accessible_resources.js # Core bot logic and strategies
├── assets/                    # CSS and SVG assets
│   ├── money_printer.svg
│   └── neon.css
├── icon/                      # Extension icons
│   └── *.png
├── README.md                  # This file
├── LICENSE                    # MIT License
├── CONTRIBUTING.md            # Contribution guidelines
├── CHANGELOG.md               # Version history
└── SECURITY.md                # Security policy
```

## ⚠️ Disclaimer

**IMPORTANT**: This software is provided for educational purposes only. 

- Trading involves substantial risk of loss
- Past performance does not guarantee future results
- Only trade with money you can afford to lose
- Always test strategies in demo mode first
- The developers are not responsible for any financial losses

## 🛠️ Development

### Prerequisites

- Google Chrome browser (version 88 or higher)
- No build tools or Node.js required — the extension is loaded directly from source files

### Local Setup & Testing

1. Clone the repository:
   ```bash
   git clone https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   cd DaRealPipsPocketOptions
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the repository folder
5. Visit a supported Pocket Option URL (see [Usage](#-usage))
6. After making code changes, click the **↺ Reload** icon on the extension card to apply them
7. Check the browser console for errors (right-click the trading page → Inspect → Console)

### Technologies Used

- **JavaScript**: Core extension logic
- **Chrome Extension Manifest V3**: Modern extension API
- **WebSocket**: Real-time market data communication
- **CSS3**: Styling and animations

### Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Guidelines for contributing to the project
- **[CHANGELOG.md](CHANGELOG.md)**: Version history and release notes
- **[SECURITY.md](SECURITY.md)**: Security policy and best practices
- **[LICENSE](LICENSE)**: MIT License details

### Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Homepage**: [The Wealthy Empire](https://thewealthyempire.net)
- **Repository**: [GitHub](https://github.com/lilwilde16/DaRealPipsPocketOptions)

## 📧 Contact

For bug reports and feature requests, please open an issue on GitHub.

---

**Version**: 2.4.0  
**Author**: Jash  
**Last Updated**: February 2026