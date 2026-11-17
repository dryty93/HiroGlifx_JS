"use strict";
// Inject an existing Playwright Page. This module does not launch a browser.
function createPlaywrightAdapter(page) {
  if (!page || typeof page.goto !== "function") throw new Error("A Playwright Page is required");
  return {
    open: url => page.goto(url),
    click: selector => page.locator(selector).click(),
    type: (selector, value) => page.locator(selector).fill(value),
    wait: selector => page.locator(selector).waitFor({ state: "visible", timeout: 10000 }),
    screenshot: path => {
      if (!/^[\w./-]+\.png$/.test(path) || path.startsWith("/") || path.split("/").includes(".."))
        throw new Error("Screenshot must be a relative .png path");
      return page.screenshot({ path });
    }
  };
}
module.exports = { createPlaywrightAdapter };
