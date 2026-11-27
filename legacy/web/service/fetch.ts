import type {
  ApiErrorPayload,
  ApiValidationErrorDetail,
} from "../types/api/type";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string | null;
  public readonly data: unknown;

  constructor(
    status: number,
    message: string,
    data?: unknown,
    code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  responseType?: "json" | "blob";
  params?: Record<string, string | number | boolean | undefined | null>;
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const errorPayload = data as ApiErrorPayload;
    if (typeof errorPayload.error?.message === "string") {
      return errorPayload.error.message;
    }
    if (typeof errorPayload.detail === "string") {
      return errorPayload.detail;
    }
    if (Array.isArray(errorPayload.detail) && errorPayload.detail.length > 0) {
      const first = errorPayload.detail[0] as ApiValidationErrorDetail;
      if (first && typeof first.msg === "string") {
        return first.msg;
      }
    }
    if (typeof errorPayload.message === "string") {
      return errorPayload.message;
    }
  }
  return fallback;
}

function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${base}${cleanEndpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

function getAccessToken(): string | null {
  try {
    return localStorage.getItem("veritas_access_token");
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const rt = localStorage.getItem("veritas_refresh_token");
      if (!rt) return null;
      const base = API_BASE_URL.replace(/\/+$/, "");
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token: string; refresh_token: string };
      localStorage.setItem("veritas_access_token", data.access_token);
      localStorage.setItem("veritas_refresh_token", data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function friendlyError(code: string | null, message: string): string {
  if (!code) return message;
  if (code === "OCR_UNAVAILABLE" || message.includes("OCR_UNAVAILABLE"))
    return "Scan is image-only and on-device OCR could not read it. Marked needs_review — upload a clearer PDF or TXT.";
  if (message.includes("SCANNED_NEEDS_REVIEW") || message.includes("EXTRACTION_FAILED"))
    return "We stored the file but text extraction is weak. Open Pages to verify, or upload TXT.";
  if (code === "PROVIDER_UNAVAILABLE" || message.includes("PROVIDER_UNAVAILABLE"))
    return "Legal source is temporarily unavailable. Evidence already stored is still usable.";
  return message;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    responseType = "json",
    params,
    headers = {},
    ...customConfig
  } = options;

  const requestHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) || {}),
  };
  const at = getAccessToken();
  if (at && !requestHeaders["Authorization"]) requestHeaders["Authorization"] = `Bearer ${at}`;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...customConfig,
    credentials: "include",
    headers: requestHeaders,
  };

  if (body !== undefined) {
    config.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  const url = buildUrl(endpoint, params);
  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(
      0,
      "Cannot reach the Veritas API. Check that the backend is running and try again.",
      err,
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (response.ok && responseType === "blob") {
    return (await response.blob()) as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const responseData: unknown = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.status === 401 && !endpoint.includes("/auth/")) {
    const fresh = await tryRefresh();
    if (fresh) {
      requestHeaders["Authorization"] = `Bearer ${fresh}`;
      try {
        response = await fetch(url, { ...config, headers: requestHeaders });
      } catch (err) {
        throw new ApiError(0, "Cannot reach the Veritas API. Check that the backend is running and try again.", err);
      }
      if (response.ok) {
        if (response.status === 204) return undefined as unknown as T;
        if (responseType === "blob") return (await response.blob()) as T;
        const ct2 = response.headers.get("content-type");
        const j2 = ct2 && ct2.includes("application/json");
        const d2: unknown = j2 ? await response.json().catch(() => null) : await response.text().catch(() => null);
        return d2 as T;
      }
      const ct3 = response.headers.get("content-type");
      const j3 = ct3 && ct3.includes("application/json");
      const d3: unknown = j3 ? await response.json().catch(() => null) : await response.text().catch(() => null);
      const m3 = parseErrorMessage(d3, `Request failed with status ${response.status}`);
      throw new ApiError(response.status, friendlyError(null, m3), d3, null);
    }
  }

  if (!response.ok) {
    const message = parseErrorMessage(
      responseData,
      `Request failed with status ${response.status}`,
    );
    const code =
      typeof responseData === "object" &&
      responseData !== null &&
      typeof (responseData as ApiErrorPayload).error?.code === "string"
        ? (responseData as ApiErrorPayload).error!.code
        : null;
    throw new ApiError(response.status, friendlyError(code, message), responseData, code);
  }

  return responseData as T;
}

export const fetchClient = {
  get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "body" | "method">,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body" | "method">,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body" | "method">,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "body" | "method">,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};
