import { Liveblocks } from "@liveblocks/node";
import type { PresenceSource } from "@/types/collab";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCK_SECRET_KEY!,
});

export type RoomCommentRealtimeEvent =
  | { type: "comment.created"; comment: unknown }
  | { type: "comment.updated"; comment: unknown }
  | { type: "comment.deleted"; id: string }
  | { type: "checkpoint.restored"; checkpointId: string; roomId: string };

export async function broadcastRoomEvent(
  roomId: string,
  event: RoomCommentRealtimeEvent
): Promise<void> {
  await liveblocks.broadcastEvent(roomId, event as never);
}

export async function getRoomOnlineCount(roomId: string): Promise<number | null> {
  try {
    const result = await liveblocks.getActiveUsers(roomId);
    return result.data.length;
  } catch {
    return null;
  }
}

export async function getRoomsOnlineCounts(
  roomIds: string[],
  options?: { concurrency?: number }
): Promise<Record<string, { onlineCount: number | null; source: PresenceSource }>> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 3, 8));
  const queue = [...new Set(roomIds.filter(Boolean))];
  const output: Record<string, { onlineCount: number | null; source: PresenceSource }> = {};

  const worker = async () => {
    while (queue.length > 0) {
      const roomId = queue.shift();
      if (!roomId) continue;
      const onlineCount = await getRoomOnlineCount(roomId);
      output[roomId] = {
        onlineCount,
        source: onlineCount === null ? "none" : "live",
      };
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return output;
}
