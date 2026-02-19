# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Money Printer Bot, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainers directly with details
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Best Practices

### For Users

When using Money Printer Bot, please follow these security guidelines:

1. **Start with Demo Mode**: Always test strategies in demo mode first
2. **Set Stop Losses**: Configure stop loss limits to protect your capital
3. **Monitor Actively**: Don't leave the bot running unattended for extended periods
4. **Use Strong Passwords**: Secure your Pocket Option account with a strong, unique password
5. **Enable 2FA**: Use two-factor authentication on your trading account
6. **Review Code**: This is open-source - review the code before using
7. **Keep Updated**: Use the latest version for security patches

### Known Limitations

- This extension requires broad host permissions to interact with Pocket Option
- The extension communicates with external servers for user validation
- WebSocket connections are used for real-time market data
- Trading credentials are managed by the Pocket Option platform, not this extension

### Data Privacy

Money Printer Bot:
- Does NOT store or transmit your trading credentials
- Does NOT collect personal information
- Communicates with Pocket Option platforms using their standard APIs
- May validate user IDs with external servers (see code for details)

### Permissions Explained

This extension requests the following permissions:

- **storage**: To save your bot configuration and preferences locally
- **host_permissions**: To inject scripts on Pocket Option trading platforms
- **web_accessible_resources**: To load bot UI components

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Check the [CHANGELOG](CHANGELOG.md) for security-related updates.

## Disclaimer

**Use at Your Own Risk**: This software is provided "as-is" without any warranty. Trading involves substantial financial risk. The developers are not responsible for any losses incurred.

---

Last Updated: February 2026
