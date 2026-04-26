export type DebugLogEntry = {
  ts: string;
  level: "log" | "info" | "warn" | "error";
  message: string;
};

const ENABLED_KEY = "guardian_debug_console";
const LOGS_KEY = "guardian_debug_logs_v1";
const MAX_LOGS = 200;

let installed = false;

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shouldCapture(level: DebugLogEntry["level"], parts: string[]): boolean {
  if (level === "warn" || level === "error") return true;
  if (isDebugConsoleEnabled()) return true;
  return parts.some((part) => part.includes("[autofill]") || part.includes("[sync]") || part.includes("[SSE]"));
}

export function isDebugConsoleEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setDebugConsoleEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export function getDebugLogs(): DebugLogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DebugLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearDebugLogs(): void {
  localStorage.removeItem(LOGS_KEY);
}

export function appendDebugLog(level: DebugLogEntry["level"], ...args: unknown[]): void {
  const parts = args.map((arg) => safeStringify(arg));
  if (!shouldCapture(level, parts)) return;

  const next: DebugLogEntry = {
    ts: new Date().toISOString(),
    level,
    message: parts.join(" "),
  };

  const logs = getDebugLogs();
  logs.push(next);
  while (logs.length > MAX_LOGS) logs.shift();
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage failures; console should still work normally.
  }
}

export function installDebugConsoleCapture(): void {
  if (installed) return;
  installed = true;

  const methods: DebugLogEntry["level"][] = ["log", "info", "warn", "error"];
  for (const level of methods) {
    const original = console[level].bind(console);
    console[level] = ((...args: unknown[]) => {
      appendDebugLog(level, ...args);
      original(...args);
    }) as typeof console[typeof level];
  }

  window.addEventListener("error", (event) => {
    appendDebugLog("error", event.message, event.error ?? "");
  });

  window.addEventListener("unhandledrejection", (event) => {
    appendDebugLog("error", "Unhandled rejection", event.reason ?? "");
  });
}

export function formatDebugLogs(entries: DebugLogEntry[]): string {
  return entries.map((entry) => `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.message}`).join("\n");
}
