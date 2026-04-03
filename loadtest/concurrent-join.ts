/**
 * Colyseus 并发压测（Node，适合超过浏览器 WebSocket 上限）
 *
 * 压测房无需 JWT：
 *   npx tsx loadtest/concurrent-join.ts --endpoint http://127.0.0.1:2567 --room loadtest_room --num 500 --delay 15 --sendInterval 150
 *
 * 聊天房需 JWT：
 *   npx tsx loadtest/concurrent-join.ts --room chat_world_room --num 200 --token <JWT>
 */
import { Client, Room } from "colyseus.js";

type Args = {
  endpoint: string;
  room: string;
  num: number;
  delay: number;
  token: string;
  guildId: string;
  teamId: string;
  joinTimeoutMs: number;
  /** 周期性发送 load 消息的间隔（毫秒），0 表示不发送 */
  sendInterval: number;
};

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const out: Args = {
    endpoint: "http://127.0.0.1:2567",
    room: "loadtest_room",
    num: 200,
    delay: 20,
    token: "",
    guildId: "",
    teamId: "",
    joinTimeoutMs: 30_000,
    sendInterval: 0,
  };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    const v = a[i + 1];
    if (k === "--endpoint" && v) {
      out.endpoint = v;
      i++;
    } else if (k === "--room" && v) {
      out.room = v;
      i++;
    } else if (k === "--num" && v) {
      out.num = Math.max(1, parseInt(v, 10) || 200);
      i++;
    } else if (k === "--delay" && v) {
      out.delay = Math.max(0, parseInt(v, 10) || 0);
      i++;
    } else if (k === "--token" && v) {
      out.token = v;
      i++;
    } else if (k === "--guildId" && v) {
      out.guildId = v;
      i++;
    } else if (k === "--teamId" && v) {
      out.teamId = v;
      i++;
    } else if (k === "--timeout" && v) {
      out.joinTimeoutMs = Math.max(1000, parseInt(v, 10) || 30_000);
      i++;
    } else if (k === "--sendInterval" && v) {
      out.sendInterval = Math.max(0, parseInt(v, 10) || 0);
      i++;
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} 超时 ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function needsToken(room: string): boolean {
  return room === "my_room" || room.startsWith("chat_");
}

async function main() {
  const args = parseArgs();
  if (needsToken(args.room) && !args.token) {
    console.error("该房间需要 JWT: --token <jwt>");
    process.exit(1);
  }

  const t0Run = Date.now();
  const joinOptions: Record<string, unknown> = {
    guildId: args.guildId,
    teamId: args.teamId,
    x: 0,
    y: 0,
    nearbyRadius: 120,
  };
  if (args.token) joinOptions.token = args.token;

  let connected = 0;
  let failed = 0;
  let inFlight = 0;
  const rooms: Room[] = [];
  const sendTimers: ReturnType<typeof setInterval>[] = [];
  let loadSent = 0;
  let loadAcked = 0;
  const joinMs: number[] = [];
  const t0 = Date.now();

  const statTimer = setInterval(() => {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const avg =
      joinMs.length > 0
        ? (joinMs.reduce((a, b) => a + b, 0) / joinMs.length).toFixed(0)
        : "-";
    console.log(
      `[${elapsed}s] 堆≈${mem}MB | 成功=${connected} 失败=${failed} 进行中=${inFlight} 平均加入=${avg}ms | load ${loadAcked}/${loadSent}`
    );
  }, 1000);

  for (let i = 0; i < args.num; i++) {
    inFlight++;
    const tJoin = Date.now();
    if (!args.token) {
      joinOptions.userId = `node_${t0Run}_${i}`;
    }
    try {
      const client = new Client(args.endpoint);
      const room = await withTimeout(
        client.joinOrCreate(args.room, joinOptions),
        args.joinTimeoutMs,
        "joinOrCreate"
      );
      joinMs.push(Date.now() - tJoin);
      connected++;
      rooms.push(room);
      room.onLeave(() => {
        connected = Math.max(0, connected - 1);
      });

      if (args.sendInterval > 0) {
        let seq = i * 1_000_000;
        const timer = setInterval(() => {
          try {
            seq++;
            room.send("load", { n: Math.random(), clientSeq: seq });
            loadSent++;
          } catch {
            /* ignore */
          }
        }, args.sendInterval);
        sendTimers.push(timer);
        room.onMessage("loadAck", () => {
          loadAcked++;
        });
      }
    } catch (e: any) {
      failed++;
      if (failed <= 5 || failed % 50 === 0) {
        console.error(`连接失败 #${failed}:`, e?.message || e);
      }
    } finally {
      inFlight--;
    }
    if (args.delay > 0) await sleep(args.delay);
  }

  clearInterval(statTimer);
  const totalSec = (Date.now() - t0) / 1000;
  console.log("\n--- 连接阶段结束 ---");
  console.log(
    `目标: ${args.num} 成功: ${connected} 失败: ${failed} 耗时: ${totalSec.toFixed(1)}s | loadAck/loadSent: ${loadAcked}/${loadSent}`
  );
  console.log(`保持连接: ${rooms.length} 路（Ctrl+C 退出）`);

  const shutdown = () => {
    for (const t of sendTimers) clearInterval(t);
    for (const r of rooms) {
      try {
        r.leave();
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
