# Money Printer Bot - Pocket Option Extension

A browser extension that enhances the [Pocket Option](https://pocketoption.com) trading platform with automated trading capabilities and an improved user interface.

## 🎯 What Does This Extension Do?

Money Printer Bot is a browser extension designed specifically for the Pocket Option trading platform and its affiliated domains. It provides:

- **Automated Trading Strategies**: Implements multiple trading strategies including signals-based trading, CCI (Commodity Channel Index), candlestick patterns, and pin bar detection
- **Risk Management**: Built-in stop-loss and take-profit functionality with Martingale support
- **Enhanced UI**: Dark neon-themed overlay with improved controls and real-time status indicators
- **Multi-Domain Support**: Works across all Pocket Option platforms (pocketoption.com, platform58.po2.capital, p.finance, po.company, po1.capital, pocket-link22.co)

The extension injects custom JavaScript into the trading platform pages to provide additional functionality without modifying the core platform code.

## 📦 Installation

### Prerequisites
- A Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, etc.)
- Access to a Pocket Option trading account

### Loading the Extension

1. **Download or Clone the Repository**
   ```bash
   git clone https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   cd DaRealPipsPocketOptions
   ```

2. **Open Extension Management in Your Browser**
   - **Chrome/Brave**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`
   - **Opera**: Navigate to `opera://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `DaRealPipsPocketOptions` folder (the directory containing `manifest.json`)

5. **Verify Installation**
   - You should see "Money Printer Bot" appear in your extensions list
   - The extension icon should appear in your browser toolbar

## 🚀 Usage

### Activating the Extension

1. Navigate to [Pocket Option](https://pocketoption.com) or any supported domain
2. The extension automatically injects itself when the page loads
3. Look for the Money Printer Bot UI overlay on the trading interface
4. The overlay appears after the platform's DOM is stable and ready

### Features

- **Trading Strategies**: Choose from multiple automated trading strategies
- **Deal Management**: Configure deal limits, minimum profit thresholds, and delays
- **Balance Tracking**: Monitors both demo and real account balances
- **Martingale System**: Optional progressive betting system with configurable steps
- **OTC Support**: Option to include or exclude OTC (Over-The-Counter) markets

### Important Notes

⚠️ **Disclaimer**: This extension is for educational and research purposes. Automated trading carries significant financial risk. Only trade with funds you can afford to lose.

## 🛠️ Development

### Project Structure

```
DaRealPipsPocketOptions/
├── manifest.json              # Extension configuration (Manifest V3)
├── main.js                    # Entry point (minimal)
├── document_start.js          # Early injection script
├── document_end.js           # Main platform integration (bundled)
├── overlay.js                 # UI overlay and controls
├── web_accessible_resources.js # Core trading logic and strategies
├── assets/                    # CSS and visual assets
├── icon/                      # Extension icons (various sizes)
└── README.md                  # This file
```

### Making Changes

1. **Clone and Edit**
   ```bash
   git clone https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   cd DaRealPipsPocketOptions
   # Make your changes to the JavaScript files
   ```

2. **Test Your Changes**
   - Open your browser's extension page (e.g., `chrome://extensions/`)
   - Click the refresh/reload icon on the Money Printer Bot extension
   - Navigate to Pocket Option and test your changes
   - Use browser DevTools (F12) to check for errors in the console

3. **Debugging**
   - Open Developer Tools (F12) on the Pocket Option page
   - Check the Console tab for any error messages
   - Use the Sources tab to set breakpoints in the extension code
   - The extension uses `window.postMessage` for communication between scripts

### Key Files Explained

- **document_start.js**: Runs before the page DOM is ready; injects the main trading logic early
- **document_end.js**: Bundled code that runs after DOM is loaded; handles platform integration
- **overlay.js**: Creates the visual UI overlay with controls and indicators
- **web_accessible_resources.js**: Contains the core trading strategies, WebSocket interception, and deal management logic

### Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: Storage (for saving user preferences)
- **Content Scripts**: Run on Pocket Option domains only
- **WebSocket Interception**: The extension intercepts WebSocket connections to monitor trades and market data

## 📝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-improvement`)
3. Make your changes (keeping them focused and well-tested)
4. Commit with clear messages (`git commit -m 'Add feature X'`)
5. Push to your fork (`git push origin feature/my-improvement`)
6. Open a Pull Request

## 📄 License

See the repository for license information.

## 🔗 Links

- **Official Website**: [The Wealthy Empire](https://thewealthyempire.net)
- **Pocket Option Platform**: [pocketoption.com](https://pocketoption.com)

---

**Version**: 2.1.10  
**Author**: Jash