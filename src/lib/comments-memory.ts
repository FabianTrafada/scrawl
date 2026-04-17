export interface RoomComment {
  id: string;
  roomId: string;
  userId: string;
  x: number | null;
  y: number | null;
  elementId: string | null;
  text: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}

const globalState = globalThis as typeof globalThis & {
  __mathdrawComments?: Map<string, RoomComment[]>;
};

const commentsByRoom = globalState.__mathdrawComments ?? new Map<string, RoomComment[]>();
globalState.__mathdrawComments = commentsByRoom;

export function listRoomComments(roomId: string): RoomComment[] {
  return [...(commentsByRoom.get(roomId) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

export function addRoomComment(comment: RoomComment): RoomComment {
  const list = commentsByRoom.get(comment.roomId) ?? [];
  list.unshift(comment);
  commentsByRoom.set(comment.roomId, list);
  return comment;
}

export function updateRoomComment(
  roomId: string,
  commentId: string,
  patch: Partial<Pick<RoomComment, "text" | "resolved" | "x" | "y" | "elementId">>
): RoomComment | null {
  const list = commentsByRoom.get(roomId) ?? [];
  const idx = list.findIndex((item) => item.id === commentId);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch, updatedAt: Date.now() };
  list[idx] = next;
  commentsByRoom.set(roomId, list);
  return next;
}

export function deleteRoomComment(roomId: string, commentId: string): boolean {
  const list = commentsByRoom.get(roomId) ?? [];
  const next = list.filter((item) => item.id !== commentId);
  commentsByRoom.set(roomId, next);
  return next.length !== list.length;
}
