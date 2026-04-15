import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous } from "better-auth/plugins/anonymous";
import { prisma } from "./db";
import { getDefaultAvatarUrlFromUser, shouldUseDicebearFallback } from "./avatar";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Transfer room ownership from anonymous to real account
        await prisma.room.updateMany({
          where: { ownerId: anonymousUser.user.id },
          data: { ownerId: newUser.user.id },
        });
        await prisma.roomMember.updateMany({
          where: { userId: anonymousUser.user.id },
          data: { userId: newUser.user.id },
        });

        // Ensure Google-linked users have a deterministic default avatar when missing
        if (shouldUseDicebearFallback(newUser.user.image)) {
          const googleAccount = await prisma.account.findFirst({
            where: {
              userId: newUser.user.id,
              providerId: "google",
            },
            select: { id: true },
          });

          if (googleAccount) {
            const avatarUrl = getDefaultAvatarUrlFromUser({
              id: newUser.user.id,
              email: newUser.user.email,
              name: newUser.user.name,
            });
            await prisma.user.update({
              where: { id: newUser.user.id },
              data: { image: avatarUrl },
            });
          }
        }
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  user: {
    additionalFields: {
      isAnonymous: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
