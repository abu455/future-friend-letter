# 星域需求雷达与成交智能体

面向工业制造、外贸、设备销售和企业服务团队的 **市场需求雷达 + AI 成交智能体**。两套引擎共用企业、联系人、机会和跟进记录，在同一工作流里闭环。

当前仓库把应用放在 `starfield/`。本地默认使用 **SQLite + 演示数据**（每条 Seed 记录带「演示数据」标记）。未配置 Apollo / 大模型 / 企查查密钥时进入 Demo Mode，不会把模拟数据伪装成实时抓取。

## 功能一览

- 自然语言需求 → ICP 拆解 → 可视化扫描步骤 → 雷达光点与趋势
- 信号中心（卡片/列表、筛选、批量转入机会池）
- Apollo People Search 服务端接入（含 401/403/422/429/空结果处理）
- 机会看板（拖动改阶段并写历史）
- 成交智能体：客户分析、决策链、策略、11 类触达内容、异议处理、带依据的成交预测
- 行动中心与数据源中心
- Mobile first：底部 5 项导航、≥44px 触控、筛选抽屉、机会全屏详情

## 技术栈

Next.js 16 App Router · TypeScript · Tailwind CSS v4 · shadcn 风格组件 · Framer Motion · Recharts · Prisma · Zod · Vercel AI SDK

## 一键启动（Demo）

```bash
cd starfield
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

`npm run db:setup` = `prisma generate` + `prisma db push` + seed。

## 安装依赖

```bash
cd starfield
npm install
```

## 配置数据库

默认 SQLite（零依赖，适合 Demo）：

```
DATABASE_URL="file:./dev.db"
```

生产建议 PostgreSQL（Neon / RDS / 自建）：

1. 把 `prisma/schema.prisma` 中 `provider = "sqlite"` 改为 `provider = "postgresql"`
2. 设置 `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/starfield?sslmode=require"`
3. 运行 `npx prisma migrate dev --name init`
4. 运行 `npm run db:seed`

也可用仓库内 `docker-compose.yml` 起本地 Postgres：

```bash
docker compose up -d
```

## 配置 Apollo

见 [docs/APOLLO.md](docs/APOLLO.md)。密钥只放服务端环境变量。

```bash
npm run check:apollo
```

未配置时，搜索页显示 `APOLLO_NOT_CONFIGURED`，可改用带标记的演示联系人。

## 配置 AI 模型

```
AI_GATEWAY_API_KEY=
AI_MODEL="openai/gpt-4.1-mini"
```

或 OpenAI 兼容：

```
OPENAI_API_KEY=
OPENAI_BASE_URL="https://api.openai.com/v1"
```

未配置时使用内置演示引擎解析需求、生成成交方案和异议处理，界面会标明引擎类型。

企查查为预留接入：

```
QCC_APP_KEY=
QCC_SECRET_KEY=
```

未配置时数据源中心显示「未接入」，不会伪造工商数据。

## 初始化数据库

```bash
npm run db:setup
```

## 运行测试

```bash
npm test
npm run lint
```

## 生产构建

```bash
npm run build
npm start
```

## 部署到 Vercel

1. 将 Root Directory 设为 `starfield`（若 monorepo 部署）
2. 配置环境变量：`DATABASE_URL`（Postgres）、`APOLLO_API_KEY`、`AI_GATEWAY_API_KEY`、`AI_MODEL`，以及可选的企查查密钥
3. Build Command: `prisma generate && prisma migrate deploy && next build`（Postgres）或 `prisma generate && next build`（若使用 `db push`）
4. 部署后运行一次 seed（可在 Vercel 的一次性 Job 或本地对生产库执行 `npm run db:seed`）

Serverless 上请使用 PostgreSQL，不要使用 SQLite 文件库。

## 安全

- API Key 只存在服务端，`.env*` 已忽略，`.env.example` 可提交
- 前端 bundle 不含密钥
- AI 输入长度限制 + 提示词注入拦截 + 外部 HTML 清洗
- 扫描接口频率与单次数量限制
- People Search 不返回联系方式时显示「需要 Enrichment」，不伪造邮箱电话

## 未接入的真实数据源（刻意未伪装）

| 数据源 | 状态 |
| --- | --- |
| Apollo People Search | 架构已接通，需有效 Key |
| 行业协会网站 | 演示 Seed，无爬虫 |
| 展会名录 | 演示 Seed，无爬虫 |
| 企业官网 | 演示 Seed，无爬虫 |
| 招聘信息 | 演示 Seed，无爬虫 |
| 新闻媒体 | 演示 Seed，无爬虫 |
| 企查查 | 仅配置检测，无正式查询适配器 |
| Webhook | 可暂停/开启，未接外部推送验签 |

## 目录

```
starfield/
  prisma/             schema · seed
  src/app/            页面与 API
  src/components/     雷达、布局、UI
  src/lib/            Prisma、Apollo、AI、扫描与成交引擎
  scripts/check-apollo.ts
  docs/
```
