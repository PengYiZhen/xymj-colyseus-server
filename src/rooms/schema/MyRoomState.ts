import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("number") seatIndex: number = -1;
  @type("boolean") online: boolean = true;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") attacking: boolean = false;
}

export class MyRoomState extends Schema {
  @type("string") mySynchronizedProperty: string = "Hello world";
  @type("number") frame: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
}
