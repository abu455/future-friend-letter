export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  AI_NOT_CONFIGURED: "AI_NOT_CONFIGURED",
  AI_INPUT_TOO_LONG: "AI_INPUT_TOO_LONG",
  AI_INJECTION_BLOCKED: "AI_INJECTION_BLOCKED",
  APOLLO_NOT_CONFIGURED: "APOLLO_NOT_CONFIGURED",
  APOLLO_UNAUTHORIZED: "APOLLO_UNAUTHORIZED",
  APOLLO_FORBIDDEN: "APOLLO_FORBIDDEN",
  APOLLO_INVALID_FILTER: "APOLLO_INVALID_FILTER",
  APOLLO_RATE_LIMITED: "APOLLO_RATE_LIMITED",
  APOLLO_NETWORK_ERROR: "APOLLO_NETWORK_ERROR",
  APOLLO_EMPTY: "APOLLO_EMPTY",
  QCC_NOT_CONFIGURED: "QCC_NOT_CONFIGURED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorPayload(code: string, message: string, details?: unknown) {
  return {
    ok: false as const,
    error: { code, message, details: details ?? null },
  };
}

export function okPayload<T>(data: T, meta?: Record<string, unknown>) {
  return {
    ok: true as const,
    data,
    meta: meta ?? undefined,
  };
}

export const ERROR_CODE_DOCS: { code: string; http: number; meaning: string }[] = [
  { code: "VALIDATION_ERROR", http: 422, meaning: "请求体未通过 Zod 校验" },
  { code: "RATE_LIMITED", http: 429, meaning: "扫描或批量接口触发频率限制" },
  { code: "NOT_FOUND", http: 404, meaning: "资源不存在" },
  { code: "CONFLICT", http: 409, meaning: "幂等冲突或状态不允许该操作" },
  { code: "INTERNAL_ERROR", http: 500, meaning: "未捕获的服务端错误" },
  { code: "AI_NOT_CONFIGURED", http: 200, meaning: "未配置模型密钥，已回退演示引擎" },
  { code: "AI_INPUT_TOO_LONG", http: 422, meaning: "AI 输入超过长度限制" },
  { code: "AI_INJECTION_BLOCKED", http: 422, meaning: "输入疑似提示词注入，已拒绝" },
  { code: "APOLLO_NOT_CONFIGURED", http: 200, meaning: "未配置 APOLLO_API_KEY" },
  { code: "APOLLO_UNAUTHORIZED", http: 401, meaning: "Apollo 密钥无效（401）" },
  { code: "APOLLO_FORBIDDEN", http: 403, meaning: "套餐或 Scope 不支持（403）" },
  { code: "APOLLO_INVALID_FILTER", http: 422, meaning: "筛选参数错误（422）" },
  { code: "APOLLO_RATE_LIMITED", http: 429, meaning: "Apollo 频率限制（429）" },
  { code: "APOLLO_NETWORK_ERROR", http: 503, meaning: "无法连接 Apollo" },
  { code: "APOLLO_EMPTY", http: 200, meaning: "查询成功但没有结果" },
  { code: "QCC_NOT_CONFIGURED", http: 200, meaning: "企查查密钥未配置" },
];
