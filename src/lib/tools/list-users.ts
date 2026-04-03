import { tool } from "ai";
import { z } from "zod";
import { prisma } from "#/db";

export const listUsers = tool({
  description:
    "List all users on the system with their names and roles. Use this when the user asks who has accounts, wants to see family members, or needs to know about other users.",
  inputSchema: z.object({}),
  execute: async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
      where: {
        banned: false,
      },
      orderBy: { name: "asc" },
    });

    return users;
  },
});
