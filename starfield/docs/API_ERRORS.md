# API 约定与错误码

所有接口返回：

```json
{
  "ok": true,
  "data": {},
  "meta": { "demoMode": true }
}
```

或：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数未通过校验",
    "details": {}
  }
}
```

输入一律经 Zod 校验。服务端日志会脱敏，不会打印完整 API Key。

## 核心路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/radar/parse` | 自然语言 → ICP |
| POST | `/api/radar/scan` | 启动扫描（幂等 ID + 频率限制） |
| GET | `/api/radar/status` | 扫描进度 |
| GET | `/api/signals` | 信号列表 |
| POST | `/api/signals/:id/opportunity` | 信号转机会 |
| GET | `/api/companies` | 企业 |
| GET | `/api/contacts` | 联系人 |
| GET/POST | `/api/opportunities` | 机会列表 / 创建 |
| GET/PATCH | `/api/opportunities/:id` | 详情 / 改阶段与概率 |
| POST | `/api/opportunities/:id/agent` | 启动成交智能体 |
| POST | `/api/agents/close` | 生成成交方案 |
| POST | `/api/agents/objection` | 异议处理 |
| POST | `/api/agents/message` | 触达内容 |
| GET/POST | `/api/apollo-search` | Apollo 状态 / 搜索 |
| GET | `/api/data-sources` | 数据源 |
| POST | `/api/data-sources/:id/test` | 测试连接 |

扫描接口默认每 IP 每分钟 8 次（`SCAN_RATE_LIMIT_PER_MINUTE`）。重复扫描可带 `idempotencyKey` 或 `Idempotency-Key` 头，相同键返回同一 `ScanJob`。

## 错误码

| code | HTTP | 含义 |
| --- | --- | --- |
| VALIDATION_ERROR | 422 | Zod 校验失败 |
| RATE_LIMITED | 429 | 扫描或批量限流 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 状态冲突 |
| INTERNAL_ERROR | 500 | 未捕获错误 |
| AI_INPUT_TOO_LONG | 422 | AI 输入超长 |
| AI_INJECTION_BLOCKED | 422 | 疑似提示词注入 |
| APOLLO_NOT_CONFIGURED | 200 | 未配置密钥 |
| APOLLO_UNAUTHORIZED | 401 | 密钥无效 |
| APOLLO_FORBIDDEN | 403 | 套餐/Scope |
| APOLLO_INVALID_FILTER | 422 | 筛选参数 |
| APOLLO_RATE_LIMITED | 429 | Apollo 限流 |
| APOLLO_NETWORK_ERROR | 503 | 网络失败 |
| APOLLO_EMPTY | 200 | 成功但无结果 |
| QCC_NOT_CONFIGURED | 200 | 企查查未配置 |

未配置大模型时，成交智能体与需求拆解回退到演示引擎，并在响应 `meta` / 界面中标明，不会伪装成实时模型输出。
