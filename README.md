# Money Printer Bot - Pocket Options Trading Extension

A Chrome browser extension designed for automated trading on Pocket Option platform using various trading strategies and signals.

## 🌟 Features

- **Multiple Trading Strategies**:
  - Signal-based trading
  - Candle pattern analysis
  - CCI (Commodity Channel Index) indicator
  - Pin bar patterns
  - Martingale progression system

- **Customizable Settings**:
  - Minimum profit percentage threshold
  - Deal limits and delay configuration
  - Take profit targets (percentage and sum)
  - OTC market support
  - Demo/Real account switching

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

3. **Configure Settings**:
   - Choose your trading strategy
   - Set minimum profit threshold
   - Configure deal limits
   - Set take profit targets
   - Enable/disable OTC trading

4. **Start Trading**: Click the start button to begin automated trading

5. **Monitor Performance**: Track your trades and PnL in real-time through the bot interface

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
└── README.md                  # This file
```

## ⚠️ Disclaimer

**IMPORTANT**: This software is provided for educational purposes only. 

- Trading involves substantial risk of loss
- Past performance does not guarantee future results
- Only trade with money you can afford to lose
- Always test strategies in demo mode first
- The developers are not responsible for any financial losses

## 🛠️ Development

### Technologies Used

- **JavaScript**: Core extension logic
- **Chrome Extension Manifest V3**: Modern extension API
- **WebSocket**: Real-time market data communication
- **CSS3**: Styling and animations

### Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

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

**Version**: 2.1.10  
**Author**: Jash  
**Last Updated**: February 2026