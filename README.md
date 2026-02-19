# Money Printer Bot - Pocket Option Trading Extension

A Chrome browser extension that provides automated trading capabilities for Pocket Option and compatible binary options platforms.

## ⚠️ Important Disclaimer

**Trading binary options carries significant financial risk. This bot is provided for educational and research purposes only. Use at your own risk. Past performance does not guarantee future results. Only trade with money you can afford to lose.**

## Overview

Money Printer Bot is a browser extension that integrates with Pocket Option trading platforms to provide:

- **Automated Trading Strategies**: Multiple built-in strategies including signals, candles, CCI indicators, and pin bar patterns
- **Risk Management**: Configurable profit targets, deal limits, and martingale position sizing
- **Real-time Monitoring**: WebSocket integration for live market data and automated trade execution
- **Modern UI**: Dark neon-themed overlay interface for strategy configuration and monitoring

## Features

- 🤖 **Multiple Trading Strategies**
  - Signal-based trading
  - Candlestick pattern recognition
  - CCI (Commodity Channel Index) indicator
  - Pin bar pattern detection
  - Martingale money management

- 📊 **Advanced Controls**
  - Minimum profit threshold filtering
  - Configurable deal limits
  - Take profit targets (percentage or fixed amount)
  - Delay between trades
  - OTC (Over-The-Counter) market toggle

- 🎨 **User Interface**
  - Dark neon theme for reduced eye strain
  - Real-time balance tracking (demo/real accounts)
  - Trade history and performance monitoring
  - Strategy parameter customization

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   cd DaRealPipsPocketOptions
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the repository folder

5. The Money Printer Bot extension should now appear in your extensions list

### Supported Platforms

The extension works on the following domains:
- pocketoption.com
- platform58.po2.capital
- p.finance
- po.company
- po1.capital
- pocket-link22.co

## Usage

1. **Navigate to a supported platform** (e.g., https://pocketoption.com)

2. **Wait for the platform to fully load** - The bot will automatically inject its UI when the trading interface is ready

3. **Configure your strategy**:
   - Select your preferred trading strategy
   - Set minimum profit threshold
   - Configure deal limits and take profit targets
   - Adjust other parameters as needed

4. **Start the bot** - Click the start button to begin automated trading

5. **Monitor performance** - Track your trades and account balance in real-time

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Strategy** | Trading algorithm to use (signals/candles/CCI/pinBar/martin) | signals |
| **Min Profit** | Minimum profit percentage required to open trades | 80% |
| **Delay** | Seconds to wait between trades | 0 |
| **Deals Limit** | Maximum concurrent open positions | 10 |
| **Take Profit %** | Percentage gain to stop trading | 20% |
| **Use OTC** | Trade during OTC (weekend) hours | true |
| **Martingale Steps** | Position sizing multipliers for recovery strategy | [2,2,2,2,2,2,2,2,2] |

## Project Structure

```
DaRealPipsPocketOptions/
├── manifest.json                      # Chrome extension manifest (MV3)
├── document_start.js                  # Early injection bootstrap
├── document_end.js                    # Bundled core logic (minified)
├── overlay.js                         # UI loader and initialization
├── web_accessible_resources.js        # Main bot engine and strategies
├── main.js                            # Extension entry point
├── assets/
│   ├── neon.css                      # Dark neon theme styles
│   └── money_printer.svg             # SVG logo
└── icon/
    └── *.png                         # Extension icons (various sizes)
```

## Development

This extension is built with vanilla JavaScript (no build tools required).

### Key Files

- **web_accessible_resources.js**: Core trading engine, strategy implementations, and WebSocket interception
- **overlay.js**: UI initialization and DOM stability checks
- **document_start.js**: Early script injection into page context
- **manifest.json**: Extension configuration and permissions

### Making Changes

1. Edit the relevant JavaScript files
2. Reload the extension in `chrome://extensions/`
3. Test thoroughly on a demo account before using with real funds

## Trading Strategies Explained

### Signals Strategy
Uses predefined signal indicators across multiple timeframes (1m, 2m, 3m, 5m, 10m, 15m) to determine optimal entry points.

### Candles Strategy
Analyzes consecutive candlestick patterns to identify trend continuation or reversal setups.

### CCI Strategy
Commodity Channel Index indicator with configurable period and thresholds for overbought/oversold conditions.

### Pin Bar Strategy
Detects pin bar reversal patterns with configurable rejection ratio thresholds.

### Martingale Strategy
Progressive position sizing to recover losses - **use with extreme caution due to high risk**.

## Security & Privacy

- All trading logic runs locally in your browser
- No external data collection or tracking
- WebSocket traffic interception is limited to supported trading platforms
- Extension requires minimal permissions (storage only)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Visit: https://thewealthyempire.net

## Acknowledgments

- Built for Pocket Option and compatible platforms
- Uses vanilla JavaScript for maximum compatibility
- Dark neon UI inspired by modern trading interfaces

---

**Remember: Never risk more than you can afford to lose. Always test strategies on demo accounts first.**