import { Room, Client } from "@colyseus/core";
import { MyRoomState } from "./schema/MyRoomState";
import { RequireAuth } from "../utils/decorators/RequireAuth";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  state = new MyRoomState();
  /**
   * @RequireAuth
   * 用户验证安全性的jwt token & accessToken 验证
   * 【使用此装饰器】如果用户没有登录，则无法创建和加入房间
   */
  @RequireAuth()
  onCreate (options: any) {
    this.onMessage("type", (client, message) => {
      //
      // handle "type" message
      //
    });
  }


  @RequireAuth()
  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
