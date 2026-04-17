import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveRoomAccess } from "@/lib/room-access";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string; checkpointId: string }> };

type RoomCheckpointModel = {
  findFirst: (args: {
    where: { id: string; roomId: string };
    select: {
      id: true;
      name: true;
      version: true;
      snapshot: true;
      createdAt: true;
      authorId: true;
    };
  }) => Promise<
    | {
        id: string;
        name: string;
        version: number;
        snapshot: unknown;
        createdAt: Date;
        authorId: string;
      }
    | null
  >;
  delete: (args: { where: { id: string } }) => Promise<void>;
};

const roomCheckpointModel = (prisma as unknown as { roomCheckpoint: RoomCheckpointModel })
  .roomCheckpoint;

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, checkpointId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checkpoint = await roomCheckpointModel.findFirst({
    where: { id: checkpointId, roomId },
    select: {
      id: true,
      name: true,
      version: true,
      snapshot: true,
      createdAt: true,
      authorId: true,
    },
  });

  if (!checkpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    checkpoint: {
      id: checkpoint.id,
      name: checkpoint.name,
      version: checkpoint.version,
      snapshot: checkpoint.snapshot,
      createdAt: checkpoint.createdAt.toISOString(),
      authorId: checkpoint.authorId,
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, checkpointId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await roomCheckpointModel.findFirst({
    where: { id: checkpointId, roomId },
    select: {
      id: true,
      name: true,
      version: true,
      snapshot: true,
      createdAt: true,
      authorId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await roomCheckpointModel.delete({ where: { id: checkpointId } });
  return NextResponse.json({ success: true });
}
