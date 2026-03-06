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


