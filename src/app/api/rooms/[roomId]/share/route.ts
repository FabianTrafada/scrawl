import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string }> };

/** GET /api/rooms/[roomId]/share — get room share settings + members */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      invites: {
        where: { used: false, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, access: true, createdAt: true },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isOwner = room.ownerId === session.user.id;

  // If not owner, return basic data so they can "Leave Room"
  if (!isOwner) {
    return NextResponse.json({
      id: room.id,
      name: room.name,
      isOwner: false,
    });
  }

  // Filter out any pending invites for users who are already members or the owner
  const memberEmails = new Set(
    room.members
      .map((m: { user: { email: string | null } }) => m.user.email)
      .filter((email: string | null): email is string => Boolean(email))
      .map((email: string) => email.toLowerCase())
  );
  if (room.owner.email) {
    memberEmails.add(room.owner.email.toLowerCase());
  }

  const validPendingInvites = room.invites.filter(
    (inv) => !memberEmails.has(inv.email.toLowerCase())
  );

  return NextResponse.json({
    id: room.id,
    name: room.name,
    isOwner: true,
    defaultAccess: room.defaultAccess,
    owner: room.owner,
    members: room.members.map((m) => ({
      id: m.id,
      access: m.access,
      user: m.user,
    })),
    pendingInvites: validPendingInvites,
  });
}

/** PATCH /api/rooms/[roomId]/share — update share settings */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name && typeof body.name === "string") {
    updates.name = body.name.trim();
  }
  if (body.defaultAccess && ["edit", "view", "none"].includes(body.defaultAccess)) {
    updates.defaultAccess = body.defaultAccess;
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: updates,
  });

  return NextResponse.json({ room: updated });
}

/** DELETE /api/rooms/[roomId]/share — remove a member from the room */
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const { memberId } = await request.json();

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.roomMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
