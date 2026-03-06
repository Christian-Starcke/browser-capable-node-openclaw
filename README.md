# OpenClaw Playwright Bridge for Browserless

A production-ready bridge node that connects OpenClaw to Browserless on Railway using Playwright. This service receives browser commands from OpenClaw, converts them to Playwright API calls, and executes them in persistent browser sessions via Browserless.

## Architecture

```
OpenClaw → Bridge Node → Browserless (Railway) → Browser
```

- **OpenClaw**: Sends browser tool commands
- **Bridge Node**: Translates commands to Playwright API calls
- **Browserless**: Manages browser instances on Railway
- **Browser**: Executes automation commands

## Features

- ✅ Playwright-based browser automation
- ✅ Persistent browser sessions
- ✅ Command mapping from OpenClaw to Playwright
- ✅ Automatic reconnection handling
- ✅ Session management
- ✅ Error handling and logging
- ✅ Railway deployment ready

## Prerequisites

- Node.js 18+
- Railway account
- OpenClaw Gateway URL and token
- Browserless instance deployed on Railway

## Environment Variables

### Required

- `OPENCLAW_GATEWAY_URL`: OpenClaw Gateway endpoint (e.g., `https://gateway.openclaw.io`)
- `OPENCLAW_GATEWAY_TOKEN`: Authentication token for OpenClaw Gateway
- `BROWSERLESS_WS_ENDPOINT`: Browserless WebSocket endpoint (e.g., `wss://your-browserless.railway.app`)
- `NODE_ID`: Unique identifier for this bridge node (e.g., `browser-bridge-1`)

### Optional

- `BROWSERLESS_TOKEN`: Authentication token for Browserless (if required)
- `LOG_LEVEL`: Logging level (`info`, `debug`, `warn`, `error`) - default: `info`

## Installation

```bash
npm install
```

## Local Development

```bash
# Set environment variables
export OPENCLAW_GATEWAY_URL="https://your-gateway.openclaw.io"
export OPENCLAW_GATEWAY_TOKEN="your-token"
export BROWSERLESS_WS_ENDPOINT="wss://your-browserless.railway.app"
export NODE_ID="browser-bridge-local"
export BROWSERLESS_TOKEN="your-browserless-token"  # if required

# Run the bridge
npm start

# Or with watch mode for development
npm run dev
```

## Railway Deployment

1. **Create a new Railway project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" or "Empty Project"

2. **Configure environment variables**
   - Go to your Railway project settings
   - Add all required environment variables listed above

3. **Deploy**
   - If using GitHub: Push your code and Railway will auto-deploy
   - If using Railway CLI: `railway up`

4. **Verify deployment**
   - Check Railway logs for: `Node {NODE_ID} connected to OpenClaw Gateway`
   - Verify connection to Browserless in logs

## Supported Commands

The bridge supports the following OpenClaw browser commands:

| Command | Description | Parameters |
|---------|-------------|------------|
| `navigate` / `goto` | Navigate to URL | `url` |
| `click` | Click element | `selector`, `options` |
| `type` / `fill` | Type text | `selector`, `text`, `options` |
| `screenshot` | Take screenshot | `options` (fullPage, type) |
| `evaluate` / `execute` | Execute JavaScript | `script`, `args` |
| `waitFor` / `wait` | Wait for element | `selector`, `options` |
| `getText` / `text` | Get element text | `selector` |
| `getAttribute` | Get element attribute | `selector`, `attribute` |
| `select` | Select dropdown option | `selector`, `value` |
| `press` | Press keyboard key | `key` |
| `reload` / `refresh` | Reload page | - |
| `goBack` | Navigate back | - |
| `goForward` | Navigate forward | - |
| `close` | Close session | - |

## Command Examples

### Navigate
```json
{
  "action": "navigate",
  "url": "https://example.com",
  "sessionId": "default"
}
```

### Click Element
```json
{
  "action": "click",
  "selector": "button#submit",
  "sessionId": "default"
}
```

### Type Text
```json
{
  "action": "type",
  "selector": "input#username",
  "text": "myusername",
  "sessionId": "default"
}
```

### Screenshot
```json
{
  "action": "screenshot",
  "options": {
    "fullPage": true,
    "type": "png"
  },
  "sessionId": "default"
}
```

### Execute JavaScript
```json
{
  "action": "evaluate",
  "script": "document.title",
  "sessionId": "default"
}
```

## Session Management

- Sessions are persistent across commands
- Default session ID is `"default"` if not specified
- Use different `sessionId` values for multiple concurrent sessions
- Sessions maintain cookies, localStorage, and browser state

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Browserless
- Verify `BROWSERLESS_WS_ENDPOINT` is correct
- Check if Browserless token is required and set correctly
- Ensure Browserless instance is running on Railway

**Problem**: Cannot connect to OpenClaw Gateway
- Verify `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN`
- Check network connectivity
- Ensure Gateway is accessible

### Command Execution Issues

**Problem**: Commands timing out
- Increase timeout values in command options
- Check Browserless logs for browser issues
- Verify selectors are correct

**Problem**: Session not persisting
- Ensure same `sessionId` is used across commands
- Check if session was explicitly closed
- Verify Browserless session persistence settings

## Logging

Set `LOG_LEVEL=debug` for detailed logging:

```bash
export LOG_LEVEL=debug
npm start
```

## License

MIT
