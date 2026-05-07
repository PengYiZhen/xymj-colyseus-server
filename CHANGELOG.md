# 更新日志

本文档由 **小游码匠 · xymj-colyseus-server** 维护方发布，供您在选型、集成与升级时查阅。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)，条目风格参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

完整用法请以仓库 **README**、**Swagger（`/api-docs`）** 及配套 [开发者文档](https://pengyizhen.github.io/xcs.github.io/) 为准。

---

## [1.1.0] - 2026-05-07

### 本版定位

当前 **推荐集成基线**。在此版本上，您可获得与文档一致的 **HTTP 鉴权、匹配开房、多频道聊天、帧同步对局** 等约定实现，并可直接使用仓库内静态演示页做联调。

### 您可依赖的能力

- **匹配与开房（`matchmaker_room`）**：主动匹配（`match:find` / `match:cancel`）、Party 房间码（`party:create` / `party:join` / `party:start`），组局成功后由服务端下发 `match:found`，客户端再 `joinById` 进入 `game_room`。**使用本能力前请部署 Redis**，详见 README 与文档「匹配与开房」章节。
- **帧同步对局（`game_room`）**：固定帧率、`input` 消息与 Schema 状态同步；支持匹配下发的 `matchId`、`seatIndex`、`reconnectKey` 等与断线重连相关的约定字段。
- **多模式聊天（`chat_world_room` 等）**：世界 / 工会 / 附近 / 队伍四类频道；进房 options 需携带 JWT，并按频道补充 `guildId`、`teamId`、坐标与 `nearbyRadius` 等。**世界频道**在多进程部署时依赖 **Redis Pub/Sub** 做跨实例同步。
- **HTTP API**：基于 `routing-controllers` 的装饰器路由；**Swagger** 提供可交互接口文档。注册、登录及微信 / 抖音小游戏登录等接口签发的访问令牌，与 Colyseus 进房时的 **`token` / `accessToken`** 字段对齐。
- **数据与中间件**：TypeORM（MySQL/MariaDB）、Redis（会话、匹配队列、聊天广播等）；房间侧 JWT 校验使用 **`@RequireAuth()`** 装饰器，与 Redis 中访问令牌状态联动。
- **联调资源**：`src/public` 下提供 **`MatchmakingDemo.html`**、**`ChatDemo.html`**、**`FrameSync.html`** 等静态页，便于您在拿到 JWT 后快速验证消息流。

### 升级与环境提示

- 运行环境要求 **Node.js ≥ 20.9.0**；使用匹配或世界频道跨实例能力时，请保证 **Redis** 可用并按 README 配置连接。
- **压测房间 `loadtest_room`** 默认不做 JWT 校验，仅用于容量与延迟摸底；**上线环境请务必关闭或限制访问**（如通过 `LOADTEST_ROOM_ENABLED` 等环境变量，以仓库实现为准）。

### 问题与贡献

- 源码与缺陷跟踪：<https://github.com/PengYiZhen/xymj-colyseus-server>  
- 若您从更早的私有分支或模板合并而来，合并后请对照本文件与文档核对 **房间名、环境变量与 Redis 依赖** 是否与当前版本一致。

---

## [1.0.0]

### 说明

首个对外整合形态：**JWT 鉴权**、示例 **`my_room`**、基础认证相关 HTTP API 与可扩展的房间注册方式。  

若您从 **1.0.x** 集成线升级到 **1.1.0**，请重点补齐 **Redis**、核对新增房间类型（`matchmaker_room`、`game_room`、`chat_*`）及静态资源路径，避免客户端仍使用已废弃的单一示例房间假设。

---

<!-- 维护者注：发布新版本时请在本文件顶部追加新版本章节，并同步更新文档站 docs/changelog/index.md。 -->
