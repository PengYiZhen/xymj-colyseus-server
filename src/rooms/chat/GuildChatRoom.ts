import { BaseChatRoom, ChatChannel } from "./BaseChatRoom";
import { ChatPlayer } from "../schema/chat/ChatPlayer";

export class GuildChatRoom extends BaseChatRoom {
  protected get channel(): ChatChannel {
    return "guild";
  }

  protected isRecipient(sender: ChatPlayer, target: ChatPlayer): boolean {
    // 工会聊天：同 guildId 才互通
    if (!sender.guildId || !target.guildId) return false;
    return sender.guildId === target.guildId;
  }
}

