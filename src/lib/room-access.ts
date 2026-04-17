import { prisma } from "@/lib/db";

export type ResolvedRoomAccess = {
  canRead: boolean;
  canWrite: boolean;
  isOwner: boolean;
  access: "edit" | "view" | "none";
};

export async function resolveRoomAccess(
  roomId: string,
  userId: string
): Promise<ResolvedRoomAccess> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { where: { userId } } },
  });
  if (!room) {
    return {
      canRead: false,
      canWrite: false,
      isOwner: false,
      access: "none",
    };
  }

  const isOwner = room.ownerId === userId;
  const membership = room.members[0];
  const defaultAccess = room.defaultAccess as "edit" | "view" | "none";
  const access = isOwner
    ? "edit"
    : membership
      ? (membership.access as "edit" | "view")
      : defaultAccess;

  return {
    canRead: access !== "none",
    canWrite: access === "edit",
    isOwner,
    access,
  };
}
