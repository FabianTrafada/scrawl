import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/lib/auth";
import { getPreferredAvatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCK_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  // Authenticate with Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = session.user;
  const avatar = getPreferredAvatarUrl({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  });

  // Get the requested room from the Liveblocks client
  const { room: roomId } = await request.json();
  if (!roomId || typeof roomId !== "string") {
    return new NextResponse("Missing room", { status: 400 });
  }

  // Look up the room in the database
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { where: { userId: user.id } },
    },
  });

  if (!room) {
    return new NextResponse("Room not found", { status: 404 });
  }

  // Determine access level
  const isOwner = room.ownerId === user.id;
  const membership = room.members[0];

  let access: "edit" | "view" | "none" = "none";
  if (isOwner) {
    access = "edit";
  } else if (membership) {
    access = membership.access as "edit" | "view";
  } else {
    // Not a member — use room's default access
    access = room.defaultAccess as "edit" | "view" | "none";
    
    // Automatically add the user as a member if they have link access
    // This ensures they show up in the Share dialog list
    if (access !== "none") {
      try {
        await prisma.roomMember.create({
          data: {
            roomId,
            userId: user.id,
            access,
          },
        });
      } catch (error) {
        // If they were added concurrently by another tab, ignore the error
        console.error("Failed to auto-add member:", error);
      }
    }
  }

  if (access === "none") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Prepare Liveblocks session
  const lbSession = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.name ?? "Anonymous",
      avatar,
      email: user.email ?? "",
    },
  });

  if (access === "edit") {
    lbSession.allow(roomId, lbSession.FULL_ACCESS);
  } else {
    lbSession.allow(roomId, lbSession.READ_ACCESS);
  }

  const { status, body } = await lbSession.authorize();
  return new NextResponse(body, { status });
}
