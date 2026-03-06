class CommandMapper {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  async execute(cmd) {
    const action = cmd.action || cmd.type || cmd.command;
    const sessionId = cmd.sessionId || 'default';

    switch (action) {
      case 'navigate':
      case 'goto':
        return await this.navigate(sessionId, cmd.url);

      case 'click':
        return await this.click(sessionId, cmd.selector, cmd.options);

      case 'type':
      case 'fill':
        return await this.type(sessionId, cmd.selector, cmd.text, cmd.options);

      case 'screenshot':
        return await this.screenshot(sessionId, cmd.options);

      case 'evaluate':
      case 'execute':
        return await this.evaluate(sessionId, cmd.script, cmd.args);

      case 'waitFor':
      case 'wait':
        return await this.waitFor(sessionId, cmd.selector, cmd.options);

      case 'getText':
      case 'text':
        return await this.getText(sessionId, cmd.selector);

      case 'getAttribute':
        return await this.getAttribute(sessionId, cmd.selector, cmd.attribute);

      case 'select':
        return await this.select(sessionId, cmd.selector, cmd.value);

      case 'press':
        return await this.press(sessionId, cmd.key);

      case 'reload':
      case 'refresh':
        return await this.reload(sessionId);

      case 'goBack':
        return await this.goBack(sessionId);

      case 'goForward':
        return await this.goForward(sessionId);

      case 'close':
        return await this.close(sessionId);

      default:
        throw new Error(`Unknown command action: ${action}`);
    }
  }

  async navigate(sessionId, url) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return {
      success: true,
      url: page.url(),
      title: await page.title()
    };
  }

  async click(sessionId, selector, options = {}) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.click(selector, options);
    return { success: true };
  }

  async type(sessionId, selector, text, options = {}) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    if (selector) {
      await page.fill(selector, text, options);
    } else {
      await page.keyboard.type(text, options);
    }
    return { success: true };
  }

  async screenshot(sessionId, options = {}) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    const screenshot = await page.screenshot({
      fullPage: options.fullPage || false,
      type: options.type || 'png',
      ...options
    });
    return {
      success: true,
      screenshot: screenshot.toString('base64'),
      format: options.type || 'png'
    };
  }

  async evaluate(sessionId, script, args = []) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    const result = await page.evaluate(script, ...args);
    return {
      success: true,
      result
    };
  }

  async waitFor(sessionId, selector, options = {}) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    if (selector) {
      await page.waitForSelector(selector, options);
    } else if (options.timeout) {
      await page.waitForTimeout(options.timeout);
    }
    return { success: true };
  }

  async getText(sessionId, selector) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    const text = await page.textContent(selector);
    return {
      success: true,
      text
    };
  }

  async getAttribute(sessionId, selector, attribute) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    const value = await page.getAttribute(selector, attribute);
    return {
      success: true,
      attribute,
      value
    };
  }

  async select(sessionId, selector, value) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.selectOption(selector, value);
    return { success: true };
  }

  async press(sessionId, key) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.keyboard.press(key);
    return { success: true };
  }

  async reload(sessionId) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.reload({ waitUntil: 'networkidle' });
    return {
      success: true,
      url: page.url()
    };
  }

  async goBack(sessionId) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.goBack({ waitUntil: 'networkidle' });
    return {
      success: true,
      url: page.url()
    };
  }

  async goForward(sessionId) {
    const page = await this.sessionManager.getOrCreatePage(sessionId);
    await page.goForward({ waitUntil: 'networkidle' });
    return {
      success: true,
      url: page.url()
    };
  }

  async close(sessionId) {
    await this.sessionManager.closeSession(sessionId);
    return { success: true };
  }
}

module.exports = { CommandMapper };
