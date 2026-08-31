# 星域需求雷达与成交智能体

面向工业制造、外贸、设备销售和企业服务团队的“市场需求雷达 + AI 成交智能体”一体化 MVP。应用使用同一套企业、联系人、机会与跟进数据，完成从自然语言需求到下一步销售行动的闭环。

> 未配置 PostgreSQL、Apollo 或 AI 服务时，应用自动使用带有“演示数据”标记的 Seed Data。演示联系人不包含伪造邮箱或电话。

## 技术栈

- Next.js 16 App Router、React 19、TypeScript
- Tailwind CSS 4、shadcn/ui、Framer Motion、Recharts
- PostgreSQL、Prisma ORM 7
- Zod 4、OpenAI-compatible 服务端模型接口
- Vitest、ESLint

## 已实现闭环

1. 输入自然语言市场需求并进行安全清洗
2. 自动拆解行业、地区、人数、职位、职级、采购信号、痛点与排除条件
3. 启动七步市场扫描并展示实时进度
4. 在动态雷达和趋势图中查看需求信号
5. 将信号幂等转为企业销售机会
6. 通过 Apollo 服务端代理搜索决策人，或使用明确标记的演示联系人
7. 将联系人加入机会决策链
8. 启动成交智能体，生成客户、决策链、策略与可解释预测
9. 生成中英文开发信、私信、电话开场、跟进等内容
10. 处理客户异议并创建下一步行动任务
11. 在看板拖动或详情选择销售阶段，自动写入阶段变化记录
12. 更新成交概率并在行动中心完成、延期或批量处理任务

## 一键启动

要求 Node.js 20.19+，推荐 Node.js 22。

```bash
cd xingyu-radar
cp .env.example .env.local
npm install
npm run dev
```

访问 <http://localhost:3000>。没有外部配置时会直接进入 Demo Mode。

## 配置 PostgreSQL

1. 创建 PostgreSQL 数据库。
2. 在 `.env.local` 写入：

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

3. 生成 Client、执行 migration 并写入演示 Seed Data：

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

开发数据库需要创建新 migration 时运行：

```bash
npm run db:migrate
```

Prisma Schema 位于 `prisma/schema.prisma`，初始 migration 位于 `prisma/migrations/20260831085100_init/migration.sql`。

## 配置 Apollo

在 `.env.local` 添加服务端密钥：

```dotenv
APOLLO_API_KEY=your_server_side_key
```

运行一键连接检测：

```bash
npm run apollo:test
```

浏览器只调用 `/api/apollo-search`，服务端再通过 `x-api-key` 请求 Apollo。详细筛选格式、状态码与排查方式见 `docs/APOLLO.md`。

## 配置 AI 模型

支持 OpenAI-compatible Chat Completions 接口：

```dotenv
AI_GATEWAY_API_KEY=your_server_side_key
AI_GATEWAY_URL=https://ai-gateway.vercel.sh/v1/chat/completions
AI_MODEL=provider/model-name
```

未配置时，智能体使用确定性的演示策略生成器，并在结果中标记 `mode: demo`。服务端会限制输入长度、清洗 HTML，并隔离外部内容中的提示词指令。

## 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run lint         # ESLint
npm test             # 单元与核心流程测试
npm run apollo:test  # Apollo 连接检测
```

## API

核心接口：

- `POST /api/radar/scan`
- `GET /api/radar/status`
- `GET /api/signals`
- `POST /api/signals/:id/opportunity`
- `GET /api/companies`
- `GET|POST /api/contacts`
- `GET|POST /api/opportunities`
- `PATCH /api/opportunities/:id`
- `POST /api/opportunities/:id/agent`
- `POST /api/agents/close`
- `POST /api/agents/objection`
- `POST /api/agents/message`
- `GET|POST /api/apollo-search`
- `GET /api/data-sources`
- `POST /api/data-sources/:id/test`
- `GET|POST /api/tasks`
- `PATCH /api/tasks/:id`

所有写接口使用 Zod 校验；扫描接口每 IP 每分钟最多 5 次；创建扫描、机会和任务支持 `idempotencyKey`。统一错误结构和错误码见 `docs/API_ERRORS.md`。

## 部署到 Vercel

1. 将仓库导入 Vercel。
2. 将 Root Directory 设置为 `xingyu-radar`。
3. 配置 `DATABASE_URL`、`APOLLO_API_KEY`、`AI_GATEWAY_API_KEY`、`AI_MODEL` 等环境变量。
4. 在首次部署前执行 `npm run db:deploy && npm run db:seed`。
5. Build Command 使用 `npm run build`，Install Command 使用 `npm install`。

`postinstall` 会自动生成 Prisma Client。所有密钥均为无 `NEXT_PUBLIC_` 前缀的服务端变量。

## 安全边界

- `.env.local` 已由 `.gitignore` 排除，`.env.example` 只包含空值
- Apollo、AI、企查查密钥不进入客户端 Bundle，也不会在日志中完整输出
- Apollo 上游错误正文最多记录 500 字符
- AI 输入最长 2,000 字，兼容模型 payload 最长 20,000 字
- 外部 HTML 与常见提示词注入表达会被清洗
- 单次 Apollo 最多请求 100 条，扫描条件数组均有数量限制
- 危险操作使用确认弹窗；Demo 与实时状态明确区分

## 项目结构

```text
src/app/                       Next.js 页面与统一 API Route Handler
src/components/                工作台、雷达、趋势与 shadcn/ui 组件
src/lib/                       领域类型、Demo Store、外部服务与校验
src/lib/__tests__/             单元与核心业务闭环测试
prisma/schema.prisma           数据模型
prisma/migrations/             PostgreSQL migration
prisma/seed.ts                 Seed Data
scripts/test-apollo.ts         Apollo 一键检测
docs/                          Apollo 与 API 错误码说明
```
