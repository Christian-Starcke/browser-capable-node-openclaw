# OpenClaw Playwright Bridge for Browserless (HTTP API)

A production-ready HTTP API bridge that connects OpenClaw to Browserless on Railway using Playwright. This service receives browser commands via HTTP, converts them to Playwright API calls, and executes them in persistent browser sessions via Browserless.

## Architecture

```
OpenClaw → HTTP API Bridge → Browserless (Railway) → Browser
```

- **OpenClaw**: Sends browser tool commands via HTTP POST requests
- **Bridge Node**: HTTP API server that translates commands to Playwright API calls
- **Browserless**: Manages browser instances on Railway
- **Browser**: Executes automation commands

## Features

- ✅ HTTP REST API (no WebSocket required)
- ✅ Playwright-based browser automation
- ✅ Persistent browser sessions
- ✅ Command mapping from OpenClaw to Playwright
- ✅ Automatic reconnection handling
- ✅ Session management
- ✅ Error handling and logging
- ✅ Railway deployment ready
- ✅ Health check endpoint

## Prerequisites

- Node.js 18+
- Railway account
- Browserless instance deployed on Railway

## Environment Variables

### Required

- `BROWSERLESS_WS_ENDPOINT`: Browserless WebSocket endpoint (e.g., `wss://your-browserless.railway.app/playwright?token=...`)

### Optional

- `BROWSERLESS_TOKEN`: Authentication token for Browserless (if not included in endpoint URL)
- `PORT`: HTTP server port (default: `3000`)
- `LOG_LEVEL`: Logging level (`info`, `debug`, `warn`, `error`) - default: `info`

**Note**: `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` are no longer required since we're using HTTP API instead of WebSocket connection.

## Installation

```bash
npm install
```

## Local Development

```bash
# Set environment variables
export BROWSERLESS_WS_ENDPOINT="wss://your-browserless.railway.app/playwright?token=your-token"
export PORT=3000
export LOG_LEVEL="info"

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
   - Add `BROWSERLESS_WS_ENDPOINT` (required)
   - Optionally add `PORT` (defaults to 3000)
   - Optionally add `LOG_LEVEL` (defaults to info)

3. **Deploy**
   - If using GitHub: Push your code and Railway will auto-deploy
   - If using Railway CLI: `railway up`

4. **Verify deployment**
   - Check Railway logs for: `Browser Bridge HTTP server listening on port 3000`
   - Visit the health check endpoint: `https://your-bridge.railway.app/health`

## HTTP API Endpoints

### POST `/browser/command`

Execute a browser command.

**Request Body:**
```json
{
  "action": "navigate",
  "url": "https://example.com",
  "sessionId": "default"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain"
}
```

### POST `/api/browser/command`

Alternative endpoint path (same functionality as `/browser/command`).

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "browser-bridge",
  "browserless": "configured",
  "timestamp": "2026-03-06T15:00:00.000Z"
}
```

### GET `/`

Service information endpoint.

**Response:**
```json
{
  "service": "OpenClaw Browser Bridge",
  "version": "2.0.0",
  "endpoints": {
    "health": "/health",
    "browserCommand": "/browser/command",
    "browserCommandAlt": "/api/browser/command"
  }
}
```

## Supported Commands

The bridge supports the following browser commands:

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
```bash
curl -X POST https://your-bridge.railway.app/browser/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "navigate",
    "url": "https://example.com",
    "sessionId": "default"
  }'
```

### Click Element
```bash
curl -X POST https://your-bridge.railway.app/browser/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "selector": "button#submit",
    "sessionId": "default"
  }'
```

### Type Text
```bash
curl -X POST https://your-bridge.railway.app/browser/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type",
    "selector": "input#username",
    "text": "myusername",
    "sessionId": "default"
  }'
```

### Screenshot
```bash
curl -X POST https://your-bridge.railway.app/browser/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "screenshot",
    "options": {
      "fullPage": true,
      "type": "png"
    },
    "sessionId": "default"
  }'
```

### Execute JavaScript
```bash
curl -X POST https://your-bridge.railway.app/browser/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "evaluate",
    "script": "document.title",
    "sessionId": "default"
  }'
```

## Configuring OpenClaw to Use This Bridge

To configure OpenClaw to route browser commands to this bridge:

1. Get your bridge URL from Railway (e.g., `https://your-bridge.railway.app`)
2. Configure OpenClaw to use HTTP endpoint: `https://your-bridge.railway.app/browser/command`
3. OpenClaw will send browser commands as HTTP POST requests to this endpoint

**Note**: The exact configuration depends on your OpenClaw setup. You may need to:
- Set an environment variable in OpenClaw pointing to the bridge URL
- Configure OpenClaw's browser tool to use HTTP instead of WebSocket
- Update OpenClaw's configuration file

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

**Problem**: HTTP server not starting
- Check if `PORT` is available (default: 3000)
- Verify Railway has exposed the service port
- Check Railway logs for errors

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
