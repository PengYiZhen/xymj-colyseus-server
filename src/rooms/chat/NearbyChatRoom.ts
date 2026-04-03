import { BaseChatRoom, ChatChannel } from "./BaseChatRoom";
import { ChatPlayer } from "../schema/chat/ChatPlayer";

export class NearbyChatRoom extends BaseChatRoom {
  protected get channel(): ChatChannel {
    return "nearby";
  }

  protected isRecipient(sender: ChatPlayer, target: ChatPlayer): boolean {
    // 附近聊天：距离 <= sender.nearbyRadius
    const radius = sender.nearbyRadius || 120;
    if (radius <= 0) return false;

    const dx = sender.x - target.x;
    const dy = sender.y - target.y;
    const distSq = dx * dx + dy * dy;
    return distSq <= radius * radius;
  }
}

