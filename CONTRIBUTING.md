# Contributing to Nuvio MovieBoxPro Companion

Thank you for your interest in contributing to the **Nuvio MovieBoxPro Companion & Discovery Hub**! We welcome bug reports, documentation improvements, feature requests, and code contributions.

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Development Setup

### Prerequisites

- **Node.js**: v20 or newer
- **npm**: v9 or newer
- **Chromium / Google Chrome**: Installed locally for browser automation
- **Git**

### Getting Started

1. **Fork and clone the repository:**
   ```sh
   git clone https://github.com/YOUR_USERNAME/nuvio-movieboxpro-companion.git
   cd nuvio-movieboxpro-companion
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Initialize local environment:**
   ```sh
   npm run init:lan
   ```
   This generates a `.env` file with secure random keys if one does not already exist.

4. **Start the local companion:**
   ```sh
   npm start
   ```

5. **Retrieve setup URL:**
   ```sh
   npm run setup-url
   ```

---

## Running Tests

All unit tests run using the native Node.js test runner:

```sh
npm test
```

Please make sure all tests pass before submitting a pull request. When introducing new logic or fixing a bug, add corresponding unit tests in the `test/` directory.

---

## Code Style & Architecture Guidelines

- **Native ES Modules (`.mjs`)**: All source files use standard ES module syntax (`import` / `export`).
- **No Heavy Frameworks**: Keep runtime dependencies minimal (`playwright` is the only external runtime dependency).
- **Security & Privacy First**:
  - Never commit `.env` files, browser profiles, tokens, or TMDb keys.
  - Ensure all sensitive endpoints check for `COMPANION_KEY` or `PLUGIN_SETUP_KEY`.
  - Avoid exposing ports publicly; design for local LAN or private VPN (Tailscale) usage.
- **Client Compatibility**:
  - Keep Nuvio Android TV, Web, and Mobile compatibility in mind (e.g. handle URL-encoded IDs, trailing slashes, and legacy endpoints).

---

## Submitting Pull Requests

1. Create a feature branch from `main`:
   ```sh
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with clear, descriptive commit messages.
3. Ensure all tests pass: `npm test`.
4. Push to your fork:
   ```sh
   git push origin feature/my-new-feature
   ```
5. Open a Pull Request on GitHub against `main`. Fill in the PR template with details about your changes.

Thank you for contributing!
