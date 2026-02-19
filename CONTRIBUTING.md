# Contributing to Money Printer Bot

Thank you for your interest in contributing to Money Printer Bot! We welcome contributions from the community.

## Code of Conduct

- Be respectful and considerate in all interactions
- Focus on constructive feedback and collaboration
- Remember this software involves financial trading - accuracy and safety are paramount

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser version and platform details
- Screenshots if applicable

### Suggesting Enhancements

We welcome feature suggestions! Please:
- Check if the feature has already been requested
- Provide a clear use case and rationale
- Describe the expected behavior in detail

### Pull Requests

1. **Fork the repository** and create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Keep changes focused and atomic
   - Follow existing code style and conventions
   - Add comments for complex logic
   - Test thoroughly on demo accounts

3. **Test your changes**:
   - Load the extension in Chrome developer mode
   - Test on demo accounts first
   - Verify existing functionality still works
   - Check browser console for errors

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add new feature description"
   ```
   
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

5. **Push to your fork** and submit a pull request

6. **PR Guidelines**:
   - Provide a clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

## Development Guidelines

### Code Style

- Use **2 spaces** for indentation (JavaScript)
- Use **semicolons** at end of statements
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Keep lines under 100 characters when possible
- Add JSDoc comments for functions

### File Organization

- **manifest.json**: Extension configuration only
- **document_start.js**: Early injection logic (minimal)
- **overlay.js**: UI initialization and DOM waiting
- **web_accessible_resources.js**: Core bot logic and strategies
- **assets/**: Static resources (CSS, SVG, etc.)
- **icon/**: Extension icons only

### Testing Checklist

Before submitting a PR, verify:
- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] No console errors on supported platforms
- [ ] UI displays correctly (if applicable)
- [ ] Demo account trading works as expected
- [ ] No unintended side effects on platform functionality
- [ ] Code is properly commented
- [ ] Commits are atomic and well-described

### Security Considerations

**Critical**: This extension handles financial transactions. Please:
- Never expose user credentials or API keys
- Validate all user inputs
- Use WebSocket interception carefully
- Test edge cases thoroughly
- Document any security implications

### Trading Strategy Contributions

When adding or modifying trading strategies:
1. **Document the strategy logic** with clear comments
2. **Explain parameters** and their recommended ranges
3. **Include risk warnings** for aggressive strategies
4. **Test extensively** on historical data if possible
5. **Never promise profitability** - all trading involves risk

## Questions?

If you have questions about contributing:
- Open a GitHub Discussion
- Check existing issues and PRs
- Visit https://thewealthyempire.net

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Remember**: Always test on demo accounts before using real funds. Trading involves significant risk.
