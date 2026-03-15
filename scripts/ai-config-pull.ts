import { promises as fs } from "node:fs";
import path from "node:path";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "../examples/ai-config");

async function main() {
	const obsidianDir = process.env.OBSIDIAN_DIR;
	const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG;

	if (!obsidianDir || !aiConfigRel) {
		console.error(
			"OBSIDIAN_DIR and OBSIDIAN_AI_CONFIG must be set in .env",
		);
		process.exit(1);
	}

	const sourceDir = path.join(obsidianDir, aiConfigRel);

	let files: string[];
	try {
		files = await fs.readdir(sourceDir);
	} catch {
		console.error(`Cannot read AI config dir: ${sourceDir}`);
		process.exit(1);
	}

	await fs.mkdir(EXAMPLES_DIR, { recursive: true });

	let pulled = 0;

	for (const file of files) {
		const src = path.join(sourceDir, file);
		const dest = path.join(EXAMPLES_DIR, file);

		const stat = await fs.stat(src);
		if (!stat.isFile() || !file.endsWith(".md")) continue;

		await fs.copyFile(src, dest);
		console.log(`  pull: ${file}`);
		pulled++;
	}

	console.log(`\nDone. Pulled ${pulled} file(s) from live config.`);
	console.log(`Source: ${sourceDir}`);
	console.log(`Target: ${EXAMPLES_DIR}`);
}

main();
