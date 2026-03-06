const express = require('express');
const cors = require('cors');
const { BrowserSessionManager } = require('./session-manager');
const { CommandMapper } = require('./command-mapper');

// Environment variables
const {
  BROWSERLESS_WS_ENDPOINT,
  BROWSERLESS_TOKEN,
  PORT = 3000,
  LOG_LEVEL = 'info'
} = process.env;

// Validate required environment variables
const requiredEnvVars = [
  'BROWSERLESS_WS_ENDPOINT'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Logging utility (define early so we can use it)
const log = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => LOG_LEVEL === 'debug' && console.log(`[DEBUG] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};

// Build Browserless WebSocket URL with token
// Only add token if endpoint doesn't already have one and token is provided
let browserlessUrl = BROWSERLESS_WS_ENDPOINT;
if (BROWSERLESS_TOKEN && !browserlessUrl.includes('token=')) {
  const separator = browserlessUrl.includes('?') ? '&' : '?';
  browserlessUrl = `${browserlessUrl}${separator}token=${BROWSERLESS_TOKEN}`;
}

// Initialize session manager and command mapper
const sessionManager = new BrowserSessionManager(browserlessUrl);
const commandMapper = new CommandMapper(sessionManager);

// Initialize Express app
const app = express();

// Log all incoming requests FIRST (before body parsing)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  log.info(`[INCOMING] ${req.method} ${req.path} - ${timestamp}`);
  log.info(`[INCOMING] Origin: ${req.headers.origin || 'none'}`);
  log.info(`[INCOMING] User-Agent: ${req.headers['user-agent'] || 'none'}`);
  log.info(`[INCOMING] Content-Type: ${req.headers['content-type'] || 'none'}`);
  next();
});

// CORS middleware - allow all origins for debugging
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Support large screenshots
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Support form data

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'browser-bridge',
    browserless: BROWSERLESS_WS_ENDPOINT ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// Browser command endpoint
app.post('/browser/command', async (req, res) => {
  const startTime = Date.now();
  const cmd = req.body;
  
  // Set a longer timeout for browser operations (60 seconds)
  req.setTimeout(60000);
  res.setTimeout(60000);
  
  log.info(`[REQUEST] Received browser command: ${cmd.action || cmd.type || cmd.command || 'unknown'}`);
  log.info(`[REQUEST] Full command payload:`, JSON.stringify(cmd, null, 2));
  log.info(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));

  try {
    const result = await commandMapper.execute(cmd);
    const duration = Date.now() - startTime;
    log.info(`[RESPONSE] Command completed in ${duration}ms`);
    log.debug('Command result:', JSON.stringify(result, null, 2));
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`[ERROR] Command failed after ${duration}ms:`, error.message);
    log.error('[ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: LOG_LEVEL === 'debug' ? error.stack : undefined
    });
  }
});

// Browser command endpoint (alternative path for compatibility)
app.post('/api/browser/command', async (req, res) => {
  // Same handler as /browser/command
  const startTime = Date.now();
  const cmd = req.body;
  
  // Set a longer timeout for browser operations (60 seconds)
  req.setTimeout(60000);
  res.setTimeout(60000);
  
  log.info(`[REQUEST] Received browser command (via /api): ${cmd.action || cmd.type || cmd.command || 'unknown'}`);
  log.info(`[REQUEST] Full command payload:`, JSON.stringify(cmd, null, 2));
  log.info(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));

  try {
    const result = await commandMapper.execute(cmd);
    const duration = Date.now() - startTime;
    log.info(`[RESPONSE] Command completed in ${duration}ms`);
    log.debug('Command result:', JSON.stringify(result, null, 2));
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`[ERROR] Command failed after ${duration}ms:`, error.message);
    log.error('[ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: LOG_LEVEL === 'debug' ? error.stack : undefined
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'OpenClaw Browser Bridge',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      browserCommand: '/browser/command',
      browserCommandAlt: '/api/browser/command',
      test: '/test'
    },
    documentation: 'POST browser commands to /browser/command endpoint'
  });
});

// Test endpoint - logs all requests for debugging
app.all('/test', (req, res) => {
  const timestamp = new Date().toISOString();
  log.info(`[TEST] ${req.method} request received at ${timestamp}`);
  log.info(`[TEST] Headers:`, JSON.stringify(req.headers, null, 2));
  log.info(`[TEST] Query:`, JSON.stringify(req.query, null, 2));
  log.info(`[TEST] Body:`, JSON.stringify(req.body, null, 2));
  
  res.json({
    success: true,
    message: 'Test endpoint reached successfully',
    timestamp,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  log.error('Express error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Graceful shutdown
const shutdown = async () => {
  log.info('Shutting down...');
  try {
    await sessionManager.closeAll();
    server.close(() => {
      log.info('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start HTTP server
const server = app.listen(PORT, () => {
  log.info(`Browser Bridge HTTP server listening on port ${PORT}`);
  log.info(`Health check: http://localhost:${PORT}/health`);
  log.info(`Browser command endpoint: http://localhost:${PORT}/browser/command`);
  log.info(`Browserless endpoint: ${BROWSERLESS_WS_ENDPOINT}`);
});

// Set server timeout to 60 seconds for long-running browser operations
server.timeout = 60000;
server.keepAliveTimeout = 60000;

// Handle server errors
server.on('error', (error) => {
  log.error('HTTP server error:', error);
  process.exit(1);
});
