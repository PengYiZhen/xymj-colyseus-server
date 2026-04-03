import { BaseChatRoom, ChatChannel } from "./BaseChatRoom";
import { ChatPlayer } from "../schema/chat/ChatPlayer";

export class TeamChatRoom extends BaseChatRoom {
  protected get channel(): ChatChannel {
    return "team";
  }

  protected isRecipient(sender: ChatPlayer, target: ChatPlayer): boolean {
    // 队伍聊天：同 teamId 才互通
    if (!sender.teamId || !target.teamId) return false;
    return sender.teamId === target.teamId;
  }
}

