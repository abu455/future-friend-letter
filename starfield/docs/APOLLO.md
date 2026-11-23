# Apollo 接入说明

星域通过 **服务端** 调用 Apollo People Search，浏览器永远拿不到 `APOLLO_API_KEY`。

## 接口

```
POST https://api.apollo.io/api/v1/mixed_people/api_search
Header: x-api-key: <APOLLO_API_KEY>
Content-Type: application/json
```

数组筛选按官方 Query Params 发送：

| 参数 | 含义 |
| --- | --- |
| `person_titles[]` | 目标职位 |
| `person_seniorities[]` | 决策人职级 |
| `person_locations[]` | 人员地区 |
| `organization_locations[]` | 企业总部地区 |
| `organization_num_employees_ranges[]` | 员工人数区间，如 `101,200` |
| `organization_domains[]` | 企业域名 |
| `currently_using_any_of_technology_uids[]` | 技术栈 |
| `q_organization_job_titles[]` | 招聘职位信号 |
| `q_keywords` | 企业或行业关键词 |

应用内对应实现：`src/lib/apollo.ts` 的 `buildApolloQuery()`，由 `POST /api/apollo-search` 调用。

## 配置

1. 在 [Apollo](https://developer.apollo.io/) 创建 API Key，确认套餐包含 People Search / mixed people search。
2. 写入 `starfield/.env.local`（不要提交）：

```
APOLLO_API_KEY=your_key_here
```

3. 运行连通性脚本：

```bash
cd starfield
npm run check:apollo
```

脚本只打印密钥指纹和 HTTP 状态，不会输出完整 Key。

## 应用内状态

| 情况 | 错误码 | 产品表现 |
| --- | --- | --- |
| 未配置 Key | `APOLLO_NOT_CONFIGURED` | 搜索页明确提示，可改用「演示联系人」 |
| 401 | `APOLLO_UNAUTHORIZED` | 密钥无效 |
| 403 | `APOLLO_FORBIDDEN` | 套餐或 Scope 不支持 |
| 422 | `APOLLO_INVALID_FILTER` | 筛选参数错误 |
| 429 | `APOLLO_RATE_LIMITED` | 频率限制 |
| 网络失败 | `APOLLO_NETWORK_ERROR` | 无法连接 |
| 200 但无人 | `APOLLO_EMPTY` | 查询成功但没有结果 |

People Search 若未返回邮箱或电话，界面显示 **需要 Enrichment**，系统不会伪造联系方式。

演示联系人带「演示数据」标记，不会被写成 Apollo 实时结果。
