const { chromium } = require('playwright-core');
const { BrowserSessionManager } = require('./session-manager');
const { CommandMapper } = require('./command-mapper');

// Import OpenClaw Client - the package exports OpenClawClient
const { OpenClawClient } = require('openclaw-node');
const Client = OpenClawClient;

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
// OpenClawClient expects 'url' not 'gatewayUrl'
const client = new Client({
  url: OPENCLAW_GATEWAY_URL,
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
