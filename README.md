# 哪吒行情 · Nezha Stock Dash

一个**炒股软件风格**的 [哪吒监控 v2](https://github.com/nezhahq/nezha) 用户前端主题：把每台服务器当作一只“股票”，CPU 占用就是“现价”，用行情列表、指数、涨跌家数、分时图和 K 线来看你的服务器。

> A stock-terminal style user theme for Nezha Monitoring v2: servers are quoted like stocks (CPU = price) with a watchlist, market index, breadth, intraday charts and K-line candles. Red-up/green-down by default, switchable to green-up/red-down.

## 特性

- **行情终端外观**：默认黑底深色（通达信 / 同花顺风格），另有白底浅色（东方财富网页风格）和跟随系统；等宽数字、方角面板。
- **涨跌颜色可切换**：默认 **红涨绿跌**，可一键切换为 **绿涨红跌**；首屏绘制前即生效，不会闪色。颜色从不作为唯一提示，涨跌同时带有 ▲▼ 符号和正负号。
- **首页 = 自选股行情**
  - 滚动行情条（悬停暂停，尊重“减少动态效果”设置）
  - 综合负载指数（在线节点平均 CPU）与较 1 分钟前的涨跌
  - 涨跌家数：上涨 / 平盘 / 下跌 / 停牌，点击可筛选
  - 行情列表：现价、涨跌、涨跌幅、内存、磁盘、上下行速度、运行时长、分时迷你图；表头可排序
  - 手机端为自选股样式的紧凑行，点击右侧涨跌幅可轮换显示 涨跌幅 → 涨跌 → 内存
  - 也可切换为卡片视图
- **离线 = 停牌**：离线节点灰色显示“停牌”，计入涨跌家数，但不使用涨跌色。
- **详情页 = 个股报价页**
  - 现价、涨跌、最高/最低、内存、Swap、磁盘、进程、连接、负载、网速、总流量
  - 可折叠的“简况 · F10”：系统、架构、CPU/GPU、版本、开机时间、温度等
  - **分时**：实时 / 1 日 / 7 日 / 30 日，蓝色价格线 + 黄色均价线
  - **K 线**：CPU / 内存 / 负载1 的 OHLC 蜡烛图，MA5 / MA10 / MA20 均线，网络流量作为成交量；支持拖动、缩放、十字光标（需开启 TSDB；游客仅可查看 1 日）
  - **网络**：上行在零轴上方、下行在下方的镜像“成交量”柱状图，以及延迟 / 丢包图
- **移动端适配**：所有页面在 390px 宽度下可用。
- 完整保留上游 nezha-dash 的功能：分组、地图、服务监控、⌘K 命令面板、多语言、自定义代码全局变量等。

## 安装

在哪吒面板中：**系统设置 → 前端管理（用户前端）**，添加仓库地址：

```
https://github.com/MR-MonkeyRay/nezha-stock-dash
```

然后启用即可。面板会下载最新 Release 中的 `dist.zip`。

> 主题只使用 `/` 与 `/server/:id` 两个路由，静态资源以 `/` 为基础路径，符合哪吒 v2 用户前端的要求。

### 切换涨跌颜色 / 主题

- 页头右侧 **主题按钮**（月亮 / 太阳图标）下拉菜单：浅色 / 深色 / 跟随系统，以及 **涨跌颜色：红涨绿跌 / 绿涨红跌**。
- **⌘K / Ctrl K** 命令面板中搜索“红涨绿跌”或“绿涨红跌”。
- 选择保存在浏览器 `localStorage`（键 `vite-ui-theme`、`priceColor`）。

## 自定义代码（全局变量）

在面板 **系统设置 → 自定义代码** 中，可以通过 `<script>` 设置以下全局变量：

| 变量 | 类型 | 说明 |
|---|---|---|
| `window.ForceTheme` | `"dark"` \| `"light"` | 强制主题 |
| `window.ForceColorConvention` | `"red-up"` \| `"green-up"` | 强制涨跌颜色（强制后菜单中的切换项禁用） |
| `window.ForceCardInline` | `boolean` | 强制使用行情列表视图 |
| `window.ForceShowMap` | `boolean` | 默认显示地图 |
| `window.ForceShowServices` | `boolean` | 默认显示服务监控 |
| `window.ForcePeakCutEnabled` | `boolean` | 延迟图默认开启削峰 |
| `window.ForceSortType` | `"default"` `"name"` `"uptime"` `"system"` `"cpu"` `"mem"` `"disk"` `"up"` `"down"` `"up total"` `"down total"` | 强制排序字段 |
| `window.ForceSortOrder` | `"asc"` \| `"desc"` | 强制排序方向 |
| `window.ShowNetTransfer` | `boolean` | 在列表/卡片中显示总流量 |
| `window.FixedTopServerName` | `boolean` | 卡片视图中服务器名使用较大字号（兼容上游） |
| `window.ForceUseSvgFlag` | `boolean` | 使用 SVG 国旗而非 emoji |
| `window.CustomLogo` | `string` | 自定义 Logo 图片地址 |
| `window.CustomDesc` | `string` | 页头站点描述 |
| `window.CustomLinks` | `string` | 页头链接，JSON 字符串：`[{"link":"https://…","name":"博客"}]` |
| `window.CustomBackgroundImage` | `string` | 背景图 |
| `window.CustomMobileBackgroundImage` | `string` | 移动端背景图 |
| `window.CustomIllustration` | `string` | 首页概览右侧插画图片地址 |
| `window.DisableAnimatedMan` | `boolean` | 不显示首页插画 |

示例：

```html
<script>
  window.ForceTheme = "dark";
  window.ForceColorConvention = "red-up";
</script>
```

> 与上游的差异：首页默认显示**行情列表**（`inline` 未保存时）；首页插画只有在设置了 `CustomIllustration` 时才会显示。

## 开发

需要 Node.js 22+ 与 pnpm。

```bash
pnpm install
pnpm dev:mock          # 启动本地模拟哪吒后端 + Vite
pnpm dev:mock:guest    # 以游客身份模拟
TZ=UTC pnpm verify     # biome 检查 + 测试覆盖率 + 类型检查 + 构建
pnpm build             # 产物位于 dist/
```

模拟后端支持的环境变量：`MOCK_NEZHA_PORT`、`MOCK_NEZHA_COUNT`（节点数）、`MOCK_NEZHA_INTERVAL_MS`（推送间隔）以及 `MOCK_NEZHA_CUSTOM_CODE`（作为面板的自定义代码返回），例如：

```bash
MOCK_NEZHA_CUSTOM_CODE='<script>window.ForceColorConvention="green-up"</script>' pnpm dev:mock
```

### 发布

推送 `vX.Y.Z` 标签（须与 `package.json` 的 `version` 一致）后，GitHub Actions 会构建并在 Release 中上传 `dist.zip`（内含 `dist/index.html` 等全部静态文件）。

### 提交到官方主题列表（可选）

向 [`nezhahq/nezha`](https://github.com/nezhahq/nezha) 的 `service/singleton/frontend-templates.yaml` 提交：

```yaml
- path: "nezha-stock-dash-dist"
  name: "Nezha Stock Dash"
  repository: "https://github.com/MR-MonkeyRay/nezha-stock-dash"
  author: "MonkeyRay"
  version: "v1.0.0"
```

## 致谢与许可

- 基于 [hamster1963/nezha-dash](https://github.com/hamster1963/nezha-dash)（v2 实现），遵循 Apache License 2.0。
- K 线图使用 [TradingView Lightweight Charts™](https://www.tradingview.com/lightweight-charts/)（Apache License 2.0）。
  > TradingView Lightweight Charts™
  > Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/
- 图表：[Recharts](https://recharts.org/)；组件：[shadcn/ui](https://ui.shadcn.com/)、[Radix UI](https://www.radix-ui.com/)。

本项目以 [Apache License 2.0](./LICENSE) 发布。
