import { Capacitor, CapacitorHttp } from "@capacitor/core";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

export type JsonRecord = Record<string, unknown>;

export type HttpRequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  json?: unknown;
};

export type HttpResult =
  | { ok: true; status: number; json: unknown; text: string }
  | { ok: false; status: number; json: unknown; text: string };

function normalizeHeaders(input?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input ?? {})) out[k] = v;
  return out;
}

function asTextBody(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data ?? "");
  }
}

function toResult(status: number, json: unknown, text: string): HttpResult {
  return status >= 200 && status < 300
    ? { ok: true, status, json, text }
    : { ok: false, status, json, text };
}

export async function httpRequest(url: string, options: HttpRequestOptions = {}): Promise<HttpResult> {
  const method = options.method ?? "GET";
  const headers = normalizeHeaders(options.headers);
  const jsonBody = options.json;
  const hasJsonBody = jsonBody !== undefined;

  // Prefer native HTTP on iOS/Android to avoid WebView CORS + mixed-content constraints.
  if (Capacitor.isNativePlatform()) {
    if (hasJsonBody && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (!headers["Accept"] && !headers["accept"]) {
      headers["Accept"] = "application/json, text/plain, */*";
    }

    const nativeData = hasJsonBody ? JSON.stringify(jsonBody) : undefined;

    const resp = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: nativeData,
      // Use text and parse ourselves to avoid native JSON parsing failures on empty bodies (e.g. 204).
      responseType: "text",
    });

    const text = typeof resp.data === "string" ? resp.data : asTextBody(resp.data);
    let json: unknown = null;
    try {
      json = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      json = null;
    }

    return toResult(resp.status, json, text.trim());
  }

  const fetchResp = await fetch(url, {
    method,
    headers: {
      ...(jsonBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  });

  const text = await fetchResp.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    json = null;
  }

  return toResult(fetchResp.status, json, text.trim());
}
