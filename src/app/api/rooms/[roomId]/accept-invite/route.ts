import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ roomId: string }> };

/** GET /api/rooms/[roomId]/accept-invite?token=xxx — accept an email invite */
export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { roomId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/?error=missing_token", request.url)
    );
  }

  // Look up the invite
  const invite = await prisma.roomInvite.findUnique({ where: { token } });

  if (!invite || invite.roomId !== roomId) {
    return NextResponse.redirect(
      new URL("/?error=invalid_invite", request.url)
    );
  }

  if (invite.used) {
    // Already accepted — just redirect to the room
    return NextResponse.redirect(new URL(`/room/${roomId}?success=invite_already_accepted`, request.url));
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.redirect(
      new URL("/?error=invite_expired", request.url)
    );
  }

  if (!session?.user) {
    // Not logged in — redirect to home with the invite token so they can sign in first
    // After auth, they'll be redirected back
    return NextResponse.redirect(
      new URL(
        `/?invite_token=${token}&invite_room=${roomId}`,
        request.url
      )
    );
  }

  // Accept the invite — add user as room member
  await prisma.$transaction([
    prisma.roomMember.upsert({
      where: {
        roomId_userId: { roomId, userId: session.user.id },
      },
      update: { access: invite.access },
      create: {
        roomId,
        userId: session.user.id,
        access: invite.access,
      },
    }),
    prisma.roomInvite.update({
      where: { id: invite.id },
      data: { used: true },
    }),
  ]);

  // Redirect to the room
  return NextResponse.redirect(new URL(`/room/${roomId}?success=invite_accepted`, request.url));
}
