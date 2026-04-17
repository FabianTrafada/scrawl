import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RoomComment } from "@prisma/client";
import { broadcastRoomEvent } from "@/lib/liveblocks-server";

type Params = { params: Promise<{ roomId: string }> };

type RoomCommentWithAuthor = RoomComment & {
  author?: {
    name: string | null;
    email: string | null;
  } | null;
};

const LEGACY_REPLY_PREFIX = "[[reply:";
const LEGACY_REPLY_SEPARATOR = "]] ";

const roomCommentSupportsParentId = (() => {
  const runtime = prisma as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: Array<{ name: string }> }>;
    };
  };

  const fields = runtime._runtimeDataModel?.models?.RoomComment?.fields;
  return Array.isArray(fields) && fields.some((field) => field.name === "parentId");
})();

function parseLegacyReplyMetadata(rawText: string): {
  parentId: string | null;
  text: string;
} {
  if (!rawText.startsWith(LEGACY_REPLY_PREFIX)) {
    return { parentId: null, text: rawText };
  }

  const separatorIndex = rawText.indexOf(LEGACY_REPLY_SEPARATOR);
  if (separatorIndex < 0) {
    return { parentId: null, text: rawText };
  }

  const parentId = rawText.slice(LEGACY_REPLY_PREFIX.length, separatorIndex).trim();
  const text = rawText.slice(separatorIndex + LEGACY_REPLY_SEPARATOR.length);
  return {
    parentId: parentId || null,
    text,
  };
}

function withLegacyReplyMetadata(text: string, parentId: string | null): string {
  if (!parentId) return text;
  return `${LEGACY_REPLY_PREFIX}${parentId}${LEGACY_REPLY_SEPARATOR}${text}`;
}

function serializeComment(comment: RoomCommentWithAuthor) {
  const userName =
    comment.author?.name?.trim() ||
    comment.author?.email?.trim() ||
    `User ${comment.authorId.slice(0, 6)}`;

  const parsedLegacy = parseLegacyReplyMetadata(comment.text);
  const nativeParentId = (comment as unknown as { parentId?: string | null }).parentId ?? null;
  const parentId = nativeParentId ?? parsedLegacy.parentId;
  const normalizedText = parsedLegacy.text;

  return {
    id: comment.id,
    roomId: comment.roomId,
    userId: comment.authorId,
    userName,
    x: comment.x,
    y: comment.y,
    elementId: comment.elementId,
    parentId,
    text: normalizedText,
    resolved: comment.resolved,
    createdAt: comment.createdAt.getTime(),
    updatedAt: comment.updatedAt.getTime(),
  };
}

async function resolveRoomAccess(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { where: { userId } },
    },
  });
  if (!room) return { canRead: false, canWrite: false };

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
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { roomId } = await params;
  const comments = await prisma.roomComment.findMany({
    where: { roomId },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ comments: comments.map(serializeComment) });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as {
    text?: string;
    x?: number | null;
    y?: number | null;
    elementId?: string | null;
    parentId?: string | null;
  };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const parentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId : null;
  const parentComment = parentId
    ? await prisma.roomComment.findFirst({
        where: { id: parentId, roomId },
        select: {
          id: true,
          elementId: true,
          x: true,
          y: true,
        },
      })
    : null;

  if (parentId && !parentComment) {
    return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
  }

  const normalizedElementId =
    typeof body.elementId === "string"
      ? body.elementId
      : body.elementId === null
        ? null
        : parentComment?.elementId ?? null;

  const normalizedX =
    typeof body.x === "number" ? body.x : body.x === null ? null : parentComment?.x ?? null;
  const normalizedY =
    typeof body.y === "number" ? body.y : body.y === null ? null : parentComment?.y ?? null;

  const normalizedText = roomCommentSupportsParentId
    ? body.text.trim()
    : withLegacyReplyMetadata(body.text.trim(), parentId);

  const includeAuthor = {
    author: {
      select: {
        name: true,
        email: true,
      },
    },
  };

  const comment = roomCommentSupportsParentId
    ? await prisma.roomComment.create({
        data: {
          roomId,
          authorId: session.user.id,
          text: normalizedText,
          parentId,
          x: normalizedX,
          y: normalizedY,
          elementId: normalizedElementId,
          resolved: false,
        },
        include: includeAuthor,
      })
    : await prisma.roomComment.create({
        data: {
          roomId,
          authorId: session.user.id,
          text: normalizedText,
          x: normalizedX,
          y: normalizedY,
          elementId: normalizedElementId,
          resolved: false,
        },
        include: includeAuthor,
      });
  const serialized = serializeComment(comment);
  await broadcastRoomEvent(roomId, {
    type: "comment.created",
    comment: serialized,
  });
  return NextResponse.json({ comment: serialized });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as {
    id?: string;
    text?: string;
    resolved?: boolean;
    x?: number | null;
    y?: number | null;
    elementId?: string | null;
  };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const comment = await prisma.roomComment.findFirst({
    where: { id: body.id, roomId },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existingLegacy = parseLegacyReplyMetadata(comment.text);
  const nextText =
    typeof body.text === "string"
      ? roomCommentSupportsParentId
        ? body.text
        : withLegacyReplyMetadata(body.text, existingLegacy.parentId)
      : undefined;

  const updated = await prisma.roomComment.update({
    where: { id: body.id },
    data: {
      text: nextText,
      resolved: body.resolved,
      x: body.x,
      y: body.y,
      elementId: body.elementId,
    },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  const serialized = serializeComment(updated);
  await broadcastRoomEvent(roomId, {
    type: "comment.updated",
    comment: serialized,
  });
  return NextResponse.json({ comment: serialized });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId } = await params;
  const access = await resolveRoomAccess(roomId, session.user.id);
  if (!access.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.roomComment.findFirst({
    where: { id, roomId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.roomComment.delete({ where: { id } });
  await broadcastRoomEvent(roomId, {
    type: "comment.deleted",
    id,
  });

  return NextResponse.json({ success: true });
}
