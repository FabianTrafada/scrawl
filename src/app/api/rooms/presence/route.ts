import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRoomsOnlineCounts } from "@/lib/liveblocks-server";
import type { PresenceSource } from "@/types/collab";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { roomIds?: string[] };
  const roomIds = Array.from(new Set((body.roomIds ?? []).filter(Boolean))).slice(0, 20);
  if (!roomIds.length) {
    return NextResponse.json({ byRoomId: {} });
  }

  const allowedRooms = await prisma.room.findMany({
    where: {
      id: { in: roomIds },
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true },
  });
  const allowedRoomIds = allowedRooms.map((room) => room.id);
  if (!allowedRoomIds.length) {
    return NextResponse.json({ byRoomId: {} });
  }

  const liveCounts = await getRoomsOnlineCounts(allowedRoomIds, { concurrency: 3 });

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

  const snapshots = await roomPresenceSnapshotModel.findMany({
    where: { roomId: { in: allowedRoomIds } },
  });
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.roomId, snapshot]));

  const now = Date.now();
  const ttlMs = 60_000;
  const byRoomId = Object.fromEntries(
    allowedRoomIds.map((roomId) => {
      const live = liveCounts[roomId];
      const cached = snapshotMap.get(roomId);
      const sampledAtMs = cached?.sampledAt?.getTime?.() ?? null;
      const isStale = sampledAtMs !== null ? now - sampledAtMs > ttlMs : false;
      const source: PresenceSource =
        live?.source ?? (cached ? (isStale ? "stale" : "cache") : "none");

      return [
        roomId,
        {
          onlineCount:
            live?.onlineCount !== undefined
              ? live.onlineCount
              : cached?.onlineCount ?? null,
          sampledAt:
            live?.source === "live"
              ? new Date().toISOString()
              : cached?.sampledAt?.toISOString?.() ?? null,
          source,
        },
      ];
    })
  );

  return NextResponse.json({ byRoomId });
}
