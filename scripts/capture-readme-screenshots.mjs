import fs from "node:fs/promises";
import path from "node:path";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
const screenshotDir = path.resolve(process.cwd(), "public/screenshots");
const email = process.env.DEMO_EMAIL ?? "owner@northstarstudio.test";
const password = process.env.DEMO_PASSWORD ?? "demo12345";
const leadId = process.env.LEAD_ID;

if (!leadId) {
  throw new Error("LEAD_ID is required.");
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }

  return response.json();
}

async function createTab(baseUrl) {
  const response = await fetch(`${baseUrl}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`Could not create Chrome tab (${response.status}).`);
  }

  return response.json();
}

function createCdpClient(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  let nextId = 0;
  const pending = new Map();
  const eventListeners = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());

    if (message.id) {
      const resolver = pending.get(message.id);

      if (!resolver) {
        return;
      }

      pending.delete(message.id);

      if (message.error) {
        resolver.reject(new Error(message.error.message));
      } else {
        resolver.resolve(message.result);
      }

      return;
    }

    const listeners = eventListeners.get(message.method) ?? [];
    for (const listener of listeners) {
      listener(message.params ?? {});
    }
  });

  return {
    ws,
    async ready() {
      if (ws.readyState === WebSocket.OPEN) {
        return;
      }

      await new Promise((resolve, reject) => {
        ws.addEventListener("open", resolve, { once: true });
        ws.addEventListener("error", reject, { once: true });
      });
    },
    send(method, params = {}) {
      nextId += 1;
      const id = nextId;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) {
      const listeners = eventListeners.get(method) ?? [];
      listeners.push(listener);
      eventListeners.set(method, listeners);
    },
    waitForEvent(method, timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for ${method}`));
        }, timeoutMs);

        const listener = (params) => {
          clearTimeout(timeout);
          const listeners = eventListeners.get(method) ?? [];
          eventListeners.set(
            method,
            listeners.filter((entry) => entry !== listener),
          );
          resolve(params);
        };

        this.on(method, listener);
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result?.value;
}

async function navigate(client, url) {
  const load = client.waitForEvent("Page.loadEventFired", 15000);
  await client.send("Page.navigate", { url });
  await load;
  await wait(700);
}

async function capture(client, fileName) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });

  await fs.writeFile(path.join(screenshotDir, fileName), Buffer.from(result.data, "base64"));
}

await fs.mkdir(screenshotDir, { recursive: true });

const chromeBaseUrl = "http://127.0.0.1:9222";
const tab = await createTab(chromeBaseUrl);
const client = createCdpClient(tab.webSocketDebuggerUrl);

await client.ready();
await client.send("Page.enable");
await client.send("Runtime.enable");
await client.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await client.send("Emulation.setVisibleSize", {
  width: 1440,
  height: 1200,
});

await navigate(client, `${appUrl}/login`);

await evaluate(
  client,
  `
  (() => {
    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const submitButton = document.querySelector('button[type="submit"]');

    emailInput.focus();
    emailInput.value = ${JSON.stringify(email)};
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));

    passwordInput.focus();
    passwordInput.value = ${JSON.stringify(password)};
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    submitButton.click();
  })()
  `,
);

await wait(2600);

const loginUrlAfterSubmit = await evaluate(client, "window.location.href");

if (typeof loginUrlAfterSubmit === "string" && loginUrlAfterSubmit.includes("/login")) {
  const loginError = await evaluate(
    client,
    `
    (() => {
      const alert = document.querySelector('[class*="rose-"]');
      return alert ? alert.textContent.trim() : "Login did not complete.";
    })()
    `,
  );

  throw new Error(`Screenshot login failed: ${loginError}`);
}

const dashboardUrl = `${appUrl}/w/northstar-studio`;
const leadsUrl = `${appUrl}/w/northstar-studio/leads?view=hot`;
const leadUrl = `${appUrl}/w/northstar-studio/leads/${leadId}`;
const searchUrl = `${appUrl}/w/northstar-studio/search?q=${encodeURIComponent("healthcare fixed estimate")}`;
const settingsUrl = `${appUrl}/w/northstar-studio/settings`;

await navigate(client, dashboardUrl);
await capture(client, "dashboard.png");

await navigate(client, leadsUrl);
await capture(client, "lead-inbox.png");

await navigate(client, leadUrl);
await capture(client, "lead-detail.png");

await navigate(client, searchUrl);
await capture(client, "search-memory.png");

await navigate(client, settingsUrl);
await capture(client, "settings.png");

client.close();
