# OpenClaw Browser Node for Railway Deployment

This node bridges OpenClaw and Browserless Playwright WebSocket API.

## Features
- Connects to OpenClaw Gateway as a browser-capable node
- Receives browser tool commands from OpenClaw
- Sends commands to Browserless Playwright WebSocket API
- Returns command results back to OpenClaw

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed locally for testing
- Railway CLI
- OpenClaw Gateway URL + Auth Token
- Browserless Playwright WebSocket endpoint + token

### 2. Environment Variables Required
- OPENCLAW_GATEWAY_URL: OpenClaw Gateway endpoint
- OPENCLAW_GATEWAY_TOKEN: Gateway auth token
- BROWSERLESS_WS_ENDPOINT: Browserless Playwright WS endpoint URL (with token included)
- NODE_ID: Unique ID for this node (e.g. `browser-node-1`)

### 3. Install and Run Locally
```bash
npm install
node browser-node.js
```

### 4. Railway Deployment
1. Create new Railway project
2. Upload this directory
3. Set environment variables corresponding to above
4. Deploy and wait for logs to show successful registration

### 5. Verify
- Use OpenClaw dashboard or CLI to ensure node is connected with browser capability
- Test browser tool commands via OpenClaw


---

# browser-node.js

Node.js server that acts as a bridge between OpenClaw and Browserless

```js
const WebSocket = require('ws');
const { Client } = require('openclaw-node');

// Read env variables
const {
  OPENCLAW_GATEWAY_URL,
  OPENCLAW_GATEWAY_TOKEN,
  BROWSERLESS_WS_ENDPOINT,
  NODE_ID
} = process.env;

// Create OpenClaw client
const client = new Client({
  gatewayUrl: OPENCLAW_GATEWAY_URL,
  token: OPENCLAW_GATEWAY_TOKEN,
  nodeId: NODE_ID,
  capabilities: ['browser']
});

// Connect Browserless WebSocket
const browserlessWs = new WebSocket(BROWSERLESS_WS_ENDPOINT);

browserlessWs.on('open', () => {
  console.log('Connected to Browserless WS');
});

browserlessWs.on('error', (err) => {
  console.error('Browserless WS Error:', err);
});

// Handler for OpenClaw browser commands
client.on('browser-command', (cmd, respond) => {
  console.log('Received browser command:', cmd);

  // Relay command as JSON to Browserless WS
  browserlessWs.send(JSON.stringify(cmd));

  // Listen for response (once)
  browserlessWs.once('message', (message) => {
    let result;
    try {
      result = JSON.parse(message);
    } catch(e) {
      result = { error: 'Invalid JSON response from Browserless' };
    }
    respond(result);
  });
});

// Connect node to OpenClaw Gateway
client.connect().then(() => {
  console.log(`Node ${NODE_ID} connected to OpenClaw Gateway with browser capability`);
}).catch(console.error);
```

This is a basic proof of concept meant to be extended with richer error handling and payload translation later.


---

Let me know when you're ready to proceed with deployment steps.