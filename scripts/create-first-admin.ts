import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../src/db";
import { auth } from "../src/lib/auth";

async function main() {
	const userCount = await prisma.user.count();

	if (userCount > 0) {
		throw new Error(
			"The first admin can only be created when the database has no users.",
		);
	}

	const rl = createInterface({ input, output });

	try {
		const name = (await rl.question("Admin name: ")).trim();
		const email = (await rl.question("Admin email: ")).trim().toLowerCase();
		const password = (await rl.question("Admin password: ")).trim();

		if (!name) {
			throw new Error("Name is required.");
		}

		if (!email) {
			throw new Error("Email is required.");
		}

		if (password.length < 8) {
			throw new Error("Password must be at least 8 characters.");
		}

		const result = await auth.api.createUser({
			body: {
				name,
				email,
				password,
				role: "admin",
			},
		});

		await prisma.user.update({
			where: { id: result.user.id },
			data: {
				emailVerified: true,
				mustChangePassword: false,
				role: "admin",
			},
		});

		output.write(`\nCreated first admin: ${email}\n`);
	} finally {
		rl.close();
		await prisma.$disconnect();
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : "Unknown error";
	output.write(`\nFailed to create first admin: ${message}\n`);
	process.exitCode = 1;
});
