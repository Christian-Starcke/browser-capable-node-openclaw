const { chromium } = require('playwright-core');
const { BrowserSessionManager } = require('./session-manager');
const { CommandMapper } = require('./command-mapper');

// Import OpenClaw Client - try different export patterns
let Client;
try {
  const openclawNode = require('openclaw-node');
  
  // Try destructured export first (most common)
  if (openclawNode.Client) {
    Client = openclawNode.Client;
  } 
  // Try default export with Client property
  else if (openclawNode.default && openclawNode.default.Client) {
    Client = openclawNode.default.Client;
  }
  // Try if Client is the default export
  else if (openclawNode.default && typeof openclawNode.default === 'function') {
    Client = openclawNode.default;
  }
  // Try if the whole module is the Client
  else if (typeof openclawNode === 'function') {
    Client = openclawNode;
  }
  // If nothing works, show helpful error
  else {
    console.error('[ERROR] openclaw-node module structure:', Object.keys(openclawNode));
    throw new Error('openclaw-node Client export not found. Package may not be installed or exports differently.');
  }
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('[ERROR] openclaw-node package not found!');
    console.error('[ERROR] Please install it: npm install openclaw-node');
    console.error('[ERROR] Or if it\'s a GitHub package, update package.json with:');
    console.error('[ERROR] "openclaw-node": "github:username/repo#branch"');
  } else {
    console.error('[ERROR] Failed to load openclaw-node:', error.message);
  }
  process.exit(1);
}

// Environment variables
const {
  OPENCLAW_GATEWAY_URL,
  OPENCLAW_GATEWAY_TOKEN,
  BROWSERLESS_WS_ENDPOINT,
  BROWSERLESS_TOKEN,
  NODE_ID,
  LOG_LEVEL = 'info'
} = process.env;

// Validate required environment variables
const requiredEnvVars = [
  'OPENCLAW_GATEWAY_URL',
  'OPENCLAW_GATEWAY_TOKEN',
  'BROWSERLESS_WS_ENDPOINT',
  'NODE_ID'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Build Browserless WebSocket URL with token
// Only add token if endpoint doesn't already have one and token is provided
let browserlessUrl = BROWSERLESS_WS_ENDPOINT;
if (BROWSERLESS_TOKEN && !browserlessUrl.includes('token=')) {
  const separator = browserlessUrl.includes('?') ? '&' : '?';
  browserlessUrl = `${browserlessUrl}${separator}token=${BROWSERLESS_TOKEN}`;
}

// Initialize OpenClaw client
const client = new Client({
  gatewayUrl: OPENCLAW_GATEWAY_URL,
  token: OPENCLAW_GATEWAY_TOKEN,
  nodeId: NODE_ID,
  capabilities: ['browser']
});

// Initialize session manager and command mapper
const sessionManager = new BrowserSessionManager(browserlessUrl);
const commandMapper = new CommandMapper(sessionManager);

// Logging utility
const log = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => LOG_LEVEL === 'debug' && console.log(`[DEBUG] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};

// Handle browser commands from OpenClaw
client.on('browser-command', async (cmd, respond) => {
  log.info(`Received browser command: ${cmd.action || cmd.type || 'unknown'}`);
  log.debug('Command details:', JSON.stringify(cmd, null, 2));

  try {
    const result = await commandMapper.execute(cmd);
    log.debug('Command result:', JSON.stringify(result, null, 2));
    respond(result);
  } catch (error) {
    log.error('Command execution error:', error);
    respond({
      success: false,
      error: error.message,
      stack: LOG_LEVEL === 'debug' ? error.stack : undefined
    });
  }
});

// Graceful shutdown
const shutdown = async () => {
  log.info('Shutting down...');
  try {
    await sessionManager.closeAll();
    await client.disconnect();
    log.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connect to OpenClaw Gateway
client.connect()
  .then(() => {
    log.info(`Node ${NODE_ID} connected to OpenClaw Gateway with browser capability`);
    log.info(`Browserless endpoint: ${BROWSERLESS_WS_ENDPOINT}`);
  })
  .catch((error) => {
    log.error('Failed to connect to OpenClaw Gateway:', error);
    process.exit(1);
  });
