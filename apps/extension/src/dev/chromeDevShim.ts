/**
 * Minimal `chrome.*` shim so the popup can run in a plain browser tab
 * (e.g. http://localhost:5173) during development.
 *
 * The real popup relies on `chrome.storage.local` for persistence and on
 * `chrome.runtime.sendMessage` to talk to the background service worker.
 * Neither exists in a normal page, which is why the UI renders but nothing
 * works there. This shim backs storage with localStorage and stubs the
 * service-worker messaging. It is a no-op when the real extension APIs are
 * present, so it never affects the packaged extension.
 */

type RuntimeListener = (
  message: any,
  sender: any,
  sendResponse: (response?: any) => void,
) => boolean | void;

const STORAGE_PREFIX = "__guardian_dev_chrome_storage_";
const LOCKED_SESSION = { isLoggedIn: false, lastModified: 0, mode: "local" as const };

function createStorageArea(area: string) {
  const key = `${STORAGE_PREFIX}${area}`;

  const read = (): Record<string, unknown> => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  };

  const write = (data: Record<string, unknown>) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  return {
    async get(keys?: string | string[] | Record<string, unknown> | null) {
      const store = read();
      if (keys == null) return { ...store };
      if (typeof keys === "string") {
        return keys in store ? { [keys]: store[keys] } : {};
      }
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) if (k in store) out[k] = store[k];
        return out;
      }
      const out: Record<string, unknown> = {};
      for (const [k, fallback] of Object.entries(keys)) {
        out[k] = k in store ? store[k] : fallback;
      }
      return out;
    },
    async set(items: Record<string, unknown>) {
      write({ ...read(), ...items });
    },
    async remove(keys: string | string[]) {
      const store = read();
      for (const k of Array.isArray(keys) ? keys : [keys]) delete store[k];
      write(store);
    },
    async clear() {
      write({});
    },
  };
}

export function installChromeDevShim(): void {
  const g = globalThis as any;
  if (g.chrome?.storage?.local) return;

  const listeners = new Set<RuntimeListener>();

  const runtime = {
    id: "guardian-dev-shim",
    lastError: undefined as any,
    sendMessage: (message: any, callback?: (response: any) => void) => {
      // The popup bootstraps by asking the service worker for the current
      // session; there is no worker in a plain tab, so report a locked state.
      const response = message?.action === "getSession" ? { ...LOCKED_SESSION } : undefined;
      if (typeof callback === "function") callback(response);
      return Promise.resolve(response);
    },
    onMessage: {
      addListener: (listener: RuntimeListener) => listeners.add(listener),
      removeListener: (listener: RuntimeListener) => listeners.delete(listener),
      hasListener: (listener: RuntimeListener) => listeners.has(listener),
    },
    onStartup: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
  };

  g.chrome = g.chrome || {};
  g.chrome.runtime = runtime;
  g.chrome.storage = {
    local: createStorageArea("local"),
    session: createStorageArea("session"),
    sync: createStorageArea("sync"),
  };
  g.chrome.tabs = g.chrome.tabs || { sendMessage: () => Promise.resolve() };
}
