import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "#/db";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
	},
	plugins: [
		admin({
			defaultRole: "user",
			adminRoles: ["admin"],
		}),
		tanstackStartCookies(),
	],
});
