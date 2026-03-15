import { promises as fs } from "node:fs";
import path from "node:path";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "../examples/ai-config");

const overwrite = process.argv.includes("--overwrite");

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

	// Create the AI config directory if it doesn't exist
	await fs.mkdir(targetDir, { recursive: true });

	if (overwrite) {
		console.log("--overwrite: existing files will be replaced\n");
	}

	const files = await fs.readdir(EXAMPLES_DIR);
	let copied = 0;
	let skipped = 0;
	let overwritten = 0;

	for (const file of files) {
		const src = path.join(EXAMPLES_DIR, file);
		const dest = path.join(targetDir, file);

		const stat = await fs.stat(src);
		if (!stat.isFile()) continue;

		let exists = false;
		try {
			await fs.access(dest);
			exists = true;
		} catch {
			// file doesn't exist
		}

		if (exists && !overwrite) {
			console.log(`  skip: ${file} (already exists)`);
			skipped++;
		} else {
			await fs.copyFile(src, dest);
			if (exists) {
				console.log(`  overwrite: ${file}`);
				overwritten++;
			} else {
				console.log(`  copy: ${file}`);
				copied++;
			}
		}
	}

	console.log(
		`\nDone. Copied ${copied}, overwritten ${overwritten}, skipped ${skipped}.`,
	);
	console.log(`Target: ${targetDir}`);
}

main();
