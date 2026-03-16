import { promises as fs } from "node:fs";
import path from "node:path";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "../examples/ai-config");

const overwrite = process.argv.includes("--overwrite");

async function copyDir(srcDir: string, destDir: string, prefix = "") {
	await fs.mkdir(destDir, { recursive: true });

	const entries = await fs.readdir(srcDir, { withFileTypes: true });
	let copied = 0;
	let skipped = 0;
	let overwritten = 0;

	for (const entry of entries) {
		const src = path.join(srcDir, entry.name);
		const dest = path.join(destDir, entry.name);
		const displayName = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const sub = await copyDir(src, dest, displayName);
			copied += sub.copied;
			skipped += sub.skipped;
			overwritten += sub.overwritten;
			continue;
		}

		if (!entry.isFile()) continue;

		let exists = false;
		try {
			await fs.access(dest);
			exists = true;
		} catch {
			// file doesn't exist
		}

		if (exists && !overwrite) {
			console.log(`  skip: ${displayName} (already exists)`);
			skipped++;
		} else {
			await fs.copyFile(src, dest);
			if (exists) {
				console.log(`  overwrite: ${displayName}`);
				overwritten++;
			} else {
				console.log(`  copy: ${displayName}`);
				copied++;
			}
		}
	}

	return { copied, skipped, overwritten };
}

async function main() {
	const obsidianDir = process.env.OBSIDIAN_DIR;
	const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG;

	if (!obsidianDir || !aiConfigRel) {
		console.error(
			"OBSIDIAN_DIR and OBSIDIAN_AI_CONFIG must be set in .env",
		);
		process.exit(1);
	}

	const targetDir = path.join(obsidianDir, aiConfigRel);

	if (overwrite) {
		console.log("--overwrite: existing files will be replaced\n");
	}

	const { copied, skipped, overwritten } = await copyDir(
		EXAMPLES_DIR,
		targetDir,
	);

	console.log(
		`\nDone. Copied ${copied}, overwritten ${overwritten}, skipped ${skipped}.`,
	);
	console.log(`Target: ${targetDir}`);
}

main();
