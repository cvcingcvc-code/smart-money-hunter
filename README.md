# Smart Money Hunter — AI 链上钱包情报与模拟研报工作台

[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-Dark_Terminal-06b6d4?logo=tailwindcss)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Tests-18%20Passed-emerald?logo=vitest)](https://vitest.dev)

面向 **Solana Meme 币研究团队** 打造的一体化链上情报分析、量化打标、信号监控与模拟复盘（Paper Trading）工作台。

---

## 一、系统核心定位与设计哲学

1. **纯研究与模拟工具**：本系统**绝不请求、不存储任何钱包私钥或助记词**，不提供任何真实链上交易广播与执行能力，所有跟单与撮合仅在 **Paper Trading 仿真环境** 中运行。
2. **严谨的数据流闭环**：
   $$\text{公开链上 RPC 数据} \longrightarrow \text{交易流差分解析} \longrightarrow \text{量化指标计算} \longrightarrow \text{7 大客观规则打标} \longrightarrow \text{AI 深度画像研报} \longrightarrow \text{增量信号监控} \longrightarrow \text{模拟复盘}$$
3. **真实性与不可用区分**：严格隔离真实链上数据、仿真推演数据与价格不可得标记（Mark as Unavailable），杜绝未来函数。
4. **硬性规则防幻觉**：客观标签完全由量化数学公式与阈值触发，AI 仅用于基于结构化上下文撰写可读性投研画像，不得自行决定客观标签。

---

## 二、功能特性一览

### 1. 钱包研究库管理 (`/wallets`)
- 支持手动录入 Base58 格式 Solana 钱包公钥，自动校验地址合法性与防重判定。
- 提供分类筛选（`MEME_TRADER`、`SMART_MONEY`、`SNIPER`、`KOL`、`UNKNOWN`）与模糊搜索。
- 支持一键激活 / 暂停轮询监控，预置 20+ 个多维度样本钱包。

### 2. 链上交易流解析与同步 (`src/lib/solana/parser.ts`)
- 基于余额差分算法（Balance Deltas），精准识别代币买卖方向（BUY / SELL）、SOL 净发生额、SPL Token 变化量与 Gas 费。
- 自动识别主流路由协议：**Raydium AMM / CPMM / CLMM**、**Pump.fun 内盘**、**Jupiter v6**、**Orca Whirlpool**。
- 支持 RPC 限流自适应退避与备用节点轮询。

### 3. 7 大客观量化规则打标引擎 (`/tags`)
系统预置 7 大客观规则打标器，每项标签输出完整判定条件、实际参数值、样本量与置信度：
1. **候选聪明钱 (`CANDIDATE_SMART_MONEY`)**：胜率 $\ge 65\%$ 且 已实现盈亏 $\ge 10.0\text{ SOL}$ 且 样本量 $\ge 8$ 笔。
2. **早期买入 (`EARLY_BUYER`)**：开盘极早期（Pump.fun/内盘开盘）买入次数 $\ge 2$ 次。
3. **高频交易 (`HIGH_FREQUENCY`)**：日均交易频次 $\ge 15$ 笔/日 或 样本内总交易数 $\ge 30$ 笔。
4. **短线交易 (`SHORT_TERM_TRADER`)**：平均持仓时长 $\le 3.0$ 小时 且 平仓卖单 $\ge 2$ 笔。
5. **高集中度 (`HIGH_CONCENTRATION`)**：前 2 大代币占总流水比例 $\ge 65\%$。
6. **高风险 (`HIGH_RISK`)**：胜率 $< 35\%$ (样本 $\ge 5$) 或 综合风险评分 $\ge 60/100$。
7. **数据不足 (`INSUFFICIENT_DATA`)**：样本量 $< 5$ 笔 或 缺乏平仓卖单记录，不作主观臆断。

### 4. AI 结构化深度研报 (`/wallets/[address]`)
- 兼容 OpenAI 标准协议（支持 OpenAI、DeepSeek、Gemini 等主流大模型）。
- 严格输出 5 大维度：交易习惯剖析、潜在核心优势、主要风险警示、数据可靠性评级、是否建议继续观察（`RECOMMEND` / `NEUTRAL` / `AVOID`）。
- **内置量化降级引擎**：未配置 API Key 或网络离线时，自动切换至本地确定性量化研报合成器，确保 100% 稳定运行。

### 5. 链上实时信号监控 (`/monitor` & Worker)
- 支持站内实时告警流（买入、卖出、大额异动），支持未读状态管理与一键标为已读。
- 独立 Node.js 后台监控进程 (`pnpm worker:monitor`)，基于增量 Signature 抓取，杜绝重复告警。
- 提供一键跳转至模拟跟单交易入口。

### 6. Paper Trading 模拟复盘终端 (`/paper-trading`)
- 仿真买入与分批卖出（25% / 50% / 100%）。
- 考虑交易滑点（1.0% / 1.5% / 3.0%）、网络 Gas 损耗（0.0005 SOL）与信号延迟（1200ms）。
- 完整输出累计盈亏、在仓成本、胜率统计、历史最大回撤（MDD）与审计日志流水。

### 7. 每日投研复盘简报 (`/daily-review`)
- 自动按日聚合全库数据，生成包括核心执行摘要、链上异动洞察、候选聪明钱英雄榜与模拟跟单收益复盘的结构化简报。

---

## 三、快速开始

### 1. 环境准备
- Node.js $\ge 18.0$ (推荐 v20 或 v24)
- pnpm $\ge 8.0$
- SQLite 本地存储

### 2. 克隆与安装依赖
```bash
git clone https://github.com/cvcingcvc-code/smart-money-hunter.git
cd smart-money-hunter
pnpm install
```

### 3. 配置环境变量
复制环境配置模板：
```bash
cp .env.example .env
```
根据需求编辑 `.env`：
```env
# 本地 SQLite 数据库
DATABASE_URL="file:./dev.db"

# Solana RPC 节点 (默认官方公共节点，可替换为 Helius/QuickNode/Ankr 提升吞吐)
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_BACKUP_RPC_URL="https://rpc.ankr.com/solana"

# 可选 AI 模型配置 (留空将自动降级为本地量化研报合成引擎)
AI_API_KEY=""
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"

# 模拟盘默认参数
PAPER_INITIAL_CAPITAL_SOL=100.0
PAPER_DEFAULT_SLIPPAGE=0.015
PAPER_DEFAULT_FEE_SOL=0.0005

# 监控轮询间隔 (秒)
MONITOR_POLL_INTERVAL_SEC=30
```

### 4. 初始化数据库与导入种子数据
```bash
# 生成 Prisma Client 并同步表结构
pnpm db:push

# 导入预置的 21 个 Solana 真实样本钱包与对照组
pnpm db:seed
```

### 5. 启动开发服务器
```bash
pnpm dev
```
打开浏览器访问：[http://localhost:3000](http://localhost:3000)

### 6. (可选) 启动后台监控 Worker
在独立终端运行：
```bash
pnpm worker:monitor
```

---

## 四、自动化测试套件

项目采用 **Vitest** 进行全链路分层单元与集成测试：

```bash
pnpm test
```

测试覆盖范围：
- `tests/step1_db_and_foundation.test.ts`：数据库模型 CRUD、20+ 钱包基线数据、地址格式化工具
- `tests/step2_parser_and_sync.test.ts`：Solana Base58 校验、Raydium / Pump.fun 交易解析、失败交易过滤
- `tests/step3_rules_and_metrics.test.ts`：胜率/盈亏指标计算、7 大客观规则打标判定与边界条件
- `tests/step4_monitor_and_alerts.test.ts`：增量签名防重报警、站内通知已读状态管理
- `tests/step5_ai_and_paper_trading.test.ts`：AI 结构化研报生成、Paper Trading 滑点/手续费结算、最大回撤 (MDD) 计算

---

## 五、项目架构目录

```
smart-money-hunter/
├── prisma/
│   ├── schema.prisma        # 8 大数据库模型定义
│   └── seed.ts              # 21 个钱包初始种子数据
├── scripts/
│   └── monitor-worker.ts    # 后台独立轮询监控 Worker
├── src/
│   ├── app/
│   │   ├── api/             # RESTful API 端点 (钱包、计算、监控、模拟盘、研报、每日复盘)
│   │   ├── daily-review/    # 每日复盘简报页面
│   │   ├── monitor/         # 链上信号监控台
│   │   ├── paper-trading/   # Paper Trading 仿真终端
│   │   ├── tags/            # 7 大规则打标与透视页面
│   │   ├── wallets/         # 钱包库管理与 [address] 详情档案
│   │   ├── layout.tsx       # 交易终端全局外壳
│   │   └── page.tsx         # 总览仪表盘
│   ├── components/
│   │   └── Navbar.tsx       # 顶部导航与节点健康状态栏
│   ├── lib/
│   │   ├── ai/              # AI 提示词与本地降级研报合成器
│   │   ├── intelligence/    # 量化指标计算与 7 大客观规则引擎
│   │   ├── monitor/         # 轮询调度器与防重报警服务
│   │   ├── paper/           # Paper Trading 仿真撮合与 MDD 引擎
│   │   ├── solana/          # RPC 连接池、重试队列与交易解析器
│   │   └── utils.ts         # 常用数学、格式化与地址截断工具
│   └── types/               # 完整 TypeScript 类型声明
└── tests/                   # Vitest 5 大阶段完整测试套件
```

---

## 六、安全与合规免责声明

- 本项目由 AI 链上数据工程师与研究团队设计，仅用于学术研究、链上情报搜集与策略复盘。
- 系统**不包含任何真实交易执行逻辑**，不接入任何私钥或钱包连接插件（如 Phantom/Solflare 签名交易）。
- 历史链上交易指标与模拟盘回测结果**不代表未来收益，不构成任何投资建议**。
