# Apollo 接入说明

## 服务端配置

只在 `.env.local` 或部署平台的服务端环境变量中设置：

```dotenv
APOLLO_API_KEY=your_key
```

不要使用 `NEXT_PUBLIC_APOLLO_API_KEY`。本项目不会把密钥返回给浏览器，也不会在日志中打印密钥。

## 连接检测

```bash
npm run apollo:test
```

脚本使用一条最小 People Search 请求验证密钥、套餐、筛选格式和网络。它只输出结果数量或标准错误码。

## 服务端请求

应用调用：

```http
POST https://api.apollo.io/api/v1/mixed_people/api_search
Content-Type: application/json
x-api-key: ...
```

前端只请求本应用的 `POST /api/apollo-search`。数组筛选按 Apollo Query Params 名称传递：

```json
{
  "person_titles": ["Production Director", "Head of Procurement"],
  "person_seniorities": ["director", "head", "c_suite"],
  "person_locations": ["Munich, Germany"],
  "organization_locations": ["Germany"],
  "organization_num_employees_ranges": ["100,500"],
  "q_organization_keyword_tags": ["automotive interiors"],
  "q_organization_domains": ["example.com"],
  "currently_using_any_of_technology_uids": ["sap"],
  "q_keywords": "flexible material cutting",
  "page": 1,
  "per_page": 25
}
```

Apollo 文档中的 `person_titles[]` 等 query 参数，在 JSON 请求体中表现为同名数组字段 `person_titles`。服务端适配器负责序列化，不要在浏览器直接拼接密钥。

## 联系方式规则

People Search 不保证返回邮箱和电话。接口未返回联系方式时，UI 显示“需要 Enrichment”；应用不会猜测或伪造邮箱、电话。

## 状态处理

| 上游状态 | 应用错误码 | UI 含义 |
| --- | --- | --- |
| 未配置 | `APOLLO_NOT_CONFIGURED` | 需要设置服务端密钥 |
| 401 | `APOLLO_INVALID_KEY` | 密钥无效或失效 |
| 403 | `APOLLO_SCOPE_FORBIDDEN` | 套餐或 Scope 不支持 |
| 422 | `APOLLO_INVALID_FILTERS` | 筛选参数格式错误 |
| 429 | `APOLLO_RATE_LIMITED` | 达到频率限制 |
| 网络异常 | `APOLLO_NETWORK_ERROR` | 无法连接上游 |
| 200 + 空数组 | 成功，`empty: true` | 查询成功但没有结果 |

上游错误正文最多截断到 500 字符用于诊断，且不会包含请求头密钥。
