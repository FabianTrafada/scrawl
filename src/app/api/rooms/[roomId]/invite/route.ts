import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import { renderInviteEmail } from "@/emails/invite-email";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string }> };

/** POST /api/rooms/[roomId]/invite — send an email invite */
export async function POST(request: NextRequest, { params }: Params) {
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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const access = body.access === "view" ? "view" : "edit";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Check if user is already the owner
  if (email === session.user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "User is the owner of the room" },
      { status: 409 }
    );
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.id === room.ownerId) {
      return NextResponse.json(
        { error: "User is the owner of the room" },
        { status: 409 }
      );
    }
    
    const existingMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: existingUser.id } },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      );
    }
  }

  // Check for existing pending invite
  const existingInvite = await prisma.roomInvite.findFirst({
    where: { roomId, email, used: false, expiresAt: { gt: new Date() } },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "Invite already pending for this email" },
      { status: 409 }
    );
  }

  // Create invite
  const invite = await prisma.roomInvite.create({
    data: {
      roomId,
      email,
      access,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Build accept URL
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const acceptUrl = `${baseUrl}/api/rooms/${roomId}/accept-invite?token=${invite.token}`;

  // Send email via Resend
  const inviterName = session.user.name ?? "Someone";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: `${inviterName} invited you to "${room.name}" on Scrawl`,
      html: renderInviteEmail({
        inviterName,
        roomName: room.name,
        acceptUrl,
      }),
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Don't fail the request — invite is already created in DB
  }

  return NextResponse.json({ invite: { id: invite.id, email, access } }, { status: 201 });
}
