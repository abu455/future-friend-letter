import type { ApiErrorShape, ApiSuccess } from "@/lib/domain";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiSuccess<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      "NETWORK_ERROR",
      "网络连接失败，请检查连接后重试。",
      0,
    );
  }
  const payload = (await response.json()) as ApiSuccess<T> | ApiErrorShape;
  if (!response.ok || !payload.success) {
    const error = (payload as ApiErrorShape).error;
    throw new ApiClientError(
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "请求失败，请稍后重试。",
      response.status,
      error?.details,
    );
  }
  return payload;
}

export const idempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
