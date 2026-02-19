# Contributing to Money Printer Bot

Thank you for your interest in contributing to the Money Printer Bot Chrome extension! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Detailed steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Browser version and operating system
- Extension version

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider implementation details if possible

### Code Contributions

1. **Fork the repository**
   ```bash
   git fork https://github.com/lilwilde16/DaRealPipsPocketOptions.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Keep changes focused and atomic
   - Add comments for complex logic
   - Test thoroughly in both demo and real environments

4. **Test your changes**
   - Load the extension in Chrome Developer Mode
   - Test on Pocket Option platform
   - Verify no console errors
   - Test in both demo and real account modes

5. **Commit your changes**
   ```bash
   git commit -m "Add: brief description of changes"
   ```
   
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for code formatting
   - `refactor:` for code restructuring
   - `test:` for test additions
   - `chore:` for maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Explain what changes were made and why
   - Include screenshots for UI changes

## 📋 Code Style Guidelines

### JavaScript

- Use clear, descriptive variable names
- Add comments for complex algorithms
- Follow existing patterns and conventions
- Keep functions small and focused
- Avoid deeply nested code

### File Organization

- Place UI-related code in `overlay.js`
- Core bot logic belongs in `web_accessible_resources.js`
- Content scripts in `document_start.js` and `document_end.js`
- Update `manifest.json` for any new permissions or scripts

### Testing

- Test in Chrome Developer Mode before submitting
- Verify on live Pocket Option platform
- Test with different strategy configurations
- Ensure no breaking changes to existing features
- Test in both demo and real account modes

## 🔍 Development Setup

1. Clone the repository
2. Enable Chrome Developer Mode (`chrome://extensions/`)
3. Load unpacked extension
4. Make changes
5. Reload extension to test
6. Check browser console for errors

## 🚫 What Not to Do

- Don't introduce breaking changes without discussion
- Don't submit untested code
- Don't include API keys or sensitive data
- Don't modify core trading logic without thorough testing
- Don't commit build artifacts or dependencies
- Don't add unnecessary dependencies

## 📝 Pull Request Process

1. Ensure your code follows the style guidelines
2. Update documentation if needed
3. Add yourself to contributors if making significant changes
4. Wait for review and address feedback
5. Once approved, changes will be merged

## ⚖️ Code of Conduct

- Be respectful and professional
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards other contributors

## 📧 Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Contact the maintainers
- Check existing issues and pull requests

## 🙏 Thank You

Your contributions make this project better for everyone!
