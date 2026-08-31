# API 错误结构与错误码

成功响应：

```json
{
  "success": true,
  "data": {},
  "meta": {
    "demoMode": true,
    "requestId": "uuid",
    "total": 6
  }
}
```

错误响应：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "输入参数校验失败。",
    "details": {},
    "requestId": "uuid"
  }
}
```

每个响应同时包含 `x-request-id`，便于关联前端反馈与服务端日志。

## 通用错误码

| 错误码 | HTTP | 说明 |
| --- | ---: | --- |
| `INVALID_JSON` | 400 | 请求体不是合法 JSON |
| `VALIDATION_ERROR` | 422 | Zod 校验失败 |
| `NOT_FOUND` | 404 | 路由不存在 |
| `RATE_LIMITED` | 429 | 扫描频率超过每 IP 每分钟 5 次 |
| `INTERNAL_ERROR` | 500 | 未预期的服务端错误 |
| `SIGNAL_NOT_FOUND` | 404 | 需求信号不存在 |
| `COMPANY_NOT_FOUND` | 404 | 企业不存在 |
| `CONTACT_NOT_FOUND` | 404 | 联系人不存在 |
| `OPPORTUNITY_NOT_FOUND` | 404 | 机会不存在 |
| `TASK_NOT_FOUND` | 404 | 行动任务不存在 |
| `INVALID_STAGE` | 422 | 销售阶段值无效 |
| `DATA_SOURCE_NOT_FOUND` | 404 | 数据源不存在 |
| `SOURCE_NOT_CONFIGURED` | 422/503 | 数据源尚未配置 |

## Apollo 错误码

| 错误码 | HTTP | 说明 |
| --- | ---: | --- |
| `APOLLO_NOT_CONFIGURED` | 503 | 服务端未设置 `APOLLO_API_KEY` |
| `APOLLO_INVALID_KEY` | 401 | 上游返回 401 |
| `APOLLO_SCOPE_FORBIDDEN` | 403 | 上游返回 403 |
| `APOLLO_INVALID_FILTERS` | 422 | 上游返回 422 |
| `APOLLO_RATE_LIMITED` | 429 | 上游返回 429 |
| `APOLLO_NETWORK_ERROR` | 502 | 超时或网络连接失败 |
| `APOLLO_INVALID_RESPONSE` | 502 | 上游响应结构无法校验 |
| `APOLLO_UPSTREAM_ERROR` | 502/上游状态 | 其他上游错误 |

## AI 错误码

| 错误码 | HTTP | 说明 |
| --- | ---: | --- |
| `AI_NETWORK_ERROR` | 502 | AI Gateway 网络或超时 |
| `AI_UPSTREAM_ERROR` | 上游状态 | 模型服务拒绝请求 |
| `AI_INVALID_RESPONSE` | 502 | 模型未返回有效 JSON |

## 幂等

`POST /api/radar/scan`、信号转机会与任务创建接受最长 120 字符的 `idempotencyKey`。同一 key 重试返回第一次创建的资源，不重复创建。
