import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string }> };

/** POST /api/rooms/[roomId]/close — Close the room or leave it */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const userId = session.user.id;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isOwner = room.ownerId === userId;

  if (isOwner) {
    // Owner closes the room: Kick everyone out
    await prisma.$transaction([
      prisma.room.update({
        where: { id: roomId },
        data: { defaultAccess: "none" },
      }),
      prisma.roomMember.deleteMany({
        where: { roomId },
      }),
      prisma.roomInvite.deleteMany({
        where: { roomId },
      }),
    ]);
    return NextResponse.json({ success: true, action: "closed" });
  } else {
    // Editor leaves the room: Remove their membership
    await prisma.roomMember.deleteMany({
      where: { roomId, userId },
    });
    return NextResponse.json({ success: true, action: "left" });
  }
}
