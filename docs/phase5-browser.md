# Phase 5 — Browser automation permissions

The existing browser commands now support a policy wrapper with **explicit allowed domains**, operator approval for clicks and typing, and a redacted action audit. No arbitrary script execution.

Run a local automation:

```bash
npm install --no-save playwright
npx playwright install chromium
node runtime/run-browser.js examples/automation.scroll example.com
```

The script only visits domains you name. Actions that change pages or fill forms require an interactive yes/no approval. Audit entries include action types, selectors, status and timestamps, **not typed contents**.

**Known limits:** This adapter is a host-side approval layer, not a full isolation boundary. It does not intercept every network request or prevent cross-origin embedded resources and redirects before they occur. Do not use it for sensitive web automation against untrusted websites. For production, enforce domains at the browser context's network routing level too, use nonpersistent browser profiles, and require separate confirmation for purchases, submissions and destructive actions.

This Phase 5 PR is stacked on Phases 3–4. CI tests cover command delegation, denial, allowlisting and redacted audits.
