import { Client, Room } from "@colyseus/core";
import { LoadTestRoomState } from "./schema/LoadTestRoomState";
import appConfig from "../config";

/**
 * 无 JWT 的压测专用房间：仅用于内网/开发观察并发与消息吞吐。
 * 生产环境请通过防火墙或 LOADTEST_ROOM_ENABLED 关闭。
 */
export class LoadTestRoom extends Room<LoadTestRoomState> {
  state = new LoadTestRoomState();

  onCreate(_options: Record<string, unknown>) {
    if (!appConfig.colyseus.loadTestRoomEnabled) {
      throw new Error("压测房间已禁用（LOADTEST_ROOM_ENABLED=false）");
    }
    this.maxClients = appConfig.colyseus.loadTestRoomMaxClients;

    this.onMessage("load", (client, message) => {
      const n =
        typeof message?.n === "number" && Number.isFinite(message.n)
          ? message.n
          : Number(message?.n);
      const clientSeq =
        typeof message?.clientSeq === "number" && Number.isFinite(message.clientSeq)
          ? message.clientSeq
          : 0;
      client.send("loadAck", {
        clientSeq,
        n: Number.isFinite(n) ? n : null,
        serverTime: Date.now(),
      });
    });
  }

  onJoin(_client: Client, _options: Record<string, unknown>) {
    this.state.connectedCount++;
    this.state.revision++;
  }

  onLeave(_client: Client, _consented: boolean) {
    this.state.connectedCount = Math.max(0, this.state.connectedCount - 1);
    this.state.revision++;
  }
}
