import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRoomsOnlineCounts } from "@/lib/liveblocks-server";
import type { PresenceSource } from "@/types/collab";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const PRESENCE_TTL_MS = 60_000;
const LIVE_REFRESH_LIMIT = 10;

type RoomPresenceSnapshotRecord = {
  roomId: string;
  onlineCount: number;
  sampledAt: Date;
};

const roomPresenceSnapshotModel = (prisma as unknown as {
  roomPresenceSnapshot: {
    findMany: (args: {
      where: { roomId: { in: string[] } };
    }) => Promise<RoomPresenceSnapshotRecord[]>;
    upsert: (args: {
      where: { roomId: string };
      create: { roomId: string; onlineCount: number; sampledAt: Date };
      update: { onlineCount: number; sampledAt: Date };
    }) => Promise<RoomPresenceSnapshotRecord>;
  };
}).roomPresenceSnapshot;

/** GET /api/rooms — list rooms the user owns or is a member of */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const roomIds = rooms.map((room) => room.id);

  const unresolvedCounts = roomIds.length
    ? await prisma.roomComment.groupBy({
        by: ["roomId"],
        where: {
          roomId: { in: roomIds },
          resolved: false,
        },
        _count: { _all: true },
      })
    : [];

  const unresolvedCountMap = new Map(
    unresolvedCounts.map((item) => [item.roomId, item._count._all])
  );

  const snapshots = roomIds.length
    ? await roomPresenceSnapshotModel.findMany({
        where: { roomId: { in: roomIds } },
      })
    : [];

  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.roomId, snapshot]));

  const liveTargetIds = roomIds.slice(0, LIVE_REFRESH_LIMIT);
  const liveCounts = liveTargetIds.length
    ? await getRoomsOnlineCounts(liveTargetIds, { concurrency: 3 })
    : {};

  const now = Date.now();
  const upserts = Object.entries(liveCounts)
    .filter(([, payload]) => payload.onlineCount !== null)
    .map(([roomId, payload]) =>
      roomPresenceSnapshotModel.upsert({
        where: { roomId },
        create: {
          roomId,
          onlineCount: payload.onlineCount as number,
          sampledAt: new Date(),
        },
        update: {
          onlineCount: payload.onlineCount as number,
          sampledAt: new Date(),
        },
      })
    );
  if (upserts.length) await Promise.all(upserts);

  const enrichedRooms = rooms.map((room) => {
    const live = liveCounts[room.id];
    const cached = snapshotMap.get(room.id);
    const sampledAtMs = cached ? cached.sampledAt.getTime() : null;
    const isStale = sampledAtMs !== null ? now - sampledAtMs > PRESENCE_TTL_MS : false;

    const onlineCount =
      live?.onlineCount !== undefined ? live.onlineCount : cached?.onlineCount ?? null;
    const onlineCountSource: PresenceSource =
      live?.source ?? (cached ? (isStale ? "stale" : "cache") : "none");
    const onlineCountSampledAt =
      live?.source === "live"
        ? new Date().toISOString()
        : cached
          ? cached.sampledAt.toISOString()
          : null;

    return {
      ...room,
      activity: {
        unresolvedComments: unresolvedCountMap.get(room.id) ?? 0,
        onlineCount,
        onlineCountSampledAt,
        onlineCountSource,
      },
    };
  });

  return NextResponse.json({
    rooms: enrichedRooms,
    polling: {
      recommendedMs: 50_000,
      ttlMs: PRESENCE_TTL_MS,
    },
  });
}

/** POST /api/rooms — create a new room */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Untitled";

  const room = await prisma.room.create({
    data: {
      name,
      ownerId: session.user.id,
      defaultAccess: "edit",
    },
  });

  return NextResponse.json({ room }, { status: 201 });
}
