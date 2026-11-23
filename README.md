# Smart Money Hunter — AI 链上钱包情报与模拟研报工作台

[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-Winter_Aesthetic-c27d88?logo=tailwindcss)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Tests-33%20Passed-emerald?logo=vitest)](https://vitest.dev)

面向 **Solana Meme 币研究团队** 打造的一体化链上情报分析、100个赚钱钱包雷达挖掘、高阶阿尔法模型推演、多钱包共识跟单、5层智能出场风控与模拟复盘（Paper Trading）工作台。

界面采用独特的 **「冬雪寒霜 × 烟粉玫瑰」** 二次元质感设计，半透明毛玻璃卡片搭配轻量漫天飘雪动效，兼具交易终端的专业严谨与二次元美学。

---

## 一、系统核心定位与设计哲学

1. **纯研究与模拟工具**：本系统**绝不请求、不存储任何钱包私钥或助记词**，不提供任何真实链上交易广播与执行能力，所有跟单与撮合仅在 **Paper Trading 仿真环境** 中闭环运行。
2. **高阶阿尔法模型推演套件（Smart Money Alpha Model Suite）**：
   - **聪明钱信誉加权算法**：摆脱粗放的钱包计数，综合历史真实胜率、样本量对数置信度衰减与累计正盈亏计算其实时阿尔法权重。
   - **跟单获胜机率推演**：结合参与大户加权胜率与买入时间跨度衰减函数，量化输出预期跟单胜率（如 68.5%）与阿尔法评级（`TIER_S` ~ `TIER_D`）。
   - **庄家协同与老鼠仓检测模型（Cabal / Wash Trade Detector）**：排查多钱包是否在 $\le 5$ 秒同一区块同向买入、金额是否高度对称，识别庄家自对倒诱多并自动设防（`AVOID_DUMP`）。
   - **凯利准则最优仓位建议（Half-Kelly Sizing）**：根据预测胜率与 Meme 币盈亏比动态测算单笔最佳下注额（如推荐 1.25 SOL），杜绝无脑梭哈。
3. **5 层智能出场风控体系（Smart Exit Guardian）**：
   - **第 1 道：首笔减仓逃生**。任一聪明钱只要开始卖出第一笔，不问数量立即 100% 卖出全平，绝不当接盘侠。
   - **第 2 道：-20% 硬性止损**。若遇假共识直接割肉止损，保留元气。
   - **第 3 道：+50% 保本止盈**。浮盈触及 50% 时平仓一半锁定成本，剩余仓位让利润继续奔跑。
   - **第 4 道：动态移动追踪止盈（Trailing Stop Loss）**。利润爆发后自最高点回撤达 25%，锁定剩余丰厚利润全额离场。
   - **第 5 道：2小时时效衰减**。持仓满 2 小时未爆发直接离场，规避 Meme 币流动性枯竭死锁。
4. **硬性规则防幻觉**：客观标签完全由量化数学公式与阈值触发，AI 仅用于基于结构化上下文撰写可读性投研画像，不得自行决定客观标签。

---

## 二、功能特性一览

### 1. 100 赚钱钱包自动挖掘雷达 (`/scanner` & `pnpm scan:100`)
- 一键批量采集扫描 100 个活跃 Solana 钱包的链上流水。
- 自动解析买卖行为并计算：总流水、买入卖出笔数、已实现盈亏 (SOL)、胜率 (%)、持仓集中度。
- 自动识别净盈利钱包并筛选输出 **候选聪明钱 (Candidate Smart Money)** 与排行榜。

### 2. 多聪明钱共识信号雷达 (`/paper-trading`)
- 在滑动时间窗口（2h/4h/12h/24h）内聚合同一代币的多钱包买入行为。
- 当且仅当 $\ge 2$ 个被标记为候选聪明钱的地址共同买入时，触发 `MEDIUM` 或 `HIGH` 级共识信号。
- 支持一键填入仿真下单板或自动执行共识跟单。

### 3. 4 层出场风控控制台与一键自动化巡检 (`/api/consensus/auto-trade`)
- 实时轮询在仓头寸，检测关联聪明钱是否有卖出流水、实时浮动盈亏与持仓时长。
- 支持一键执行「共识建仓 + 智能出场风控巡检」，自动化生成详细的避险平仓日志。

### 4. 钱包研究库管理 (`/wallets`)
- 支持手动录入 Base58 格式 Solana 钱包公钥，自动校验地址合法性与防重判定。
- 提供分类筛选（`MEME_TRADER`、`SMART_MONEY`、`SNIPER`、`KOL`、`UNKNOWN`）与模糊搜索。
- 支持一键激活 / 暂停轮询监控，预置 20+ 个多维度样本钱包。

### 5. 链上交易流解析与同步 (`src/lib/solana/parser.ts`)
- 基于余额差分算法（Balance Deltas），精准识别代币买卖方向（BUY / SELL）、SOL 净发生额、SPL Token 变化量与 Gas 费。
- 自动识别主流路由协议：**Raydium AMM / CPMM / CLMM**、**Pump.fun 内盘**、**Jupiter v6**、**Orca Whirlpool**。
- 支持 RPC 限流自适应退避与备用节点轮询。

### 6. 7 大客观量化规则打标引擎 (`/tags`)
系统预置 7 大客观规则打标器，每项标签输出完整判定条件、实际参数值、样本量与置信度：
1. **候选聪明钱 (`CANDIDATE_SMART_MONEY`)**：胜率 $\ge 65\%$ 且 已实现盈亏 $\ge 10.0\text{ SOL}$ 且 样本量 $\ge 8$ 笔。
2. **早期买入 (`EARLY_BUYER`)**：开盘极早期（Pump.fun/内盘开盘）买入次数 $\ge 2$ 次。
3. **高频交易 (`HIGH_FREQUENCY`)**：日均交易频次 $\ge 15$ 笔/日 或 样本内总交易数 $\ge 30$ 笔。
4. **短线交易 (`SHORT_TERM_TRADER`)**：平均持仓时长 $\le 3.0$ 小时 且 平仓卖单 $\ge 2$ 笔。
5. **高集中度 (`HIGH_CONCENTRATION`)**：前 2 大代币占总流水比例 $\ge 65\%$。
6. **高风险 (`HIGH_RISK`)**：胜率 $< 35\%$ (样本 $\ge 5$) 或 综合风险评分 $\ge 60/100$。
7. **数据不足 (`INSUFFICIENT_DATA`)**：样本量 $< 5$ 笔 或 缺乏平仓卖单记录，不作主观臆断。

### 7. AI 结构化深度研报 (`/wallets/[address]`)
- 兼容 OpenAI 标准协议（支持 OpenAI、DeepSeek、Gemini 等主流大模型）。
- 严格输出 5 大维度：交易习惯剖析、潜在核心优势、主要风险警示、数据可靠性评级、是否建议继续观察（`RECOMMEND` / `NEUTRAL` / `AVOID`）。
- **内置量化降级引擎**：未配置 API Key 或网络离线时，自动切换至本地确定性量化研报合成器，确保 100% 稳定运行。

### 8. 链上实时信号监控 (`/monitor` & Worker)
- 支持站内实时告警流（买入、卖出、大额异动），支持未读状态管理与一键标为已读。
- 独立 Node.js 后台监控进程 (`pnpm worker:monitor`)，基于增量 Signature 抓取，杜绝重复告警。

### 9. Paper Trading 模拟复盘终端 (`/paper-trading`)
- 仿真买入与分批卖出（25% / 50% / 100%）。
- 考虑交易滑点（1.0% / 1.5% / 3.0%）、网络 Gas 损耗（0.0005 SOL）与信号延迟（1200ms）。
- 完整输出累计盈亏、在仓成本、胜率统计、历史最大回撤（MDD）与审计日志流水。

### 10. 每日投研复盘简报 (`/daily-review`)
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
SOLANA_BACKUP_RPC_URL="https://solana-rpc.publicnode.com"

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

### 6. 一键扫描 100 个赚钱钱包
在终端直接运行快速批处理脚本：
```bash
pnpm scan:100
```
或在浏览器端打开 `/scanner` 页面点击「立即开始自动挖掘 100 个钱包」。

### 7. (可选) 启动后台监控 Worker
在独立终端运行：
```bash
pnpm worker:monitor
```

---

## 四、自动化测试套件

项目采用 **Vitest** 进行全链路 8 大阶段分层单元与端到端测试，当前共计 **28 个测试用例全部通过 (28 Passed)**：

```bash
pnpm test
```

测试覆盖范围：
- `tests/step1_db_and_foundation.test.ts`：数据库模型 CRUD、20+ 钱包基线数据、地址格式化工具
- `tests/step2_parser_and_sync.test.ts`：Solana Base58 校验、Raydium / Pump.fun 交易解析、失败交易过滤
- `tests/step3_rules_and_metrics.test.ts`：胜率/盈亏指标计算、7 大客观规则打标判定与边界条件
- `tests/step4_monitor_and_alerts.test.ts`：增量签名防重报警、站内通知已读状态管理
- `tests/step5_ai_and_paper_trading.test.ts`：AI 结构化研报生成、Paper Trading 滑点/手续费结算、最大回撤 (MDD) 计算
- `tests/step6_integration_and_audit.test.ts`：端到端全生命周期闭环审计
- `tests/step7_scanner.test.ts`：100 钱包批量采集与胜率盈亏分析
- `tests/step8_consensus_and_exit.test.ts`：多聪明钱共识识别、首笔减仓逃生机制、-20%硬止损与完整交易循环
- `tests/step9_alpha_model.test.ts`：阿尔法权重算法、庄家老鼠仓排查、凯利最优仓位建议与移动追踪止盈 (Trailing Stop)

---

## 五、项目架构目录

```
smart-money-hunter/
├── prisma/
│   ├── schema.prisma        # 8 大数据库模型定义
│   └── seed.ts              # 21 个钱包初始种子数据
├── scripts/
│   ├── monitor-worker.ts    # 后台独立轮询监控 Worker
│   └── scan-and-analyze-100.ts # 100 个钱包批量扫描与盈利分析脚本
├── src/
│   ├── app/
│   │   ├── api/             # RESTful API 端点 (钱包、计算、监控、模拟盘、共识跟单、研报、每日复盘)
│   │   ├── daily-review/    # 每日复盘简报页面
│   │   ├── monitor/         # 链上信号监控台
│   │   ├── paper-trading/   # Paper Trading 仿真终端 & 共识雷达
│   │   ├── scanner/         # 100 钱包雷达挖掘看板
│   │   ├── tags/            # 7 大规则打标与透视页面
│   │   ├── wallets/         # 钱包库管理与 [address] 详情档案
│   │   ├── layout.tsx       # 全局外壳 (冬雪二次元美学主题)
│   │   └── page.tsx         # 总览仪表盘
│   ├── components/
│   │   ├── Navbar.tsx       # 顶部导航与节点健康状态栏
│   │   └── SnowEffect.tsx   # 漫天飘雪二次元动效
│   ├── lib/
│   │   ├── ai/              # AI 提示词与本地降级研报合成器
│   │   ├── intelligence/    # 量化指标计算、7 大客观规则打标与多钱包共识引擎
│   │   ├── monitor/         # 轮询调度器与防重报警服务
│   │   ├── paper/           # Paper Trading 撮合、4层出场风控与共识交易巡检服务
│   │   ├── scanner/         # 100 钱包采集器与批处理分析器
│   │   ├── solana/          # RPC 连接池、重试队列与交易解析器
│   │   └── utils.ts         # 常用数学、格式化与地址截断工具
│   └── types/               # 完整 TypeScript 类型声明
└── tests/                   # Vitest 8 大阶段完整测试套件 (28/28 Passed)
```

---

## 六、安全与合规免责声明

- 本项目由 AI 链上数据工程师与研究团队设计，仅用于学术研究、链上情报搜集与策略复盘。
- 系统**不包含任何真实交易执行逻辑**，不接入任何私钥或钱包连接插件（如 Phantom/Solflare 签名交易）。
- 历史链上交易指标与模拟盘回测结果**不代表未来收益，不构成任何投资建议**。
