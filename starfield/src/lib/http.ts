import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, errorPayload, okPayload } from "./errors";

export function jsonOk<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(okPayload(data, meta), { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(errorPayload(code, message, details), { status });
}

export function fromZod(error: ZodError) {
  return jsonError(
    "VALIDATION_ERROR",
    "请求参数未通过校验",
    422,
    error.flatten(),
  );
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown = {};
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  }
  return schema.parse(raw);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) return fromZod(error);
  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.status, error.details);
  }
  console.error("[starfield]", error instanceof Error ? error.message : error);
  return jsonError("INTERNAL_ERROR", "服务器内部错误", 500);
}

export function clientKey(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
