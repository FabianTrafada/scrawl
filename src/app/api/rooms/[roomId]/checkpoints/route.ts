import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveRoomAccess } from "@/lib/room-access";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string }> };

const MAX_CHECKPOINTS_PER_ROOM = 50;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

type RoomCheckpointModel = {
  create: (args: {
    data: {
      roomId: string;
      authorId: string;
      name: string;
      snapshot: unknown;
      version: number;
    };
  }) => Promise<{ id: string }>;
  count: (args: { where: { roomId: string } }) => Promise<number>;
  findMany: (args: {
    where: { roomId: string };
    select: {
      id: true;
      name: true;
      createdAt: true;
      version: true;
      author: { select: { id: true; name: true } };
    };
    orderBy: { createdAt: "desc" };
  }) => Promise<
    Array<{
      id: string;
      name: string;
      createdAt: Date;
      version: number;
      author: { id: string; name: string | null };
    }>
  >;
  findFirst: (args: {
    where: { roomId: string };
    orderBy: { createdAt: "asc" };
    select: { id: true };
  }) => Promise<{ id: string } | null>;
  delete: (args: { where: { id: string } }) => Promise<void>;
};

const roomCheckpointModel = (prisma as unknown as { roomCheckpoint: RoomCheckpointModel })
  .roomCheckpoint;

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checkpoints = await roomCheckpointModel.findMany({
    where: { roomId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      version: true,
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    checkpoints: checkpoints.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt.toISOString(),
      version: item.version,
      author: item.author,
    })),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    snapshot?: {
      version?: number;
      elements?: unknown[];
      camera?: { x?: number; y?: number; zoom?: number };
    };
  };

  const name = body.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const snapshot = body.snapshot;
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.elements) || !snapshot.camera) {
    return NextResponse.json({ error: "Invalid snapshot payload" }, { status: 400 });
  }

  const snapshotJson = JSON.stringify(snapshot);
  if (snapshotJson.length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json(
      { error: `Snapshot exceeds ${Math.floor(MAX_SNAPSHOT_BYTES / 1024)}KB limit` },
      { status: 413 }
    );
  }

  await roomCheckpointModel.create({
    data: {
      roomId,
      authorId: session.user.id,
      name,
      snapshot,
      version: 1,
    },
  });

  const count = await roomCheckpointModel.count({ where: { roomId } });
  if (count > MAX_CHECKPOINTS_PER_ROOM) {
    const oldest = await roomCheckpointModel.findFirst({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (oldest) {
      await roomCheckpointModel.delete({ where: { id: oldest.id } });
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
