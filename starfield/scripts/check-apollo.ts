#!/usr/bin/env tsx
/**
 * 一键检测 Apollo People Search 连通性。
 * 仅在服务端读取 APOLLO_API_KEY，不会打印完整密钥。
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const key = process.env.APOLLO_API_KEY?.trim();

function mask(value: string) {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}

async function main() {
  if (!key) {
    console.log("状态: APOLLO_NOT_CONFIGURED");
    console.log("说明: 未设置 APOLLO_API_KEY。请写入 .env.local 后重试。");
    console.log("文档: docs/APOLLO.md");
    process.exitCode = 2;
    return;
  }

  console.log("密钥指纹:", mask(key));
  const params = new URLSearchParams();
  params.append("q_keywords", "manufacturing");
  params.append("person_titles[]", "procurement director");
  params.append("person_seniorities[]", "director");
  params.append("organization_locations[]", "Germany");
  params.append("organization_num_employees_ranges[]", "101,200");
  params.set("page", "1");
  params.set("per_page", "1");

  const url = `https://api.apollo.io/api/v1/mixed_people/api_search?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": key,
      },
      body: JSON.stringify({ page: 1, per_page: 1 }),
    });
    const text = await res.text();
    const map: Record<number, string> = {
      200: "OK — 查询成功",
      401: "APOLLO_UNAUTHORIZED — 密钥无效",
      403: "APOLLO_FORBIDDEN — 套餐或 Scope 不支持",
      422: "APOLLO_INVALID_FILTER — 筛选参数错误",
      429: "APOLLO_RATE_LIMITED — 达到频率限制",
    };
    console.log("HTTP:", res.status);
    console.log("状态:", map[res.status] ?? `未映射状态码 ${res.status}`);
    console.log("响应摘要:", text.slice(0, 280).replace(key, "[redacted]"));
    if (!res.ok) process.exitCode = 1;
  } catch (error) {
    console.log("状态: APOLLO_NETWORK_ERROR");
    console.log("说明:", error instanceof Error ? error.message : "无法连接");
    process.exitCode = 1;
  }
}

main();
