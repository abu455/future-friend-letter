export type ApiOk<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export async function api<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: "网络连接失败，请稍后重试。" },
    };
  }
}

export function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}
