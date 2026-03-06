const { chromium } = require('playwright-core');

class BrowserSessionManager {
  constructor(browserlessUrl) {
    this.browserlessUrl = browserlessUrl;
    this.browser = null;
    this.contexts = new Map(); // sessionId -> context
    this.pages = new Map(); // sessionId -> page
    this.connecting = false;
  }

  async connect() {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.browser;
    }

    this.connecting = true;
    try {
      console.log(`[SESSION] Connecting to Browserless: ${this.browserlessUrl}`);
      
      // Connect to Browserless via CDP
      this.browser = await chromium.connectOverCDP(this.browserlessUrl, {
        timeout: 30000
      });

      console.log(`[SESSION] Connected to Browserless successfully`);
      
      // Handle browser disconnection
      this.browser.on('disconnected', () => {
        console.log('[SESSION] Browser disconnected');
        this.browser = null;
        this.contexts.clear();
        this.pages.clear();
      });

      return this.browser;
    } catch (error) {
      this.connecting = false;
      console.error('[SESSION] Failed to connect to Browserless:', error);
      throw new Error(`Failed to connect to Browserless: ${error.message}`);
    } finally {
      this.connecting = false;
    }
  }

  async getOrCreateContext(sessionId = 'default') {
    await this.connect();

    if (this.contexts.has(sessionId)) {
      const context = this.contexts.get(sessionId);
      // Check if context is still valid (not closed)
      try {
        // Try to access pages to verify context is still valid
        context.pages();
        return context;
      } catch (error) {
        // Context is closed or invalid, remove it
        this.contexts.delete(sessionId);
      }
    }

    // Get existing contexts or create new one
    const contexts = this.browser.contexts();
    let context;
    
    if (contexts.length > 0) {
      // Reuse existing context for default session
      context = contexts[0];
    } else {
      // Create new context
      context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }

    this.contexts.set(sessionId, context);
    
    // Handle context closure
    context.on('close', () => {
      this.contexts.delete(sessionId);
      this.pages.delete(sessionId);
    });

    return context;
  }

  async getOrCreatePage(sessionId = 'default') {
    const context = await this.getOrCreateContext(sessionId);

    if (this.pages.has(sessionId)) {
      const page = this.pages.get(sessionId);
      if (!page.isClosed()) {
        return page;
      }
      this.pages.delete(sessionId);
    }

    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();
    
    this.pages.set(sessionId, page);
    return page;
  }

  async closeSession(sessionId) {
    if (this.contexts.has(sessionId)) {
      const context = this.contexts.get(sessionId);
      await context.close();
      this.contexts.delete(sessionId);
      this.pages.delete(sessionId);
    }
  }

  async closeAll() {
    console.log('[SESSION] Closing all sessions...');
    
    for (const [sessionId, context] of this.contexts.entries()) {
      try {
        await context.close();
      } catch (error) {
        console.error(`[SESSION] Error closing session ${sessionId}:`, error);
      }
    }

    this.contexts.clear();
    this.pages.clear();

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('[SESSION] Error closing browser:', error);
      }
      this.browser = null;
    }
  }
}

module.exports = { BrowserSessionManager };
