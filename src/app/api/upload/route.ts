import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/upload — generate a presigned URL for client-side direct upload */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { filename, contentType, roomId } = body;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "Missing filename or contentType" },
      { status: 400 }
    );
  }

  // Validate content type — only images
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are allowed" },
      { status: 400 }
    );
  }

  // If roomId is provided, verify user has access to it
  if (roomId && typeof roomId === "string") {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { where: { userId: session.user.id } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isOwner = room.ownerId === session.user.id;
    const isMember = room.members.length > 0;
    const hasLinkAccess = room.defaultAccess === "edit" || room.defaultAccess === "view";

    if (!isOwner && !isMember && !hasLinkAccess) {
      return NextResponse.json({ error: "Forbidden access to room" }, { status: 403 });
    }
  }

  // Build the R2 key: rooms/<roomId>/<timestamp>-<filename>
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = roomId ? `rooms/${roomId}` : `users/${session.user.id}`;
  const key = `${prefix}/${timestamp}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 300, // 5 minutes
  });

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ presignedUrl, publicUrl, key });
}
